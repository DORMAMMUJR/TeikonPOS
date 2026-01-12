require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkShifts() {
    try {
        console.log('🔍 Connecting to DB to check shifts...');
        const res = await pool.query('SELECT id, store_id, opened_by, status, start_time FROM shifts ORDER BY start_time DESC LIMIT 5');
        console.log('📋 Recent Shifts found:', res.rows.length);
        console.table(res.rows);
    } catch (err) {
        console.error('❌ Error querying shifts:', err);
    } finally {
        pool.end();
    }
}

checkShifts();
