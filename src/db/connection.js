// MySQL connection pool and small query helpers used by every other db file.
// Connection details come from .env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).
const mysql = require("mysql2/promise");

let pool = null;

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value && name !== "DB_PASSWORD") {
    const error = new Error(`Set ${name} in the .env file.`);
    error.status = 500;
    throw error;
  }
  return value;
}

function createPool() {
  return mysql.createPool({
    host: requiredEnv("DB_HOST"),
    port: Number(process.env.DB_PORT) || 3306,
    user: requiredEnv("DB_USER"),
    password: process.env.DB_PASSWORD == null ? "" : String(process.env.DB_PASSWORD),
    database: requiredEnv("DB_NAME"),
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: Number(process.env.DB_QUEUE_LIMIT) || 0,
    namedPlaceholders: false,
    dateStrings: true,
    charset: "utf8mb4",
  });
}

function connect() {
  if (!pool) pool = createPool();
  return pool;
}

function getPool() {
  if (!pool) {
    const error = new Error("Database is not ready.");
    error.status = 500;
    throw error;
  }
  return pool;
}

// Returns all rows.
async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

// Returns the first row or null.
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

// For INSERT / UPDATE / DELETE. Returns { insertId, affectedRows, ... }.
async function execute(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

// Runs several statements together: all succeed, or none are saved.
async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const api = {
      query: async (sql, params = []) => {
        const [rows] = await connection.query(sql, params);
        return rows;
      },
      execute: async (sql, params = []) => {
        const [result] = await connection.execute(sql, params);
        return result;
      },
    };
    const value = await work(api);
    await connection.commit();
    return value;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function count(sql, params = []) {
  const row = await queryOne(sql, params);
  return Number(row?.count || 0);
}

module.exports = { connect, getPool, query, queryOne, execute, withTransaction, count };
