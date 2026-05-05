require('dotenv').config();
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { pool } = require('./config/database');
const authRoutes     = require('./routes/auth');
const usersRoutes    = require('./routes/users');
const packagesRoutes = require('./routes/packages');
const paymentsRoutes = require('./routes/payments');
const gameRoutes     = require('./routes/game');
const setupGameSocket = require('./sockets/gameSocket');

const app    = express();
const server = http.createServer(app);
const isProduction = process.env.NODE_ENV === 'production';

function parseAllowedOrigins(value) {
  return (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getTrustProxyValue(value) {
  if (!value) return isProduction ? 1 : false;
  if (value === 'true') return true;
  if (value === 'false') return false;

  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? value : numericValue;
}

async function ensureDatabaseCompatibility() {
  await pool.query(`
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS trio_qrcode_id VARCHAR(255);
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS trio_document_id VARCHAR(255);
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS trio_external_id VARCHAR(255);
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS trio_status VARCHAR(50);
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS trio_receipt_url TEXT;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'room_players_room_id_user_id_key'
      ) THEN
        ALTER TABLE room_players DROP CONSTRAINT room_players_room_id_user_id_key;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'room_players_room_id_position_key'
      ) THEN
        ALTER TABLE room_players DROP CONSTRAINT room_players_room_id_position_key;
      END IF;
    END
    $$;
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_room_players_active_user
      ON room_players (room_id, user_id)
      WHERE left_at IS NULL;
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_room_players_active_position
      ON room_players (room_id, position)
      WHERE left_at IS NULL;
  `);

  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
  `);
}

// ============================================================
// Socket.io
// ============================================================
const allowedOrigins = parseAllowedOrigins(
  process.env.ALLOWED_ORIGINS || 'http://localhost:8081,http://localhost:19006'
);

if (isProduction && !process.env.ALLOWED_ORIGINS) {
  console.warn('ALLOWED_ORIGINS não configurado em produção. Ajuste o .env do backend.');
}

app.set('trust proxy', getTrustProxyValue(process.env.TRUST_PROXY));

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupGameSocket(io);

// ============================================================
// Middlewares globais
// ============================================================
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  },
}));

// Assets estáticos (logo, imagens)
app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Muitas tentativas. Aguarde 15 minutos.' } });

app.use(limiter);

// ============================================================
// Rotas
// ============================================================
app.use('/auth',     authLimiter, authRoutes);
app.use('/users',    usersRoutes);
app.use('/packages', packagesRoutes);
app.use('/payments', paymentsRoutes);
app.use('/game',     gameRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', uptime: process.uptime() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

// ============================================================
// Inicialização
// ============================================================
const PORT = process.env.PORT || 3001;

server.listen(PORT, async () => {
  try {
    await pool.query('SELECT 1');
    await ensureDatabaseCompatibility();
    console.log(`✅  PostgreSQL conectado`);
  } catch (err) {
    console.error('❌  Erro ao conectar ao PostgreSQL:', err.message);
  }
  console.log(`🌍  Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐  Origins permitidas: ${allowedOrigins.join(', ') || 'nenhuma configurada'}`);
  console.log(`🎴  Play Cacheta backend rodando na porta ${PORT}`);
  console.log(`🃏  Socket.io aguardando conexões de jogadores`);
});
