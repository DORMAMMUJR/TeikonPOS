import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import Button from './Button';

const Settings: React.FC = () => {
  const { settings, updateSettings } = useStore();
  const [fixedCosts, setFixedCosts] = useState(settings.monthlyFixedCosts);
  const [margin, setMargin] = useState(settings.targetMargin * 100); // Display as %

  const handleSave = () => {
    updateSettings({
      monthlyFixedCosts: fixedCosts,
      targetMargin: margin / 100
    });
    alert("Configuración actualizada");
  };

  return (
    <div className="max-w-2xl bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 transition-colors">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Configuración Financiera</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Costos Fijos Mensuales ($)</label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Renta, luz, nómina base, servicios, etc.</p>
          <input
            type="number"
            value={fixedCosts}
            onChange={(e) => setFixedCosts(parseFloat(e.target.value))}
            className="block w-full border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-3 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Margen de Contribución Promedio (%)</label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Usado para calcular el punto de equilibrio. Ej: 35%.</p>
          <input
            type="number"
            value={margin}
            onChange={(e) => setMargin(parseFloat(e.target.value))}
            className="block w-full border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 border p-3 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={handleSave} variant="primary" className="shadow-md">Guardar Cambios</Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;