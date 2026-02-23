import { Supplier } from '../models.js';

// GET /api/suppliers
export const getSuppliers = async (req, res) => {
    try {
        const storeId = req.storeId;
        const suppliers = await Supplier.findAll({
            where: { storeId },
            order: [['nombre', 'ASC']]
        });
        res.json(suppliers);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ error: 'Error al obtener proveedores' });
    }
};

// GET /api/suppliers/:id
export const getSupplierById = async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const supplier = await Supplier.findOne({
            where: { id, storeId }
        });

        if (!supplier) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }
        res.json(supplier);
    } catch (error) {
        console.error('Error fetching supplier:', error);
        res.status(500).json({ error: 'Error al obtener proveedor' });
    }
};

// POST /api/suppliers
export const createSupplier = async (req, res) => {
    try {
        const storeId = req.storeId;
        const { nombre, rfc, telefono, email, direccion, diasCredito, limiteCredito } = req.body;

        if (!nombre) {
            return res.status(400).json({ error: 'El nombre del proveedor es requerido' });
        }

        const newSupplier = await Supplier.create({
            storeId,
            nombre,
            rfc,
            telefono,
            email,
            direccion,
            diasCredito: diasCredito || 0,
            limiteCredito: limiteCredito || 0
        });

        res.status(201).json(newSupplier);
    } catch (error) {
        console.error('Error creating supplier:', error);
        res.status(500).json({ error: 'Error al crear proveedor' });
    }
};

// PUT /api/suppliers/:id
export const updateSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const updates = req.body;

        const supplier = await Supplier.findOne({ where: { id, storeId } });
        if (!supplier) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        await supplier.update(updates);
        res.json(supplier);
    } catch (error) {
        console.error('Error updating supplier:', error);
        res.status(500).json({ error: 'Error al actualizar proveedor' });
    }
};

// DELETE /api/suppliers/:id (Soft delete/Deactivate)
export const deleteSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;

        const supplier = await Supplier.findOne({ where: { id, storeId } });
        if (!supplier) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        await supplier.update({ activo: false });
        res.json({ message: 'Proveedor desactivado exitosamente', id: supplier.id });
    } catch (error) {
        console.error('Error deleting supplier:', error);
        res.status(500).json({ error: 'Error al eliminar/desactivar proveedor' });
    }
};
