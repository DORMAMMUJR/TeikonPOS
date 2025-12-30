// API Base URL - automatically uses current domain in production
// API Base URL - Environment aware
const API_URL = (import.meta as any).env?.VITE_API_URL || ((import.meta as any).env?.PROD ? '' : 'http://localhost:80');

// Get auth token from localStorage
export const getAuthToken = (): string | null => {
    return localStorage.getItem('token');
};

// Set auth token
export const setAuthToken = (token: string): void => {
    localStorage.setItem('token', token);
};

// Clear auth token
export const clearAuthToken = (): void => {
    localStorage.removeItem('token');
};

// Get headers with auth
const getHeaders = (): HeadersInit => {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
};

// ==========================================
// AUTH API
// ==========================================

export const authAPI = {
    register: async (data: {
        organizationName: string;
        storeName: string;
        usuario: string;
        password: string;
        email: string;
        telefono?: string;
    }) => {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },

    login: async (usuario: string, password: string) => {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, password })
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    }
};

// ==========================================
// PRODUCTS API
// ==========================================

export const productsAPI = {
    getAll: async () => {
        const response = await fetch(`${API_URL}/api/productos`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },

    create: async (product: any) => {
        const response = await fetch(`${API_URL}/api/productos`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(product)
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },

    update: async (id: string, product: any) => {
        const response = await fetch(`${API_URL}/api/productos/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(product)
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },

    delete: async (id: string) => {
        const response = await fetch(`${API_URL}/api/productos/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    }
};

export const storesAPI = {
    getAll: async () => {
        const response = await fetch(`${API_URL}/api/stores`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },
    create: async (data: any) => {
        const response = await fetch(`${API_URL}/api/stores/new`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },
    delete: async (id: string) => {
        const response = await fetch(`${API_URL}/api/stores/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    }
};

// ==========================================
// SALES API
// ==========================================

export const salesAPI = {
    getAll: async () => {
        const response = await fetch(`${API_URL}/api/ventas`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },

    create: async (sale: any) => {
        const response = await fetch(`${API_URL}/api/ventas`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(sale)
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },

    sync: async (pendingSales: any[]) => {
        const response = await fetch(`${API_URL}/api/ventas/sync`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ sales: pendingSales })
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    }
};

// ==========================================
// EXPENSES API
// ==========================================

export const expensesAPI = {
    getAll: async () => {
        const response = await fetch(`${API_URL}/api/expenses`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },

    create: async (expense: any) => {
        const response = await fetch(`${API_URL}/api/expenses`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(expense)
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    }
};

// ==========================================
// DASHBOARD API
// ==========================================

export const dashboardAPI = {
    getSummary: async (period: 'day' | 'month', storeId?: string) => {
        let url = `${API_URL}/api/dashboard/summary?period=${period}`;
        if (storeId) {
            url += `&storeId=${storeId}`;
        }
        const response = await fetch(url, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    }
};

// ==========================================
// TICKETS API
// ==========================================

export const ticketsAPI = {
    getAll: async () => {
        const response = await fetch(`${API_URL}/api/tickets`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },

    create: async (ticket: any) => {
        const response = await fetch(`${API_URL}/api/tickets`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(ticket)
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },

    update: async (id: string, updates: any) => {
        const response = await fetch(`${API_URL}/api/tickets/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    }
};

