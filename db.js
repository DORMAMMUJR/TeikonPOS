
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar dotenv si no se ha cargado (seguridad)
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Necesario para Render/Supabase
    }
});

// Prueba de conexión opcional (log silencioso)
pool.on('error', (err, client) => {
    console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
});

export default pool;
