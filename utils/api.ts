// API Base URL - automatically uses current domain in production
// API Base URL - Environment aware
// API Base URL - Environment aware
export const API_URL = (import.meta as any).env?.VITE_API_URL || ((import.meta as any).env?.PROD ? '' : 'http://localhost:80');

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
    // Also clear any sessionStorage to ensure complete logout
    sessionStorage.clear();
};

// Decode JWT token (simple base64 decode - no verification needed on client)
export const decodeToken = (token: string): any | null => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};

// Get current user from stored token
export const getCurrentUserFromToken = (): any | null => {
    const token = getAuthToken();
    if (!token) return null;

    const decoded = decodeToken(token);
    if (!decoded) return null;

    // Check if token is expired
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        clearAuthToken();
        return null;
    }

    // Return user object from token payload
    return {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        storeId: decoded.storeId,
        store_id: decoded.storeId, // Alias for compatibility
        storeName: decoded.storeName || 'Store',
        organizationId: decoded.organizationId
    };
};

// Validate if token is still valid (not expired)
export const isTokenValid = (): boolean => {
    const token = getAuthToken();
    if (!token) return false;

    const decoded = decodeToken(token);
    if (!decoded) return false;

    // Check if token is expired (with 30 second buffer)
    if (decoded.exp && decoded.exp * 1000 < Date.now() + 30000) {
        return false;
    }

    return true;
};

// Handle session expiration centrally
const handleSessionExpired = () => {
    clearAuthToken();

    // Clear cash session from localStorage on 401
    localStorage.removeItem('cashSession');

    // Show user-friendly alert
    alert('⚠️ Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');

    // Redirect to login
    window.location.href = '/login';
};

// Global API response handler - intercepts 401 errors
const handleApiResponse = async (response: Response): Promise<Response> => {
    // Detect 401 Unauthorized
    if (response.status === 401) {
        console.error('🔒 401 Unauthorized - Session expired or invalid credentials');
        handleSessionExpired();
        throw new Error('SESIÓN_EXPIRADA');
    }

    // For other errors, let the caller handle them
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP Error ${response.status}`);
    }

    return response;
};

// Get headers with auth
export const getHeaders = (): HeadersInit => {
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
        await handleApiResponse(response);
        return response.json();
    },

    login: async (usuario: string, password: string) => {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, password })
        });
        await handleApiResponse(response);
        return response.json();
    },

    requestPasswordReset: async (email: string, phone: string) => {
        const response = await fetch(`${API_URL}/api/auth/request-password-reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, phone })
        });
        await handleApiResponse(response);
        return response.json();
    },

    updateProfile: async (data: { storeName: string, newPassword?: string }) => {
        const response = await fetch(`${API_URL}/api/me/profile`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        await handleApiResponse(response);
        return response.json();
    },

    adminResetPassword: async (targetStoreId: string, newPassword: string) => {
        const response = await fetch(`${API_URL}/api/admin/reset-password`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ targetStoreId, newPassword })
        });
        await handleApiResponse(response);
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
        await handleApiResponse(response);
        return response.json();
    },

    create: async (product: any) => {
        const response = await fetch(`${API_URL}/api/productos`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(product)
        });
        await handleApiResponse(response);
        return response.json();
    },

    update: async (id: string, product: any) => {
        const response = await fetch(`${API_URL}/api/productos/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(product)
        });
        await handleApiResponse(response);
        return response.json();
    },

    delete: async (id: string) => {
        const response = await fetch(`${API_URL}/api/productos/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        await handleApiResponse(response);
        return response.json();
    }
};

export const storesAPI = {
    getAll: async () => {
        const response = await fetch(`${API_URL}/api/stores`, {
            headers: getHeaders()
        });
        await handleApiResponse(response);
        return response.json();
    },
    create: async (data: any) => {
        const response = await fetch(`${API_URL}/api/stores/new`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        await handleApiResponse(response);
        return response.json();
    },
    delete: async (id: string, password: string) => {
        const response = await fetch(`${API_URL}/api/stores/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
            body: JSON.stringify({ password })
        });
        await handleApiResponse(response);
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
        await handleApiResponse(response);
        const data = await response.json();
        // Map backend createdAt to frontend date property
        return data.map((sale: any) => ({
            ...sale,
            date: sale.createdAt || sale.date
        }));
    },

    create: async (sale: any) => {
        const response = await fetch(`${API_URL}/api/ventas`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(sale)
        });
        await handleApiResponse(response);
        return response.json();
    },

    sync: async (pendingSales: any[]) => {
        const response = await fetch(`${API_URL}/api/ventas/sync`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ sales: pendingSales })
        });
        await handleApiResponse(response);
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
        await handleApiResponse(response);
        return response.json();
    },

    create: async (expense: any) => {
        const response = await fetch(`${API_URL}/api/expenses`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(expense)
        });
        await handleApiResponse(response);
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
        await handleApiResponse(response);
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
        await handleApiResponse(response);
        return response.json();
    },

    create: async (ticket: any) => {
        const response = await fetch(`${API_URL}/api/tickets`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(ticket)
        });
        await handleApiResponse(response);
        return response.json();
    },

    update: async (id: string, updates: any) => {
        const response = await fetch(`${API_URL}/api/tickets/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(updates)
        });
        await handleApiResponse(response);
        return response.json();
    }
};

