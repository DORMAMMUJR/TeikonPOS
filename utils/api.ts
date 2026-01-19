// API Base URL - Environment aware with proper empty string handling
// Build: 2026-01-02T22:15:00 - Cache Bust
export const API_URL = (import.meta as any).env?.VITE_API_URL !== undefined
    ? (import.meta as any).env.VITE_API_URL
    : ((import.meta as any).env?.PROD ? '' : 'http://localhost:5000');

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

// Check if token will expire soon and warn user
export const checkTokenExpirationWarning = (): void => {
    const token = getAuthToken();
    if (!token) return;

    const decoded = decodeToken(token);
    if (!decoded?.exp) return;

    const expDate = new Date(decoded.exp * 1000);
    const now = new Date();
    const timeLeft = expDate.getTime() - now.getTime();
    const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));

    // Warn if less than 7 days remaining
    if (daysLeft > 0 && daysLeft <= 7) {
        console.warn(`⚠️ TOKEN EXPIRATION WARNING: Your session will expire in ${daysLeft} day(s)`);
        console.warn(`   Expiration date: ${expDate.toLocaleString('es-MX')}`);

        // Show one-time warning to user (using sessionStorage to avoid repeated alerts)
        const warningShown = sessionStorage.getItem('tokenExpirationWarningShown');
        if (!warningShown) {
            setTimeout(() => {
                alert(`⚠️ Aviso: Tu sesión expirará en ${daysLeft} día(s).\n\nFecha de expiración: ${expDate.toLocaleDateString('es-MX')}\n\nPor favor, guarda tu trabajo y vuelve a iniciar sesión pronto.`);
                sessionStorage.setItem('tokenExpirationWarningShown', 'true');
            }, 2000); // Delay to avoid blocking app initialization
        }
    }
};

// Validate if token is still valid (not expired)
export const isTokenValid = (): boolean => {
    const token = getAuthToken();
    if (!token) {
        console.log('🔍 Token Validation: No token found');
        return false;
    }

    const decoded = decodeToken(token);
    if (!decoded) {
        console.error('🔍 Token Validation: Failed to decode token (corrupted)');
        return false;
    }

    // Check if token is expired (with 30 second buffer)
    if (decoded.exp && decoded.exp * 1000 < Date.now() + 30000) {
        const expDate = new Date(decoded.exp * 1000);
        const now = new Date();
        console.error('🔍 Token Validation: Token expired');
        console.error(`   Expired at: ${expDate.toLocaleString('es-MX')}`);
        console.error(`   Current time: ${now.toLocaleString('es-MX')}`);
        return false;
    }

    // Log successful validation with time remaining
    const timeLeft = decoded.exp * 1000 - Date.now();
    const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    console.log(`🔍 Token Validation: ✅ Valid (${daysLeft} days remaining)`);

    return true;
};

