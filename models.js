import { Sequelize, DataTypes, Op } from 'sequelize';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Inicializar Sequelize con DATABASE_URL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
});

// ==========================================
// MODELO: Organization (Negocio/Empresa)
// ==========================================
const Organization = sequelize.define('Organization', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    propietario: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    telefono: {
        type: DataTypes.STRING,
        allowNull: true
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'organizations',
    timestamps: true
});

// ==========================================
// MODELO: Store (Sucursal/Tienda)
// ==========================================
const Store = sequelize.define('Store', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    organizationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'organizations',
            key: 'id'
        }
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: false
    },
    usuario: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    direccion: {
        type: DataTypes.STRING,
        allowNull: true
    },
    telefono: {
        type: DataTypes.STRING,
        allowNull: true
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'stores',
    timestamps: true
});

// ==========================================
// MODELO: User (Usuarios del Sistema)
// ==========================================
const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('SUPER_ADMIN', 'ADMIN', 'SELLER'),
        defaultValue: 'SELLER'
    },
    storeId: {
        type: DataTypes.UUID,
        allowNull: true, // NULL para Super Admin
        references: {
            model: 'stores',
            key: 'id'
        },
        field: 'store_id'
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'full_name'
    }
}, {
    tableName: 'users',
    timestamps: true
});

// ==========================================
// MODELO: Product (Producto)
// ==========================================
const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    storeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'stores',
            key: 'id'
        }
    },
    sku: {
        type: DataTypes.STRING,
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    categoria: {
        type: DataTypes.STRING,
        allowNull: false
    },
    costPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'cost_price'
    },
    salePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'sale_price'
    },
    stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    minStock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'min_stock'
    },
    taxRate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0,
        field: 'tax_rate'
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    imagen: {
        type: DataTypes.TEXT,  // Changed from STRING to TEXT for Base64 images
        allowNull: true
    }
}, {
    tableName: 'products',
    timestamps: true,
    indexes: [
        {
            fields: ['storeId']
        }
    ]
});

// ==========================================
// MODELO: Sale (Venta)
// ==========================================
const Sale = sequelize.define('Sale', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    storeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'stores',
            key: 'id'
        },
        field: 'store_id'
    },
    vendedor: {
        type: DataTypes.STRING,
        allowNull: false
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    totalDiscount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        field: 'total_discount'
    },
    taxTotal: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        field: 'tax_total'
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    totalCost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'total_cost'
    },
    netProfit: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'net_profit'
    },
    paymentMethod: {
        type: DataTypes.ENUM('CASH', 'CARD', 'TRANSFER'),
        allowNull: false,
        field: 'payment_method'
    },
    status: {
        type: DataTypes.ENUM('ACTIVE', 'CANCELLED', 'PENDING_SYNC'),
        defaultValue: 'ACTIVE'
    },
    items: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    syncedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'synced_at'
    }
}, {
    tableName: 'sales',
    timestamps: true,
    updatedAt: false,
    indexes: [
        {
            fields: ['store_id']
        }
    ]
});

// ==========================================
// MODELO: SaleItem (Detalle de Venta)
// ==========================================
const SaleItem = sequelize.define('SaleItem', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    saleId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    productId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    precio: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    costo: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    }
}, {
    tableName: 'sale_items',
    timestamps: true
});

// ==========================================
// MODELO: Client (Cliente Final)
// ==========================================
const Client = sequelize.define('Client', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    storeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'stores',
            key: 'id'
        },
        field: 'store_id'
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    telefono: {
        type: DataTypes.STRING,
        allowNull: true
    },
    direccion: {
        type: DataTypes.STRING,
        allowNull: true
    },
    rfc: {
        type: DataTypes.STRING,
        allowNull: true
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'clients',
    timestamps: true,
    indexes: [
        {
            fields: ['store_id']
        }
    ]
});

// ==========================================
// MODELO: Expense (Gasto Operativo)
// ==========================================
const Expense = sequelize.define('Expense', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    storeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'stores',
            key: 'id'
        },
        field: 'store_id'
    },
    categoria: {
        type: DataTypes.ENUM('RENT', 'UTILITIES', 'PAYROLL', 'SUPPLIES', 'MAINTENANCE', 'OTHER'),
        allowNull: false
    },
    descripcion: {
        type: DataTypes.STRING,
        allowNull: false
    },
    monto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    recurrente: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    comprobante: {
        type: DataTypes.STRING,
        allowNull: true
    },
    registradoPor: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'registrado_por'
    }
}, {
    tableName: 'expenses',
    timestamps: true,
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['store_id']
        }
    ]
});

// ==========================================
// MODELO: StockMovement (Kardex)
// ==========================================
const StockMovement = sequelize.define('StockMovement', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    productId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        },
        field: 'product_id'
    },
    storeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'stores',
            key: 'id'
        },
        field: 'store_id'
    },
    tipo: {
        type: DataTypes.ENUM('SALE', 'PURCHASE', 'ADJUSTMENT', 'THEFT', 'RETURN', 'TRANSFER'),
        allowNull: false
    },
    cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    stockAnterior: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'stock_anterior'
    },
    stockNuevo: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'stock_nuevo'
    },
    motivo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    referenciaId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'referencia_id'
    },
    registradoPor: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'registrado_por'
    }
}, {
    tableName: 'stock_movements',
    timestamps: true,
    updatedAt: false,
    indexes: [
        {
            fields: ['store_id']
        }
    ]
});

