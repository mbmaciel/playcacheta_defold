const router = require('express').Router();
const { query } = require('../config/database');

// GET /packages — lista pacotes ativos
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, label, fichas, bonus, price, tag FROM packages WHERE is_active = true ORDER BY sort_order'
    );
    res.json({ packages: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar pacotes.' });
  }
});

module.exports = router;
