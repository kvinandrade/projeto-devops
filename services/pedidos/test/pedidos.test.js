const { test } = require('node:test');
const assert = require('node:assert/strict');

test('valida payload mínimo de pedido', () => {
  const payload = { clienteId: 'cli-1', itens: [{ sku: 'SKU-MOCHILA', quantidade: 1 }] };
  assert.ok(payload.clienteId);
  assert.ok(Array.isArray(payload.itens) && payload.itens.length > 0);
});

test('status finais conhecidos', () => {
  const status = ['CONFIRMADO', 'PAGAMENTO_RECUSADO', 'AGUARDANDO_PAGAMENTO'];
  assert.equal(status.includes('CONFIRMADO'), true);
});
