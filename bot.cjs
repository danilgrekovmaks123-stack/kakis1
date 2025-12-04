const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const Redis = require('ioredis');

// --- Configuration Loading ---
let token = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
let CASINO_URL = process.env.CASINO_URL || '';
let ADMIN_ID = process.env.ADMIN_ID || '7119839001';
let REDIS_URL = process.env.REDIS_URL || process.env.REDIS_PUBLIC_URL;

// Skip .env loading in production (Railway sets env vars automatically)
if ((!token || !CASINO_URL) && process.env.NODE_ENV !== 'production') {
  try {
    const env = fs.readFileSync('.env', 'utf8');
    if (!token) {
        const m1 = env.match(/BOT_TOKEN\s*=\s*(.+)/);
        const m2 = env.match(/TELEGRAM_BOT_TOKEN\s*=\s*(.+)/);
        token = (m1?.[1] || m2?.[1] || '').trim();
    }
    if (!CASINO_URL) {
        const m3 = env.match(/CASINO_URL\s*=\s*(.+)/);
        CASINO_URL = (CASINO_URL || m3?.[1] || '').trim();
    }
    if (!ADMIN_ID) {
        const m4 = env.match(/ADMIN_ID\s*=\s*(.+)/);
        ADMIN_ID = (m4?.[1] || '7119839001').trim();
    }
  } catch { }
}

// Force Admin ID if not set (as per request)
if (!ADMIN_ID) ADMIN_ID = '7119839001';

if (!token) { console.error('Bot token is missing'); process.exit(1); }
// Allow CASINO_URL to be empty initially if needed, but better to have it
if (!CASINO_URL) console.warn('WebApp URL is missing (CASINO_URL)');

// --- Setup ---
const app = express();
const bot = new Telegraf(token);
const PORT = process.env.PORT || 3002;

// --- Redis Setup ---
let redis;
if (REDIS_URL) {
    console.log('✅ Connecting to Redis...');
    redis = new Redis(REDIS_URL);
    redis.on('error', (err) => console.error('Redis Error:', err));
    redis.on('connect', () => console.log('✅ Connected to Redis'));
} else {
    console.warn('⚠️  REDIS_URL not found. Using IN-MEMORY storage (Data will be lost on restart!)');
    // Minimal mock for local dev without Redis
    const memoryStore = new Map();
    redis = {
        get: async (k) => memoryStore.get(k),
        set: async (k, v) => memoryStore.set(k, v),
        incrbyfloat: async (k, v) => {
            const old = parseFloat(memoryStore.get(k) || '0');
            const newVal = old + v;
            memoryStore.set(k, newVal.toString());
            return newVal.toString();
        },
        sadd: async (k, v) => {
             const set = memoryStore.get(k) || new Set();
             if (set.has(v)) return 0;
             set.add(v);
             memoryStore.set(k, set);
             return 1;
        },
        sismember: async (k, v) => {
             const set = memoryStore.get(k);
             return set && set.has(v) ? 1 : 0;
        },
        lpush: async (k, v) => {
             const list = memoryStore.get(k) || [];
             list.unshift(v);
             memoryStore.set(k, list);
             return list.length;
        }
    };
}


app.use(cors());
app.use(express.json());
// Serve static files from the 'dist' directory (Vite build output)
app.use(express.static(path.join(__dirname, 'dist')));

// --- Helper Functions (Redis Adapted) ---

async function getBalance(userId) {
    const bal = await redis.get(`balance:${userId}`);
    return parseFloat(bal || '0');
}

async function updateBalance(userId, delta) {
    // Redis incrbyfloat is atomic and perfect for this
    const newBal = await redis.incrbyfloat(`balance:${userId}`, delta);
    return parseFloat(newBal);
}

// --- Database Helper (Redis Adapted) ---

async function logTransaction(data) {
    // Idempotency check
    const exists = await redis.get(`tx:${data.id}`);
    if (exists) return false;

    await redis.set(`tx:${data.id}`, '1');
    
    const txRecord = {
        timestamp: new Date().toISOString(),
        ...data
    };
    
    // Store history in a list
    await redis.lpush(`history:${data.userId}`, JSON.stringify(txRecord));
    return true;
}

// --- Bot Logic ---
bot.start((ctx) => {
    ctx.reply('Добро пожаловать в GiftSlot! 🎰\n\nИспытай удачу и выигрывай звезды! ✨', {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🎮 Играть в GiftSlot', web_app: { url: CASINO_URL } }],
                [{ text: '📢 Наш канал', url: 'https://t.me/giftslotcom' }]
            ]
        }
    });
});

// Pre-checkout handler (Mandatory for payments)
bot.on('pre_checkout_query', async (ctx) => {
    await ctx.answerPreCheckoutQuery(true).catch(() => {});
    // Notify user that payment is being processed (as requested)
    await ctx.reply('⏳ Обработка вашего подарка...').catch(() => {});
});

