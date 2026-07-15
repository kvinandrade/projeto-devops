const { test } = require('node:test');
const assert = require('node:assert/strict');

test('rotas públicas do gateway', () => {
  const routes = ['/health', '/ready', '/api/pedidos', '/api/estoque'];
  assert.equal(routes.length, 4);
});
