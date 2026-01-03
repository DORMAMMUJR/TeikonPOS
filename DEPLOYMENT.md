# IMPORTANTE: Configuración de Variables de Entorno para Seenode

Para desplegar en Seenode, configura las siguientes variables de entorno en el panel de Seenode:

## Variables Requeridas

```bash
DATABASE_URL=postgresql://db_ug5ykojy87dn:VCIlpoz80aKCC1kCgJLIZMXs@up-de-fra1-postgresql-1.db.run-on-seenode.com:11550/db_ug5ykojy87dn

JWT_SECRET=2f6620b7949fed630a8e17e7bc34fc5af91e315a78066994da1f0c6b6dffe8d94929792d141df2f249d70e5412a57dea0cf2bf163d66b3ff3f485e1abbaf2131

PORT=80
```

## Instrucciones de Despliegue en Seenode

1. Ve al panel de Seenode
2. Selecciona tu proyecto TeikonPOS
3. Ve a la sección de "Environment Variables" o "Variables de Entorno"
4. Agrega cada variable con su valor correspondiente
5. Guarda los cambios
6. Redespliega la aplicación

## Credenciales de Acceso

**SUPER_ADMIN (Master):**

- Usuario: `dev@master.com`
- Contraseña: `DevMaster2025!`
- Role: `SUPER_ADMIN`
- User ID: `56c07762-37de-45d7-97cd-f2b0d08a8d4f`

**JWT Token (Válido 30 días - Expira: 2026-02-01):**

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NmMwNzc2Mi0zN2RlLTQ1ZDctOTdjZC1mMmIwZDA4YThkNGYiLCJzdG9yZUlkIjpudWxsLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJ1c2VybmFtZSI6ImRldkBtYXN0ZXIuY29tIiwiaWF0IjoxNzY3NDE3Mjk3LCJleHAiOjE3NzAwMDkyOTd9.7ljTb6tLar3ruL1HgFD81uWJo6lg5rm8kBj7-VflST4
```

**Usuario Demo (Original):**

- Usuario: `admin`
- Contraseña: `admin123`

**Usuario Demo 2:**

- Usuario: `demo_user`
- Contraseña: `user123`

## Uso del Token JWT

### En PowerShell

```powershell
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NmMwNzc2Mi0zN2RlLTQ1ZDctOTdjZC1mMmIwZDA4YThkNGYiLCJzdG9yZUlkIjpudWxsLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJ1c2VybmFtZSI6ImRldkBtYXN0ZXIuY29tIiwiaWF0IjoxNzY3NDE3Mjk3LCJleHAiOjE3NzAwMDkyOTd9.7ljTb6tLar3ruL1HgFD81uWJo6lg5rm8kBj7-VflST4"

# Listar tiendas
Invoke-RestMethod -Uri "https://web-trh228bezhj8.up-de-fra1-k8s-1.apps.run-on-seenode.com/api/stores" -Headers @{Authorization="Bearer $token"}
```

### En curl

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." https://web-trh228bezhj8.up-de-fra1-k8s-1.apps.run-on-seenode.com/api/stores
```

## Endpoints de la API

### Públicos (No requieren autenticación)

- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registro de nuevas organizaciones

### Protegidos (Requieren token JWT)

- `GET /api/dashboard/summary` - Resumen del dashboard
- `GET /api/productos` - Lista de productos
- `GET /api/ventas` - Historial de ventas
- `POST /api/productos` - Crear producto
- Todos los demás endpoints de gestión

**¿Por qué `/api/dashboard/summary` requiere token?**

Este endpoint devuelve datos sensibles del negocio (ventas, ingresos, estadísticas). Por seguridad, SOLO usuarios autenticados pueden acceder. El error `{"error":"Token no proporcionado"}` es **correcto** y esperado cuando intentas acceder sin login.

## Notas de Seguridad

⚠️ **IMPORTANTE:**

- El JWT_SECRET es crítico para la seguridad de la aplicación
- NUNCA compartas este archivo públicamente
- Este archivo NO debe subirse a GitHub
- Está incluido en .gitignore
