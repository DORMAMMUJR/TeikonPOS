/**
 * Authentication Utility Functions
 */

/**
 * Checks if the current authentication token is valid
 * @returns true if token exists and is not expired
 */
export function isTokenValid(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
        // Decode JWT token to check expiration
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // Convert to milliseconds
        return Date.now() < exp;
    } catch (error) {
        console.error('Error validating token:', error);
        return false;
    }
}

/**
 * Gets the current authentication token
 * @returns token string or null
 */
export function getAuthToken(): string | null {
    return localStorage.getItem('token');
}

/**
 * Clears authentication data
 */
export function clearAuth(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
}
