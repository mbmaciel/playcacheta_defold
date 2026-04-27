const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');

// GET /users/me — perfil do usuário logado
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// PUT /users/me — atualiza nome, e-mail e telefone
router.put('/me', authenticate, async (req, res) => {
  try {
    const { rows: currentRows } = await query(
      'SELECT id, name, cpf, email, phone, fichas, wins, losses FROM users WHERE id = $1',
      [req.user.id]
    );
    const currentUser = currentRows[0];
    if (!currentUser) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const nextName = typeof req.body.name === 'string'
      ? req.body.name.trim()
      : currentUser.name;
    const nextEmail = typeof req.body.email === 'string'
      ? req.body.email.toLowerCase().trim()
      : currentUser.email;
    const nextPhone = Object.prototype.hasOwnProperty.call(req.body, 'phone')
      ? (req.body.phone ? String(req.body.phone).trim() : null)
      : currentUser.phone;

    if (!nextName) {
      return res.status(400).json({ error: 'Nome é obrigatório.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(nextEmail)) {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }

    if (nextEmail !== currentUser.email) {
      const { rows: existingRows } = await query(
        'SELECT id FROM users WHERE email = $1 AND id <> $2',
        [nextEmail, req.user.id]
      );
      if (existingRows.length > 0) {
        return res.status(409).json({ error: 'Este e-mail já está em uso.' });
      }
    }

    const { rows } = await query(
      `UPDATE users SET name = $1, email = $2, phone = $3 WHERE id = $4
       RETURNING id, name, cpf, email, phone, fichas, wins, losses`,
      [nextName, nextEmail, nextPhone, req.user.id]
    );
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

// PUT /users/me/password — altera senha
router.put('/me/password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Senha atual incorreta.' });

    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);

    res.json({ message: 'Senha alterada com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao alterar senha.' });
  }
});

module.exports = router;
