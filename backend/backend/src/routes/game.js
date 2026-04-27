const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');
const { joinRoomForUser } = require('../services/roomJoin');

const BOT_PLAYERS = [
  { name: 'Lucas Ribeiro', cpf: '999.000.000-01', email: 'bot.lucas.ribeiro@playcacheta.local' },
  { name: 'Gabriel Costa', cpf: '999.000.000-02', email: 'bot.gabriel.costa@playcacheta.local' },
  { name: 'Pedro Fernandes', cpf: '999.000.000-03', email: 'bot.pedro.fernandes@playcacheta.local' },
  { name: 'Mateus Oliveira', cpf: '999.000.000-04', email: 'bot.mateus.oliveira@playcacheta.local' },
  { name: 'Vinicius Gomes', cpf: '999.000.000-05', email: 'bot.vinicius.gomes@playcacheta.local' },
  { name: 'Felipe Carvalho', cpf: '999.000.000-06', email: 'bot.felipe.carvalho@playcacheta.local' },
  { name: 'Rafael Lima', cpf: '999.000.000-07', email: 'bot.rafael.lima@playcacheta.local' },
  { name: 'Bruno Moreira', cpf: '999.000.000-08', email: 'bot.bruno.moreira@playcacheta.local' },
  { name: 'Thiago Santos', cpf: '999.000.000-09', email: 'bot.thiago.santos@playcacheta.local' },
  { name: 'Caio Almeida', cpf: '999.000.000-10', email: 'bot.caio.almeida@playcacheta.local' },
];

const BOT_PASSWORD_HASH = '$2a$10$URysv7ollo6DUZBHqD84Y.IE2j7bOXwFF/rRwC7dkRd/KiFIvE3RS';
const BOT_AUTOFILL_DELAY_MS = 3000;
const EMPTY_PUBLIC_ROOM_GRACE_MINUTES = 10;
const botAutofillTimers = new Map();

function generateRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function ensureBotUsers() {
  const bots = [];

  for (const bot of BOT_PLAYERS) {
    const existing = await query(
      `SELECT id, name, cpf, email FROM users WHERE email = $1`,
      [bot.email]
    );

    if (existing.rows[0]) {
      bots.push(existing.rows[0]);
      continue;
    }

    const inserted = await query(
      `INSERT INTO users (name, cpf, email, phone, password_hash, fichas, is_active)
       VALUES ($1, $2, $3, NULL, $4, 0, true)
       RETURNING id, name, cpf, email`,
      [bot.name, bot.cpf, bot.email, BOT_PASSWORD_HASH]
    );

    bots.push(inserted.rows[0]);
  }

  return bots;
}

async function fetchRoomWithPlayers(code) {
  const roomRes = await query(
    `SELECT r.id, r.code, r.name, r.status, r.game_type, r.fichas_per_round, r.max_players, r.is_private, r.started_at
     FROM game_rooms r WHERE r.code = $1`,
    [code.toUpperCase()]
  );

  const room = roomRes.rows[0];
  if (!room) return null;

  const playersRes = await query(
    `SELECT rp.position, rp.team, u.id, u.name, u.wins, u.losses
     FROM room_players rp
     JOIN users u ON u.id = rp.user_id
     WHERE rp.room_id = $1 AND rp.left_at IS NULL
     ORDER BY rp.position`,
    [room.id]
  );

  return { room, players: playersRes.rows };
}

function cancelRoomAutofill(roomId) {
  const timer = botAutofillTimers.get(roomId);
  if (!timer) return;
  clearTimeout(timer);
  botAutofillTimers.delete(roomId);
}

async function autofillRoomWithBots(roomId) {
  const roomRes = await query(
    `SELECT id, code, status, max_players
     FROM game_rooms
     WHERE id = $1`,
    [roomId]
  );
  const room = roomRes.rows[0];
  if (!room || room.status !== 'waiting') {
    return;
  }

  const playersRes = await query(
    `SELECT rp.position, u.id, u.name
     FROM room_players rp
     JOIN users u ON u.id = rp.user_id
     WHERE rp.room_id = $1 AND rp.left_at IS NULL
     ORDER BY rp.position`,
    [roomId]
  );

  const players = playersRes.rows;
  if (players.length === 0 || players.length >= room.max_players) {
    return;
  }

  const bots = shuffle(await ensureBotUsers()).slice(0, Math.max(0, room.max_players - players.length));
  const takenPositions = new Set(players.map(player => player.position));

  for (const bot of bots) {
    const botPosition = [0, 1, 2, 3].find(position => !takenPositions.has(position));
    if (botPosition === undefined) break;

    takenPositions.add(botPosition);

    await query(
      `INSERT INTO room_players (room_id, user_id, position, team)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (room_id, user_id) WHERE left_at IS NULL
       DO UPDATE SET left_at = NULL, position = $3, team = $4`,
      [roomId, bot.id, botPosition, botPosition % 2]
    );
  }

  await query(
    `UPDATE game_rooms
     SET status = 'playing', started_at = NOW()
     WHERE id = $1 AND status = 'waiting'`,
    [roomId]
  );
}

function scheduleRoomAutofill(room) {
  if (!room || room.status !== 'waiting') {
    return;
  }

  cancelRoomAutofill(room.id);

  const timer = setTimeout(async () => {
    botAutofillTimers.delete(room.id);

    try {
      await autofillRoomWithBots(room.id);
    } catch (err) {
      console.error('[Game] Erro ao completar sala com bots:', err);
    }
  }, BOT_AUTOFILL_DELAY_MS);

  botAutofillTimers.set(room.id, timer);
}

