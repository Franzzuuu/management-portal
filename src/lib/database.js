import mysql from 'mysql2/promise';

// Create connection pool for better performance
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Test database connection
export async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// Execute query function
export async function executeQuery(query, values = []) {
    try {
        const [results] = await pool.execute(query, values);
        return results;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

// Get single record
export async function queryOne(query, values = []) {
    const results = await executeQuery(query, values);
    return results[0] || null;
}

// Get multiple records
export async function queryMany(query, values = []) {
    return await executeQuery(query, values);
}

export default pool;