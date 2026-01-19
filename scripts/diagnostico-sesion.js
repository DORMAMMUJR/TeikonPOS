/**
 * DIAGNÓSTICO: Script para identificar problemas de sesión expirada
 * 
 * Instrucciones:
 * 1. Abrir DevTools (F12) en el navegador
 * 2. Ir a la pestaña Console
 * 3. Copiar y pegar este script completo
 * 4. Presionar Enter
 * 5. Compartir el resultado con el equipo de soporte
 */

console.log('🔍 INICIANDO DIAGNÓSTICO DE SESIÓN...\n');

// 1. Verificar si existe token en localStorage
const token = localStorage.getItem('token');
console.log('1️⃣ TOKEN EN LOCALSTORAGE:');
if (!token) {
    console.error('   ❌ NO HAY TOKEN - El usuario necesita iniciar sesión');
} else {
    console.log('   ✅ Token encontrado');
    console.log('   Longitud:', token.length, 'caracteres');

    // 2. Decodificar token JWT
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        const decoded = JSON.parse(jsonPayload);

        console.log('\n2️⃣ CONTENIDO DEL TOKEN:');
        console.log('   Usuario ID:', decoded.userId);
        console.log('   Username:', decoded.username);
        console.log('   Role:', decoded.role);
        console.log('   Store ID:', decoded.storeId);
        console.log('   Store Name:', decoded.storeName);

        // 3. Verificar expiración
        console.log('\n3️⃣ VALIDACIÓN DE EXPIRACIÓN:');
        const expDate = new Date(decoded.exp * 1000);
        const now = new Date();
        const timeLeft = expDate - now;
        const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        console.log('   Fecha de emisión:', new Date(decoded.iat * 1000).toLocaleString('es-MX'));
        console.log('   Fecha de expiración:', expDate.toLocaleString('es-MX'));
        console.log('   Fecha actual:', now.toLocaleString('es-MX'));

        if (timeLeft > 0) {
            console.log('   ✅ TOKEN VÁLIDO');
            console.log(`   Tiempo restante: ${daysLeft} días, ${hoursLeft} horas`);
        } else {
            console.error('   ❌ TOKEN EXPIRADO');
            console.log(`   Expiró hace: ${Math.abs(daysLeft)} días, ${Math.abs(hoursLeft)} horas`);
        }

    } catch (error) {
        console.error('   ❌ ERROR AL DECODIFICAR TOKEN:', error.message);
        console.error('   El token puede estar corrupto o en formato inválido');
    }
}

// 4. Verificar otros datos en localStorage
console.log('\n4️⃣ OTROS DATOS EN LOCALSTORAGE:');
const cashSession = localStorage.getItem('cashSession');
const selectedStore = localStorage.getItem('selectedStore');
const cachedProducts = localStorage.getItem('cachedProducts');

console.log('   Cash Session:', cashSession ? '✅ Existe' : '❌ No existe');
console.log('   Selected Store:', selectedStore ? '✅ Existe' : '❌ No existe');
console.log('   Cached Products:', cachedProducts ? '✅ Existe' : '❌ No existe');

// 5. Verificar configuración del sistema
console.log('\n5️⃣ CONFIGURACIÓN DEL SISTEMA:');
console.log('   Navegador:', navigator.userAgent);
console.log('   Online:', navigator.onLine ? '✅ Conectado' : '❌ Sin conexión');
console.log('   Zona horaria:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('   Diferencia UTC:', new Date().getTimezoneOffset() / -60, 'horas');

// 6. Verificar API URL
console.log('\n6️⃣ CONFIGURACIÓN DE API:');
const apiUrl = import.meta?.env?.VITE_API_URL || 'No configurada';
console.log('   API URL:', apiUrl);

// 7. Sugerencias
console.log('\n📋 SUGERENCIAS:');
if (!token) {
    console.log('   → Iniciar sesión nuevamente');
} else {
    try {
        const decoded = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        const expDate = new Date(decoded.exp * 1000);
        const now = new Date();

        if (expDate < now) {
            console.log('   → El token ha expirado. Solución:');
            console.log('      1. Ejecutar: localStorage.clear()');
            console.log('      2. Recargar la página (F5)');
            console.log('      3. Iniciar sesión nuevamente');
        } else {
            console.log('   → El token es válido. Posibles causas del error:');
            console.log('      1. Verificar que el servidor esté corriendo');
            console.log('      2. Revisar la consola del navegador para errores de red');
            console.log('      3. Verificar que JWT_SECRET no haya cambiado en el servidor');
        }
    } catch (e) {
        console.log('   → Token corrupto. Solución:');
        console.log('      1. Ejecutar: localStorage.clear()');
        console.log('      2. Recargar la página (F5)');
        console.log('      3. Iniciar sesión nuevamente');
    }
}

console.log('\n✅ DIAGNÓSTICO COMPLETADO');
console.log('📸 Por favor, toma una captura de pantalla de este resultado y compártela con soporte\n');
