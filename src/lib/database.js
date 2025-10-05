// src/lib/database.js
import mysql from 'mysql2/promise';

let pool;
let activeConnections = 0;
const MAX_CONNECTIONS = 25;

function getPool() {
    if (pool) return pool;

    pool = mysql.createPool({
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: MAX_CONNECTIONS,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
    });

    pool.on('connection', () => {
        activeConnections = Math.min(MAX_CONNECTIONS, activeConnections + 1);
        if (activeConnections > MAX_CONNECTIONS * 0.8) {
            console.warn(`High connection count: ${activeConnections}/${MAX_CONNECTIONS}`);
        }
    });

    pool.on('release', () => {
        activeConnections = Math.max(0, activeConnections - 1);
    });

    pool.on('error', async (err) => {
        console.error('Database pool error:', err);
        if (activeConnections >= MAX_CONNECTIONS) {
            console.error(`Max connections (${MAX_CONNECTIONS}) reached!`);
            try { await pool.end(); } catch (_) { }
            pool = null;
        }
    });

    return pool;
}

export async function testConnection() {
    const p = getPool();
    const conn = await p.getConnection();
    try {
        await conn.ping();
        return true;
    } finally {
        conn.release();
    }
}

export async function executeQuery(query, values = [], retries = 3) {
    let connection;
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const p = getPool();

            if (activeConnections >= MAX_CONNECTIONS) {
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            if (values?.some(v => v === undefined)) {
                throw new Error('Undefined bind parameter detected');
            }

            connection = await p.getConnection();
            const [rows] = await connection.execute(query, values);
            return rows;
        } catch (err) {
            lastError = err;
            console.error(`Query error (attempt ${attempt}/${retries}):`, err.message);
            if (err.code === 'ER_CON_COUNT_ERROR') {
                try { await pool?.end(); } catch (_) { }
                pool = null;
                await new Promise(r => setTimeout(r, 1000 * attempt));
                continue;
            }
            throw err;
        } finally {
            connection?.release();
        }
    }

    throw lastError;
}

export async function queryOne(query, values = []) {
    const rows = await executeQuery(query, values);
    return rows?.[0] ?? null;
}

export async function queryMany(query, values = []) {
    return executeQuery(query, values);
}

export async function executeDirectQuery(query, retries = 3) {
    let connection;
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const p = getPool();

            if (activeConnections >= MAX_CONNECTIONS) {
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            connection = await p.getConnection();
            const [rows] = await connection.query(query);
            return rows;
        } catch (err) {
            lastError = err;
            console.error(`Direct query error (attempt ${attempt}/${retries}):`, err.message);
            if (err.code === 'ER_CON_COUNT_ERROR') {
                try { await pool?.end(); } catch (_) { }
                pool = null;
                await new Promise(r => setTimeout(r, 1000 * attempt));
                continue;
            }
            throw err;
        } finally {
            connection?.release();
        }
    }

    throw lastError;
}

export async function getConnection(timeout = 5000) {
    const p = getPool();

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), timeout)
    );

    const connectionPromise = p.getConnection();

    try {
        return await Promise.race([connectionPromise, timeoutPromise]);
    } catch (err) {
        if (err.message === 'Connection timeout') {
            try { await pool?.end(); } catch (_) { }
            pool = null;
        }
        throw err;
    }
}

export async function cleanup() {
    if (pool) {
        await pool.end();
        pool = null;
        activeConnections = 0;
    }
}

export async function executeInQuery(baseQuery, inValues = [], otherValues = []) {
    if (!inValues?.length) throw new Error('No values provided for IN clause');
    const placeholders = inValues.map(() => '?').join(',');
    const query = baseQuery.replace('?', `(${placeholders})`);
    return executeQuery(query, [...inValues, ...otherValues]);
}

export default getPool;
