import { useEffect, useRef } from 'react';

/**
 * Hook "Híbrido" para interceptar eventos de escáner a nivel global.
 * 1. Usa el 'diff' como timeout implícito para discriminar entrada de láser vs humano.
 * 2. Usa un 'setTimeout' de limpieza rápida para cubrir el edge case: 
 *    (Humano presiona 2 teclas rápido -> se distrae -> luego escanea láser completo)
 */
export const useBarcodeScanner = (onScan: (code: string) => void) => {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const isScanningRef = useRef(false);
  const cleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const SCAN_SPEED_THRESHOLD = 50; 
    const CLEANUP_TIMEOUT = 100; // Si pasa más de 100ms sin otra tecla, fue basura humana.

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
        return;
      }

      // Reiniciamos el timer de limpieza preventiva en cada pulsación
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }

      const currentTime = Date.now();
      const diff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // REGLA 1: Time diff (el timeout implícito)
      if (diff > SCAN_SPEED_THRESHOLD) {
        bufferRef.current = '';
        isScanningRef.current = false;
      } else {
        isScanningRef.current = true;
      }

      if (e.key === 'Enter') {
        if (isScanningRef.current && bufferRef.current.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          onScan(bufferRef.current);
          
          bufferRef.current = '';
          isScanningRef.current = false;
        }
        return;
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }

      // REGLA 2: Cleanup Timeout ("El edge case de distracción rápida")
      // Si el buffer tiene "A B" rápido, y de repente pasan CLEANUP_TIMEOUT ms sin otra letra...
      // El humano se distrajo. Borramos esa basura para no mezclarla con el siguiente escáner de hardware real.
      cleanupTimeoutRef.current = setTimeout(() => {
        bufferRef.current = '';
        isScanningRef.current = false;
      }, CLEANUP_TIMEOUT);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, [onScan]);
};
