# Guía de Uso: Escaneo Rápido de Códigos de Barras

## 📋 Resumen

Sistema de escaneo rápido de códigos de barras optimizado para el módulo de ventas de Teikon POS. Permite agregar productos al carrito mediante escáner de códigos de barras con feedback visual y auditivo instantáneo.

## 🚀 Características

- ✅ **Búsqueda ultra-rápida** (< 50ms) con índice de base de datos
- ✅ **Multi-tenant seguro** - Filtra automáticamente por tienda
- ✅ **Detección automática** de entrada de escáner vs. tecleo manual
- ✅ **Auto-focus** constante en el input
- ✅ **Feedback visual** con animaciones Tailwind
- ✅ **Feedback auditivo** con Web Audio API (sin archivos de audio necesarios)
- ✅ **Validación de stock** en tiempo real
- ✅ **Modo offline** con fallback a caché local

## 📦 Componentes Creados

### 1. Backend: Endpoint de Búsqueda

**Archivo**: `server.js`

**Endpoint**: `GET /api/products/search-sku/:sku`

**Características**:
- Normalización automática de SKU (uppercase, trim)
- Filtrado multi-tenant por `storeId`
- Búsqueda optimizada con índice de base de datos
- Mapeo automático de campos backend ↔ frontend

**Ejemplo de uso**:
```javascript
GET /api/products/search-sku/ABC123
Authorization: Bearer <token>

// Respuesta exitosa (200)
{
  "id": "uuid",
  "sku": "ABC123",
  "name": "Producto Ejemplo",
  "category": "GENERAL",
  "costPrice": 10.00,
  "salePrice": 15.00,
  "stock": 50,
  "minStock": 5,
  "image": "data:image/...",
  "storeId": "uuid",
  "isActive": true
}

// Producto no encontrado (404)
{
  "error": "Producto no encontrado",
  "sku": "ABC123"
}
```

### 2. Frontend: Componente BarcodeScanner

**Archivo**: `components/BarcodeScanner.tsx`

**Props**:
```typescript
interface BarcodeScannerProps {
  onProductFound: (product: Product) => void;
  onProductNotFound?: (sku: string) => void;
  disabled?: boolean;
  className?: string;
}
```

**Características técnicas**:
- **Detección de escáner**: Identifica entrada rápida (< 50ms entre caracteres)
- **Debouncing**: 100ms para escáner, 300ms para tecleo manual
- **Auto-limpieza**: Limpia el input automáticamente después de cada búsqueda
- **Estados visuales**: idle, scanning, success, error
- **Contador de items**: Muestra cantidad de productos escaneados

**Ejemplo de integración**:
```tsx
import BarcodeScanner from './BarcodeScanner';

function MyComponent() {
  const handleProductFound = (product: Product) => {
    console.log('Producto encontrado:', product);
    // Agregar al carrito
  };

  const handleProductNotFound = (sku: string) => {
    console.log('Producto no encontrado:', sku);
    // Mostrar notificación
  };

  return (
    <BarcodeScanner
      onProductFound={handleProductFound}
      onProductNotFound={handleProductNotFound}
    />
  );
}
```

### 3. Utilidades: Sonidos de Feedback

**Archivo**: `utils/sounds.ts`

**Funciones**:
- `playBeep()` - Sonido de éxito (800Hz, 100ms)
- `playError()` - Sonido de error (200Hz, 200ms)

**Tecnología**: Web Audio API (no requiere archivos de audio)

**Alternativa con archivos de audio** (comentada en el código):
```typescript
// Descomentar si prefieres usar archivos MP3
const beepAudio = new Audio('/sounds/beep.mp3');
const errorAudio = new Audio('/sounds/error.mp3');
```

### 4. Ejemplo: Componente QuickSale

**Archivo**: `components/QuickSale.tsx`

Componente completo de ejemplo que demuestra:
- ✅ Integración del `BarcodeScanner`
- ✅ Lógica `handleAddItem` (agregar o incrementar)
- ✅ Animación flash para items recién agregados
- ✅ Validación de stock disponible
- ✅ Controles de cantidad (+/-)
- ✅ Cálculo de totales
- ✅ Botones de pago (Efectivo, Tarjeta, Transferencia)

## 🔧 Integración en tu Módulo de Ventas

### Opción 1: Usar QuickSale directamente

```tsx
import QuickSale from './components/QuickSale';

function App() {
  return <QuickSale />;
}
```

### Opción 2: Integrar BarcodeScanner en tu componente existente

```tsx
import { useState, useCallback } from 'react';
import BarcodeScanner from './components/BarcodeScanner';
import { Product } from '@/Product';

function MiModuloVentas() {
  const [cart, setCart] = useState([]);
  const [flashItemId, setFlashItemId] = useState(null);

  const handleAddItem = useCallback((product: Product) => {
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(
        item => item.productId === product.id
      );

      if (existingIndex >= 0) {
        // Producto existe: incrementar cantidad
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        };
        return updated;
      } else {
        // Producto nuevo: agregar con cantidad 1
        return [...prevCart, {
          productId: product.id,
          name: product.name,
          sellingPrice: product.salePrice,
          unitCost: product.costPrice,
          quantity: 1
        }];
      }
    });

    // Trigger animación flash
    setFlashItemId(product.id);
    setTimeout(() => setFlashItemId(null), 500);
  }, []);

  return (
    <div>
      <BarcodeScanner onProductFound={handleAddItem} />
      
      {/* Tu UI de carrito aquí */}
      {cart.map(item => (
        <div
          key={item.productId}
          className={flashItemId === item.productId ? 'animate-flash' : ''}
        >
          {item.name} - Cantidad: {item.quantity}
        </div>
      ))}
    </div>
  );
}
```

