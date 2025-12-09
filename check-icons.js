/**
 * Script para verificar dimensiones de iconos
 * Ejecutar con: node check-icons.js
 */

const fs = require('fs');
const path = require('path');

// En Node.js no podemos leer dimensiones de imágenes directamente sin una librería
// Pero podemos verificar que los archivos existan y tengan un tamaño razonable

const assetsPath = path.join(__dirname, 'assets');
const iconFiles = ['icon.png', 'adaptive-icon.png'];

console.log('Verificando iconos...\n');

let allGood = true;

iconFiles.forEach(file => {
  const filePath = path.join(assetsPath, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${file}: NO EXISTE`);
    allGood = false;
    return;
  }

  const stats = fs.statSync(filePath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  
  console.log(`✓ ${file}:`);
  console.log(`  - Tamaño: ${sizeKB} KB`);
  console.log(`  - Existe: Sí`);
  console.log(`  - Nota: Para verificar dimensiones exactas, usa ImageMagick o una herramienta online`);
  console.log('');
});

if (allGood) {
  console.log('✅ Todos los archivos de iconos existen');
  console.log('\nPara verificar las dimensiones exactas:');
  console.log('1. Usa ImageMagick: magick identify assets/icon.png');
  console.log('2. O sube la imagen a: https://www.iloveimg.com/resize-image');
  console.log('3. O usa: npx expo doctor');
} else {
  console.log('❌ Algunos archivos faltan');
}


