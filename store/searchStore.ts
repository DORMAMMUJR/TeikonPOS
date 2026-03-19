import { create } from 'zustand';

interface SearchState {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  clearSearch: () => void;
}

/**
 * useSearchStore:
 * Aisla el estado de búsqueda del ciclo de vida del layout principal.
 * Permite que POSHeader y ProductGrid se comuniquen sin disparar re-renders
 * en componentes hermanos o padres que no necesitan conocer el término de búsqueda.
 */
export const useSearchStore = create<SearchState>((set) => ({
  searchTerm: '',
  setSearchTerm: (term: string) => set({ searchTerm: term }),
  clearSearch: () => set({ searchTerm: '' }),
}));
