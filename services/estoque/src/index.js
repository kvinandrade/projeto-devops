const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

function loadShared(name) {
  const candidates = [
    path.join(__dirname, '../../shared', name),
    path.join(__dirname, '../shared', name),
  ];
  for (const c of candidates) {
    if (fs.existsSync(`${c}.js`)) return require(c);
  }
  throw new Error(`shared/${name} não encontrado`);
}

const logger = loadShared('logger');
const { tracingMiddleware } = loadShared('tracing');

const SERVICE = 'estoque';
const PORT = process.env.ESTOQUE_PORT || 3003;

const PRECOS = {
  'SKU-CAMISA-P': 49.9,
  'SKU-CAMISA-M': 49.9,
  'SKU-TENIS-42': 199.9,
  'SKU-MOCHILA': 129.9,
};

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER || 'pedidos',
  password: process.env.POSTGRES_PASSWORD || 'pedidos_secret',
  database: process.env.POSTGRES_DB || 'pedidos_veloz',
});

const app = express();
app.use(express.json());
app.use(tracingMiddleware(SERVICE));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: SERVICE });
});

app.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
});

app.get('/estoque', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT sku, nome, quantidade FROM estoque ORDER BY sku');
    res.json({
      items: rows.map((r) => ({
        sku: r.sku,
        nome: r.nome,
        quantidade: r.quantidade,
        preco: PRECOS[r.sku] || 0,
      })),
      traceId: req.trace.traceId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/estoque/reservar', async (req, res) => {
  const { itens } = req.body || {};
  if (!Array.isArray(itens) || !itens.length) {
    return res.status(400).json({ error: 'itens é obrigatório' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let valorTotal = 0;

    for (const item of itens) {
      const { sku, quantidade } = item;
      if (!sku || !quantidade || quantidade < 1) {
        throw Object.assign(new Error('Item inválido'), { status: 400 });
      }
      const { rows } = await client.query(
        'SELECT quantidade FROM estoque WHERE sku = $1 FOR UPDATE',
        [sku]
      );
      if (!rows.length) {
        throw Object.assign(new Error(`SKU não encontrado: ${sku}`), { status: 404 });
      }
      if (rows[0].quantidade < quantidade) {
        throw Object.assign(new Error(`Estoque insuficiente para ${sku}`), { status: 409 });
      }
      await client.query(
        'UPDATE estoque SET quantidade = quantidade - $1, updated_at = NOW() WHERE sku = $2',
        [quantidade, sku]
      );
      valorTotal += (PRECOS[sku] || 0) * quantidade;
    }

    await client.query('COMMIT');
    logger.info(SERVICE, 'Estoque reservado', { traceId: req.trace.traceId, itens, valorTotal });
    res.json({ reservado: true, valorTotal: Number(valorTotal.toFixed(2)), traceId: req.trace.traceId });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.warn(SERVICE, 'Falha na reserva', { error: err.message, traceId: req.trace?.traceId });
    res.status(err.status || 500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/estoque/liberar', async (req, res) => {
  const { itens } = req.body || {};
  if (!Array.isArray(itens)) return res.status(400).json({ error: 'itens é obrigatório' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const { sku, quantidade } of itens) {
      await client.query(
        'UPDATE estoque SET quantidade = quantidade + $1, updated_at = NOW() WHERE sku = $2',
        [quantidade, sku]
      );
    }
    await client.query('COMMIT');
    logger.info(SERVICE, 'Estoque liberado', { traceId: req.trace.traceId, itens });
    res.json({ liberado: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/estoque/baixar', async (req, res) => {
  // Reserva já debitou; baixa confirma a venda (idempotente para MVP)
  const { pedidoId } = req.body || {};
  logger.info(SERVICE, 'Baixa confirmada', { traceId: req.trace.traceId, pedidoId });
  res.json({ baixado: true, pedidoId });
});

app.listen(PORT, () => {
  logger.info(SERVICE, `Serviço de Estoque ouvindo na porta ${PORT}`);
});