## 🎨 Personalización de Estilos

### Animación Flash (Tailwind CSS)

Agrega a tu `index.css` o archivo de estilos global:

```css
@keyframes flash-success {
  0%, 100% { background-color: transparent; }
  50% { background-color: rgb(34 197 94 / 0.2); }
}

.animate-flash {
  animation: flash-success 0.5s ease-in-out;
}
```

### Colores del Scanner

El componente usa las siguientes clases de Tailwind:
- **Idle**: `border-orange-500 bg-orange-50`
- **Scanning**: `border-blue-500 bg-blue-50`
- **Success**: `border-green-500 bg-green-50`
- **Error**: `border-red-500 bg-red-50`

Puedes personalizar estos colores modificando las clases en `BarcodeScanner.tsx`.

## ⚡ Optimización de Rendimiento

### Base de Datos

El endpoint usa un índice compuesto para búsquedas O(log n):

```sql
-- Ya existe en el modelo, pero si necesitas crearlo manualmente:
CREATE INDEX idx_products_store_sku ON products("storeId", sku);
```

### Frontend

- **Debouncing**: Evita búsquedas duplicadas durante el tecleo
- **useCallback**: Previene re-renders innecesarios
- **Throttling**: Limita búsquedas consecutivas a 1 por segundo

## 🧪 Pruebas

### 1. Prueba de Búsqueda por SKU

```bash
# Reemplaza <TOKEN> con tu JWT y <SKU> con un SKU real
curl -X GET "http://localhost:8080/api/products/search-sku/<SKU>" \
  -H "Authorization: Bearer <TOKEN>"
```

### 2. Prueba de Escaneo Rápido

1. Abre el componente `QuickSale`
2. Escanea un código de barras
3. Verifica:
   - ✅ El producto se agrega al carrito
   - ✅ Se reproduce el sonido de éxito
   - ✅ La fila del producto tiene animación flash
   - ✅ El input se limpia automáticamente

### 3. Prueba de Producto Duplicado

1. Escanea el mismo producto 3 veces
2. Verifica:
   - ✅ Solo hay una línea en el carrito
   - ✅ La cantidad es 3
   - ✅ Cada escaneo incrementa la cantidad

### 4. Prueba de Producto No Encontrado

1. Escanea un SKU inexistente
2. Verifica:
   - ✅ Se muestra mensaje de error
   - ✅ Se reproduce sonido de error
   - ✅ El input se limpia después de 1.5s

## 🔒 Seguridad Multi-Tenant

El endpoint **SIEMPRE** filtra por `storeId` del usuario autenticado:

```javascript
// En server.js
const where = {
  sku: normalizedSKU,
  activo: true
};

// CRITICAL: Multi-tenant filtering
if (req.role !== 'SUPER_ADMIN') {
  where.storeId = req.storeId;
}
```

Esto garantiza que:
- ✅ Cada tienda solo puede buscar sus propios productos
- ✅ No hay riesgo de fuga de datos entre tenants
- ✅ Los SUPER_ADMIN pueden buscar en todas las tiendas

## 📱 Modo Offline

El componente funciona en modo offline usando el caché local:

```typescript
// En StoreContext.tsx
if (isOnline) {
  // Búsqueda en servidor
  const response = await fetch(`${API_URL}/api/products/search-sku/${sku}`);
  return await response.json();
} else {
  // Fallback a caché local
  return products.find(p => p.sku === normalizedSKU);
}
```

## 🎯 Próximos Pasos (Opcional)

1. **Historial de Escaneos**: Guardar log de productos escaneados
2. **Sugerencias Inteligentes**: Autocompletar SKUs frecuentes
3. **Soporte Multi-Código**: Permitir múltiples formatos de código de barras
4. **Estadísticas**: Tracking de velocidad de escaneo y productos más vendidos
5. **Integración con Impresora**: Imprimir etiquetas de códigos de barras

## 🐛 Troubleshooting

### El escáner no detecta productos

1. Verifica que el producto tenga un SKU asignado
2. Verifica que el producto esté activo (`isActive: true`)
3. Verifica que el producto pertenezca a la tienda actual
4. Revisa la consola del navegador para errores

### El sonido no se reproduce

1. Verifica que el navegador permita reproducción de audio
2. Algunos navegadores requieren interacción del usuario antes de reproducir audio
3. Prueba hacer clic en la página antes de escanear

### El input pierde el focus

1. Verifica que no haya otros elementos con `autoFocus`
2. El componente tiene lógica de re-focus automático
3. Si el problema persiste, revisa eventos de click en otros componentes

## 📞 Soporte

Si tienes problemas o preguntas:
1. Revisa los logs de la consola del navegador
2. Revisa los logs del servidor (búsqueda por "🔍 Searching product")
3. Verifica que el token JWT sea válido
4. Asegúrate de tener una sesión de caja abierta (si es requerido)

---

**Versión**: 1.0.0  
**Fecha**: 2026-01-12  
**Autor**: Teikon Development Team
