const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
const BALANCES_FILE = path.join(DATA_DIR, 'balances.json');
const PROMOS_FILE = path.join(DATA_DIR, 'promocodes.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch {}
  return fallback;
}

function writeJson(file, obj) {
  try {
    fs.writeFileSync(file, JSON.stringify(obj, null, 2));
  } catch {}
}

function getBalances() {
  return readJson(BALANCES_FILE, {});
}

function setBalance(userId, delta) {
  const balances = getBalances();
  const current = balances[userId] || 0;
  const next = current + delta;
  balances[userId] = next < 0 ? 0 : next;
  writeJson(BALANCES_FILE, balances);
  return balances[userId];
}

function getPromos() {
  const promos = readJson(PROMOS_FILE, {});
  // Required: only GAMEUP (+3 stars)
  if (!promos['GAMEUP']) {
    promos['GAMEUP'] = { reward: 3, currency: 'STARS', usedBy: [] };
    writeJson(PROMOS_FILE, promos);
  }
  return promos;
}

function savePromos(promos) {
  writeJson(PROMOS_FILE, promos);
}

app.post('/api/promocode/activate', (req, res) => {
  const { userId, code } = req.body || {};
  if (!userId || !code) return res.status(400).json({ error: 'invalid_request' });

  const promos = getPromos();
  const promo = promos[code];
  if (!promo) return res.status(404).json({ error: 'not_found' });

  const usedBy = promo.usedBy || [];
  if (usedBy.includes(userId)) return res.status(409).json({ error: 'already_used' });

  const amount = Number(promo.reward) || 0;
  setBalance(userId, amount);
  usedBy.push(userId);
  promo.usedBy = usedBy;
  promos[code] = promo;
  savePromos(promos);

  res.json({ ok: true, added: amount, balance: getBalances()[userId] });
});

app.post('/api/game/transaction', (req, res) => {
  // Accept but do nothing in local mode
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Local API running on port ${PORT}`);
});

