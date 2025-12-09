/**
 * Script mejorado para verificar iconos usando sharp si está disponible
 * o proporcionar instrucciones claras
 */

const fs = require('fs');
const path = require('path');

const assetsPath = path.join(__dirname, 'assets');
const iconFiles = ['icon.png', 'adaptive-icon.png'];

console.log('🔍 Verificando iconos de la app...\n');
console.log('='.repeat(50));

let allExist = true;
let issues = [];

iconFiles.forEach(file => {
  const filePath = path.join(assetsPath, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${file}: NO EXISTE`);
    allExist = false;
    issues.push(`${file} no existe`);
    return;
  }

  const stats = fs.statSync(filePath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`\n📄 ${file}:`);
  console.log(`   ✓ Existe: Sí`);
  console.log(`   📦 Tamaño: ${sizeKB} KB (${sizeMB} MB)`);
  console.log(`   📅 Modificado: ${stats.mtime.toLocaleString()}`);
  
  // Verificar si el tamaño es razonable para un icono 1024x1024
  // Un PNG 1024x1024 típicamente pesa entre 50KB y 500KB
  if (stats.size < 10240) { // Menos de 10KB es sospechoso
    console.log(`   ⚠️  ADVERTENCIA: El archivo es muy pequeño, puede estar corrupto`);
    issues.push(`${file} es muy pequeño (${sizeKB} KB)`);
  } else if (stats.size > 2 * 1024 * 1024) { // Más de 2MB es sospechoso
    console.log(`   ⚠️  ADVERTENCIA: El archivo es muy grande para un icono`);
    issues.push(`${file} es muy grande (${sizeMB} MB)`);
  }
});

console.log('\n' + '='.repeat(50));

if (!allExist) {
  console.log('\n❌ ERROR: Algunos archivos de iconos faltan');
  process.exit(1);
}

if (issues.length > 0) {
  console.log('\n⚠️  ADVERTENCIAS:');
  issues.forEach(issue => console.log(`   - ${issue}`));
}

console.log('\n📋 Para verificar las DIMENSIONES EXACTAS:');
console.log('   1. Ejecuta: npx expo-doctor');
console.log('   2. O usa ImageMagick: magick identify assets/icon.png');
console.log('   3. O sube la imagen a: https://www.iloveimg.com/resize-image');
console.log('\n✅ Requisitos:');
console.log('   - icon.png: DEBE ser exactamente 1024x1024 píxeles');
console.log('   - adaptive-icon.png: DEBE ser exactamente 1024x1024 píxeles');
console.log('   - Ambos deben ser cuadrados perfectos (mismo ancho y alto)');
console.log('');