// GET /game/rooms — salas públicas disponíveis
router.get('/rooms', authenticate, async (req, res) => {
  const VALID_TYPES = ['truco_paulista', 'cacheta', 'cachetao'];
  const gameTypeFilter = VALID_TYPES.includes(req.query.gameType) ? req.query.gameType : null;
  try {
    const { rows } = await query(
      `SELECT r.id, r.code, r.name, r.status, r.game_type, r.fichas_per_round,
              r.max_players, r.is_private,
              COUNT(rp.id)::int AS players_count
       FROM game_rooms r
       LEFT JOIN room_players rp ON rp.room_id = r.id AND rp.left_at IS NULL
       WHERE r.status = 'waiting' AND r.is_private = false
         AND ($2::text IS NULL OR r.game_type = $2)
       GROUP BY r.id
       HAVING COUNT(rp.id) < r.max_players
          AND (
            COUNT(rp.id) > 0
            OR r.created_at >= NOW() - ($1::int * INTERVAL '1 minute')
          )
       ORDER BY r.created_at DESC
       LIMIT 20`,
      [EMPTY_PUBLIC_ROOM_GRACE_MINUTES, gameTypeFilter]
    );
    res.json({ rooms: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar salas.' });
  }
});

// POST /game/rooms — cria nova sala
router.post('/rooms', authenticate, async (req, res) => {
  const { name, fichasPerRound = 5, isPrivate = false, gameType = 'truco_paulista' } = req.body;
  const VALID_TYPES = ['truco_paulista', 'cacheta', 'cachetao'];
  const gameTypeVal = VALID_TYPES.includes(gameType) ? gameType : 'truco_paulista';

  if (req.user.fichas < fichasPerRound) {
    return res.status(400).json({ error: 'Fichas insuficientes para criar a sala.' });
  }

  let code = generateRoomCode();
  let attempts = 0;
  while (attempts < 5) {
    const exists = await query('SELECT id FROM game_rooms WHERE code = $1', [code]);
    if (!exists.rows[0]) break;
    code = generateRoomCode();
    attempts++;
  }

  try {
    const { rows } = await query(
      `INSERT INTO game_rooms (code, name, fichas_per_round, is_private, game_type, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, code, name, status, game_type, fichas_per_round, max_players, is_private`,
      [code, name || `Sala de ${req.user.name.split(' ')[0]}`, fichasPerRound, isPrivate, gameTypeVal, req.user.id]
    );
    res.status(201).json({ room: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar sala.' });
  }
});

// GET /game/rooms/:code — info da sala pelo código
router.get('/rooms/:code', authenticate, async (req, res) => {
  try {
    const data = await fetchRoomWithPlayers(req.params.code);
    if (!data) return res.status(404).json({ error: 'Sala não encontrada.' });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar sala.' });
  }
});

// POST /game/rooms/:code/join — entra em uma sala via REST
router.post('/rooms/:code/join', authenticate, async (req, res) => {
  try {
    const joinResult = await joinRoomForUser(req.params.code, req.user.id);
    if (joinResult.error) {
      return res.status(joinResult.status || 400).json({ error: joinResult.error });
    }

    const { room, position, userFichas } = joinResult;

    let data = await fetchRoomWithPlayers(req.params.code);

    if (room.status === 'waiting' && data.players.length >= room.max_players) {
      cancelRoomAutofill(room.id);
      await query(
        `UPDATE game_rooms
         SET status = 'playing', started_at = NOW()
         WHERE id = $1 AND status = 'waiting'`,
        [room.id]
      );
      data = await fetchRoomWithPlayers(req.params.code);
    } else {
      scheduleRoomAutofill(room);
    }

    res.json({
      ok: true,
      position,
      ...data,
      user: {
        id: req.user.id,
        fichas: userFichas,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao entrar na sala.' });
  }
});

// POST /game/rooms/:code/leave — sai da sala via REST
router.post('/rooms/:code/leave', authenticate, async (req, res) => {
  try {
    const roomRes = await query(
      `SELECT id FROM game_rooms WHERE code = $1`,
      [req.params.code.toUpperCase()]
    );
    const room = roomRes.rows[0];
    if (!room) return res.status(404).json({ error: 'Sala não encontrada.' });

    await query(
      `UPDATE room_players SET left_at = NOW()
       WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [room.id, req.user.id]
    );

    const remainingRes = await query(
      `SELECT
         COUNT(*) FILTER (WHERE u.email NOT LIKE '%@playcacheta.local')::int AS real_count
       FROM room_players rp
       JOIN users u ON u.id = rp.user_id
       WHERE rp.room_id = $1 AND rp.left_at IS NULL`,
      [room.id]
    );

    if (remainingRes.rows[0].real_count === 0) {
      cancelRoomAutofill(room.id);
      await query(
        `UPDATE room_players SET left_at = NOW()
         WHERE room_id = $1 AND left_at IS NULL
           AND user_id IN (SELECT id FROM users WHERE email LIKE '%@playcacheta.local')`,
        [room.id]
      );
      await query(
        `UPDATE game_rooms SET status = 'waiting', started_at = NULL
         WHERE id = $1 AND status = 'playing'`,
        [room.id]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao sair da sala.' });
  }
});

// GET /game/history — histórico de partidas do usuário
router.get('/history', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT gh.id, gh.final_scores, gh.rounds_played, gh.duration_secs,
              gh.created_at, r.code AS room_code,
              CASE WHEN gh.winner_team = rp.team THEN true ELSE false END AS won
       FROM game_history gh
       JOIN game_rooms r ON r.id = gh.room_id
       JOIN room_players rp ON rp.room_id = r.id AND rp.user_id = $1
       ORDER BY gh.created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ history: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar histórico.' });
  }
});

module.exports = router;
