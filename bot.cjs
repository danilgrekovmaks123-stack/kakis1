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

// Ensure data directory exists for persistent storage
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'transactions.json');
const BALANCES_FILE = path.join(DATA_DIR, 'balances.json');
const PROMOCODES_FILE = path.join(DATA_DIR, 'promocodes.json');

app.use(cors());
app.use(express.json());
// Serve static files from the 'dist' directory (Vite build output)
app.use(express.static(path.join(__dirname, 'dist')));

// --- One-time global balances reset ---
try {
    const RESET_MARK = path.join(DATA_DIR, 'reset_balances.done');
    if (!fs.existsSync(RESET_MARK)) {
        fs.writeFileSync(BALANCES_FILE, JSON.stringify({}, null, 2));
        fs.writeFileSync(RESET_MARK, new Date().toISOString());
        console.log('Global balances reset: all user balances set to 0');
    }
} catch (e) {
    console.error('Global balances reset failed:', e);
}

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

function getPromocodes() {
    let promos = {};
    try {
        if (fs.existsSync(PROMOCODES_FILE)) {
            promos = JSON.parse(fs.readFileSync(PROMOCODES_FILE, 'utf8'));
        }
    } catch (e) { console.error('Error reading promocodes:', e); }
    
    if (promos["GIFTUFC"]) {
        delete promos["GIFTUFC"];
        savePromocodes(promos);
    }

    if (promos["GIFTSL"]) {
        delete promos["GIFTSL"];
        savePromocodes(promos);
    }

    if (!promos["SUCHKA"]) {
        promos["SUCHKA"] = {
            reward: 3,
            currency: "STARS",
            usedBy: []
        };
        savePromocodes(promos);
    }

    if (promos["MONKEY"]) {
        delete promos["MONKEY"];
        savePromocodes(promos);
    }

    if (promos["FREE10"]) {
        delete promos["FREE10"];
        savePromocodes(promos);
    }

    if (!promos["GAMEUP"]) {
        promos["GAMEUP"] = {
            reward: 3,
            currency: "STARS",
            usedBy: []
        };
        savePromocodes(promos);
    }

    if (!promos["NNAKFLAS200"]) {
        promos["NNAKFLAS200"] = {
            reward: 200,
            currency: "STARS",
            usedBy: [],
            maxUsages: 1
        };
        savePromocodes(promos);
    }

    if (!promos["SAFVADFASS100"]) {
        promos["SAFVADFASS100"] = {
            reward: 100,
            currency: "STARS",
            usedBy: [],
            maxUsages: 1
        };
        savePromocodes(promos);
    }

    if (!promos["X2KMVDASDD200F"]) {
        promos["X2KMVDASDD200F"] = {
            reward: 200,
            currency: "STARS",
            usedBy: [],
            maxUsages: 1
        };
        savePromocodes(promos);
    }

    if (!promos["NHFMVLAJFG300"]) {
        promos["NHFMVLAJFG300"] = {
            reward: 300,
            currency: "STARS",
            usedBy: [],
            maxUsages: 1
        };
        savePromocodes(promos);
    }

    if (!promos["FKFMMFKLLDJVKL1000"]) {
        promos["FKFMMFKLLDJVKL1000"] = {
            reward: 1000,
            currency: "STARS",
            usedBy: [],
            maxUsages: 1
        };
        savePromocodes(promos);
    }

    if (!promos["DNVKDLAMFMVKQ1000S"]) {
        promos["DNVKDLAMFMVKQ1000S"] = {
            reward: 1000,
            currency: "STARS",
            usedBy: [],
            maxUsages: 1
        };
        savePromocodes(promos);
    }

    if (!promos["HFLVORMLS20"]) {
        promos["HFLVORMLS20"] = {
            reward: 20,
            currency: "STARS",
            usedBy: [],
            maxUsages: 1
        };
        savePromocodes(promos);
    }

    return promos;
}

function savePromocodes(promos) {
    try {
        fs.writeFileSync(PROMOCODES_FILE, JSON.stringify(promos, null, 2));
        return true;
    } catch (e) {
        console.error('Error writing promocodes:', e);
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
    ctx.reply('Испытай удачу в GiftSlot\n🎁 Вводи промокоды на звезды и зарабатывай звезды каждый день', {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Играть в GiftSlot', web_app: { url: CASINO_URL } }],
                [{ text: 'Наш канал', url: 'https://t.me/giftslotcom' }]
            ]
        }
    });
});

