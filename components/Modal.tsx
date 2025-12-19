
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-brand-bg/80 backdrop-blur-sm transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        ></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div 
          className="relative inline-block align-bottom bg-brand-panel border border-brand-border text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full cut-corner p-6"
        >
          <div className="flex justify-between items-start mb-8 border-b border-brand-border pb-4">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-brand-text" id="modal-title">
              {title}
            </h3>
            <button
              type="button"
              className="text-brand-muted hover:text-brand-text transition-colors"
              onClick={onClose}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="text-brand-text">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
