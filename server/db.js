const { Pool } = require("pg");

let pool = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function query(text, params = []) {
  const p = getPool();
  if (!p) throw new Error("DATABASE_URL is not configured");
  return p.query(text, params);
}

module.exports = { getPool, query };
