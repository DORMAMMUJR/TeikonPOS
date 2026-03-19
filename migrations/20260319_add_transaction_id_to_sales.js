/**
 * Migration: Add transactionId to sales (Idempotency Support)
 * 
 * Purpose: Prevents duplicate sales from retries (network timeouts,
 * double-clicks, offline sync re-uploads, etc.).
 * 
 * Rules:
 * - UNIQUE: guarantees one sale per client-generated transaction ID.
 * - NULL allowed: preserves integrity of historical sales without this column.
 * - VARCHAR(100): accommodates UUIDs (36 chars), nanoids, and custom prefixes.
 * 
 * Frontend usage in CheckoutModal.tsx:
 *   const transactionId = crypto.randomUUID();
 *   await processSaleAndContributeToGoal(items, paymentMethod, { transactionId, ... });
 * 
 * Backend usage in salesController.js:
 *   if (options.transactionId) {
 *     const existing = await Sale.findOne({ where: { transactionId: options.transactionId } });
 *     if (existing) return res.status(200).json({ success: true, sale: existing, idempotent: true });
 *   }
 */

export default {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔄 Migration: Adding transaction_id to sales for idempotency...');

      // 1. Agregar la columna como NULLABLE (no rompe ventas históricas)
      await queryInterface.sequelize.query(`
        ALTER TABLE sales
        ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100) DEFAULT NULL;
      `, { transaction });

      console.log('✅ Column transaction_id added');

      // 2. Crear índice UNIQUE, pero solo sobre las filas que NO son NULL
      // (Partial unique index: la restricción aplica solo a valores presentes)
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS sales_transaction_id_unique
        ON sales (transaction_id)
        WHERE transaction_id IS NOT NULL;
      `, { transaction });

      console.log('✅ Partial UNIQUE index created on transaction_id');

      await transaction.commit();
      console.log('🎉 Migration completed: idempotency support ready');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔄 Rollback: Removing transaction_id from sales...');

      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS sales_transaction_id_unique;
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE sales
        DROP COLUMN IF EXISTS transaction_id;
      `, { transaction });

      await transaction.commit();
      console.log('🎉 Rollback completed');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
