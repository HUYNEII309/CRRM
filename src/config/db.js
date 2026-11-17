const sql = require('mssql');

let pool = null;

/**
 * Build mssql configuration from environment variables (or override object).
 */
function buildSqlConfig(overrides = {}) {
  const host = overrides.host ?? process.env.DB_HOST ?? 'localhost';
  const instance = overrides.instance ?? process.env.DB_INSTANCE ?? '';
  const portRaw = overrides.port ?? process.env.DB_PORT ?? '1433';

  const dbName = overrides.database !== undefined ? overrides.database : process.env.DB_NAME;

  const config = {
    server: host,
    ...(dbName && String(dbName).trim() !== '' ? { database: String(dbName).trim() } : {}),
    user: overrides.user ?? process.env.DB_USER ?? 'sa',
    password: overrides.password ?? process.env.DB_PASSWORD ?? '',
    connectionTimeout: Number(process.env.DB_CONNECTION_TIMEOUT || 15000),
    requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT || 30000),
    pool: {
      max: Number(process.env.DB_POOL_MAX || 10),
      min: Number(process.env.DB_POOL_MIN || 0),
      idleTimeoutMillis: 30000,
    },
    options: {
      encrypt: String(overrides.encrypt ?? process.env.DB_ENCRYPT ?? 'false').toLowerCase() === 'true',
      trustServerCertificate:
        String(overrides.trustServerCertificate ?? process.env.DB_TRUST_SERVER_CERTIFICATE ?? 'true').toLowerCase() === 'true',
      enableArithAbort: true,
      cryptoCredentialsDetails: {
        minVersion: 'TLSv1',
        ciphers: 'DEFAULT@SECLEVEL=0',
      },
    },
  };

  if (instance && String(instance).trim() !== '') {
    config.options.instanceName = String(instance).trim();
  } else if (portRaw) {
    config.port = Number(portRaw);
  }

  return config;
}

/**
 * Get or initialize the shared SQL Server connection pool.
 */
async function getPool() {
  if (pool && pool.connected) {
    return pool;
  }
  if (pool) {
    try {
      await pool.close();
    } catch (_) {
      // ignore close errors on broken pool
    }
    pool = null;
  }

  const config = buildSqlConfig();
  pool = await new sql.ConnectionPool(config).connect();
  pool.on('error', (err) => {
    console.error('[SQL Pool Error]', err.message);
    pool = null;
  });

  // Tự động kiểm tra và khởi tạo các Stored Procedure cốt lõi (tblchamsockhachhang_Delete, tblkhachhang_Delete)
  try {
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tblchamsockhachhang_Delete]') AND type in (N'P', N'PC'))
      BEGIN
        EXEC('CREATE PROCEDURE [dbo].[tblchamsockhachhang_Delete]
          @idchamsockhachhang varchar(12)
        AS
        BEGIN
          SET NOCOUNT ON;
          DELETE FROM dbo.tbltasklist WHERE idchamsockhachhang = @idchamsockhachhang;
          DELETE FROM dbo.tbldauvieccodinh WHERE idchamsockhachhang = @idchamsockhachhang;
          DELETE FROM dbo.tblImage WHERE idchamsockhachhang = @idchamsockhachhang;
          DELETE FROM dbo.tblchamsockhachhang WHERE idchamsockhachhang = @idchamsockhachhang;
        END');
      END;

      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tblkhachhang_Delete]') AND type in (N'P', N'PC'))
      BEGIN
        EXEC('CREATE PROCEDURE [dbo].[tblkhachhang_Delete]
          @idkhachhang varchar(12)
        AS
        BEGIN
          SET NOCOUNT ON;
          DELETE FROM dbo.tbllichhen WHERE idkhachhang = @idkhachhang;
          DELETE FROM dbo.tbltasklist WHERE idkhachhang = @idkhachhang;
          DELETE FROM dbo.tbldauvieccodinh WHERE idkhachhang = @idkhachhang;
          DELETE FROM dbo.tblImage WHERE idchamsockhachhang IN (SELECT idchamsockhachhang FROM dbo.tblchamsockhachhang WHERE idkhachhang = @idkhachhang);
          DELETE FROM dbo.tblchamsockhachhang WHERE idkhachhang = @idkhachhang;
          DELETE FROM dbo.tblkhachhang WHERE idkhachhang = @idkhachhang;
        END');
      END;
    `);
  } catch (_) {}

  return pool;
}

/**
 * Reset the current pool (used when updating .env / connection settings at runtime).
 */
async function resetPool() {
  if (pool) {
    try {
      await pool.close();
    } catch (_) {
      // ignore
    }
    pool = null;
  }
}

/**
 * Test a SQL Server connection with optional custom config.
 */
async function testConnection(overrides = {}) {
  const testConfig = buildSqlConfig(overrides);
  const tempPool = new sql.ConnectionPool(testConfig);
  try {
    await tempPool.connect();
    const result = await tempPool.request().query('SELECT DB_NAME() AS dbName, @@SERVERNAME AS serverName, GETDATE() AS serverTime');
    return {
      ok: true,
      info: result.recordset[0],
    };
  } finally {
    try {
      await tempPool.close();
    } catch (_) {
      // ignore
    }
  }
}

module.exports = {
  sql,
  buildSqlConfig,
  getPool,
  resetPool,
  testConnection,
};
