require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const userId = 'ea143929-c9e8-4221-8289-40822602758f'; // ID tomado del log anterior (aproximado, necesito el real)

async function checkUser() {
    try {
        // Primero obtengo el ID exacto del último turno para no equivocarme
        const shiftRes = await pool.query('SELECT opened_by, store_id FROM shifts ORDER BY start_time DESC LIMIT 1');
        if (shiftRes.rows.length === 0) {
            console.log('No shifts found');
            return;
        }

        const { opened_by, store_id } = shiftRes.rows[0];
        console.log(`🔎 Checking User ${opened_by} and Store ${store_id} from last shift...`);

        const userRes = await pool.query('SELECT id, username, "storeId", role FROM "Users" WHERE id = $1', [opened_by]);
        console.log('👤 User Details:');
        console.table(userRes.rows);

        // También verifico la tabla Stores si es posible
        // const storeRes = await pool.query('SELECT id, nombre, usuario FROM "Stores" WHERE id = $1', [store_id]);
        // console.log('🏪 Store Details:');
        // console.table(storeRes.rows);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        pool.end();
    }
}

checkUser();
