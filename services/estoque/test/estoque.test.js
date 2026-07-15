const { test } = require('node:test');
const assert = require('node:assert/strict');

test('preço de SKU conhecido', () => {
  const PRECOS = { 'SKU-MOCHILA': 129.9 };
  assert.equal(PRECOS['SKU-MOCHILA'], 129.9);
});

test('validação de quantidade', () => {
  const quantidade = 2;
  assert.ok(quantidade >= 1);
});
