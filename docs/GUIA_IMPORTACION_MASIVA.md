# 📦 Guía de Importación Masiva en TeikonPOS

¡Carga todo tu inventario en segundos! Sigue estos 3 pasos sencillos:

---

## 📋 Paso 1: Prepara tu Excel

Descarga nuestra [plantilla de ejemplo](./plantilla_importacion.csv) o crea un archivo Excel (`.xlsx`) con las siguientes columnas:

| Columna | Obligatorio | Descripción | Ejemplo |
|---------|-------------|-------------|---------|
| **SKU** | ✅ Sí | Código único de tu producto | `A-001`, `COCA-600` |
| **Nombre** | ✅ Sí | Descripción del producto | `Camiseta Básica Negra` |
| **Precio** | ⚠️ Recomendado | Precio de venta al público | `250.00` |
| **Costo** | ⚠️ Recomendado | Cuánto te costó el producto | `120.00` |
| **Existencia** | ⚠️ Recomendado | Cantidad actual en inventario | `50` |
| **Categoria** | ❌ Opcional | Familia del producto | `Ropa`, `Bebidas` |

### 💡 Variaciones Aceptadas

El sistema es inteligente y acepta diferentes nombres de columnas:

- **SKU**: También acepta `Código`, `Codigo`, `Barcode`
- **Nombre**: También acepta `Name`, `Producto`
- **Precio**: También acepta `Precio Venta`, `Venta`, `Price`, `Sale Price`
- **Costo**: También acepta `Costo Compra`, `Precio Costo`, `Cost`
- **Existencia**: También acepta `Stock`, `Inventario`
- **Categoria**: También acepta `Categoría`, `Category`

### 📝 Ejemplo de Excel

```
SKU         | Nombre                    | Precio  | Costo  | Existencia | Categoria
------------|---------------------------|---------|--------|------------|----------
CAM-001     | Camiseta Básica Negra     | 250.00  | 120.00 | 50         | Ropa
TEN-XYZ     | Tenis Deportivos          | 1200.50 | 800.00 | 15         | Calzado
GOR-RED     | Gorra Roja                | 300.00  | 150.00 | 20         | Accesorios
```

---

## 🖼️ Paso 2: Prepara tus Fotos (Opcional)

Si quieres cargar imágenes automáticamente:

1. **Organiza tus fotos**: Pon todas las fotos de tus productos en una sola carpeta en tu computadora.

2. **Nombra las fotos correctamente**: 
   - ⚠️ **IMPORTANTE**: El nombre de la foto debe ser **EXACTAMENTE IGUAL** al SKU del producto.
   - El sistema ignora mayúsculas/minúsculas.
   - Formatos soportados: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`

### ✅ Ejemplos Correctos:

```
📁 Mis Fotos de Productos/
  ├── CAM-001.jpg          ✅ Coincide con SKU "CAM-001"
  ├── ten-xyz.png          ✅ Coincide con SKU "TEN-XYZ" (case-insensitive)
  ├── GOR-RED.jpeg         ✅ Coincide con SKU "GOR-RED"
  └── PAN-001.webp         ✅ Coincide con SKU "PAN-001"
```

### ❌ Ejemplos Incorrectos:

```
📁 Mis Fotos de Productos/
  ├── Camiseta negra.jpg   ❌ No coincide con ningún SKU
  ├── CAM-001 (1).jpg      ❌ Tiene caracteres extra
  ├── producto1.png        ❌ No coincide con ningún SKU
```

---

## 🚀 Paso 3: ¡Sube todo!

1. En TeikonPOS, ve a **Inventario** y haz clic en el botón **"IMPORTAR EXCEL"** (botón azul).

2. **Selecciona tu archivo Excel**:
   - Click en "Seleccionar archivo Excel"
   - Busca tu archivo `.xlsx`, `.xls` o `.csv`
   - Click en "Abrir"

3. **(Opcional) Selecciona la carpeta de fotos**:
   - Click en "Seleccionar carpeta de imágenes"
   - Navega a la carpeta donde guardaste las fotos
   - Click en "Seleccionar carpeta"

4. **Procesa los datos**:
   - Click en el botón **"Procesar Datos"**
   - El sistema leerá el Excel y buscará las imágenes correspondientes

5. **Revisa la vista previa**:
   - Verás una tabla con las primeras 5 filas
   - Verifica que los datos sean correctos
   - Las imágenes encontradas aparecerán como thumbnails

6. **Confirma la importación**:
   - Click en **"Importar X Productos"**
   - Espera a que la barra de progreso llegue al 100%
   - ¡Listo! Tus productos han sido importados

---

## ⚠️ Notas Importantes

### SKUs Duplicados
- Si un SKU ya existe en tu inventario, **se omitirá automáticamente**.
- El sistema te mostrará cuántos productos fueron omitidos al final.
- No se perderá ningún dato existente.

### Productos sin Imagen
- Los productos sin imagen se importarán correctamente.
- Puedes agregar las imágenes manualmente después.

### Imágenes sin Producto
- Las imágenes que no coincidan con ningún SKU serán ignoradas.
- No causarán errores en la importación.

### Stock Inicial
- Si importas productos con existencia > 0, el sistema creará automáticamente un movimiento de stock tipo "COMPRA".
- Esto quedará registrado en el historial de movimientos.

---

## 🎯 Consejos y Mejores Prácticas

1. **Prueba con pocos productos primero**: Importa 5-10 productos para familiarizarte con el proceso.

2. **Usa SKUs consistentes**: Mantén un formato uniforme (ej: `CAT-001`, `CAT-002`, etc.).

3. **Revisa los precios**: Asegúrate de que el Precio de Venta sea mayor que el Costo.

4. **Categorías uniformes**: Usa las mismas categorías para productos similares (ej: "Ropa" en lugar de "ropa", "ROPA", "Ropas").

5. **Optimiza las imágenes**: 
   - Tamaño recomendado: 800x800 píxeles
   - Peso máximo: 2MB por imagen
   - Formato recomendado: JPG o PNG

6. **Haz respaldo**: Guarda una copia de tu Excel antes de importar.

---

## ❓ Preguntas Frecuentes

### ¿Puedo actualizar productos existentes?
Actualmente, los productos con SKUs duplicados se omiten. Para actualizar, debes editar manualmente o eliminar el producto existente primero.

### ¿Qué pasa si mi Excel tiene más columnas?
No hay problema. El sistema solo tomará las columnas que reconozca e ignorará el resto.

### ¿Puedo importar sin imágenes?
¡Sí! Las imágenes son completamente opcionales. Puedes importar solo el Excel.

### ¿Cuántos productos puedo importar a la vez?
El límite depende de tu navegador, pero generalmente puedes importar hasta 1,000 productos sin problemas.

### ¿Qué formatos de Excel acepta?
- `.xlsx` (Excel 2007 o superior)
- `.xls` (Excel 97-2003)
- `.csv` (Valores separados por comas)

---

## 🆘 Soporte

Si tienes problemas con la importación:

1. Verifica que tu Excel tenga las columnas correctas
2. Asegúrate de que los SKUs sean únicos
3. Revisa que las imágenes estén nombradas correctamente
4. Contacta a soporte técnico con una captura de pantalla del error

---

**¡Feliz importación! 🎉**
