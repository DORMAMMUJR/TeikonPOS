import { sequelize } from './models.js';
import fs from 'fs';

async function checkColumns() {
  try {
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'inventory_movements';
    `);
    fs.writeFileSync('cols.json', JSON.stringify(results, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    process.exit();
  }
}

checkColumns();
