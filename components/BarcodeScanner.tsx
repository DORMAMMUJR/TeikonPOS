import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product } from '@/Product';
import { useStore } from '../context/StoreContext';
import { playBeep, playError } from '../utils/sounds';
import { Scan, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface BarcodeScannerProps {
    onProductFound: (product: Product) => void;
    onProductNotFound?: (sku: string) => void;
    disabled?: boolean;
    className?: string;
}

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error';

/**
 * BarcodeScanner Component
 * 
 * Optimized barcode scanner with:
 * - Global keyboard listener for scanner input detection
 * - Auto-focus management
 * - Debouncing to prevent duplicate searches
 * - Visual and audio feedback
 * - Multi-tenant SKU search
 */
const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
    onProductFound,
    onProductNotFound,
    disabled = false,
    className = ''
}) => {
    const { searchProductBySKU } = useStore();
    const [inputValue, setInputValue] = useState('');
    const [status, setStatus] = useState<ScanStatus>('idle');
    const [lastScannedSKU, setLastScannedSKU] = useState<string>('');
    const [scanCount, setScanCount] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastKeypressRef = useRef<number>(0);
    const inputBufferRef = useRef<string>('');

    /**
     * Auto-focus the input when component mounts or becomes enabled
     */
    useEffect(() => {
        if (!disabled && inputRef.current) {
            inputRef.current.focus();
        }
    }, [disabled]);

    /**
     * Maintain focus on the input field
     * Refocus if user clicks elsewhere
     */
    useEffect(() => {
        const handleFocusLoss = () => {
            if (!disabled && inputRef.current && document.activeElement !== inputRef.current) {
                setTimeout(() => {
                    inputRef.current?.focus();
                }, 100);
            }
        };

        document.addEventListener('click', handleFocusLoss);
        return () => document.removeEventListener('click', handleFocusLoss);
    }, [disabled]);

    /**
     * Search product by SKU
     * Optimized with debouncing and duplicate prevention
     */
    const searchProduct = useCallback(async (sku: string) => {
        if (!sku || sku.trim() === '' || disabled) return;

        const normalizedSKU = sku.trim().toUpperCase();

        // Prevent duplicate searches
        if (normalizedSKU === lastScannedSKU && Date.now() - lastKeypressRef.current < 1000) {
            console.log('⏭️ Skipping duplicate scan:', normalizedSKU);
            return;
        }

        setStatus('scanning');
        setLastScannedSKU(normalizedSKU);

        try {
            console.log('🔍 Searching for SKU:', normalizedSKU);
            const product = await searchProductBySKU(normalizedSKU);

            if (product) {
                console.log('✅ Product found:', product.name);
                setStatus('success');
                setScanCount(prev => prev + 1);
                playBeep();
                onProductFound(product);

                // Reset to idle after animation
                setTimeout(() => {
                    setStatus('idle');
                    setInputValue('');
                }, 500);
            } else {
                console.log('❌ Product not found:', normalizedSKU);
                setStatus('error');
                playError();
                onProductNotFound?.(normalizedSKU);

                // Reset to idle after showing error
                setTimeout(() => {
                    setStatus('idle');
                    setInputValue('');
                }, 1500);
            }
        } catch (error) {
            console.error('Error searching product:', error);
            setStatus('error');
            playError();
            onProductNotFound?.(normalizedSKU);

            setTimeout(() => {
                setStatus('idle');
                setInputValue('');
            }, 1500);
        }
    }, [searchProductBySKU, onProductFound, onProductNotFound, disabled, lastScannedSKU]);

    /**
     * Handle input change with scanner detection
     * Barcode scanners typically input very fast (< 50ms between characters)
     */
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);

        const now = Date.now();
        const timeSinceLastKeypress = now - lastKeypressRef.current;
        lastKeypressRef.current = now;

        // Detect scanner input (fast typing)
        const isScannerInput = timeSinceLastKeypress < 50 && value.length > inputBufferRef.current.length;
        inputBufferRef.current = value;

        // Clear existing timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // If scanner detected or Enter key will be pressed, wait for complete input
        // Otherwise debounce for manual typing
        const debounceTime = isScannerInput ? 100 : 300;

        searchTimeoutRef.current = setTimeout(() => {
            if (value.trim() !== '') {
                searchProduct(value);
            }
        }, debounceTime);
    };

    /**
     * Handle Enter key press for manual input
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();

            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }

            if (inputValue.trim() !== '') {
                searchProduct(inputValue);
            }
        }
    };

    /**
     * Cleanup timeouts on unmount
     */
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    /**
     * Get status icon and color
     */
    const getStatusDisplay = () => {
        switch (status) {
            case 'scanning':
                return {
                    icon: <Loader2 className="animate-spin" size={20} />,
                    color: 'text-blue-500',
                    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
                    borderColor: 'border-blue-500'
                };
            case 'success':
                return {
                    icon: <CheckCircle2 size={20} />,
                    color: 'text-green-500',
                    bgColor: 'bg-green-50 dark:bg-green-950/20',
                    borderColor: 'border-green-500'
                };
            case 'error':
                return {
                    icon: <XCircle size={20} />,
                    color: 'text-red-500',
                    bgColor: 'bg-red-50 dark:bg-red-950/20',
                    borderColor: 'border-red-500'
                };
            default:
                return {
                    icon: <Scan size={20} />,
                    color: 'text-orange-500',
                    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
                    borderColor: 'border-orange-500'
                };
        }
    };

    const statusDisplay = getStatusDisplay();

    return (
        <div className={`relative ${className}`}>
            {/* Scanner Input */}
            <div className={`relative transition-all duration-200 ${statusDisplay.bgColor} rounded-xl border-2 ${statusDisplay.borderColor} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                    <div className={statusDisplay.color}>
                        {statusDisplay.icon}
                    </div>
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    placeholder="Escanea código de barras o ingresa SKU..."
                    className={`w-full pl-12 pr-24 py-4 bg-transparent text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none ${disabled ? 'cursor-not-allowed' : ''}`}
                    autoComplete="off"
                    autoFocus
                />

                {/* Scan Counter */}
                {scanCount > 0 && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="px-3 py-1 bg-orange-500 text-white text-xs font-black rounded-full">
                            {scanCount} items
                        </div>
                    </div>
                )}
            </div>

            {/* Status Messages */}
            {status === 'error' && (
                <div className="mt-2 text-xs font-bold text-red-500 flex items-center gap-2">
                    <XCircle size={14} />
                    <span>Producto no encontrado: {lastScannedSKU}</span>
                </div>
            )}

            {status === 'success' && (
                <div className="mt-2 text-xs font-bold text-green-500 flex items-center gap-2 animate-pulse">
                    <CheckCircle2 size={14} />
                    <span>¡Producto agregado!</span>
                </div>
            )}

            {/* Instructions */}
            {status === 'idle' && scanCount === 0 && (
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    💡 Tip: Escanea códigos de barras o presiona Enter después de ingresar el SKU
                </div>
            )}
        </div>
    );
};

export default BarcodeScanner;
