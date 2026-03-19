/**
 * Script de migración ESM — Agrega transaction_id a la tabla sales
 * 
 * Uso:
 *   node migrations/run_add_transaction_id.js
 */

import { sequelize } from '../models.js';

async function run() {
    const transaction = await sequelize.transaction();
    try {
        console.log('🔄 Migrando: Agregando transaction_id a sales...');

        await sequelize.query(`
            ALTER TABLE sales
            ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100) DEFAULT NULL;
        `, { transaction });

        console.log('✅ Columna transaction_id agregada');

        await sequelize.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS sales_transaction_id_unique
            ON sales (transaction_id)
            WHERE transaction_id IS NOT NULL;
        `, { transaction });

        console.log('✅ Índice UNIQUE parcial creado en transaction_id');

        await transaction.commit();
        console.log('🎉 Migración completada con éxito');

    } catch (error) {
        await transaction.rollback();
        console.error('❌ Error en migración:', error.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

run();