// Successful Payment Handler
bot.on('successful_payment', async (ctx) => {
    const payment = ctx.message.successful_payment;
    const userId = ctx.from.id;
    const amount = payment.total_amount; // For Stars, this is the amount
    const currency = payment.currency; // 'XTR'

    const txData = {
        id: payment.provider_payment_charge_id,
        userId: userId,
        username: ctx.from.username,
        amount: amount,
        currency: currency,
        payload: payment.invoice_payload,
        type: 'deposit'
    };

    if (await logTransaction(txData)) {
        // Update persistent balance
        const newBalance = await updateBalance(userId, amount);

        // Notify User
        await ctx.reply(`✅ Оплата прошла успешно! Получено ${amount} звезд. Баланс: ${newBalance.toFixed(2)}`);
        
        // Notify Admin
        if (ADMIN_ID) {
            bot.telegram.sendMessage(ADMIN_ID, `💰 Новое пополнение!\nUser: ${ctx.from.first_name} (@${ctx.from.username})\nAmount: ${amount} Stars`).catch(e => console.error('Admin notify failed', e));
        }
    }
});

// --- Action Handlers ---
bot.action(/^approve_(\d+)_(\d+)$/, async (ctx) => {
    const userId = parseInt(ctx.match[1]);
    const amount = parseInt(ctx.match[2]);
    
    // Since we already deducted the balance, we just acknowledge.
    
    await ctx.editMessageText(`✅ Вывод одобрен\nUser ID: ${userId}\nAmount: ${amount} Stars\nStatus: Completed`);
    await ctx.answerCbQuery('Withdrawal confirmed');
    
    // Notify user
    bot.telegram.sendMessage(userId, `✅ Ваш вывод ${amount} звезд одобрен! Они скоро поступят на ваш счет.`).catch(() => {});
});

bot.action(/^decline_(\d+)_(\d+)$/, async (ctx) => {
    const userId = parseInt(ctx.match[1]);
    const amount = parseInt(ctx.match[2]);
    
    // Refund the user
    await updateBalance(userId, amount);
    
    await ctx.editMessageText(`❌ Вывод отклонен\nUser ID: ${userId}\nAmount: ${amount} Stars\nStatus: Refunded`);
    await ctx.answerCbQuery('Withdrawal declined');
    
    // Notify user
    bot.telegram.sendMessage(userId, `❌ Ваш вывод ${amount} звезд был отклонен. Средства возвращены на баланс.`).catch(() => {});
});

// --- API Endpoints for WebApp ---

// Get Balance Endpoint
app.get('/api/balance/:userId', async (req, res) => {
    const userId = req.params.userId;
    const balance = await getBalance(userId);
    res.json({ balance });
});

app.post('/api/withdraw', async (req, res) => {
    const { userId, amount, username } = req.body;
    
    if (!userId || !amount || amount < 500) {
        return res.status(400).json({ error: 'Неверный запрос. Минимальный вывод 500 звезд.' });
    }

    const currentBalance = await getBalance(userId);

    if (currentBalance < amount) {
        return res.status(400).json({ error: 'Недостаточно средств' });
    }

    // Deduct immediately
    const newBalance = await updateBalance(userId, -amount);

    // Log withdrawal request
    await logTransaction({
        id: `withdraw_${userId}_${Date.now()}`,
        userId: userId,
        username: username,
        amount: amount,
        type: 'withdrawal',
        status: 'pending'
    });

    // Send Request to Admin
    try {
        if (ADMIN_ID) {
            await bot.telegram.sendMessage(ADMIN_ID, 
                `💸 Запрос на вывод!\nUser: ${username} (ID: ${userId})\nAmount: ${amount} Stars\nBalance left: ${newBalance}`, 
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '✅ Одобрить', callback_data: `approve_${userId}_${amount}` },
                                { text: '❌ Отклонить', callback_data: `decline_${userId}_${amount}` }
                            ]
                        ]
                    }
                }
            );
        }
        res.json({ success: true, newBalance });
    } catch (e) {
        console.error('Failed to notify admin:', e);
        // Refund on error
        await updateBalance(userId, amount);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/promo', async (req, res) => {
    const { userId, code } = req.body;
    
    if (!userId || !code) {
        return res.status(400).json({ error: 'Invalid request' });
    }

    const promoCode = code.trim().toUpperCase();
    
    if (promoCode !== '1GAME') {
        return res.status(400).json({ error: 'Неверный промокод' });
    }

    // Check if used using Redis Set
    const isUsed = await redis.sismember(`promos:${userId}`, promoCode);

    if (isUsed) {
        return res.status(400).json({ error: 'Вы уже использовали этот промокод' });
    }

    // Apply Promo
    const bonusAmount = 2;
    await updateBalance(userId, bonusAmount);
    
    // Mark as used
    await redis.sadd(`promos:${userId}`, promoCode);

    res.json({ success: true, message: `Промокод активирован! Начислено ${bonusAmount} звезды.` });
});


app.post('/api/create-invoice', async (req, res) => {
    const { amount, userId } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    try {
        const title = 'Gift Stars';
        const description = `Gift ${amount} Stars`;
        const payload = `deposit_${userId}_${Date.now()}`;
        const providerToken = ""; // Empty for Telegram Stars
        const currency = "XTR";
        const prices = [{ label: "Stars", amount: Math.floor(amount) }]; // Amount in minimal units? For Stars, amount 1 = 1 Star.

        const link = await bot.telegram.createInvoiceLink({
            title,
            description,
            payload,
            provider_token: providerToken,
            currency: currency,
            prices: prices,
        });

        res.json({ link });
    } catch (error) {
        console.error('Invoice creation failed:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
});

// Start Bot
bot.launch().then(() => {
    console.log('Bot is running...');
}).catch((err) => {
    console.error('Bot launch failed:', err);
});

// Graceful Stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
