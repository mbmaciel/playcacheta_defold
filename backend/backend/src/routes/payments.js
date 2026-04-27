const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { query, getClient } = require('../config/database');
const trio = require('../services/trio');

function formatCPF(cpf = '') {
  const digits = String(cpf).replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return digits;
}

function reaisToCents(value) {
  return Math.round(parseFloat(value || 0) * 100);
}

function resolveLifecycleStatus(document = {}, eventType) {
  if (eventType === 'settled') return 'settled';
  if (eventType === 'failed') return 'failed';

  const stages = Array.isArray(document.stages) ? document.stages : [];
  const finalStage = stages[stages.length - 1]?.status;
  if (finalStage === 'settled' || finalStage === 'failed') return finalStage;

  if (document.status === 'failed') return 'failed';
  if (document.status === 'settled') return 'settled';

  return 'pending';
}

async function fetchTrioDocumentForTransaction(transaction) {
  if (!transaction.trio_external_id) return null;

  try {
    return await trio.searchCollectingDocument({
      externalId: transaction.trio_external_id,
      fromDatetime: new Date(new Date(transaction.created_at).getTime() - 60 * 60 * 1000).toISOString(),
      toDatetime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    if (err.status === 422 || err.status === 404) return null;
    throw err;
  }
}

async function syncTransactionStatus(transactionId, { trioDocument = null, trioEventType = null } = {}) {
  let prefetchedDocument = trioDocument;
  if (!prefetchedDocument) {
    const txRes = await query('SELECT trio_external_id, created_at FROM transactions WHERE id = $1', [transactionId]);
    const transaction = txRes.rows[0];
    if (!transaction) return { notFound: true };

    prefetchedDocument = await fetchTrioDocumentForTransaction(transaction);
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const txRes = await client.query(
      `SELECT * FROM transactions WHERE id = $1 FOR UPDATE`,
      [transactionId]
    );
    const transaction = txRes.rows[0];
    if (!transaction) {
      await client.query('ROLLBACK');
      return { notFound: true };
    }

    const document = prefetchedDocument;
    const trioStatus = resolveLifecycleStatus(document || {}, trioEventType);

    if (trioStatus === 'settled') {
      if (transaction.status !== 'confirmed') {
        const totalFichas = transaction.fichas_amount + transaction.bonus_amount;

        await client.query(
          `UPDATE transactions
              SET status = 'confirmed',
                  confirmed_at = COALESCE(confirmed_at, NOW()),
                  pix_txid = COALESCE($1, pix_txid),
                  trio_document_id = COALESCE($2, trio_document_id),
                  trio_status = 'settled',
                  trio_receipt_url = COALESCE($3, trio_receipt_url)
            WHERE id = $4`,
          [document?.txid || null, document?.id || null, document?.receipt_url || null, transaction.id]
        );

        const userRes = await client.query(
          `UPDATE users
              SET fichas = fichas + $1,
                  total_spent = total_spent + $2
            WHERE id = $3
            RETURNING id, name, fichas, total_spent`,
          [totalFichas, transaction.value, transaction.user_id]
        );

        await client.query('COMMIT');
        return {
          status: 'confirmed',
          message: `${totalFichas} fichas creditadas com sucesso!`,
          fichasAdded: totalFichas,
          user: userRes.rows[0],
          transactionId: transaction.id,
        };
      }

      const userRes = await client.query(
        'SELECT id, name, fichas, total_spent FROM users WHERE id = $1',
        [transaction.user_id]
      );

      await client.query('COMMIT');
      return {
        status: 'confirmed',
        message: 'Pagamento já confirmado anteriormente.',
        fichasAdded: transaction.fichas_amount + transaction.bonus_amount,
        user: userRes.rows[0],
        transactionId: transaction.id,
      };
    }

    if (trioStatus === 'failed') {
      if (transaction.status === 'pending') {
        await client.query(
          `UPDATE transactions
              SET status = 'cancelled',
                  trio_document_id = COALESCE($1, trio_document_id),
                  trio_status = 'failed',
                  trio_receipt_url = COALESCE($2, trio_receipt_url)
            WHERE id = $3`,
          [document?.id || null, document?.receipt_url || null, transaction.id]
        );
      }

      await client.query('COMMIT');
      return {
        status: 'cancelled',
        message: document?.stages?.at?.(-1)?.error_message || 'O pagamento foi recusado pela Trio.',
        transactionId: transaction.id,
      };
    }

    if (transaction.status === 'pending' && new Date() > new Date(transaction.expires_at)) {
      await client.query(
        `UPDATE transactions
            SET status = 'expired',
                trio_status = COALESCE(trio_status, 'expired')
          WHERE id = $1`,
        [transaction.id]
      );
      await client.query('COMMIT');
      return {
        status: 'expired',
        message: 'A cobrança expirou. Gere um novo pagamento.',
        transactionId: transaction.id,
      };
    }

    await client.query('COMMIT');
    return {
      status: transaction.status,
      message: 'Pagamento ainda não confirmado pela Trio.',
      transactionId: transaction.id,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// POST /payments — cria nova transação PIX na Trio
router.post('/', authenticate, async (req, res) => {
  const { packageId } = req.body;
  if (!packageId) return res.status(400).json({ error: 'packageId é obrigatório.' });
  if (!trio.isConfigured()) {
    return res.status(503).json({
      error: 'Integração Trio não configurada. Defina TRIO_CLIENT_ID, TRIO_CLIENT_SECRET e TRIO_VIRTUAL_ACCOUNT_ID.',
    });
  }

  try {
    const pkgRes = await query(
      'SELECT * FROM packages WHERE id = $1 AND is_active = true',
      [packageId]
    );
    if (!pkgRes.rows[0]) return res.status(404).json({ error: 'Pacote não encontrado.' });

    const pkg = pkgRes.rows[0];
    const transactionId = uuidv4();
    const expirationSeconds = Math.max(360, parseInt(process.env.TRIO_PAYMENT_EXPIRATION_SECONDS || '600', 10));
    const expiresAt = new Date(Date.now() + expirationSeconds * 1000).toISOString();

    const trioResponse = await trio.createDynamicQrCode({
      amountInCents: reaisToCents(pkg.price),
      externalId: transactionId,
      description: `Compra de ${pkg.label} no Play Cacheta`,
      expirationDatetime: expiresAt,
      counterparty: {
        tax_number: formatCPF(req.user.cpf),
        name: req.user.name,
      },
    });

    const qrCode = trioResponse.data;

    const { rows } = await query(
      `INSERT INTO transactions
         (id, user_id, package_id, fichas_amount, bonus_amount, value, status, pix_payload, expires_at,
          trio_qrcode_id, trio_external_id, trio_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10, $11)
       RETURNING id, fichas_amount, bonus_amount, value, status, pix_payload, expires_at, created_at,
                 trio_qrcode_id, trio_external_id, trio_status`,
      [
        transactionId,
        req.user.id,
        pkg.id,
        pkg.fichas,
        pkg.bonus,
        pkg.price,
        qrCode.hash,
        qrCode.expiration_datetime || expiresAt,
        qrCode.id,
        qrCode.external_id || transactionId,
        qrCode.status || 'created',
      ]
    );

    res.status(201).json({
      transaction: rows[0],
      package: pkg,
      provider: {
        name: 'trio',
        environment: trio.getConfig().environment,
        qrCodeId: qrCode.id,
      },
    });
  } catch (err) {
    console.error('Create Trio payment error:', err);
    res.status(500).json({ error: err.message || 'Erro ao criar transação.' });
  }
});

// GET /payments/:id/status — sincroniza o status com a Trio
router.get('/:id/status', authenticate, async (req, res) => {
  try {
    const ownershipRes = await query(
      'SELECT id FROM transactions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!ownershipRes.rows[0]) {
      return res.status(404).json({ error: 'Transação não encontrada.' });
    }

    const result = await syncTransactionStatus(req.params.id);
    if (result.notFound) {
      return res.status(404).json({ error: 'Transação não encontrada.' });
    }

    res.json(result);
  } catch (err) {
    console.error('Sync Trio payment error:', err);
    res.status(500).json({ error: 'Erro ao consultar pagamento.' });
  }
});

// POST /payments/:id/confirm — mantém compatibilidade com o botão manual do app
router.post('/:id/confirm', authenticate, async (req, res) => {
  try {
    const ownershipRes = await query(
      'SELECT id FROM transactions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!ownershipRes.rows[0]) {
      return res.status(404).json({ error: 'Transação não encontrada.' });
    }

    const result = await syncTransactionStatus(req.params.id);
    if (result.notFound) {
      return res.status(404).json({ error: 'Transação não encontrada.' });
    }

    res.json(result);
  } catch (err) {
    console.error('Confirm Trio payment error:', err);
    res.status(500).json({ error: 'Erro ao confirmar pagamento.' });
  }
});

// GET /payments/history — histórico do usuário
router.get('/history', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT t.id, t.fichas_amount, t.bonus_amount, t.value, t.status,
              t.confirmed_at, t.created_at, t.trio_status,
              p.label AS package_label
       FROM transactions t
       LEFT JOIN packages p ON p.id = t.package_id
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ transactions: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar histórico.' });
  }
});

// POST /payments/webhook — recebe confirmação da Trio
router.post('/webhook', async (req, res) => {
  if (!trio.verifyWebhook(req)) {
    return res.status(401).json({ error: 'Webhook Trio inválido.' });
  }

  const event = req.body || {};
  if (event.category !== 'collecting_document') {
    return res.sendStatus(200);
  }

  try {
    const { rows } = await query(
      `SELECT id
         FROM transactions
        WHERE trio_qrcode_id = $1
           OR trio_document_id = $2
           OR trio_external_id = $3
        ORDER BY created_at DESC
        LIMIT 1`,
      [
        event.data?.ref_id || null,
        event.ref_id || null,
        event.data?.external_id || null,
      ]
    );

    if (!rows[0]) {
      console.warn('Webhook Trio sem transação local correspondente:', event.ref_id);
      return res.sendStatus(200);
    }

    await syncTransactionStatus(rows[0].id, {
      trioDocument: event.data,
      trioEventType: event.type,
    });

    res.sendStatus(200);
  } catch (err) {
    console.error('Trio webhook error:', err);
    res.status(500).json({ error: 'Erro ao processar webhook.' });
  }
});

module.exports = router;
