function log(level, service, message, meta = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    service,
    message,
    ...meta,
  };
  // 12-Factor: logs como stream stdout
  console.log(JSON.stringify(entry));
}

module.exports = {
  info: (service, message, meta) => log('info', service, message, meta),
  warn: (service, message, meta) => log('warn', service, message, meta),
  error: (service, message, meta) => log('error', service, message, meta),
};
