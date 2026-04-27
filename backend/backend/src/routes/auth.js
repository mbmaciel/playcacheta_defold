const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function sanitizeCPF(cpf) {
  return cpf.replace(/\D/g, '');
}

function isValidCPF(cpf) {
  const digits = sanitizeCPF(cpf);
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  return rest === parseInt(digits[10]);
}

// POST /auth/register
router.post('/register', async (req, res) => {
  const { name, cpf, email, phone, password } = req.body;

  if (!name || !cpf || !email || !password) {
    return res.status(400).json({ error: 'Campos obrigatórios: name, cpf, email, password.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
  }
  if (!isValidCPF(cpf)) {
    return res.status(400).json({ error: 'CPF inválido.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }

  const rawCPF = sanitizeCPF(cpf);
  const formattedCPF = `${rawCPF.slice(0,3)}.${rawCPF.slice(3,6)}.${rawCPF.slice(6,9)}-${rawCPF.slice(9)}`;

  try {
    // Verifica duplicatas
    const existing = await query(
      'SELECT id FROM users WHERE cpf = $1 OR email = $2',
      [formattedCPF, email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'CPF ou e-mail já cadastrado.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { rows } = await query(
      `INSERT INTO users (name, cpf, email, phone, password_hash, fichas)
       VALUES ($1, $2, $3, $4, $5, 50)
       RETURNING id, name, cpf, email, phone, fichas, wins, losses, created_at`,
      [name.trim(), formattedCPF, email.toLowerCase().trim(), phone || null, passwordHash]
    );

    const user = rows[0];
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Conta criada com sucesso! Você ganhou 50 fichas de bônus.',
      token,
      user,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { cpf, password } = req.body;

  if (!cpf || !password) {
    return res.status(400).json({ error: 'CPF e senha são obrigatórios.' });
  }

  const rawCPF = sanitizeCPF(cpf);
  const formattedCPF = rawCPF.length === 11
    ? `${rawCPF.slice(0,3)}.${rawCPF.slice(3,6)}.${rawCPF.slice(6,9)}-${rawCPF.slice(9)}`
    : cpf;

  try {
    const { rows } = await query(
      `SELECT id, name, cpf, email, phone, password_hash, fichas, wins, losses, is_active
       FROM users WHERE cpf = $1`,
      [formattedCPF]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'CPF ou senha incorretos.' });
    }
    if (!user.is_active) {
      return res.status(401).json({ error: 'Conta desativada. Entre em contato com o suporte.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'CPF ou senha incorretos.' });
    }

    const token = generateToken(user.id);
    const { password_hash, ...userWithoutPassword } = user;

    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

module.exports = router;
