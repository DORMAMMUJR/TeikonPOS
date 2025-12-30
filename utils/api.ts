// API Base URL - automatically uses current domain in production
const API_URL = (import.meta as any).env?.PROD ? '' : 'http://localhost:80';

// Get auth token from localStorage
export const getAuthToken = (): string | null => {
    return localStorage.getItem('authToken');
};

// Set auth token
export const setAuthToken = (token: string): void => {
    localStorage.setItem('authToken', token);
};

// Clear auth token
export const clearAuthToken = (): void => {
    localStorage.removeItem('authToken');
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

    sync: async (sales: any[]) => {
        const response = await fetch(`${API_URL}/api/ventas/sync`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ ventas: sales })
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    }
};

// ==========================================
// DASHBOARD API
// ==========================================

export const dashboardAPI = {
    getSummary: async (period: 'day' | 'week' | 'month' | 'year' = 'month') => {
        const response = await fetch(`${API_URL}/api/dashboard/summary?period=${period}`, {
            headers: getHeaders()
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
        const response = await fetch(`${API_URL}/api/gastos`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },

    create: async (expense: any) => {
        const response = await fetch(`${API_URL}/api/gastos`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(expense)
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    }
};

// ==========================================
// STORES API
// ==========================================

export const storesAPI = {
    getAll: async () => {
        const response = await fetch(`${API_URL}/api/stores`, {
            headers: getHeaders()
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

