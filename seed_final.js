
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import {
    sequelize,
    Organization,
    Store,
    User,
    Product,
    Sale,
    Expense,
    StockMovement,
    CashShift,
    Client
} from './models.js';

dotenv.config();

const encryptPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

const seed = async () => {
    try {
        console.log('🔄 Iniciando Limpieza y Seeding Final (Fase 4)...');
        console.log('⚠️  ESTO BORRARÁ TODOS LOS DATOS EXISTENTES ⚠️');

        // 1. Force Sync (Wipes DB)
        await sequelize.sync({ force: true });
        console.log('✅ Base de datos limpiada y esquemas recreados.');

        // 2. Create Global Organization
        const org = await Organization.create({
            nombre: 'Teikon Corp',
            slug: 'teikon-corp',
            propietario: 'Admin Global',
            email: 'admin@teikonpos.com',
            telefono: '555-000-0000'
        });
        console.log('✅ Organización creada:', org.nombre);

        // 3. Create SUPER ADMIN User (Global, No Store)
        const superAdminPass = await encryptPassword('admin123'); // Default secure password for demo
        const superAdmin = await User.create({
            username: 'admin',
            password: superAdminPass,
            role: 'SUPER_ADMIN',
            storeId: null, // Global access
            fullName: 'Super Administrador'
        });
        console.log('✅ USUARIO SUPER ADMIN CREADO:');
        console.log('   User: admin');
        console.log('   Pass: admin123');
        console.log('   Role: SUPER_ADMIN (Acceso Global)');

        // 4. Create Demo Store
        const demoPass = await encryptPassword('demo123');
        const demoStore = await Store.create({
            organizationId: org.id,
            nombre: 'Tienda Demo',
            slug: 'tienda-demo',
            usuario: 'demo_owner@teikon.com', // Store Login
            password: demoPass,
            direccion: 'Calle Ficticia 123, Ciudad Demo',
            telefono: '555-123-4567',
            plan: 'Premium',
            status: 'active'
        });
        console.log('✅ TIENDA DEMO CREADA:', demoStore.nombre);

        // 5. Create Demo User (Store Owner)
        // This allows the user to log in as a "normal" store owner to test that view.
        const demoUserPass = await encryptPassword('user123');
        const demoUser = await User.create({
            username: 'demo_user',
            password: demoUserPass,
            role: 'ADMIN', // Admin of this store, not SUPER_ADMIN
            storeId: demoStore.id,
            fullName: 'Dueño Demo'
        });

        console.log('✅ USUARIO DEMO (Dueño de Tienda) CREADO:');
        console.log('   User: demo_user');
        console.log('   Pass: user123');
        console.log('   Role: ADMIN (Limitado a Tienda Demo)');
        console.log('   Store ID:', demoStore.id);

        console.log('🚀 SEEDING FINAL COMPLETADO EXITOSAMENTE.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error durante el seeding:', error);
        process.exit(1);
    }
};

seed();