// Handle session expiration centrally
const handleSessionExpired = () => {
    // Determine if we are already on the login page
    const isLoginPage = window.location.pathname === '/login';

    if (isLoginPage) {
        // If we are already on the login page, just clear the token silently
        // This avoids infinite alert loops if API calls fail during login
        console.warn('🔒 Session invalid, but user is already on login page. Clearing token silently.');
        clearAuthToken();
        localStorage.removeItem('cashSession');
        return;
    }

    console.error('🔒 SESSION EXPIRED - Cleaning up and redirecting to login');

    // Get token info before clearing for better error message
    const token = getAuthToken();
    let expirationInfo = '';

    if (token) {
        try {
            const decoded = decodeToken(token);
            if (decoded?.exp) {
                const expDate = new Date(decoded.exp * 1000);
                const now = new Date();
                const daysSinceExpired = Math.floor((now.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24));

                if (daysSinceExpired > 0) {
                    expirationInfo = `\n\nTu sesión expiró hace ${daysSinceExpired} día(s).`;
                } else {
                    expirationInfo = '\n\nTu sesión ha expirado.';
                }
            }
        } catch (e) {
            console.warn('Could not decode token for expiration info:', e);
        }
    }

    clearAuthToken();

    // Clear cash session from localStorage on 401
    localStorage.removeItem('cashSession');

    // Show user-friendly alert with more context
    alert(`⚠️ Tu sesión ha expirado${expirationInfo}\n\nPor favor, inicia sesión nuevamente para continuar.`);

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

// Robust wrapper for fetch with error handling
const safeFetch = async (url: string, options: RequestInit): Promise<Response> => {
    try {
        const response = await fetch(url, options);
        return handleApiResponse(response);
    } catch (error: any) {
        // Handle Network Errors (TypeError: Failed to fetch)
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            console.error('❌ Network Error (CORS/Server Down):', error);

            // Determine if using relative or absolute URL
            const isRelativeURL = !API_URL || API_URL === '' || API_URL.startsWith('/');
            const isHTTPS = API_URL.startsWith('https');

            let msg: string;
            if (isRelativeURL) {
                msg = `⚠️ Error de Conexión:\nNo se pudo conectar al servidor.\n\nPosibles causas:\n• El servidor está en mantenimiento\n• Problema de conexión a internet\n• Verifica que el backend esté corriendo`;
            } else if (isHTTPS) {
                msg = `⚠️ Error de Conexión con Servidor SaaS:\nNo se pudo conectar a ${API_URL}.\n\nPosibles causas:\n• Mantenimiento del servidor\n• Problema de conexión a internet`;
            } else {
                const portMatch = API_URL.match(/:(\d+)/);
                const port = portMatch ? portMatch[1] : '5000';
                msg = `⚠️ Error de Conexión: No se pudo contactar al servidor en el puerto ${port}.\n\nPosibles causas:\n• El servidor backend no está corriendo\n• Antivirus/Firewall bloqueando la conexión`;
            }

            alert(msg);
            throw new Error('NETWORK_ERROR');
        }
        throw error;
    }
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
        const response = await safeFetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    },

    login: async (usuario: string, password: string) => {
        const response = await safeFetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, password })
        });
        return response.json();
    },

    requestPasswordReset: async (email: string, phone: string) => {
        const response = await safeFetch(`${API_URL}/api/auth/request-password-reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, phone })
        });
        return response.json();
    },

    updateProfile: async (data: { storeName: string, newPassword?: string }) => {
        const response = await safeFetch(`${API_URL}/api/me/profile`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return response.json();
    },

    adminUpdateStore: async (
        targetStoreId: string,
        updates: {
            name?: string;
            ownerName?: string;
            email?: string;
            newPassword?: string;
        }
    ) => {
        const response = await safeFetch(`${API_URL}/api/admin/update-store`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ targetStoreId, ...updates })
        });
        return response.json();
    }
};

// ==========================================
// PRODUCTS API
// ==========================================

export const productsAPI = {
    getAll: async (options?: { storeId?: string }) => {
        const LIMIT = 50;
        let allProducts: any[] = [];
        let page = 1;
        let totalPages = 1;

        // Fetch first page to get total pages value
        try {
            // Build URL with optional storeId filter
            let baseUrl = `${API_URL}/api/productos`;
            const queryParams = [`page=${page}`, `limit=${LIMIT}`];

            // IMPROVED: Add storeId filter if provided (for Super Admin viewing specific store)
            if (options?.storeId) {
                queryParams.push(`storeId=${options.storeId}`);
            }

            const url = `${baseUrl}?${queryParams.join('&')}`;

            // Initial Request
            const response1 = await safeFetch(url, {
                headers: getHeaders()
            });
            const data1 = await response1.json();

            // Handle response format (Paginated vs Legacy/Flat)
            if (data1.data && Array.isArray(data1.data)) {
                allProducts = [...data1.data];
                totalPages = data1.totalPages || 1;
                page++;

                // If more pages exist, fetch them sequentially (to be kind to server) or parallel
                while (page <= totalPages) {
                    const pageUrl = `${baseUrl}?${queryParams.map(p => p.startsWith('page=') ? `page=${page}` : p).join('&')}`;
                    const res = await safeFetch(pageUrl, {
                        headers: getHeaders()
                    });
                    const pageData = await res.json();
                    if (pageData.data) {
                        allProducts = [...allProducts, ...pageData.data];
                    }
                    page++;
                }

                return allProducts;
            } else if (Array.isArray(data1)) {
                // Fallback if backend hasn't updated or returns flat array
                return data1;
            }

            return [];
        } catch (error) {
            console.error('Error fetching products chunked:', error);
            throw error;
        }
    },

    create: async (product: any) => {
        const response = await safeFetch(`${API_URL}/api/productos`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(product)
        });
        return response.json();
    },

    update: async (id: string, product: any) => {
        const response = await safeFetch(`${API_URL}/api/productos/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(product)
        });
        return response.json();
    },

    delete: async (id: string) => {
        const response = await safeFetch(`${API_URL}/api/productos/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        return response.json();
    }
};

export const storesAPI = {
    getAll: async () => {
        const response = await safeFetch(`${API_URL}/api/stores`, {
            headers: getHeaders()
        });
        return response.json();
    },
    create: async (data: any) => {
        const response = await safeFetch(`${API_URL}/api/stores/new`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return response.json();
    },
    delete: async (id: string, password: string) => {
        const response = await safeFetch(`${API_URL}/api/stores/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
            body: JSON.stringify({ password })
        });
        return response.json();
    }
};

