import { sequelize } from './models.js';

async function renameColumns() {
  try {
    console.log('Renaming columns to match models.js...');
    
    await sequelize.query(`
      ALTER TABLE inventory_movements 
      RENAME COLUMN "productId" TO product_id;
    `);
    await sequelize.query(`
      ALTER TABLE inventory_movements 
      RENAME COLUMN "storeId" TO store_id;
    `);
    await sequelize.query(`
      ALTER TABLE inventory_movements 
      RENAME COLUMN "previousStock" TO previous_stock;
    `);
    await sequelize.query(`
      ALTER TABLE inventory_movements 
      RENAME COLUMN "newStock" TO new_stock;
    `);
    await sequelize.query(`
      ALTER TABLE inventory_movements 
      RENAME COLUMN "referenceId" TO reference_id;
    `);
    await sequelize.query(`
      ALTER TABLE inventory_movements 
      RENAME COLUMN "createdBy" TO created_by;
    `);
    await sequelize.query(`
      ALTER TABLE inventory_movements 
      RENAME COLUMN "createdAt" TO created_at;
    `);
    await sequelize.query(`
      ALTER TABLE inventory_movements 
      RENAME COLUMN "updatedAt" TO updated_at;
    `);

    console.log('✅ Columns renamed successfully to snake_case!');
  } catch (error) {
    if (error.message.includes('does not exist')) {
        console.log('⚠️ Some columns might have already been renamed.', error.message);
    } else {
        console.error('❌ Error renaming columns:', error);
    }
    
    // Fallback: If they were already snake_case but something else is wrong?
  } finally {
    process.exit();
  }
}

renameColumns();
