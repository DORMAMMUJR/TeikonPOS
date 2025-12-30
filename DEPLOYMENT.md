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

**SUPER_ADMIN:**
- Usuario: `admin`
- Contraseña: `admin123`

**Usuario Demo:**
- Usuario: `demo_user`
- Contraseña: `user123`

## Notas de Seguridad

⚠️ **IMPORTANTE:** 
- El JWT_SECRET es crítico para la seguridad de la aplicación
- NUNCA compartas este archivo públicamente
- Este archivo NO debe subirse a GitHub
- Está incluido en .gitignore