// ==========================================
// SALES API
// ==========================================

export const salesAPI = {
    getAll: async (options?: { storeId?: string }) => {
        // Build URL with optional storeId filter
        let url = `${API_URL}/api/ventas`;

        // IMPROVED: Add storeId filter if provided (for Super Admin viewing specific store)
        if (options?.storeId) {
            url += `?storeId=${options.storeId}`;
        }

        const response = await safeFetch(url, {
            headers: getHeaders()
        });
        const data = await response.json();
        // Map backend createdAt to frontend date property
        return data.map((sale: any) => ({
            ...sale,
            date: sale.createdAt || sale.date
        }));
    },

    getById: async (id: string) => {
        const response = await safeFetch(`${API_URL}/api/ventas/${id}`, {
            headers: getHeaders()
        });
        const data = await response.json();
        // Map backend createdAt to frontend date property for consistency
        return {
            ...data,
            date: data.createdAt || data.date
        };
    },

    create: async (sale: any) => {
        const response = await safeFetch(`${API_URL}/api/ventas`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(sale)
        });
        return response.json();
    },

    sync: async (pendingSales: any[]) => {
        const response = await safeFetch(`${API_URL}/api/ventas/sync`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ sales: pendingSales })
        });
        return response.json();
    }
};

// ==========================================
// EXPENSES API
// ==========================================

export const expensesAPI = {
    getAll: async () => {
        const response = await safeFetch(`${API_URL}/api/expenses`, {
            headers: getHeaders()
        });
        return response.json();
    },

    create: async (expense: any) => {
        const response = await safeFetch(`${API_URL}/api/expenses`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(expense)
        });
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
        const response = await safeFetch(url, {
            headers: getHeaders()
        });
        return response.json();
    }
};

// ==========================================
// TICKETS API
// ==========================================

export const ticketsAPI = {
    getAll: async () => {
        const response = await safeFetch(`${API_URL}/api/tickets`, {
            headers: getHeaders()
        });
        return response.json();
    },

    create: async (ticket: any) => {
        const response = await safeFetch(`${API_URL}/api/tickets`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(ticket)
        });
        return response.json();
    },

    update: async (id: string, updates: any) => {
        const response = await safeFetch(`${API_URL}/api/tickets/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(updates)
        });
        return response.json();
    }
};

// ==========================================
// SHIFTS API (TURNO DE CAJA)
// ==========================================

export const shiftsAPI = {
    start: async (startBalance: number) => {
        const response = await safeFetch(`${API_URL}/api/shifts/start`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ startBalance })
        });
        return response.json();
    },

    getCurrent: async () => {
        const response = await safeFetch(`${API_URL}/api/shifts/current`, {
            headers: getHeaders()
        });
        // Backend returns null if no active shift, 200 OK
        return response.json();
    },

    end: async (shiftId: string, data: any) => {
        const response = await safeFetch(`${API_URL}/api/shifts/end`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ shiftId, ...data })
        });
        return response.json();
    }
};

// ==========================================
// TICKET SETTINGS API
// ==========================================

export const ticketSettingsAPI = {
    get: async (storeId: string) => {
        const response = await safeFetch(`${API_URL}/api/ticket-settings/${storeId}`, {
            headers: getHeaders()
        });
        return response.json();
    },

    update: async (storeId: string, settings: any) => {
        const response = await safeFetch(`${API_URL}/api/ticket-settings/${storeId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(settings)
        });
        return response.json();
    }
};