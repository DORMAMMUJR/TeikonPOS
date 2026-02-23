import { sequelize, CatalogProduct, InventoryItem, Product } from './models.js';

async function migrateCatalog() {
    console.log('--- Iniciando Migración: Desacoplamiento de Catálogo e Inventario ---');
    try {
        await sequelize.authenticate();
        console.log('Conexión a BD establecida.');

        // 1. Sincronizar las nuevas tablas sin borrar las antiguas
        await CatalogProduct.sync({ alter: true });
        await InventoryItem.sync({ alter: true });
        console.log('Tablas catalog_products e inventory_items aseguradas.');

        // 2. Traer todos los productos antiguos
        const legacyProducts = await Product.findAll();
        console.log(`Encontrados ${legacyProducts.length} productos legacy (Product).`);

        if (legacyProducts.length === 0) {
            console.log('No hay productos que migrar. Proceso finalizado.');
            process.exit(0);
        }

        let catCreated = 0;
        let invCreated = 0;
        let catFound = 0;
        let errors = 0;

        for (const lp of legacyProducts) {
            try {
                // El SKU se convierte en la llave de identidad universal (GTIN)
                // Si dos tiendas tenian el mismo SKU, compartirán el CatalogProduct
                const sku = lp.sku.trim().toUpperCase() || `NO-SKU-${lp.id.slice(0, 8)}`;

                let catalogEntry = await CatalogProduct.findOne({ where: { sku: sku } });

                if (!catalogEntry) {
                    catalogEntry = await CatalogProduct.create({
                        sku: sku,
                        nombre: lp.nombre,
                        categoria: lp.categoria || 'General',
                        imagen: lp.imagen || null
                    });
                    catCreated++;
                } else {
                    catFound++;
                }

                // Ahora creamos el ítem de inventario asociado a esa tienda específica
                // Verificamos si no existe un inventario ya cruzado para no duplicar en re-corridas
                const existInv = await InventoryItem.findOne({
                    where: { storeId: lp.storeId, catalogProductId: catalogEntry.id }
                });

                if (!existInv) {
                    await InventoryItem.create({
                        storeId: lp.storeId,
                        catalogProductId: catalogEntry.id,
                        costPrice: lp.costPrice,
                        salePrice: lp.salePrice,
                        stock: lp.stock,
                        minStock: lp.minStock,
                        taxRate: lp.taxRate,
                        activo: lp.activo
                    });
                    invCreated++;
                }
            } catch (err) {
                console.error(`❌ Error migrando el producto ID: ${lp.id}, SKU: ${lp.sku} -> ${err.message}`);
                errors++;
            }
        }

        console.log('\n--- RESUMEN DE MIGRACIÓN ---');
        console.log(`Catálogo: ${catCreated} creados, ${catFound} reutilizados.`);
        console.log(`Inventario: ${invCreated} nuevos items asignados a tiendas.`);
        console.log(`Errores: ${errors}`);
        console.log('----------------------------\n');

        console.log('Migración Exitosa. RECUERDA: Los SaleItems, StockMovements antiguos siguen apuntando a los IDs de los productos legacy.');

    } catch (error) {
        console.error('Error fatal durante la migración:', error);
    } finally {
        process.exit();
    }
}

migrateCatalog();
