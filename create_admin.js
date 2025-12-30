import pg from 'pg';
const { Client } = pg;

// 👇👇👇 IMPORTANTE: PEGA AQUÍ TU LINK DE SEENODE (postgres://...) 👇👇👇
const connectionString = "postgresql://db_ug5ykojy87dn:VCIlpoz80aKCC1kCgJLIZMXs@up-de-fra1-postgresql-1.db.run-on-seenode.com:11550/db_ug5ykojy87dn";

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function createSuperAdmin() {
    try {
        await client.connect();
        console.log("✅ Conectado a la nube...");

        // 1. CREAMOS LA TABLA (El estante)
        console.log("🔨 Construyendo tabla de usuarios...");
        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        store_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
        await client.query(createTableQuery);
        console.log("✅ Tabla 'users' creada o verificada.");

        // 2. CREAMOS EL USUARIO (La mercancía)
        console.log("👤 Creando Super Admin...");
        const insertQuery = `
      INSERT INTO users (username, password, role, store_id, created_at)
      VALUES (
        'superadmin1', 
        '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxwKc.60r.javXqWN.Su1By.6V.1e', 
        'SUPER_ADMIN', 
        NULL, 
        NOW()
      );
    `;

        await client.query(insertQuery);
        console.log("🎉 ¡ÉXITO TOTAL! Usuario creado.");
        console.log("👉 Corre a tu web y entra con: superadmin1 / sasquexy1");

    } catch (error) {
        if (error.message.includes("duplicate key")) {
            console.log("⚠️ El usuario ya existía. ¡Ya puedes entrar!");
        } else {
            console.error("❌ Error:", error.message);
        }
    } finally {
        await client.end();
    }
}

createSuperAdmin();