// ==========================================
// MODELO: CashShift (Turno de Caja)
// ==========================================
const CashShift = sequelize.define('CashShift', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    storeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'stores',
            key: 'id'
        },
        field: 'store_id'
    },
    cajero: {
        type: DataTypes.STRING,
        allowNull: false
    },
    apertura: {
        type: DataTypes.DATE,
        allowNull: false
    },
    cierre: {
        type: DataTypes.DATE,
        allowNull: true
    },
    montoInicial: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'monto_inicial'
    },
    ventasEfectivo: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        field: 'ventas_efectivo'
    },
    ventasTarjeta: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        field: 'ventas_tarjeta'
    },
    ventasTransferencia: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        field: 'ventas_transferencia'
    },
    gastos: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    montoEsperado: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'monto_esperado'
    },
    montoReal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'monto_real'
    },
    diferencia: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    notas: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('OPEN', 'CLOSED'),
        defaultValue: 'OPEN'
    }
}, {
    tableName: 'cash_shifts',
    timestamps: true,
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['store_id']
        }
    ]
});

// ==========================================
// MODELO: CashSession (Sesión de Caja en Tiempo Real)
// ==========================================
const CashSession = sequelize.define('CashSession', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    storeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'stores',
            key: 'id'
        },
        field: 'store_id'
    },
    ownerId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'User ID who opened the session'
    },
    startTime: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: true
    },
    startBalance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'start_balance'
    },
    expectedBalance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'expected_balance'
    },
    endBalanceReal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'end_balance_real'
    },
    cashSales: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        field: 'cash_sales'
    },
    refunds: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM('OPEN', 'CLOSED'),
        defaultValue: 'OPEN'
    }
}, {
    tableName: 'cash_sessions',
    timestamps: true,
    indexes: [
        {
            fields: ['store_id']
        },
        {
            fields: ['status']
        }
    ]
});

// ==========================================
// RELACIONES
// ==========================================

// Organization -> Store (1:N)
Organization.hasMany(Store, { foreignKey: 'organizationId', as: 'stores' });
Store.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

// Store -> Product (1:N)
Store.hasMany(Product, { foreignKey: 'storeId', as: 'products', onDelete: 'CASCADE' });
Product.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

// Store -> Sale (1:N)
Store.hasMany(Sale, { foreignKey: 'storeId', as: 'sales', onDelete: 'CASCADE' });
Sale.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

// Sale <-> SaleItem (1:N)
Sale.hasMany(SaleItem, { foreignKey: 'saleId' });
SaleItem.belongsTo(Sale, { foreignKey: 'saleId' });

// Product <-> SaleItem (1:N)
Product.hasMany(SaleItem, { foreignKey: 'productId' });
SaleItem.belongsTo(Product, { foreignKey: 'productId' });

// Store -> Expense (1:N)
Store.hasMany(Expense, { foreignKey: 'storeId', as: 'expenses', onDelete: 'CASCADE' });
Expense.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

// Store -> CashShift (1:N)
Store.hasMany(CashShift, { foreignKey: 'storeId', as: 'cashShifts', onDelete: 'CASCADE' });
CashShift.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

// Store -> User (1:N)
Store.hasMany(User, { foreignKey: 'storeId', as: 'users', onDelete: 'CASCADE' });
User.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

// Store -> Client (1:N)
Store.hasMany(Client, { foreignKey: 'storeId', as: 'clients', onDelete: 'CASCADE' });
Client.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

// Product -> StockMovement (1:N)
Product.hasMany(StockMovement, { foreignKey: 'productId', as: 'movements', onDelete: 'CASCADE' });
StockMovement.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// Store -> StockMovement (1:N)
// Store -> StockMovement (1:N)
Store.hasMany(StockMovement, { foreignKey: 'storeId', as: 'stockMovements', onDelete: 'CASCADE' });
StockMovement.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

// ==========================================
// MODELO: Ticket (Soporte Técnico)
// ==========================================
const Ticket = sequelize.define('Ticket', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    storeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'stores',
            key: 'id'
        },
        field: 'store_id'
    },
    titulo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    prioridad: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
        defaultValue: 'MEDIUM'
    },
    status: {
        type: DataTypes.ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'),
        defaultValue: 'OPEN'
    },
    creadoPor: { // Usuario que creó el ticket
        type: DataTypes.STRING,
        allowNull: false,
        field: 'creado_por'
    }
}, {
    tableName: 'tickets',
    timestamps: true
});

// Store -> Ticket (1:N)
Store.hasMany(Ticket, { foreignKey: 'storeId', as: 'tickets', onDelete: 'CASCADE' });
Ticket.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

// ==========================================
// MODELO: StoreConfig (Configuración de Tienda)
// ==========================================
const StoreConfig = sequelize.define('StoreConfig', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    storeId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: 'stores', // FIXED: Must match tableName (lowercase)
            key: 'id'
        },
        field: 'store_id'
    },
    breakEvenGoal: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        comment: 'Meta de venta mensual o punto de equilibrio'
    },
    theme: {
        type: DataTypes.STRING,
        defaultValue: 'light'
    }
}, {
    tableName: 'store_configs',
    timestamps: true
});

// Store -> StoreConfig (1:1)
Store.hasOne(StoreConfig, { foreignKey: 'storeId', as: 'config', onDelete: 'CASCADE' });
StoreConfig.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

// ==========================================
// EXPORTAR
// ==========================================
export {
    sequelize,
    Op,
    Organization,
    Store,
    User,
    Product,
    Sale,
    SaleItem,
    Expense,
    StockMovement,
    CashShift,
    Client,
    Ticket,
    StoreConfig,
    CashSession
};
