const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const ADMIN_CPF = '000.000.000-00';

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query(
      'SELECT id, name, email, cpf, phone, fichas, wins, losses, avatar_url, is_active FROM users WHERE id = $1',
      [payload.userId]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Usuário não encontrado.' });
    if (!rows[0].is_active) return res.status(401).json({ error: 'Conta desativada.' });

    req.user = {
      ...rows[0],
      is_admin: rows[0].cpf === ADMIN_CPF,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Acesso restrito ao administrador do sistema.' });
  }

  next();
}

module.exports = { authenticate, requireAdmin };
