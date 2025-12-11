// src/lib/database.js
import mysql from 'mysql2/promise';

let pool;
let isPoolClosing = false;
const MAX_CONNECTIONS = 10; // Reduced from 25 to prevent exhaustion
const CONNECTION_TIMEOUT = 10000; // 10 seconds

function getPool() {
    if (isPoolClosing) {
        throw new Error('Pool is being closed, please retry');
    }

    if (pool) return pool;

    pool = mysql.createPool({
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: MAX_CONNECTIONS,
        maxIdle: MAX_CONNECTIONS, // Max idle connections
        idleTimeout: 60000, // Close idle connections after 60s
        queueLimit: 0, // Unlimited queue
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        connectTimeout: CONNECTION_TIMEOUT,
    });

    pool.on('error', (err) => {
        console.error('Database pool error:', err);
        // Don't close pool on error, let it recover
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

            if (values?.some(v => v === undefined)) {
                throw new Error('Undefined bind parameter detected');
            }

            connection = await p.getConnection();
            const [rows] = await connection.execute(query, values);
            return rows;
        } catch (err) {
            lastError = err;
            console.error(`Query error (attempt ${attempt}/${retries}):`, err.message);
            
            // Handle specific error codes
            if (err.code === 'ER_CON_COUNT_ERROR' || err.code === 'ECONNREFUSED' || err.message?.includes('Too many connections')) {
                console.warn('Connection pool exhausted, waiting before retry...');
                await new Promise(r => setTimeout(r, 1000 * attempt));
                continue;
            }
            
            // For other errors, throw immediately
            if (attempt === retries) {
                throw lastError;
            }
            
            await new Promise(r => setTimeout(r, 500 * attempt));
        } finally {
            if (connection) {
                try {
                    connection.release();
                } catch (releaseErr) {
                    console.error('Error releasing connection:', releaseErr);
                }
            }
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
            connection = await p.getConnection();
            const [rows] = await connection.query(query);
            return rows;
        } catch (err) {
            lastError = err;
            console.error(`Direct query error (attempt ${attempt}/${retries}):`, err.message);
            
            // Handle specific error codes
            if (err.code === 'ER_CON_COUNT_ERROR' || err.code === 'ECONNREFUSED' || err.message?.includes('Too many connections')) {
                console.warn('Connection pool exhausted, waiting before retry...');
                await new Promise(r => setTimeout(r, 1000 * attempt));
                continue;
            }
            
            // For other errors, throw immediately
            if (attempt === retries) {
                throw lastError;
            }
            
            await new Promise(r => setTimeout(r, 500 * attempt));
        } finally {
            if (connection) {
                try {
                    connection.release();
                } catch (releaseErr) {
                    console.error('Error releasing connection:', releaseErr);
                }
            }
        }
    }

    throw lastError;
}

export async function getConnection(timeout = 10000) {
    const p = getPool();

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), timeout)
    );

    const connectionPromise = p.getConnection();

    try {
        const connection = await Promise.race([connectionPromise, timeoutPromise]);
        return connection;
    } catch (err) {
        console.error('Failed to get connection:', err.message);
        throw err;
    }
}

export async function cleanup() {
    if (pool && !isPoolClosing) {
        isPoolClosing = true;
        try {
            await pool.end();
            console.log('Database pool closed successfully');
        } catch (err) {
            console.error('Error closing pool:', err);
        } finally {
            pool = null;
            isPoolClosing = false;
        }
    }
}

export async function executeInQuery(baseQuery, inValues = [], otherValues = []) {
    if (!inValues?.length) throw new Error('No values provided for IN clause');
    const placeholders = inValues.map(() => '?').join(',');
    const query = baseQuery.replace('?', `(${placeholders})`);
    return executeQuery(query, [...inValues, ...otherValues]);
}

export default getPool;
