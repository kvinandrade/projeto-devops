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
const { tracingMiddleware, outboundHeaders } = loadShared('tracing');

const SERVICE = 'pedidos';
const PORT = process.env.PEDIDOS_PORT || 3001;
const ESTOQUE_URL = process.env.ESTOQUE_URL || 'http://estoque:3003';
const PAGAMENTOS_URL = process.env.PAGAMENTOS_URL || 'http://pagamentos:3002';

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

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: SERVICE });
  } catch (err) {
    res.status(503).json({ status: 'degraded', service: SERVICE, error: err.message });
  }
});

app.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
});

async function callService(url, options, req) {
  const res = await fetch(url, {
    ...options,
    headers: { ...outboundHeaders(req), ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(body.error || `Falha em ${url}`);
    error.status = res.status;
    error.body = body;
    throw error;
  }
  return body;
}

app.post('/pedidos', async (req, res) => {
  const { clienteId, itens } = req.body || {};
  if (!clienteId || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: 'clienteId e itens são obrigatórios' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reserva = await callService(
      `${ESTOQUE_URL}/estoque/reservar`,
      { method: 'POST', body: JSON.stringify({ itens }) },
      req
    );

    const valorTotal = reserva.valorTotal;
    const pedidoId = uuidv4();

    await client.query(
      `INSERT INTO pedidos (id, cliente_id, itens, valor_total, status)
       VALUES ($1, $2, $3::jsonb, $4, 'AGUARDANDO_PAGAMENTO')`,
      [pedidoId, clienteId, JSON.stringify(itens), valorTotal]
    );

    const pagamento = await callService(
      `${PAGAMENTOS_URL}/pagamentos`,
      {
        method: 'POST',
        body: JSON.stringify({ pedidoId, valor: valorTotal }),
      },
      req
    );

    const statusFinal = pagamento.status === 'APROVADO' ? 'CONFIRMADO' : 'PAGAMENTO_RECUSADO';

    if (statusFinal === 'CONFIRMADO') {
      await callService(
        `${ESTOQUE_URL}/estoque/baixar`,
        { method: 'POST', body: JSON.stringify({ itens, pedidoId }) },
        req
      );
    } else {
      await callService(
        `${ESTOQUE_URL}/estoque/liberar`,
        { method: 'POST', body: JSON.stringify({ itens }) },
        req
      );
    }

    await client.query(
      `UPDATE pedidos SET status = $1, pagamento_id = $2, updated_at = NOW() WHERE id = $3`,
      [statusFinal, pagamento.id, pedidoId]
    );
    await client.query('COMMIT');

    logger.info(SERVICE, 'Pedido processado', {
      traceId: req.trace.traceId,
      pedidoId,
      statusFinal,
      valorTotal,
    });

    res.status(201).json({
      id: pedidoId,
      status: statusFinal,
      valorTotal,
      pagamentoId: pagamento.id,
      traceId: req.trace.traceId,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(SERVICE, 'Falha ao criar pedido', {
      traceId: req.trace?.traceId,
      error: err.message,
    });
    res.status(err.status || 500).json({ error: err.message, traceId: req.trace?.traceId });
  } finally {
    client.release();
  }
});

app.get('/pedidos/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM pedidos WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Pedido não encontrado' });
    const p = rows[0];
    res.json({
      id: p.id,
      clienteId: p.cliente_id,
      itens: p.itens,
      valorTotal: Number(p.valor_total),
      status: p.status,
      pagamentoId: p.pagamento_id,
      createdAt: p.created_at,
      traceId: req.trace.traceId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/pedidos', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, cliente_id, valor_total, status, created_at FROM pedidos ORDER BY created_at DESC LIMIT 50'
    );
    res.json({
      items: rows.map((p) => ({
        id: p.id,
        clienteId: p.cliente_id,
        valorTotal: Number(p.valor_total),
        status: p.status,
        createdAt: p.created_at,
      })),
      traceId: req.trace.traceId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  logger.info(SERVICE, `Serviço de Pedidos ouvindo na porta ${PORT}`);
});
