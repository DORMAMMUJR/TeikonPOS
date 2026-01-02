import { sequelize, Product, InventorySnapshot } from '../models.js';

async function verifySafetySystem() {
    try {
        console.log('🧪 Starting Inventory Safety System Verification...');

        // 0. Ensure connected and SYNC
        await sequelize.authenticate();
        console.log('✅ DB Connected');
        await InventorySnapshot.sync(); // Create table if not exists (safer than alter global)
        console.log('✅ Table synced');

        // 1. Test Backup Logic (Simulation)
        // We will mock the creating of a snapshot manually to see if Model works
        const mockData = [{ id: 'test-uuid', sku: 'TEST', nombre: 'Test Item', stock: 10 }];
        const snapshot = await InventorySnapshot.create({
            description: 'Verification Test',
            data: mockData,
            createdBy: 'SystemVerifier'
        });
        console.log('✅ Snapshot Model Verification: Created ID', snapshot.id);

        // 2. Test JSON Integrity
        if (snapshot.data[0].sku !== 'TEST') throw new Error('JSONB Storage failed');
        console.log('✅ JSONB Storage Integrity Verified');

        // 3. Clean up
        await snapshot.destroy();
        console.log('✅ Cleanup successful');

        process.exit(0);
    } catch (e) {
        console.error('❌ Verification Failed:', e);
        process.exit(1);
    }
}

verifySafetySystem();
