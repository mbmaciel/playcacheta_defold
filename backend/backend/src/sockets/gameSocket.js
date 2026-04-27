'use strict';

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { joinRoomForUser } = require('../services/roomJoin');
const {
  createGameState,
  startRound,
  playCard,
  callTruco,
  respondTruco,
  serializeForPlayer,
} = require('../game/trucoEngine');

// Mapa em memória: roomId -> gameState
const activeGames = new Map();
// Mapa: socketId -> { userId, roomId, playerIdx }
const playerSessions = new Map();

function emitGameState(io, state) {
  state.players.forEach((player, idx) => {
    const serialized = serializeForPlayer(state, idx);
    io.to(player.socketId).emit('game:state', serialized);
  });
}

function emitToRoom(io, roomId, event, data) {
  const state = activeGames.get(roomId);
  if (!state) return;
  state.players.forEach(p => {
    io.to(p.socketId).emit(event, data);
  });
}

async function saveGameResult(state) {
  try {
    const duration = Math.round((Date.now() - state.startedAt) / 1000);
    await query(
      `INSERT INTO game_history (room_id, winner_team, final_scores, rounds_played, duration_secs, players_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        state.roomId,
        state.gameWinner,
        JSON.stringify({ team0: state.teamScores[0], team1: state.teamScores[1] }),
        state.roundNumber,
        duration,
        JSON.stringify(state.players.map(p => ({ userId: p.userId, name: p.name, team: p.team }))),
      ]
    );
    await query(
      `UPDATE game_rooms SET status = 'finished', ended_at = NOW(), winner_team = $1 WHERE id = $2`,
      [state.gameWinner, state.roomId]
    );

    // Atualiza wins/losses
    for (const player of state.players) {
      const won = player.team === state.gameWinner;
      await query(
        `UPDATE users SET ${won ? 'wins' : 'losses'} = ${won ? 'wins' : 'losses'} + 1 WHERE id = $1`,
        [player.userId]
      );
    }

    // Credita fichas aos vencedores (apenas jogadores reais, não bots)
    const fichasPerRound = state.fichasPerRound || 0;
    if (fichasPerRound > 0) {
      const realPlayers = state.players.filter(p => !p.isBot);
      const realWinners = realPlayers.filter(p => p.team === state.gameWinner);

      if (realWinners.length > 0) {
        const totalPot = fichasPerRound * realPlayers.length;
        const prizePerWinner = Math.floor(totalPot / realWinners.length);

        for (const winner of realWinners) {
          await query(
            'UPDATE users SET fichas = fichas + $1 WHERE id = $2',
            [prizePerWinner, winner.userId]
          );
        }
      }
    }
  } catch (err) {
    console.error('[Game] Erro ao salvar resultado:', err);
  }
}

module.exports = function setupGameSocket(io) {
  // Middleware de autenticação WebSocket
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Token não fornecido.'));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const { rows } = await query(
        'SELECT id, name, fichas FROM users WHERE id = $1 AND is_active = true',
        [payload.userId]
      );
      if (!rows[0]) return next(new Error('Usuário não encontrado.'));
      socket.user = rows[0];
      next();
    } catch {
      next(new Error('Token inválido.'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[WS] Conectado: ${socket.user.name} (${socket.id})`);

    // ----------------------------------------------------------------
    // Entrar na sala
    // ----------------------------------------------------------------
    socket.on('room:join', async ({ roomCode }, cb = () => {}) => {
      try {
        const joinResult = await joinRoomForUser(roomCode, socket.user.id);
        if (joinResult.error) {
          return cb({ error: joinResult.error });
        }

        const { room, position, userFichas } = joinResult;
        socket.user.fichas = userFichas;

        socket.join(room.id);
        playerSessions.set(socket.id, { userId: socket.user.id, roomId: room.id, position });

        // Se o jogo já está em andamento, reconecta
        if (activeGames.has(room.id)) {
          const state = activeGames.get(room.id);
          const pIdx = state.players.findIndex(p => p.userId === socket.user.id);
          if (pIdx !== -1) {
            state.players[pIdx].socketId = socket.id;
            socket.emit('game:state', serializeForPlayer(state, pIdx));
            cb({ ok: true, reconnected: true });
            return;
          }
        }

        // Notifica sala
        const playersRes = await query(
          `SELECT rp.position, rp.team, u.id, u.name, u.fichas, u.email
           FROM room_players rp JOIN users u ON u.id = rp.user_id
           WHERE rp.room_id = $1 AND rp.left_at IS NULL ORDER BY rp.position`,
          [room.id]
        );

        io.to(room.id).emit('room:players', { players: playersRes.rows });
        cb({
          ok: true,
          room,
          position,
          user: {
            id: socket.user.id,
            fichas: userFichas,
          },
        });

        // Verifica se pode iniciar o jogo (4 jogadores)
        if (playersRes.rows.length === room.max_players && room.status === 'waiting') {
          const fichasPerRound = room.fichas_per_round;
          await query(
            `UPDATE game_rooms SET status = 'playing', started_at = NOW() WHERE id = $1 AND status = 'waiting'`,
            [room.id]
          );

          const gamePlayers = playersRes.rows.map(p => ({
            userId: p.id,
            name: p.name,
            socketId: null,
            team: p.team,
            isBot: p.email.endsWith('@playcacheta.local'),
          }));

          // Associa socketIds
          gamePlayers.forEach(gp => {
            for (const [sid, sess] of playerSessions.entries()) {
              if (sess.userId === gp.userId && sess.roomId === room.id) {
                gp.socketId = sid;
              }
            }
          });

          const state = createGameState(room.id, gamePlayers);
          state.startedAt = Date.now();
          state.fichasPerRound = fichasPerRound;
          startRound(state, 0);
          activeGames.set(room.id, state);

          io.to(room.id).emit('game:start', { message: 'O jogo começou!' });
          emitGameState(io, state);
        }
      } catch (err) {
        console.error('[WS] room:join error:', err);
        cb({ error: 'Erro interno.' });
      }
    });

    // ----------------------------------------------------------------
    // Jogar carta
    // ----------------------------------------------------------------
    socket.on('game:play_card', ({ cardId }, cb = () => {}) => {
      const session = playerSessions.get(socket.id);
      if (!session) return cb({ error: 'Você não está em nenhuma sala.' });

      const state = activeGames.get(session.roomId);
      if (!state || state.status !== 'playing') return cb({ error: 'Nenhum jogo ativo.' });

      const playerIdx = state.players.findIndex(p => p.userId === session.userId);
      if (playerIdx === -1) return cb({ error: 'Jogador não encontrado.' });

      const result = playCard(state, playerIdx, cardId);
      if (result.error) return cb({ error: result.error });

      if (result.event === 'game_over') {
        saveGameResult(state);
        emitGameState(io, state);
        emitToRoom(io, session.roomId, 'game:over', {
          winner: state.gameWinner,
          scores: state.teamScores,
        });
        activeGames.delete(session.roomId);
      } else if (result.event === 'round_over') {
        emitGameState(io, state);
        emitToRoom(io, session.roomId, 'game:round_over', {
          winner: state.round.winner,
          scores: state.teamScores,
        });
        // Inicia próxima rodada após 3 segundos
        setTimeout(() => {
          if (activeGames.has(session.roomId)) {
            const nextStarterIdx = (state.round.currentPlayerIdx + 1) % 4;
            startRound(state, nextStarterIdx);
            emitGameState(io, state);
            emitToRoom(io, session.roomId, 'game:round_start', { round: state.round.number });
          }
        }, 3000);
      } else {
        emitGameState(io, state);
      }

      cb({ ok: true });
    });

    // ----------------------------------------------------------------
    // Pedir truco
    // ----------------------------------------------------------------
    socket.on('game:truco', (_, cb = () => {}) => {
      const session = playerSessions.get(socket.id);
      if (!session) return cb({ error: 'Fora da sala.' });

      const state = activeGames.get(session.roomId);
      if (!state) return cb({ error: 'Sem jogo ativo.' });

      const playerIdx = state.players.findIndex(p => p.userId === session.userId);
      const result = callTruco(state, playerIdx);
      if (result.error) return cb({ error: result.error });

      emitGameState(io, state);
      emitToRoom(io, session.roomId, 'game:truco_called', {
        callerName: socket.user.name,
        nextValue: result.nextValue,
      });
      cb({ ok: true });
    });

    // ----------------------------------------------------------------
    // Responder truco (accept / decline / raise)
    // ----------------------------------------------------------------
    socket.on('game:truco_response', ({ response }, cb = () => {}) => {
      const session = playerSessions.get(socket.id);
      if (!session) return cb({ error: 'Fora da sala.' });

      const state = activeGames.get(session.roomId);
      if (!state) return cb({ error: 'Sem jogo ativo.' });

      const playerIdx = state.players.findIndex(p => p.userId === session.userId);
      const result = respondTruco(state, playerIdx, response);
      if (result.error) return cb({ error: result.error });

      if (result.event === 'game_over') {
        saveGameResult(state);
        emitGameState(io, state);
        emitToRoom(io, session.roomId, 'game:over', {
          winner: state.gameWinner,
          scores: state.teamScores,
        });
        activeGames.delete(session.roomId);
      } else if (result.event === 'round_over') {
        emitGameState(io, state);
        emitToRoom(io, session.roomId, 'game:round_over', {
          winner: result.roundWinner,
          scores: state.teamScores,
        });
        setTimeout(() => {
          if (activeGames.has(session.roomId)) {
            startRound(state, (state.round.currentPlayerIdx + 1) % 4);
            emitGameState(io, state);
          }
        }, 3000);
      } else {
        emitGameState(io, state);
      }

      cb({ ok: true });
    });

    // ----------------------------------------------------------------
    // Chat na sala
    // ----------------------------------------------------------------
    socket.on('room:chat', ({ message }) => {
      const session = playerSessions.get(socket.id);
      if (!session) return;
      if (typeof message !== 'string' || message.trim().length === 0) return;

      io.to(session.roomId).emit('room:chat', {
        from: socket.user.name,
        message: message.trim().slice(0, 200),
        at: new Date().toISOString(),
      });
    });

    // ----------------------------------------------------------------
    // Desconexão
    // ----------------------------------------------------------------
    socket.on('disconnect', async () => {
      console.log(`[WS] Desconectado: ${socket.user.name}`);
      const session = playerSessions.get(socket.id);
      playerSessions.delete(socket.id);

      if (!session) return;

      const state = activeGames.get(session.roomId);
      if (state) {
        const pIdx = state.players.findIndex(p => p.userId === session.userId);
        if (pIdx !== -1) {
          // Marca como desconectado mas não remove do jogo imediatamente
          state.players[pIdx].socketId = null;
          emitToRoom(io, session.roomId, 'game:player_disconnected', {
            name: socket.user.name,
          });
        }
      }

      // Atualiza sala no banco
      try {
        await query(
          `UPDATE room_players SET left_at = NOW()
           WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL`,
          [session.roomId, session.userId]
        );

        // Se não há jogo ativo e não restam jogadores reais, remove bots e reseta a sala
        if (!state) {
          const remainingRes = await query(
            `SELECT
               COUNT(*) FILTER (WHERE u.email NOT LIKE '%@playcacheta.local')::int AS real_count
             FROM room_players rp
             JOIN users u ON u.id = rp.user_id
             WHERE rp.room_id = $1 AND rp.left_at IS NULL`,
            [session.roomId]
          );

          if (remainingRes.rows[0].real_count === 0) {
            await query(
              `UPDATE room_players SET left_at = NOW()
               WHERE room_id = $1 AND left_at IS NULL
                 AND user_id IN (SELECT id FROM users WHERE email LIKE '%@playcacheta.local')`,
              [session.roomId]
            );
            await query(
              `UPDATE game_rooms SET status = 'waiting', started_at = NULL
               WHERE id = $1 AND status = 'playing'`,
              [session.roomId]
            );
          }
        }
      } catch (err) {
        console.error('[WS] Erro ao atualizar room_players:', err);
      }
    });
  });
};
