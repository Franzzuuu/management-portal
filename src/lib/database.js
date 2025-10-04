import mysql from 'mysql2/promise';

// Track active connections
let activeConnections = 0;
const MAX_CONNECTIONS = 25; // Lower than MySQL max_connections
let pool;

function getPool() {
    if (pool) return pool;

    pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: MAX_CONNECTIONS,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
    });

    // Enhanced connection monitoring
    pool.on('connection', () => {
        activeConnections = Math.min(MAX_CONNECTIONS, activeConnections + 1);
        // Only log if connections are getting high
        if (activeConnections > MAX_CONNECTIONS * 0.8) { // Log when over 80% capacity
            console.warn(`High connection count: ${activeConnections}/${MAX_CONNECTIONS}`);
        }
    });

    pool.on('release', () => {
        activeConnections = Math.max(0, activeConnections - 1);
    });

    pool.on('error', (err) => {
        console.error('Database pool error:', err);
        if (activeConnections >= MAX_CONNECTIONS) {
            console.error(`Max connections (${MAX_CONNECTIONS}) reached!`);
            // Force cleanup of idle connections
            pool.end().catch(console.error);
            pool = null; // Reset pool to force recreation
        }
    });

    return pool;
}

// Execute query with connection cleanup
export async function executeQuery(query, values = [], retries = 3) {
    let connection;
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            if (!pool) {
                pool = getPool();
            }

            // Check for too many connections
            if (activeConnections >= MAX_CONNECTIONS) {
                console.warn('Too many connections, waiting for cleanup...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }

            // Validate parameters
            if (values.some(v => v === undefined)) {
                throw new Error('Undefined bind parameter detected');
            }

            connection = await pool.getConnection();
            const [results] = await connection.execute(query, values);
            return results;

        } catch (error) {
            lastError = error;
            console.error(`Query error (attempt ${attempt}/${retries}):`, error.message);

            if (error.code === 'ER_CON_COUNT_ERROR') {
                // Force pool cleanup and recreation
                if (pool) {
                    await pool.end().catch(console.error);
                    pool = null;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                continue;
            }
            throw error;

        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    throw lastError;
}

// Simplified queryOne function
export async function queryOne(query, values = []) {
    const results = await executeQuery(query, values);
    return results?.[0] || null;
}

// Simplified queryMany function
export async function queryMany(query, values = []) {
    return await executeQuery(query, values);
}

// Get connection with timeout
export async function getConnection(timeout = 5000) {
    if (!pool) {
        pool = getPool();
    }

    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), timeout);
    });

    const connectionPromise = pool.getConnection();

    try {
        const connection = await Promise.race([connectionPromise, timeoutPromise]);
        return connection;
    } catch (error) {
        if (error.message === 'Connection timeout') {
            // Force pool cleanup on timeout
            if (pool) {
                await pool.end().catch(console.error);
                pool = null;
            }
        }
        throw error;
    }
}

// Cleanup function for graceful shutdown
export async function cleanup() {
    if (pool) {
        await pool.end();
        pool = null;
        activeConnections = 0;
    }
}

export default getPool;