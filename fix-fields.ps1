$file = "context\StoreContext.tsx"
$content = Get-Content $file -Raw

# Replace the problematic section
$oldCode = @"
        // Prepare product data with storeId
        const productPayload = {
          ...productData,
          // For SUPER_ADMIN: use storeId from productData if provided, otherwise show error
          // For regular users: use currentUser.storeId
          storeId: currentUser.role === 'SUPER_ADMIN' 
            ? (productData as any).storeId || null
            : currentUser.storeId
        };
"@

$newCode = @"
        // Map frontend field names (English) to backend API names (Spanish)
        const productPayload: any = {
          sku: productData.sku,
          nombre: productData.name,
          categoria: productData.category || '',
          costPrice: productData.costPrice,
          salePrice: productData.salePrice,
          stock: productData.stock || 0,
          minStock: productData.minStock || 0,
          taxRate: productData.taxRate || 0,
          imagen: productData.image,
          storeId: currentUser.role === 'SUPER_ADMIN' 
            ? (productData as any).storeId || null
            : currentUser.storeId
        };

        // DEBUG: Log payload before sending
        console.log('📦 Payload a enviar:', JSON.stringify(productPayload, null, 2));
        console.log('👤 Usuario:', currentUser.username, 'Role:', currentUser.role);
        console.log('🏪 StoreId:', productPayload.storeId);
"@

$content = $content.Replace($oldCode, $newCode)
Set-Content $file $content -NoNewline

Write-Host "✅ Archivo actualizado correctamente"
