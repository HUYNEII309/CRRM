const { sql } = require('../config/db');

/**
 * Generate a 12-character ID compatible with CRMPLUSDB varchar(12) primary keys.
 * Format: YYYYMMDD + 4-digit sequence (e.g. 202611130001), matching SelectEnd pattern.
 */
async function generateNextId(pool, tableName, pkColumn, prefixOverride = null) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const prefix = prefixOverride || `${yyyy}${mm}${dd}`;

  const query = `
    SELECT TOP 1 [${pkColumn}] AS lastId
    FROM [dbo].[${tableName}]
    WHERE [${pkColumn}] LIKE @prefix + '%'
    ORDER BY [${pkColumn}] DESC
  `;

  const result = await pool.request().input('prefix', sql.VarChar(12), prefix).query(query);
  const lastId = result.recordset[0]?.lastId;

  let nextSeq = 1;
  if (lastId && lastId.length > prefix.length) {
    const suffix = lastId.slice(prefix.length);
    const parsed = parseInt(suffix, 10);
    if (!Number.isNaN(parsed)) {
      nextSeq = parsed + 1;
    }
  }

  const seqWidth = Math.max(12 - prefix.length, 1);
  return `${prefix}${String(nextSeq).padStart(seqWidth, '0')}`.slice(0, 12);
}

module.exports = {
  generateNextId,
};
