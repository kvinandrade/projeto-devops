const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
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

const SERVICE = 'api-gateway';
const PORT = process.env.GATEWAY_PORT || 8080;
const PEDIDOS_URL = process.env.PEDIDOS_URL || 'http://pedidos:3001';
const ESTOQUE_URL = process.env.ESTOQUE_URL || 'http://estoque:3003';
const PAGAMENTOS_URL = process.env.PAGAMENTOS_URL || 'http://pagamentos:3002';

const app = express();
app.use(tracingMiddleware(SERVICE));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: SERVICE,
    upstreams: { pedidos: PEDIDOS_URL, estoque: ESTOQUE_URL, pagamentos: PAGAMENTOS_URL },
  });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true });
});

app.get('/', (_req, res) => {
  res.json({
    name: 'Pedidos Veloz API Gateway',
    empresa: 'Loja Veloz',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      pedidos: 'POST /api/pedidos | GET /api/pedidos | GET /api/pedidos/:id',
      estoque: 'GET /api/estoque',
      pagamentos: 'GET /api/pagamentos/:id',
    },
  });
});

function proxyTo(target, upstreamPrefix) {
  // Express remove o prefixo do mount; remontamos para o path do microsserviço.
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => {
      if (!path || path === '/') return upstreamPrefix;
      return `${upstreamPrefix}${path}`;
    },
    on: {
      proxyReq: (proxyReq, req) => {
        const headers = outboundHeaders(req);
        Object.entries(headers).forEach(([k, v]) => proxyReq.setHeader(k, v));
        logger.info(SERVICE, 'Proxy request', {
          traceId: req.trace?.traceId,
          method: req.method,
          path: req.url,
          target,
        });
      },
    },
  });
}

app.use('/api/pedidos', proxyTo(PEDIDOS_URL, '/pedidos'));
app.use('/api/estoque', proxyTo(ESTOQUE_URL, '/estoque'));
app.use('/api/pagamentos', proxyTo(PAGAMENTOS_URL, '/pagamentos'));
app.use((err, req, res, _next) => {
  logger.error(SERVICE, 'Erro no gateway', { error: err.message, traceId: req.trace?.traceId });
  res.status(502).json({ error: 'Bad gateway', detail: err.message });
});

app.listen(PORT, () => {
  logger.info(SERVICE, `API Gateway ouvindo na porta ${PORT}`);
});
