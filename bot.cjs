const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf');

// --- Configuration Loading ---
let token = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
let CASINO_URL = process.env.CASINO_URL || '';
let ADMIN_ID = '7119839001';

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
const DB_FILE = 'transactions.json';
const BALANCES_FILE = 'balances.json';
const USED_PROMOS_FILE = 'used_promos.json';

app.use(cors());
app.use(express.json());
// Serve static files from the 'dist' directory (Vite build output)
app.use(express.static(path.join(__dirname, 'dist')));

// --- Helper Functions ---
function getBalances() {
    try {
        if (fs.existsSync(BALANCES_FILE)) {
            return JSON.parse(fs.readFileSync(BALANCES_FILE, 'utf8'));
        }
    } catch (e) { console.error('Error reading balances:', e); }
    return {};
}

function saveBalances(balances) {
    try {
        fs.writeFileSync(BALANCES_FILE, JSON.stringify(balances, null, 2));
        return true;
    } catch (e) {
        console.error('Error writing balances:', e);
        return false;
    }
}

function updateBalance(userId, delta) {
    const balances = getBalances();
    const current = balances[userId] || 0;
    // Ensure we don't get floating point weirdness
    balances[userId] = Number((current + delta).toFixed(2));
    saveBalances(balances);
    return balances[userId];
}

// --- Promo Code Helper ---
function getUsedPromos() {
    try {
        if (fs.existsSync(USED_PROMOS_FILE)) {
            return JSON.parse(fs.readFileSync(USED_PROMOS_FILE, 'utf8'));
        }
    } catch (e) { console.error('Error reading used promos:', e); }
    return {};
}

function saveUsedPromos(data) {
    try {
        fs.writeFileSync(USED_PROMOS_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('Error writing used promos:', e);
        return false;
    }
}

// --- Database Helper ---

function logTransaction(data) {
    let transactions = [];
    try {
        if (fs.existsSync(DB_FILE)) {
            transactions = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        }
    } catch (e) { console.error('Error reading DB:', e); }

    // Idempotency check
    if (transactions.some(t => t.id === data.id)) return false;

    transactions.push({
        timestamp: new Date().toISOString(),
        ...data
    });

    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(transactions, null, 2));
    } catch (e) { console.error('Error writing DB:', e); }
    return true;
}

