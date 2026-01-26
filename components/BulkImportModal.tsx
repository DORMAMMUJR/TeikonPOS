import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
    Upload, FileSpreadsheet, FolderOpen, CheckCircle, AlertCircle, X,
    Download, HelpCircle, AlertTriangle, Image as ImageIcon
} from 'lucide-react';
import { Modal, Button } from '../src/components/ui';
import { productsAPI } from '../utils/api';

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    targetStoreId?: string;
}

interface ParsedProduct {
    sku: string;
    nombre: string;
    categoria: string;
    costPrice: number;
    salePrice: number;
    stock: number;
    minStock: number;
    imagen?: string;
    warning?: string; // Para advertencias de negocio
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onSuccess, targetStoreId }) => {
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [imageFiles, setImageFiles] = useState<FileList | null>(null);
    const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [importResult, setImportResult] = useState<any>(null);

    const excelInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    // --- FUNCIÓN: DESCARGAR PLANTILLA ---
    const handleDownloadTemplate = () => {
        const headers = ['SKU', 'Nombre', 'Precio', 'Costo', 'Existencia', 'Categoria'];
        const rows = [
            ['CAM-001', 'Camiseta Básica Negra', '250.00', '120.00', '50', 'Ropa'],
            ['TEN-XYZ', 'Tenis Deportivos', '1200.50', '800.00', '15', 'Calzado'],
            ['GOR-RED', 'Gorra Roja', '300.00', '150.00', '20', 'Accesorios']
        ];
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'plantilla_teikon.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Normalizar cabeceras del Excel
    const normalizeHeader = (header: string): string => {
        const normalized = header.toLowerCase().trim();

        const headerMap: { [key: string]: string } = {
            'sku': 'sku',
            'código': 'sku',
            'codigo': 'sku',
            'barcode': 'sku',
            'clave': 'sku',
            'nombre': 'nombre',
            'name': 'nombre',
            'producto': 'nombre',
            'categoría': 'categoria',
            'categoria': 'categoria',
            'category': 'categoria',
            'costo': 'costPrice',
            'costo compra': 'costPrice',
            'precio costo': 'costPrice',
            'cost': 'costPrice',
            'precio': 'salePrice',
            'precio venta': 'salePrice',
            'venta': 'salePrice',
            'price': 'salePrice',
            'sale price': 'salePrice',
            'saleprice': 'salePrice',
            'stock': 'stock',
            'existencia': 'stock',
            'inventario': 'stock',
            'stock mínimo': 'minStock',
            'stock minimo': 'minStock',
            'min stock': 'minStock',
            'mínimo': 'minStock',
            'minimo': 'minStock'
        };

        return headerMap[normalized] || normalized;
    };

    // Convertir imagen a Base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Procesar Excel y cruzar con imágenes
    const handleProcess = async () => {
        if (!excelFile) {
            setError('Por favor selecciona un archivo Excel');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // Leer archivo Excel
            const data = await excelFile.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                throw new Error('El archivo Excel está vacío');
            }

            // Crear mapa de imágenes por SKU
            const imageMap = new Map<string, File>();
            if (imageFiles) {
                for (let i = 0; i < imageFiles.length; i++) {
                    const file = imageFiles[i];
                    const fileName = file.name.split('.')[0].toUpperCase();
                    imageMap.set(fileName, file);
                }
            }

            // Procesar productos
            const products: ParsedProduct[] = [];

            for (const row of jsonData as any[]) {
                // Normalizar cabeceras
                const normalizedRow: any = {};
                for (const [key, value] of Object.entries(row)) {
                    const normalizedKey = normalizeHeader(key);
                    normalizedRow[normalizedKey] = value;
                }

                const sku = String(normalizedRow.sku || '').trim().toUpperCase();

                if (!sku) continue;

                const costPrice = Number(normalizedRow.costPrice || 0);
                const salePrice = Number(normalizedRow.salePrice || 0);

                // Validación de negocio
                let warning = undefined;
                if (salePrice < costPrice && salePrice > 0 && costPrice > 0) {
                    warning = "⚠️ Precio menor al costo";
                } else if (salePrice === 0) {
                    warning = "⚠️ Precio es 0";
                }

                const product: ParsedProduct = {
                    sku,
                    nombre: String(normalizedRow.nombre || '').trim(),
                    categoria: String(normalizedRow.categoria || 'General').trim(),
                    costPrice,
                    salePrice,
                    stock: Number(normalizedRow.stock || 0),
                    minStock: Number(normalizedRow.minStock || 5),
                    warning
                };

                // Buscar imagen correspondiente
                const imageFile = imageMap.get(sku);
                if (imageFile) {
                    try {
                        product.imagen = await fileToBase64(imageFile);
                    } catch (imgError) {
                        console.warn(`No se pudo convertir imagen para SKU ${sku}:`, imgError);
                    }
                }

                products.push(product);
            }

            setParsedProducts(products);
            console.log(`✅ Procesados ${products.length} productos`);

        } catch (err: any) {
            console.error('Error al procesar archivo:', err);
            setError(err.message || 'Error al procesar el archivo');
        } finally {
            setIsProcessing(false);
        }
    };

    // Enviar al servidor
    const handleUpload = async () => {
        if (parsedProducts.length === 0) {
            setError('No hay productos para importar');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setError(null);

        try {
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const response = await productsAPI.bulkImport({
                products: parsedProducts,
                storeId: targetStoreId
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            console.log('✅ Importación exitosa:', response);
            setImportResult(response);

            setTimeout(() => {
                onSuccess();
                handleClose();
            }, 2000);

        } catch (err: any) {
            console.error('Error al importar productos:', err);
            setError(err.response?.data?.error || 'Error al importar productos');
            setUploadProgress(0);
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = () => {
        setExcelFile(null);
        setImageFiles(null);
        setParsedProducts([]);
        setIsProcessing(false);
        setIsUploading(false);
        setUploadProgress(0);
        setError(null);
        setShowHelp(false);
        setImportResult(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* HEADER */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Importación Masiva</h2>
                        <button
                            onClick={() => setShowHelp(!showHelp)}
                            className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Ayuda"
                        >
                            <HelpCircle className="w-5 h-5" />
                        </button>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* HELP BANNER */}
                {showHelp && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-4 text-sm text-blue-800 dark:text-blue-300 border-b border-blue-100 dark:border-blue-900">
                        <p className="font-bold mb-2">📘 Guía Rápida:</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
                            <li>El Excel debe tener columnas: <b>SKU, Nombre, Precio, Costo</b></li>
                            <li>Para imágenes automáticas, el nombre del archivo debe ser igual al SKU</li>
                            <li>Ejemplo: SKU "CAM-001" → Imagen "CAM-001.jpg"</li>
                            <li>Descarga la plantilla de ejemplo para ver el formato correcto</li>
                        </ul>
                    </div>
                )}

                {/* CONTENT */}
                <div className="p-6 overflow-y-auto flex-1">
                    {importResult ? (
                        // RESULTADO DE IMPORTACIÓN
                        <div className="text-center py-10 animate-in fade-in zoom-in duration-300">
                            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">¡Importación Completada!</h3>
                            <div className="mt-6 flex justify-center gap-8 text-center">
                                <div>
                                    <p className="text-4xl font-black text-green-600">{importResult.imported || 0}</p>
                                    <p className="text-xs text-slate-500 uppercase font-bold mt-1">Importados</p>
                                </div>
                                <div>
                                    <p className="text-4xl font-black text-slate-400">{importResult.skipped || 0}</p>
                                    <p className="text-xs text-slate-500 uppercase font-bold mt-1">Omitidos</p>
                                </div>
                            </div>
                        </div>
                    ) : parsedProducts.length > 0 ? (
                        // PREVISUALIZACIÓN
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    <span className="font-bold text-blue-800 dark:text-blue-300">
                                        Se detectaron <b className="text-blue-600 dark:text-blue-400">{parsedProducts.length}</b> productos
                                    </span>
                                </div>
                            </div>

                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Img</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">SKU</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Nombre</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Costo</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Precio</th>
                                                <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                            {parsedProducts.slice(0, 50).map((product, index) => (
                                                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <td className="px-4 py-2">
                                                        {product.imagen ? (
                                                            <img src={product.imagen} alt={product.sku} className="w-10 h-10 object-cover rounded border border-slate-200 dark:border-slate-700" />
                                                        ) : (
                                                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center">
                                                                <ImageIcon className="w-4 h-4 text-slate-400" />
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{product.sku}</td>
                                                    <td className="px-4 py-2 text-xs text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{product.nombre}</td>
                                                    <td className="px-4 py-2 text-right text-xs text-slate-600 dark:text-slate-400">${product.costPrice.toFixed(2)}</td>
                                                    <td className="px-4 py-2 text-right text-xs font-bold text-slate-900 dark:text-white">${product.salePrice.toFixed(2)}</td>
                                                    <td className="px-4 py-2 text-center">
                                                        {product.warning ? (
                                                            <div className="group relative inline-block">
                                                                <AlertTriangle className="w-5 h-5 text-amber-500 cursor-help mx-auto" />
                                                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                                                                    {product.warning}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <CheckCircle className="w-5 h-5 text-green-500 mx-auto opacity-30" />
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {parsedProducts.length > 50 && (
                                <p className="text-xs text-slate-500 text-center">
                                    Mostrando primeros 50 de {parsedProducts.length} productos
                                </p>
                            )}

                            {/* Barra de Progreso */}
                            {isUploading && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                                        <span>Importando productos...</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-orange-500 to-orange-600 h-full transition-all duration-300 rounded-full"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Botones de Acción */}
                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={() => { setParsedProducts([]); setExcelFile(null); setImageFiles(null); }}
                                    className="flex-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-slate-300 dark:hover:bg-slate-700"
                                    disabled={isUploading}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleUpload}
                                    disabled={isUploading}
                                    className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isUploading ? (
                                        'Importando...'
                                    ) : (
                                        <>
                                            <CheckCircle size={18} />
                                            Importar {parsedProducts.length} Productos
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        // SELECCIÓN DE ARCHIVOS
                        <div className="space-y-6">
                            {/* Paso 1: Excel */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                        Paso 1: Archivo Excel
                                    </label>
                                    <button
                                        onClick={handleDownloadTemplate}
                                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium py-1 px-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                                    >
                                        <Download className="w-3 h-3" />
                                        Descargar plantilla
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                        id="excel-upload"
                                        ref={excelInputRef}
                                    />
                                    <label
                                        htmlFor="excel-upload"
                                        className="flex items-center justify-center gap-3 w-full p-6 border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-xl cursor-pointer hover:border-orange-500 dark:hover:border-orange-500 transition-colors bg-orange-50/50 dark:bg-orange-950/20"
                                    >
                                        <FileSpreadsheet className="text-orange-500" size={32} />
                                        <div className="text-center">
                                            <span className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                                {excelFile ? excelFile.name : 'Click para seleccionar archivo Excel'}
                                            </span>
                                            <span className="block text-xs text-slate-500 mt-1">
                                                Formatos: .xlsx, .xls, .csv
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Paso 2: Imágenes */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    Paso 2: Carpeta de Imágenes (Opcional)
                                </label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        // @ts-ignore
                                        webkitdirectory="true"
                                        multiple
                                        onChange={(e) => setImageFiles(e.target.files)}
                                        className="hidden"
                                        id="images-upload"
                                        ref={folderInputRef}
                                    />
                                    <label
                                        htmlFor="images-upload"
                                        className="flex items-center justify-center gap-3 w-full p-6 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors bg-blue-50/50 dark:bg-blue-950/20"
                                    >
                                        <FolderOpen className="text-blue-500" size={32} />
                                        <div className="text-center">
                                            <span className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                                {imageFiles ? `${imageFiles.length} imágenes seleccionadas` : 'Click para seleccionar carpeta de imágenes'}
                                            </span>
                                            <span className="block text-xs text-slate-500 mt-1">
                                                Las imágenes deben nombrarse igual que el SKU
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Botón Procesar */}
                            <Button
                                onClick={handleProcess}
                                disabled={!excelFile || isProcessing}
                                className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={18} />
                                        Procesar Datos
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Mensajes de Error */}
                    {error && (
                        <div className="mt-4 flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl">
                            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                            <span className="text-sm font-bold text-red-700 dark:text-red-400">{error}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkImportModal;
