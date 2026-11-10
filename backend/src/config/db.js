const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { Pool } = require('pg');

const connectionString =
  process.env.DATABASE_URL ||
  process.env.DATABASE_PUBLIC_URL ||
  process.env.POSTGRES_URL ||
  '';

const host = process.env.DB_HOST || process.env.PGHOST || 'localhost';
const port = parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10);
const user = process.env.DB_USER || process.env.PGUSER || 'postgres';
const password = process.env.DB_PASSWORD || process.env.PGPASSWORD || 'root';
const database = process.env.DB_NAME || process.env.PGDATABASE || 'db_catalogo';

const isLocalHost =
  !connectionString &&
  (host === 'localhost' || host === '127.0.0.1' || host === '::1');

const isInternalRailway =
  (connectionString && connectionString.includes('.railway.internal')) ||
  host.includes('.railway.internal');

const useSsl =
  process.env.DB_SSL === 'true'
    ? true
    : process.env.DB_SSL === 'false'
    ? false
    : !isLocalHost && !isInternalRailway;

// Limpiar parámetros sslmode de la URL cuando pasamos configuración SSL explícita en pg
function normalizeConnectionString(urlStr) {
  if (!urlStr) return '';
  try {
    const parsed = new URL(urlStr);
    if (useSsl && parsed.searchParams.has('sslmode')) {
      parsed.searchParams.delete('sslmode');
      parsed.searchParams.delete('channel_binding');
    }
    return parsed.toString();
  } catch {
    return urlStr;
  }
}

const poolConfig = connectionString
  ? {
      connectionString: normalizeConnectionString(connectionString),
      ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    }
  : {
      host,
      port,
      user,
      password,
      database,
      ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    };

const pool = new Pool(poolConfig);

const dbConfig = {
  host,
  port,
  user,
  password,
  database,
  isCloudDb: !isLocalHost,
  useSsl,
};

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err.message);
});

module.exports = {
  pool,
  dbConfig,
};