// --- Bot Logic ---
bot.start((ctx) => {
    ctx.reply('GiftSlot', {
        reply_markup: {
            inline_keyboard: [[{ text: 'Играть в GiftSlot', web_app: { url: CASINO_URL } }]]
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

    if (logTransaction(txData)) {
        // Update persistent balance
        const newBalance = updateBalance(userId, amount);

        // Notify User
        await ctx.reply(`✅ Оплата прошла успешно! Получено ${amount} звезд. Баланс: ${newBalance}`);
        
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
    // Optionally we can mark transaction as completed in DB if we tracked it there.
    
    await ctx.editMessageText(`✅ Вывод одобрен\nUser ID: ${userId}\nAmount: ${amount} Stars\nStatus: Completed`);
    await ctx.answerCbQuery('Withdrawal confirmed');
    
    // Notify user
    bot.telegram.sendMessage(userId, `✅ Ваш вывод ${amount} звезд одобрен! Они скоро поступят на ваш счет.`).catch(() => {});
});

bot.action(/^decline_(\d+)_(\d+)$/, async (ctx) => {
    const userId = parseInt(ctx.match[1]);
    const amount = parseInt(ctx.match[2]);
    
    // Refund the user
    updateBalance(userId, amount);
    
    await ctx.editMessageText(`❌ Вывод отклонен\nUser ID: ${userId}\nAmount: ${amount} Stars\nStatus: Refunded`);
    await ctx.answerCbQuery('Withdrawal declined');
    
    // Notify user
    bot.telegram.sendMessage(userId, `❌ Ваш вывод ${amount} звезд был отклонен. Средства возвращены на баланс.`).catch(() => {});
});

// --- API Endpoints for WebApp ---
app.post('/api/withdraw', async (req, res) => {
    const { userId, amount, username } = req.body;
    
    if (!userId || !amount || amount < 500) {
        return res.status(400).json({ error: 'Неверный запрос. Минимальный вывод 500 звезд.' });
    }

    const balances = getBalances();
    const currentBalance = balances[userId] || 0;

    if (currentBalance < amount) {
        return res.status(400).json({ error: 'Недостаточно средств' });
    }

    // Deduct immediately
    const newBalance = updateBalance(userId, -amount);

    // Log withdrawal request
    logTransaction({
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
        updateBalance(userId, amount);
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

    const usedPromos = getUsedPromos();
    const userUsedPromos = usedPromos[userId] || [];

    if (userUsedPromos.includes(promoCode)) {
        return res.status(400).json({ error: 'Вы уже использовали этот промокод' });
    }

    // Apply Promo
    const bonusAmount = 2;
    updateBalance(userId, bonusAmount);
    
    // Mark as used
    userUsedPromos.push(promoCode);
    usedPromos[userId] = userUsedPromos;
    saveUsedPromos(usedPromos);

    res.json({ success: true, message: `Промокод активирован! Начислено ${bonusAmount} звезды.` });
});

app.get('/api/balance/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const balances = getBalances();
    const balance = balances[userId] || 0;
    res.json({ stars: balance });
});

app.post('/api/game/transaction', (req, res) => {
    const { userId, amount } = req.body;
    if (!userId || typeof amount !== 'number') {
        return res.status(400).json({ error: 'Invalid params' });
    }
    // amount can be negative (bet) or positive (win)
    const newBalance = updateBalance(userId, amount);
    res.json({ balance: newBalance });
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

// --- Withdrawal Logic ---

app.post('/api/withdraw', async (req, res) => {
    const { userId, amount, username } = req.body;
    
    if (!userId || !amount || amount < 500) {
        return res.status(400).json({ error: 'Invalid request. Minimum withdrawal is 500 Stars.' });
    }

    const balances = getBalances();
    const currentBalance = balances[userId] || 0;

    if (currentBalance < amount) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Deduct immediately
    const newBalance = updateBalance(userId, -amount);

    // Log withdrawal request
    logTransaction({
        id: `withdraw_${userId}_${Date.now()}`,
        userId,
        username,
        amount: -amount,
        currency: 'XTR',
        type: 'withdrawal_request'
    });

    // Notify Admin
    if (ADMIN_ID) {
        try {
            await bot.telegram.sendMessage(ADMIN_ID, 
                `💸 <b>New Withdrawal Request</b>\n` +
                `User: @${username} (ID: <code>${userId}</code>)\n` +
                `Amount: <b>${amount} Stars</b>\n` +
                `Balance remaining: ${newBalance}`, 
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '❌ Отклонить', callback_data: `decline_${userId}_${amount}` },
                                { text: '✅ Подтвердить', callback_data: `approve_${userId}_${amount}` }
                            ]
                        ]
                    }
                }
            );
        } catch (e) {
            console.error('Failed to notify admin', e);
        }
    }

    res.json({ success: true, newBalance });
});

// Admin Actions
bot.action(/^approve_(\d+)_(\d+)$/, async (ctx) => {
    const userId = parseInt(ctx.match[1]);
    const amount = parseInt(ctx.match[2]);
    
    await ctx.editMessageText(
        `✅ <b>Withdrawal Approved</b>\n` +
        `User ID: ${userId}\n` +
        `Amount: ${amount} Stars\n` +
        `Status: Completed`,
        { parse_mode: 'HTML' }
    );
    await ctx.answerCbQuery('Withdrawal confirmed');
    
    // Notify user
    bot.telegram.sendMessage(userId, `✅ Ваш вывод ${amount} звезд одобрен! Они скоро поступят на ваш счет.`).catch(() => {});
});

bot.action(/^decline_(\d+)_(\d+)$/, async (ctx) => {
    const userId = parseInt(ctx.match[1]);
    const amount = parseInt(ctx.match[2]);

    // Refund the user
    const newBalance = updateBalance(userId, amount);
    
    // Log refund
    logTransaction({
        id: `refund_${userId}_${Date.now()}`,
        userId,
        amount: amount,
        currency: 'XTR',
        type: 'withdrawal_refund'
    });

    await ctx.editMessageText(
        `❌ <b>Withdrawal Declined</b>\n` +
        `User ID: ${userId}\n` +
        `Amount: ${amount} Stars\n` +
        `Action: Refunded\n` +
        `New Balance: ${newBalance}`,
        { parse_mode: 'HTML' }
    );
    await ctx.answerCbQuery('Withdrawal declined and refunded');
    
    // Notify user
    bot.telegram.sendMessage(userId, `❌ Ваш вывод ${amount} звезд был отклонен. Средства возвращены на баланс.`).catch(() => {});
});

// --- Start Servers ---
bot.launch().then(() => console.log('Bot started'));
app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
});

// Graceful stop
process.once('SIGINT', () => { bot.stop('SIGINT'); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); });
