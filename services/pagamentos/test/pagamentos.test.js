const { test } = require('node:test');
const assert = require('node:assert/strict');

function autorizar(valor) {
  const cents = Math.round((Number(valor) % 1) * 100);
  if (cents === 13) return 'RECUSADO';
  return 'APROVADO';
}

test('aprova valores comuns', () => {
  assert.equal(autorizar(99.9), 'APROVADO');
  assert.equal(autorizar(10), 'APROVADO');
});

test('recusa valor com centavos .13', () => {
  assert.equal(autorizar(50.13), 'RECUSADO');
});
