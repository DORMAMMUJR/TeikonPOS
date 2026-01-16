import { DataTypes } from 'sequelize';

export default {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            console.log('🔄 Starting migration: Change shift_id from INTEGER to UUID');

            // 1. Drop existing foreign key constraints
            console.log('📌 Step 1: Dropping foreign key constraints...');

            await queryInterface.sequelize.query(`
                ALTER TABLE sales 
                DROP CONSTRAINT IF EXISTS sales_shift_id_fkey;
            `, { transaction });

            await queryInterface.sequelize.query(`
                ALTER TABLE expenses 
                DROP CONSTRAINT IF EXISTS expenses_shift_id_fkey;
            `, { transaction });

            console.log('✅ Foreign key constraints dropped');

            // 2. Change shift_id column type in sales table
            console.log('📌 Step 2: Converting sales.shift_id to UUID...');

            await queryInterface.sequelize.query(`
                ALTER TABLE sales 
                ALTER COLUMN shift_id TYPE UUID 
                USING shift_id::text::uuid;
            `, { transaction });

            console.log('✅ sales.shift_id converted to UUID');

            // 3. Change shift_id column type in expenses table
            console.log('📌 Step 3: Converting expenses.shift_id to UUID...');

            await queryInterface.sequelize.query(`
                ALTER TABLE expenses 
                ALTER COLUMN shift_id TYPE UUID 
                USING shift_id::text::uuid;
            `, { transaction });

            console.log('✅ expenses.shift_id converted to UUID');

            // 4. Re-add foreign key constraints
            console.log('📌 Step 4: Re-adding foreign key constraints...');

            await queryInterface.sequelize.query(`
                ALTER TABLE sales 
                ADD CONSTRAINT sales_shift_id_fkey 
                FOREIGN KEY (shift_id) 
                REFERENCES shifts(id) 
                ON DELETE SET NULL 
                ON UPDATE CASCADE;
            `, { transaction });

            await queryInterface.sequelize.query(`
                ALTER TABLE expenses 
                ADD CONSTRAINT expenses_shift_id_fkey 
                FOREIGN KEY (shift_id) 
                REFERENCES shifts(id) 
                ON DELETE SET NULL 
                ON UPDATE CASCADE;
            `, { transaction });

            console.log('✅ Foreign key constraints re-added');

            await transaction.commit();
            console.log('🎉 Migration completed successfully!');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Migration failed:', error);
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            console.log('🔄 Starting rollback: Change shift_id from UUID to INTEGER');

            // 1. Drop foreign key constraints
            await queryInterface.sequelize.query(`
                ALTER TABLE sales 
                DROP CONSTRAINT IF EXISTS sales_shift_id_fkey;
            `, { transaction });

            await queryInterface.sequelize.query(`
                ALTER TABLE expenses 
                DROP CONSTRAINT IF EXISTS expenses_shift_id_fkey;
            `, { transaction });

            // 2. Convert back to INTEGER (this will fail if there are UUID values that can't convert)
            // WARNING: This is destructive and may lose data
            await queryInterface.sequelize.query(`
                ALTER TABLE sales 
                ALTER COLUMN shift_id TYPE INTEGER 
                USING NULL;
            `, { transaction });

            await queryInterface.sequelize.query(`
                ALTER TABLE expenses 
                ALTER COLUMN shift_id TYPE INTEGER 
                USING NULL;
            `, { transaction });

            // 3. Re-add foreign key constraints
            await queryInterface.sequelize.query(`
                ALTER TABLE sales 
                ADD CONSTRAINT sales_shift_id_fkey 
                FOREIGN KEY (shift_id) 
                REFERENCES shifts(id) 
                ON DELETE SET NULL 
                ON UPDATE CASCADE;
            `, { transaction });

            await queryInterface.sequelize.query(`
                ALTER TABLE expenses 
                ADD CONSTRAINT expenses_shift_id_fkey 
                FOREIGN KEY (shift_id) 
                REFERENCES shifts(id) 
                ON DELETE SET NULL 
                ON UPDATE CASCADE;
            `, { transaction });

            await transaction.commit();
            console.log('🎉 Rollback completed successfully!');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Rollback failed:', error);
            throw error;
        }
    }
};
