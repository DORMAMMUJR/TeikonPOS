import { Sale, SaleItem, StockMovement, sequelize } from './models.js';

async function deleteSalesHistory() {
    try {
        console.log('🔍 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Count existing sales
        const salesCount = await Sale.count();
        const saleItemsCount = await SaleItem.count();

        console.log(`\n📊 Current records:`);
        console.log(`   - Sales: ${salesCount}`);
        console.log(`   - Sale Items: ${saleItemsCount}`);

        if (salesCount === 0) {
            console.log('\n✨ No sales records found. Database is already clean.');
            process.exit(0);
        }

        console.log('\n🗑️  Starting deletion process...');

        // Delete all sales (this will cascade to sale_items due to foreign key)
        const deletedSales = await Sale.destroy({
            where: {},
            truncate: false
        });

        // Delete all sale items (in case cascade didn't work)
        const deletedSaleItems = await SaleItem.destroy({
            where: {},
            truncate: false
        });

        // Optionally delete stock movements related to sales
        const deletedStockMovements = await StockMovement.destroy({
            where: {
                tipo: 'SALE'
            }
        });

        console.log('\n✅ Deletion completed successfully!');
        console.log(`\n📊 Deleted records:`);
        console.log(`   - Sales: ${deletedSales}`);
        console.log(`   - Sale Items: ${deletedSaleItems}`);
        console.log(`   - Stock Movements (SALE type): ${deletedStockMovements}`);

        // Verify deletion
        const remainingSales = await Sale.count();
        const remainingSaleItems = await SaleItem.count();

        console.log(`\n🔍 Verification:`);
        console.log(`   - Remaining Sales: ${remainingSales}`);
        console.log(`   - Remaining Sale Items: ${remainingSaleItems}`);

        if (remainingSales === 0 && remainingSaleItems === 0) {
            console.log('\n✨ All sales history has been successfully deleted!');
        } else {
            console.log('\n⚠️  Warning: Some records may still remain.');
        }

        await sequelize.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error deleting sales history:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Execute the deletion
deleteSalesHistory();
