import React from 'react';
import { useStore } from '../context/StoreContext';
import { DollarSign, ShoppingBag, TrendingUp, AlertTriangle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { getDashboardStats, products } = useStore();
  const stats = getDashboardStats('month');
  
  // Low stock
  const lowStockProducts = products.filter(p => p.isActive && p.stock <= p.minStock);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Dashboard Mensual</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Resumen de operaciones y finanzas.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-l-4 border-green-500 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ventas Totales</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${stats.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Utilidad Bruta</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${stats.totalProfit.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-l-4 border-purple-500 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tickets</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.salesCount}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
              <ShoppingBag className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-l-4 border-orange-500 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ticket Promedio</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${stats.ticketAverage.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-l-4 border-red-500">
          <div className="flex items-center space-x-2 mb-4 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="text-lg font-medium">Alertas de Stock Bajo</h3>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Stock Actual</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Mínimo</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {lowStockProducts.map(p => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">{p.name}</td>
                    <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400 font-bold">{p.stock}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{p.minStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;