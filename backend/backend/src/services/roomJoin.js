const { getClient } = require('../config/database');

async function joinRoomForUser(roomCode, userId) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const roomRes = await client.query(
      `SELECT * FROM game_rooms WHERE code = $1 FOR UPDATE`,
      [roomCode.toUpperCase()]
    );
    const room = roomRes.rows[0];
    if (!room) {
      await client.query('ROLLBACK');
      return { error: 'Sala não encontrada.', status: 404 };
    }

    if (room.status === 'finished') {
      await client.query('ROLLBACK');
      return { error: 'Esta partida já terminou.', status: 400 };
    }

    const userRes = await client.query(
      `SELECT id, fichas FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );
    const user = userRes.rows[0];
    if (!user) {
      await client.query('ROLLBACK');
      return { error: 'Usuário não encontrado.', status: 404 };
    }

    const alreadyRes = await client.query(
      `SELECT position FROM room_players WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [room.id, userId]
    );

    let position = alreadyRes.rows[0]?.position;
    let currentFichas = user.fichas;
    let charged = false;

    if (position === undefined) {
      const countRes = await client.query(
        `SELECT COUNT(*)::int AS cnt, ARRAY_AGG(position ORDER BY position) AS positions
         FROM room_players WHERE room_id = $1 AND left_at IS NULL`,
        [room.id]
      );
      const { cnt, positions } = countRes.rows[0];

      if (cnt >= room.max_players) {
        await client.query('ROLLBACK');
        return { error: 'Sala lotada.', status: 400 };
      }

      const debitRes = await client.query(
        `UPDATE users
         SET fichas = fichas - $1
         WHERE id = $2 AND fichas >= $1
         RETURNING fichas`,
        [room.fichas_per_round, userId]
      );

      if (!debitRes.rows[0]) {
        await client.query('ROLLBACK');
        return { error: 'Fichas insuficientes para entrar na sala.', status: 400 };
      }

      currentFichas = debitRes.rows[0].fichas;
      charged = true;

      const taken = positions || [];
      position = [0, 1, 2, 3].find(p => !taken.includes(p));

      await client.query(
        `INSERT INTO room_players (room_id, user_id, position, team)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (room_id, user_id) WHERE left_at IS NULL
         DO UPDATE SET left_at = NULL, position = $3`,
        [room.id, userId, position, position % 2]
      );
    }

    await client.query('COMMIT');
    return {
      room,
      position,
      charged,
      userFichas: currentFichas,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { joinRoomForUser };
