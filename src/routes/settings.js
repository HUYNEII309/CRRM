const express = require('express');
const fs = require('fs');
const path = require('path');
const { testConnection, resetPool } = require('../config/db');

const router = express.Router();
const ENV_PATH = path.resolve(process.cwd(), '.env');

router.get('/db', async (req, res) => {
  const currentConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || '1433',
    instance: process.env.DB_INSTANCE || '',
    database: process.env.DB_NAME ?? '',
    user: process.env.DB_USER || 'sa',
    hasPassword: Boolean(process.env.DB_PASSWORD),
    encrypt: String(process.env.DB_ENCRYPT || 'false').toLowerCase() === 'true',
    trustServerCertificate: String(process.env.DB_TRUST_SERVER_CERTIFICATE || 'true').toLowerCase() === 'true',
  };

  try {
    const status = await testConnection();
    return res.json({ config: currentConfig, connected: true, info: status.info });
  } catch (err) {
    return res.json({ config: currentConfig, connected: false, error: err.message });
  }
});

router.post('/db/test', async (req, res) => {
  const { host, port, instance, database, user, password, encrypt, trustServerCertificate } = req.body || {};
  try {
    const result = await testConnection({
      host,
      port,
      instance,
      database,
      user,
      password: password !== undefined && password !== '' ? password : process.env.DB_PASSWORD,
      encrypt,
      trustServerCertificate,
    });
    return res.json({ ok: true, message: 'Kết nối SQL Server thành công!', info: result.info });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

router.post('/db/save', async (req, res) => {
  const { host, port, instance, database, user, password, encrypt, trustServerCertificate } = req.body || {};
  const finalPassword = password !== undefined && password !== '' ? password : process.env.DB_PASSWORD || '';

  const envMap = {
    PORT: process.env.PORT || '3000',
    JWT_SECRET: process.env.JWT_SECRET || 'crmplus_secret_key_change_me_in_production',
    DB_HOST: host || 'localhost',
    DB_PORT: instance ? '' : String(port || '1433'),
    DB_INSTANCE: instance || '',
    DB_NAME: database || '',
    DB_USER: user || 'sa',
    DB_PASSWORD: finalPassword,
    DB_ENCRYPT: String(Boolean(encrypt)),
    DB_TRUST_SERVER_CERTIFICATE: String(trustServerCertificate !== false),
    DB_POOL_MAX: process.env.DB_POOL_MAX || '10',
    DB_POOL_MIN: process.env.DB_POOL_MIN || '0',
    DB_CONNECTION_TIMEOUT: process.env.DB_CONNECTION_TIMEOUT || '15000',
    DB_REQUEST_TIMEOUT: process.env.DB_REQUEST_TIMEOUT || '30000',
  };

  try {
    const testResult = await testConnection({
      host: envMap.DB_HOST,
      port: envMap.DB_PORT,
      instance: envMap.DB_INSTANCE,
      database: envMap.DB_NAME,
      user: envMap.DB_USER,
      password: envMap.DB_PASSWORD,
      encrypt: envMap.DB_ENCRYPT,
      trustServerCertificate: envMap.DB_TRUST_SERVER_CERTIFICATE,
    });

    const lines = Object.entries(envMap).map(([k, v]) => `${k}=${v}`);
    fs.writeFileSync(ENV_PATH, `${lines.join('\n')}\n`, 'utf8');

    Object.entries(envMap).forEach(([k, v]) => {
      process.env[k] = v;
    });
    await resetPool();

    return res.json({
      ok: true,
      message: 'Đã lưu cấu hình vào .env và kết nối SQL Server thành công!',
      info: testResult.info,
    });
  } catch (err) {
    return res.status(400).json({
      ok: false,
      error: `Không thể kết nối với cấu hình mới: ${err.message}`,
    });
  }
});

module.exports = router;
