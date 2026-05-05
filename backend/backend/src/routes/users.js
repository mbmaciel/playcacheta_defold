const router = require('express').Router();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { query } = require('../config/database');

const AVATAR_DIR = path.join(__dirname, '../../uploads/avatars');
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, AVATAR_DIR),
    filename: (req, file, cb) => {
      const ext = MIME_TO_EXT[file.mimetype] || '.jpg';
      cb(null, uuidv4() + ext);
    },
  }),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato não permitido. Use JPG, PNG ou WebP.'));
    }
  },
});

// GET /users — lista usuários para o administrador
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, name, cpf, email, phone, fichas, total_spent, wins, losses, avatar_url, is_active, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    res.json({ users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
});

// GET /users/me — perfil do usuário logado
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// PUT /users/me — atualiza nome, e-mail e telefone
router.put('/me', authenticate, async (req, res) => {
  try {
    const { rows: currentRows } = await query(
      'SELECT id, name, cpf, email, phone, fichas, wins, losses, avatar_url FROM users WHERE id = $1',
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
       RETURNING id, name, cpf, email, phone, fichas, wins, losses, avatar_url`,
      [nextName, nextEmail, nextPhone, req.user.id]
    );
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

// POST /users/me/avatar — upload de foto de perfil
router.post('/me/avatar', authenticate, (req, res) => {
  console.log('[avatar] content-type:', req.get('content-type'));
  console.log('[avatar] body type:', typeof req.body, req.body && Object.keys(req.body));
  upload.single('avatar')(req, res, async (err) => {
    if (err) {
      console.error('[avatar] upload error:', err.code || err.name, err.message);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'A imagem deve ter no máximo 2 MB.' });
        }
        return res.status(400).json({ error: 'Erro no upload da imagem.' });
      }
      return res.status(400).json({ error: err.message });
    }

    console.log('[avatar] file:', req.file?.originalname, req.file?.mimetype, req.file?.size);

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    }

    try {
      const avatarUrl = '/uploads/avatars/' + req.file.filename;

      const { rows: oldRows } = await query(
        'SELECT avatar_url FROM users WHERE id = $1',
        [req.user.id]
      );

      if (oldRows[0]?.avatar_url && oldRows[0].avatar_url !== avatarUrl) {
        const oldPath = path.join(__dirname, '../..', oldRows[0].avatar_url);
        fs.unlink(oldPath, () => {});
      }

      const { rows } = await query(
        'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, name, email, cpf, phone, fichas, wins, losses, avatar_url',
        [avatarUrl, req.user.id]
      );

      res.json({ user: rows[0], avatar_url: avatarUrl });
    } catch (dbErr) {
      console.error(dbErr);
      fs.unlink(req.file.path, () => {});
      res.status(500).json({ error: 'Erro ao salvar foto de perfil.' });
    }
  });
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
