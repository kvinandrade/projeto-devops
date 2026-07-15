/**
 * Tracing distribuído (OpenTelemetry-ready).
 * Em produção, substitua por @opentelemetry/sdk-node + OTLP exporter.
 * Aqui geramos/propagamos traceparent W3C para correlacionar logs entre serviços.
 */
const { randomBytes } = require('crypto');

function newTraceId() {
  return randomBytes(16).toString('hex');
}

function newSpanId() {
  return randomBytes(8).toString('hex');
}

function extractOrCreateTrace(req) {
  const incoming = req.headers.traceparent;
  if (incoming && typeof incoming === 'string') {
    const parts = incoming.split('-');
    if (parts.length >= 3) {
      return { traceId: parts[1], parentSpanId: parts[2], spanId: newSpanId() };
    }
  }
  return { traceId: newTraceId(), parentSpanId: null, spanId: newSpanId() };
}

function buildTraceparent(traceId, spanId) {
  return `00-${traceId}-${spanId}-01`;
}

function tracingMiddleware(serviceName) {
  return (req, res, next) => {
    const ctx = extractOrCreateTrace(req);
    req.trace = ctx;
    req.serviceName = serviceName;
    res.setHeader('traceparent', buildTraceparent(ctx.traceId, ctx.spanId));
    res.setHeader('x-trace-id', ctx.traceId);
    next();
  };
}

function outboundHeaders(req) {
  const ctx = req.trace || { traceId: newTraceId(), spanId: newSpanId() };
  return {
    'Content-Type': 'application/json',
    traceparent: buildTraceparent(ctx.traceId, ctx.spanId),
    'x-trace-id': ctx.traceId,
  };
}

module.exports = {
  tracingMiddleware,
  outboundHeaders,
  buildTraceparent,
  newTraceId,
};
