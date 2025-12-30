
import { sequelize, User, Store, Product, Sale, Expense, StockMovement, Organization, Client } from './models.js';
import bcrypt from 'bcrypt';

const resetDatabase = async () => {
    try {
        console.log('🔄 Iniciando reseteo de base de datos...');

        // Force sync (drops tables)
        await sequelize.sync({ force: true });
        console.log('✅ Tablas eliminadas y recreadas.');

        // Create Super Admin
        const hashedPassword = await bcrypt.hash('admin123', 10);

        await User.create({
            username: 'devalex',
            password: hashedPassword,
            role: 'SUPER_ADMIN',
            storeId: null, // Global
            nombre: 'Alejandro Dev'
        });

        console.log('👑 Super Admin "devalex" recreado (pass: admin123)');
        console.log('✅ Base de datos limpia y lista para SaaS Mode.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al resetear DB:', error);
        process.exit(1);
    }
};

resetDatabase();
