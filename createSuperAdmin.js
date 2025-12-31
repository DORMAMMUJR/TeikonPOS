import bcrypt from 'bcryptjs';
import { sequelize, User } from './models.js';

async function createSuperAdmin() {
    try {
        console.log('🔐 Creating SUPER_ADMIN user...\n');

        await sequelize.authenticate();
        console.log('✅ Database connection established\n');

        const email = 'dev@master.com';
        const password = 'DevMaster2025!';

        // Check if user already exists
        const existing = await User.findOne({ where: { username: email } });

        if (existing) {
            console.log(`⚠️  User ${email} already exists!`);
            console.log(`   ID: ${existing.id}`);
            console.log(`   Role: ${existing.role}`);
            console.log(`   Store ID: ${existing.storeId || 'NULL (SUPER_ADMIN)'}\n`);

            if (existing.role !== 'SUPER_ADMIN') {
                console.log('⚠️  WARNING: This user exists but is NOT a SUPER_ADMIN!');
                console.log('   Consider updating the role or using a different email.\n');
            }

            await sequelize.close();
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create SUPER_ADMIN user
        const user = await User.create({
            username: email,
            password: hashedPassword,
            role: 'SUPER_ADMIN',
            storeId: null, // SUPER_ADMIN has no store
            fullName: 'Super Administrator'
        });

        console.log('✅ SUPER_ADMIN user created successfully!\n');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('                    🔐 SUPER ADMIN CREDENTIALS                  ');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`\nEmail/Username: ${email}`);
        console.log(`Password: ${password}`);
        console.log(`Role: SUPER_ADMIN`);
        console.log(`User ID: ${user.id}`);
        console.log(`Store ID: NULL (can access all stores)`);
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('\n📍 Access URL: http://localhost:5173/admin/stores');
        console.log('   (or /admin for auto-redirect to stores)\n');
        console.log('🔒 Security Note: Change this password after first login!\n');

        await sequelize.close();
        console.log('🔌 Database connection closed\n');

    } catch (error) {
        console.error('❌ Error creating SUPER_ADMIN:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

createSuperAdmin();
