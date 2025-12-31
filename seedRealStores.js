import bcrypt from 'bcryptjs';
import { sequelize, Organization, Store, User, StoreConfig } from './models.js';

// Generic secure password for all stores
const GENERIC_PASSWORD = 'Tienda2025!';

// Real store data
const stores = [
    {
        name: 'Alvazca',
        contact: 'Carlos Alvarado',
        phone: '+52 998 215 7742',
        email: 'admin@alvazca.com',
        slug: 'alvazca',
        username: 'alvazca_store'
    },
    {
        name: 'Caprichosa tentación',
        contact: 'Gerardo Segura',
        phone: '+52 744 161 8231',
        email: 'admin@caprichosa.com',
        slug: 'caprichosa-tentacion',
        username: 'caprichosa_store'
    },
    {
        name: 'Argenis',
        contact: 'Argelia Martinez',
        phone: '+52 833 181 5683',
        email: 'admin@argenis.com',
        slug: 'argenis',
        username: 'argenis_store'
    },
    {
        name: 'Mily Cosmetics',
        contact: 'Enrique',
        phone: '+52 33 1845 3647',
        email: 'admin@milycosmetics.com',
        slug: 'mily-cosmetics',
        username: 'mily_store'
    },
    {
        name: 'Clutch y Frenos Fuller',
        contact: 'Georgina Rios',
        phone: '+52 55 8202 5862',
        email: 'admin@clutchfuller.com',
        slug: 'clutch-fuller',
        username: 'clutch_store'
    }
];

async function seedRealStores() {
    try {
        console.log('🚀 Starting real store seeding process...\n');

        // Connect to database
        await sequelize.authenticate();
        console.log('✅ Database connection established\n');

        // Hash the generic password once
        const hashedPassword = await bcrypt.hash(GENERIC_PASSWORD, 10);

        // Find or use first organization
        let organization = await Organization.findOne();

        if (!organization) {
            console.error('❌ No organization found in database. Please create one first.');
            process.exit(1);
        }

        console.log(`✅ Using organization: ${organization.nombre} (${organization.id})\n`);

        const credentials = [];

        // Create each store with its admin user
        for (const storeData of stores) {
            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`📍 Processing: ${storeData.name}`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

            // Check if store already exists
            let store = await Store.findOne({ where: { slug: storeData.slug } });

            if (store) {
                console.log(`⚠️  Store "${storeData.name}" already exists, skipping...`);

                // Check if admin user exists
                const existingUser = await User.findOne({
                    where: {
                        username: storeData.email,
                        storeId: store.id
                    }
                });

                if (existingUser) {
                    credentials.push({
                        store: storeData.name,
                        contact: storeData.contact,
                        email: storeData.email,
                        password: GENERIC_PASSWORD,
                        status: 'EXISTING'
                    });
                }
                continue;
            }

            // Create store
            console.log(`🏪 Creating store...`);
            store = await Store.create({
                organizationId: organization.id,
                nombre: storeData.name,
                slug: storeData.slug,
                usuario: storeData.username, // Legacy field - unique username
                password: hashedPassword, // Legacy field
                telefono: storeData.phone,
                direccion: '',
                activo: true
            });
            console.log(`✅ Store created with ID: ${store.id}`);

            // Create admin user for the store
            console.log(`👤 Creating admin user...`);
            const user = await User.create({
                username: storeData.email,
                password: hashedPassword,
                role: 'ADMIN',
                storeId: store.id,
                fullName: storeData.contact
            });
            console.log(`✅ Admin user created with ID: ${user.id}`);

            // Create store config with default values
            console.log(`⚙️  Creating store config...`);
            await StoreConfig.create({
                storeId: store.id,
                breakEvenGoal: 30000, // Default monthly goal: $30,000
                theme: 'light'
            });
            console.log(`✅ Store config created`);

            // Add to credentials list
            credentials.push({
                store: storeData.name,
                contact: storeData.contact,
                email: storeData.email,
                password: GENERIC_PASSWORD,
                phone: storeData.phone,
                status: 'NEW'
            });

            console.log(`✅ ${storeData.name} setup complete!`);
        }

        // Print credentials summary
        console.log('\n\n');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('                    🔐 CREDENTIALS SUMMARY                      ');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('\nCopy and send these credentials to your clients:\n');

        credentials.forEach((cred, index) => {
            console.log(`\n${index + 1}. ${cred.store} (${cred.status})`);
            console.log(`   ├─ Contact: ${cred.contact}`);
            console.log(`   ├─ Phone: ${cred.phone}`);
            console.log(`   ├─ Email/Username: ${cred.email}`);
            console.log(`   └─ Password: ${cred.password}`);
        });

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('\n📋 Quick Copy Format:\n');

        credentials.forEach((cred) => {
            console.log(`${cred.store}:`);
            console.log(`Usuario: ${cred.email}`);
            console.log(`Contraseña: ${cred.password}`);
            console.log('');
        });

        console.log('═══════════════════════════════════════════════════════════════');
        console.log('\n✅ Seeding completed successfully!');
        console.log(`📊 Total stores processed: ${stores.length}`);
        console.log(`🆕 New stores created: ${credentials.filter(c => c.status === 'NEW').length}`);
        console.log(`♻️  Existing stores: ${credentials.filter(c => c.status === 'EXISTING').length}`);
        console.log('\n🔒 Security Note: All users share the password: Tienda2025!');
        console.log('   Recommend clients change it after first login.\n');

    } catch (error) {
        console.error('\n❌ Error during seeding:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await sequelize.close();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the seeding
seedRealStores();
