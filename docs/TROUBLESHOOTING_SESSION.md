# 🔧 Troubleshooting: Problemas de Sesión Expirada

## Síntoma: "Inicio de sesión expiró" al acceder a una tienda

### Causas Comunes

1. **Token JWT Expirado** (más común)
   - Los tokens tienen una duración de 90 días en producción
   - Si no has iniciado sesión en más de 90 días, el token expira automáticamente

2. **Token Corrupto en localStorage**
   - Datos dañados o modificados manualmente
   - Puede ocurrir por extensiones del navegador o limpieza parcial de caché

3. **Cambio de JWT_SECRET en el servidor**
   - Si se cambió la clave secreta, todos los tokens antiguos son inválidos

4. **Desincronización de Reloj**
   - Diferencia significativa entre la hora del cliente y del servidor

---

## Solución Rápida (Recomendada)

### Opción 1: Limpiar localStorage y Reiniciar Sesión

1. Abre la consola del navegador (F12)
2. Ve a la pestaña **Console**
3. Ejecuta el siguiente comando:
   ```javascript
   localStorage.clear();
   ```
4. Recarga la página (F5)
5. Inicia sesión nuevamente

### Opción 2: Usar el Script de Diagnóstico

1. Abre la consola del navegador (F12)
2. Copia y pega el contenido de `scripts/diagnostico-sesion.js`
3. Presiona Enter
4. Revisa el diagnóstico detallado
5. Sigue las sugerencias mostradas

---

## Diagnóstico Avanzado

### Verificar Token Manualmente

1. Abre DevTools (F12) → **Application** → **Local Storage**
2. Busca la key `token`
3. Copia el valor
4. Ve a [jwt.io](https://jwt.io)
5. Pega el token en el campo "Encoded"
6. Verifica el campo `exp` (fecha de expiración en formato Unix timestamp)
7. Compara con la fecha actual usando: `new Date(exp * 1000)`

### Verificar Logs del Servidor

Si el problema persiste, revisa los logs del servidor:

```bash
# Buscar errores de autenticación
grep "401 Unauthorized" logs/server.log
grep "Token inválido" logs/server.log
```

### Verificar Configuración de JWT

Asegúrate de que el archivo `.env` tenga:

```env
JWT_SECRET=<tu-clave-secreta>
JWT_EXPIRATION=90d
```

**IMPORTANTE:** Si cambias `JWT_SECRET`, todos los usuarios deberán volver a iniciar sesión.

---

## Prevención

### Para Usuarios

- **Guarda tu trabajo frecuentemente** antes de que expire la sesión
- **Presta atención a las alertas** de expiración (aparecen 7 días antes)
- **Inicia sesión al menos una vez cada 80 días** para renovar el token

### Para Administradores

- **Monitorea los logs** para detectar patrones de expiración
- **Considera aumentar JWT_EXPIRATION** si los usuarios necesitan sesiones más largas
- **Implementa refresh tokens** para sesiones automáticas sin interrupciones

---

## Mensajes de Error y Significado

| Mensaje | Causa | Solución |
|---------|-------|----------|
| "Tu sesión ha expirado" | Token expirado por tiempo | Limpiar localStorage e iniciar sesión |
| "Token inválido" | Token corrupto o JWT_SECRET cambiado | Limpiar localStorage e iniciar sesión |
| "No se pudo conectar al servidor" | Servidor caído o problema de red | Verificar que el servidor esté corriendo |
| "Tu sesión expirará en X días" | Advertencia preventiva | Guardar trabajo y reiniciar sesión pronto |

---

## Logs de Diagnóstico

El sistema ahora incluye logging detallado en la consola del navegador:

- `🔍 Token Validation: ✅ Valid (X days remaining)` - Token válido
- `🔍 Token Validation: Token expired` - Token expirado con fechas
- `🔒 SESSION EXPIRED - Cleaning up` - Sesión expirada detectada
- `⚠️ TOKEN EXPIRATION WARNING` - Advertencia de expiración próxima

---

## Contacto de Soporte

Si el problema persiste después de seguir estos pasos:

1. Ejecuta el script de diagnóstico (`scripts/diagnostico-sesion.js`)
2. Toma una captura de pantalla del resultado
3. Contacta al equipo de soporte con:
   - Captura del diagnóstico
   - Fecha/hora del error
   - Navegador y versión
   - Pasos para reproducir el error
