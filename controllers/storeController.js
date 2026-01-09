
import bcrypt from 'bcryptjs';
import { Store, User, StoreConfig, Organization } from '../models.js';

// POST /api/stores/new - Crear nueva tienda
export const createStore = async (req, res) => {
    try {
        const { nombre, usuario, password, direccion, telefono, ownerName } = req.body;

        // Validaciones básicas
        if (!nombre || !usuario || !password) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        // Verificar que usuario no exista (en Users o Stores)
        const existingStore = await Store.findOne({ where: { usuario } });
        const existingUser = await User.findOne({ where: { username: usuario } });

        if (existingStore || existingUser) {
            return res.status(400).json({ error: 'El usuario/email ya existe' });
        }

        // Encriptar password
        const hashedPassword = await bcrypt.hash(password, 10);

        // --- NEW: Robust Organization ID Handling ---
        let targetOrganizationId = req.organizationId;

        // If no organizationId in request/token, look for one or create default
        if (!targetOrganizationId) {
            const firstOrg = await Organization.findOne();
            if (firstOrg) {
                targetOrganizationId = firstOrg.id;
            } else {
                console.log('⚠️ No organization found. Creating Default Organization...');
                const newOrg = await Organization.create({
                    name: 'Default Organization',
                    slug: `default-org-${Date.now()}`,
                    plan: 'ENTERPRISE'
                });
                targetOrganizationId = newOrg.id;
            }
        }

        // 1. Crear Store
        const store = await Store.create({
            organizationId: targetOrganizationId,
            nombre,
            slug: `${nombre.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
            usuario, // Legacy field
            password: hashedPassword, // Legacy field
            direccion: direccion || 'N/A',
            telefono
        });

        // 2. Crear User Admin para esta Store
        const user = await User.create({
            username: usuario,
            password: hashedPassword,
            role: 'ADMIN', // Using 'ADMIN' to match existing logic (or 'admin' depending on consistency, logic says 'ADMIN' in line 219)
            storeId: store.id,
            fullName: ownerName || nombre
        });

        // 3. Inicializar Configuración
        await StoreConfig.create({
            storeId: store.id,
            breakEvenGoal: 0.00,
            theme: 'light'
        });

        res.status(201).json({
            id: store.id,
            nombre: store.nombre,
            usuario: store.usuario,
            owner: user.fullName,
            organizationId: store.organizationId
        });
    } catch (error) {
        console.error('Error al crear sucursal:', error);
        res.status(500).json({ error: 'Error al crear sucursal: ' + error.message });
    }
};

// GET /api/stores - Listar todas las tiendas (SOLO SUPER_ADMIN)
export const getStores = async (req, res) => {
    try {
        if (req.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        const stores = await Store.findAll({
            attributes: ['id', 'nombre', 'usuario', 'telefono', 'direccion', 'createdAt'],
            include: [{
                model: User,
                as: 'users',
                attributes: ['fullName'],
                where: { role: 'ADMIN' },
                required: false  // LEFT JOIN in case no admin user exists
            }],
            order: [['createdAt', 'DESC']]
        });

        // Map to frontend expectation
        const mappedStores = stores.map(s => {
            // Get the admin user's fullName (first ADMIN user if multiple exist)
            const adminUser = s.users && s.users.length > 0 ? s.users[0] : null;

            return {
                id: s.id,
                name: s.nombre,
                ownerName: adminUser?.fullName || 'N/A',  // Owner's full name
                ownerEmail: s.usuario,  // Email/username for login
                phone: s.telefono || 'N/A',
                plan: 'Premium',
                status: 'active',
                lastActive: new Date(s.createdAt).toLocaleDateString()
            };
        });

        res.json(mappedStores);
    } catch (error) {
        console.error('Error al listar sucursales:', error);
        res.status(500).json({ error: 'Error al listar sucursales' });
    }
};

// DELETE /api/stores/:id - Eliminar tienda (RBAC: SOLO SUPER_ADMIN / DESARROLLADOR)
export const deleteStore = async (req, res) => {
    try {
        const targetStoreId = req.params.id;
        const { role } = req; // Del token JWT
        const { password } = req.body;

        // ==========================================
        // VALIDACIÓN RBAC - Capa de Seguridad Backend
        // ==========================================

        // REGLA: SOLO SUPER_ADMIN (Desarrollador) puede eliminar tiendas
        // Se eliminó el permiso para 'admin' (dueños de tienda) por solicitud del usuario
        if (role !== 'SUPER_ADMIN') {
            console.warn(`🚫 INTENTO DE ELIMINACIÓN DENEGADO: Usuario ${req.usuario} (${role}) intentó eliminar tienda ${targetStoreId}`);
            return res.status(403).json({
                error: 'ACCESO DENEGADO',
                message: 'Solo el Desarrollador (Super Admin) puede realizar esta acción crítica. Contacte a soporte.'
            });
        }

        // ==========================================
        // VALIDACIÓN DE CONTRASEÑA (Doble Factor)
        // ==========================================

        if (!password) {
            return res.status(400).json({ error: 'Se requiere confirmación de contraseña' });
        }

        // Buscar el usuario actual para verificar contraseña
        const currentUser = await User.findOne({ where: { username: req.usuario } });
        if (!currentUser) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar contraseña con bcrypt
        const isPasswordValid = await bcrypt.compare(password, currentUser.password);
        if (!isPasswordValid) {
            console.warn(`🚫 CONTRASEÑA INCORRECTA: Usuario ${req.usuario} intentó eliminar tienda ${targetStoreId}`);
            return res.status(403).json({ error: 'Contraseña incorrecta' });
        }

        // ==========================================
        // ELIMINACIÓN DE TIENDA
        // ==========================================

        // Buscar la tienda a eliminar
        const store = await Store.findByPk(targetStoreId);
        if (!store) {
            return res.status(404).json({ error: 'Tienda no encontrada' });
        }

        // Log de seguridad (auditoría)
        console.log(`🔴 ELIMINACIÓN DE TIENDA AUTORIZADA:`);
        console.log(`   - Tienda: ${store.nombre} (ID: ${store.id})`);
        console.log(`   - Usuario: ${req.usuario} (Rol: ${role})`);
        console.log(`   - Timestamp: ${new Date().toISOString()}`);

        // Cascade delete is handled by Database definition (onDelete: CASCADE)
        await store.destroy();

        res.json({
            message: 'Tienda eliminada correctamente',
            deletedStore: store.nombre
        });
    } catch (error) {
        console.error('Error al eliminar tienda:', error);
        res.status(500).json({ error: 'Error al eliminar tienda' });
    }
};
