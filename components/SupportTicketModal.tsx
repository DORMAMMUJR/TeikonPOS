
import React, { useState } from 'react';
import { X, Send, LifeBuoy, User as UserIcon, Store as StoreIcon, MessageSquare } from 'lucide-react';
import Button from './Button';

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SupportTicketModal: React.FC<SupportTicketModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    requesterName: '',
    storeName: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newTicket = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      status: 'pending',
      ...formData
    };

    // Persistence Logic
    const existingTicketsRaw = localStorage.getItem('teikon_tickets');
    const existingTickets = existingTicketsRaw ? JSON.parse(existingTicketsRaw) : [];
    const updatedTickets = [newTicket, ...existingTickets];
    localStorage.setItem('teikon_tickets', JSON.stringify(updatedTickets));

    // UI Logic
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      setFormData({ requesterName: '', storeName: '', description: '' });
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex justify-between items-start mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl text-white">
                <LifeBuoy size={20} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 dark:text-white">Teikon Support Center</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Asistencia Técnica Directa</p>
              </div>
            </div>
<<<<<<< HEAD
            <button
              onClick={onClose}
              aria-label="Cerrar modal"
              title="Cerrar"
              className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
=======
            <button onClick={onClose} aria-label="Cerrar" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
>>>>>>> bf8c5a6c68ba90d674e30bc90174141a3a0b2683
              <X size={20} />
            </button>
          </div>

          {showSuccess ? (
            <div className="py-12 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in">
              <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                <Send size={32} />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">¡Ticket Enviado!</h4>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Nuestro equipo revisará el reporte pronto.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Solicitante</label>
                  <div className="relative group">
<<<<<<< HEAD
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" size={16} />
=======
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" size={16} />
>>>>>>> bf8c5a6c68ba90d674e30bc90174141a3a0b2683
                    <input
                      required
                      placeholder="Nombre Completo"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
                      value={formData.requesterName}
                      onChange={e => setFormData({ ...formData, requesterName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Tienda / Nodo</label>
                  <div className="relative group">
<<<<<<< HEAD
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" size={16} />
=======
                    <StoreIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" size={16} />
>>>>>>> bf8c5a6c68ba90d674e30bc90174141a3a0b2683
                    <input
                      required
                      placeholder="Sucursal"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
                      value={formData.storeName}
                      onChange={e => setFormData({ ...formData, storeName: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Descripción del Problema</label>
                <div className="relative group">
                  <MessageSquare className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500" size={16} />
                  <textarea
                    required
                    placeholder="Describe detalladamente el error o consulta..."
                    rows={4}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all resize-none"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Procesando...' : <><Send size={14} /> Enviar Reporte</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportTicketModal;
