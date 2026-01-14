const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Sequelize } = require('sequelize');

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL missing');
    process.exit(1);
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: console.log,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

const commands = [
    // SALES
    "ALTER TABLE sales ADD COLUMN IF NOT EXISTS shift_id INTEGER;",
    "CREATE INDEX IF NOT EXISTS sales_shift_id_idx ON sales(shift_id);",

    // EXPENSES
    "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS shift_id INTEGER;",
    "CREATE INDEX IF NOT EXISTS expenses_shift_id_idx ON expenses(shift_id);",
];

// FKs separadas porque 'IF NOT EXISTS' no existe para constraints en versiones viejas de PG de forma simple
// y 'DO $$' falló. Intentaremos agregar y si falla (error 42710 duplicate_object), ignoramos.
const constraintCommands = [
    "ALTER TABLE sales ADD CONSTRAINT fk_sales_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL;",
    "ALTER TABLE expenses ADD CONSTRAINT fk_expenses_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL;"
];

async function run() {
    try {
        await sequelize.authenticate();
        console.log('✅ Auth OK');

        for (const sql of commands) {
            console.log(`▶ Executing: ${sql}`);
            await sequelize.query(sql);
        }

        for (const sql of constraintCommands) {
            console.log(`▶ Executing constraint: ${sql}`);
            try {
                await sequelize.query(sql);
            } catch (e) {
                if (e.original && e.original.code === '42710') {
                    console.log('   ⚠ Constraint already exists (ignored)');
                } else if (e.message.includes('already exists')) { // Sequelize sometimes matches string
                    console.log('   ⚠ Constraint already exists (ignored)');
                } else {
                    console.warn('   ⚠ Constraint creation failed (non-critical if exists):', e.message);
                }
            }
        }

        console.log('✅ Migration finished');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
}
run();