// Pre-checkout handler (Mandatory for payments)
bot.on('pre_checkout_query', async (ctx) => {
    await ctx.answerPreCheckoutQuery(true).catch(() => {});
    // Notify user that payment is being processed (as requested)
    await bot.telegram.sendMessage(ctx.from.id, '⏳ Обработка вашего подарка...').catch(() => {});
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

// Inline Query Handler for Referral Sharing
bot.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query;
    const userId = ctx.from.id;
    // We can use a default bot username if context is missing, but better to get it from me
    // However, me is only available if bot info is fetched. Telegraf usually does this.
    const botUsername = ctx.botInfo?.username || 'GIFTslotdropbot'; 
    const referralLink = `https://t.me/${botUsername}?start=ref${userId}`;

    const results = [
        {
            type: 'photo',
            id: 'invite_friend',
            photo_url: 'https://img.freepik.com/free-vector/casino-background-with-golden-coins-flying_1017-38378.jpg', // Placeholder nice casino/gift image
            thumb_url: 'https://img.freepik.com/free-vector/casino-background-with-golden-coins-flying_1017-38378.jpg',
            caption: `⭐ *Хочешь подарю тебе звезды и подарки?*\n\nПолучай их каждые 24 часа в бесплатной рулетке!`,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Получить 🎁', url: referralLink }]
                ]
            }
        }
    ];

    await ctx.answerInlineQuery(results, { cache_time: 0 });
});

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

app.post('/api/promocode/activate', (req, res) => {
    const { userId, code } = req.body;
    
    if (!userId || !code) {
        return res.status(400).json({ success: false, error: 'Missing userId or code' });
    }

    const upperCode = code.toUpperCase().trim();
    const promos = getPromocodes();
    const promo = promos[upperCode];

    if (!promo || !promo.reward) {
        return res.status(400).json({ success: false, error: 'Неверный промокод' });
    }

    if (promo.usedBy.includes(userId)) {
        return res.status(400).json({ success: false, error: 'Вы уже использовали этот промокод' });
    }

    // Check for global usage limit
    if (promo.maxUsages && promo.usedBy.length >= promo.maxUsages) {
        return res.status(400).json({ success: false, error: 'Этот промокод больше не действителен (лимит исчерпан)' });
    }

    // Apply reward
    const reward = promo.reward;
    const newBalance = updateBalance(userId, reward);

    // Mark as used
    promo.usedBy.push(userId);
    savePromocodes(promos);

    // Log transaction
    logTransaction({
        id: `promo_${upperCode}_${userId}_${Date.now()}`,
        userId: userId,
        amount: reward,
        type: 'promo',
        payload: upperCode
    });

    res.json({ success: true, newBalance, reward });
});

app.post('/api/create-invoice', async (req, res) => {
    const { amount, userId } = req.body;

    if (!userId || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount or userId' });
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

// --- Test Endpoint ---
app.post('/api/test/add-balance', (req, res) => {
    const { userId, amount } = req.body;
    if (!userId || !amount) return res.status(400).json({ error: 'Invalid params' });
    
    const newBalance = updateBalance(userId, amount);
    logTransaction({
        id: `test_deposit_${userId}_${Date.now()}`,
        userId,
        amount,
        type: 'test_deposit',
        status: 'completed'
    });
    res.json({ success: true, newBalance });
});





// --- Start Servers ---
const startBot = async () => {
    try {
        // Use Webhook if in production and CASINO_URL is available (and valid)
        if (process.env.NODE_ENV === 'production' && CASINO_URL && CASINO_URL.startsWith('https')) {
            const webhookPath = `/telegraf/${token}`;
            const webhookUrl = `${CASINO_URL}${webhookPath}`;
            
            console.log(`Using Webhook: ${webhookUrl}`);
            
            // Set webhook
            await bot.telegram.setWebhook(webhookUrl);
            
            // Handle updates via Express
            app.use(bot.webhookCallback(webhookPath));
            
            console.log('Bot webhook configured successfully.');
        } else {
            // Use Polling for local development
            console.log('Using Polling...');
            // Clear webhook just in case it was set previously
            try {
                await bot.telegram.deleteWebhook();
                await bot.launch();
                console.log('Bot polling started.');
            } catch (err) {
                console.warn('Bot polling failed to start (likely due to invalid token). API will still work.');
                console.warn(err.message);
            }
        }
    } catch (e) {
        console.error('Bot setup failed:', e);
        // Do not exit, keep server running
    }
};

startBot();

app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
