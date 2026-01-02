import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../src/components/ui';
import { Target, TrendingUp } from 'lucide-react';

interface SalesGoalModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SalesGoalModal: React.FC<SalesGoalModalProps> = ({ isOpen, onClose }) => {
    const [goalValue, setGoalValue] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Load current goal from localStorage
            const currentGoal = localStorage.getItem('dailySalesGoal') || '10000';
            setGoalValue(currentGoal);
        }
    }, [isOpen]);

    const handleSave = () => {
        const numValue = parseFloat(goalValue);

        if (isNaN(numValue) || numValue <= 0) {
            alert('Por favor ingresa un valor válido mayor a 0');
            return;
        }

        localStorage.setItem('dailySalesGoal', numValue.toString());
        alert(`✅ Meta actualizada a $${numValue.toLocaleString()}`);
        onClose();

        // Trigger a custom event to notify POSHeader to refresh
        window.dispatchEvent(new Event('salesGoalUpdated'));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="MODIFICAR META DE VENTA">
            <div className="space-y-6 p-2">
                <div className="flex items-center justify-center p-6 bg-purple-500/5 rounded-2xl border-2 border-purple-500/10">
                    <Target className="text-purple-600" size={48} />
                </div>

                <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Meta Diaria (MXN)
                    </label>
                    <input
                        type="number"
                        className="w-full py-4 text-3xl font-black bg-slate-50 dark:bg-slate-950 border-4 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-purple-500 text-center"
                        value={goalValue}
                        onChange={e => setGoalValue(e.target.value)}
                        placeholder="10000"
                        autoFocus
                    />
                    <p className="text-xs text-slate-500 text-center font-bold">
                        Esta meta se usa para calcular el progreso diario de ventas
                    </p>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button variant="secondary" fullWidth onClick={onClose}>
                        CANCELAR
                    </Button>
                    <Button variant="primary" fullWidth onClick={handleSave}>
                        GUARDAR META
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default SalesGoalModal;
