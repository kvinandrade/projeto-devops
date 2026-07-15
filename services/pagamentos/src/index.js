const express = require('express');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
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

const SERVICE = 'pagamentos';
const PORT = process.env.PAGAMENTOS_PORT || 3002;
const API_KEY = process.env.PAYMENT_API_KEY || 'demo-payment-key';

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

/**
 * Mock de adquirente: valores com centavos .13 são recusados (para demo de falha).
 */
function autorizar(valor) {
  const cents = Math.round((Number(valor) % 1) * 100);
  if (cents === 13) return 'RECUSADO';
  return 'APROVADO';
}

app.post('/pagamentos', async (req, res) => {
  const { pedidoId, valor } = req.body || {};
  if (!pedidoId || valor == null) {
    return res.status(400).json({ error: 'pedidoId e valor são obrigatórios' });
  }
  if (!API_KEY) {
    return res.status(500).json({ error: 'PAYMENT_API_KEY não configurada' });
  }

  const id = uuidv4();
  const status = autorizar(valor);

  try {
    await pool.query(
      `INSERT INTO pagamentos (id, pedido_id, valor, status, provedor)
       VALUES ($1, $2, $3, $4, 'mock-acquirer')`,
      [id, pedidoId, valor, status]
    );

    logger.info(SERVICE, 'Pagamento processado', {
      traceId: req.trace.traceId,
      pagamentoId: id,
      pedidoId,
      status,
      valor,
    });

    // Simula latência de adquirente externo
    await new Promise((r) => setTimeout(r, 80));

    res.status(201).json({
      id,
      pedidoId,
      valor: Number(valor),
      status,
      provedor: 'mock-acquirer',
      traceId: req.trace.traceId,
    });
  } catch (err) {
    logger.error(SERVICE, 'Falha no pagamento', { error: err.message, traceId: req.trace?.traceId });
    res.status(500).json({ error: err.message });
  }
});

app.get('/pagamentos/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM pagamentos WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Pagamento não encontrado' });
    const p = rows[0];
    res.json({
      id: p.id,
      pedidoId: p.pedido_id,
      valor: Number(p.valor),
      status: p.status,
      provedor: p.provedor,
      createdAt: p.created_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  logger.info(SERVICE, `Serviço de Pagamentos ouvindo na porta ${PORT}`);
});
