const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

async function check() {
    try {
        await sequelize.authenticate();
        console.log('✅ Auth OK');
        const [results] = await sequelize.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_name IN ('sales', 'expenses') 
            AND column_name = 'shift_id';
        `);
        console.log('Columns found:', results.length);
        results.forEach(r => console.log(` - ${r.table_name}.${r.column_name}`));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
