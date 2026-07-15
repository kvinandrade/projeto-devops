const path = require('path');
const fs = require('fs');

function resolveShared(moduleName) {
  const candidates = [
    path.join(__dirname, '../../shared', moduleName),
    path.join(__dirname, '../shared', moduleName),
    path.join('/app/shared', moduleName),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(`${candidate}.js`)) return require(candidate);
  }
  throw new Error(`Módulo shared não encontrado: ${moduleName}`);
}

module.exports = { resolveShared };
