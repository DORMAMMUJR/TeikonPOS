import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function ConnectionStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showStatus, setShowStatus] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowStatus(true);
            setTimeout(() => setShowStatus(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowStatus(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
            {/* Status Indicator Dot */}
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />

            {/* Status Message (shows temporarily) */}
            {showStatus && (
                <div
                    className={`
            px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium
            ${isOnline ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
            animate-in slide-in-from-right duration-300
          `}
                >
                    {isOnline ? (
                        <>
                            <Wifi size={16} />
                            <span>Conectado</span>
                        </>
                    ) : (
                        <>
                            <WifiOff size={16} />
                            <span>Sin conexión - Modo offline</span>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
