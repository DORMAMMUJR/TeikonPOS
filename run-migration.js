import { sequelize } from './models.js';
import migration from './migrations/20260115_change_shift_id_to_uuid.js';

async function runMigration() {
    try {
        console.log('🚀 Starting migration execution...\n');

        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established\n');

        // Run the migration
        await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);

        console.log('\n✅ Migration completed successfully!');
        console.log('📊 You can now create sales with UUID shift_id values');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        console.error('\nStack trace:', error.stack);
        process.exit(1);
    }
}

runMigration();
