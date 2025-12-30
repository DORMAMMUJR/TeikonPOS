
import { sequelize, User, Store, Product, Sale, Expense, StockMovement, Organization } from './models.js';
import bcrypt from 'bcrypt';

const resetDatabase = async () => {
    try {
        console.log('🔄 Iniciando reseteo de base de datos...');

        // Force sync (drops tables)
        await sequelize.sync({ force: true });
        console.log('✅ Tablas eliminadas y recreadas.');

        // Create Super Admin
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // We might not need an organization for Super Admin if they are system-wide, 
        // but models might require loose coupling.
        // Let's create a "System" organization just in case, or allow nulls.
        // Checking User model... it has storeId which can be null?
        // User model definition: storeId: { type: DataTypes.UUID, allowNull: true }

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
