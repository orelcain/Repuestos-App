#!/usr/bin/env node
/**
 * Script para migrar IDs de máquinas a slugs limpios
 * 
 * Uso: node scripts/migrate-machine-ids.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Inicializar Firebase Admin
// Requiere GOOGLE_APPLICATION_CREDENTIALS o serviceAccountKey.json
const app = initializeApp({
  storageBucket: 'app-inventario-repuestos.appspot.com'
});

const db = getFirestore(app);
const storage = getStorage(app).bucket();

/**
 * Genera slug limpio desde marca y modelo
 */
function generateSlug(marca, modelo) {
  return `${marca}-${modelo}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Migrar una máquina a nuevo ID
 */
async function migrateMachine(oldId, newId, machineData) {
  console.log(`\n📦 Migrando máquina: ${oldId} → ${newId}`);
  
  try {
    // 1. Crear documento con nuevo ID
    await db.collection('machines').doc(newId).set(machineData);
    console.log(`✅ Documento creado: machines/${newId}`);
    
    // 2. Migrar archivos de Storage si existen
    const oldPath = `machines/${oldId}/`;
    const newPath = `machines/${newId}/`;
    
    const [files] = await storage.getFiles({ prefix: oldPath });
    
    if (files.length > 0) {
      console.log(`📁 Encontrados ${files.length} archivos en ${oldPath}`);
      
      for (const file of files) {
        const relativePath = file.name.replace(oldPath, '');
        const newFilePath = `${newPath}${relativePath}`;
        
        console.log(`  📄 ${file.name} → ${newFilePath}`);
        await file.copy(newFilePath);
      }
      
      console.log(`✅ Archivos copiados a ${newPath}`);
      
      // 3. Actualizar URLs en el documento
      if (machineData.manuals && machineData.manuals.length > 0) {
        const updatedManuals = machineData.manuals.map(url => {
          if (url.includes(oldPath)) {
            return url.replace(oldPath, newPath);
          }
          return url;
        });
        
        await db.collection('machines').doc(newId).update({
          manuals: updatedManuals
        });
        
        console.log(`✅ URLs de manuales actualizadas`);
      }
      
      // 4. Preguntar si eliminar archivos antiguos (comentado por seguridad)
      // console.log(`⚠️  Para eliminar archivos antiguos, ejecuta:`);
      // console.log(`   gsutil -m rm -r gs://app-inventario-repuestos.appspot.com/${oldPath}`);
    } else {
      console.log(`ℹ️  No hay archivos en Storage para migrar`);
    }
    
    // 5. Eliminar documento antiguo
    await db.collection('machines').doc(oldId).delete();
    console.log(`✅ Documento antiguo eliminado: machines/${oldId}`);
    
    console.log(`\n✨ Migración completada: ${oldId} → ${newId}`);
    
  } catch (error) {
    console.error(`❌ Error migrando ${oldId}:`, error);
    throw error;
  }
}

/**
 * Ejecutar migración
 */
async function main() {
  console.log('🚀 Iniciando migración de IDs de máquinas...\n');
  
  try {
    // Obtener todas las máquinas
    const snapshot = await db.collection('machines').get();
    const machines = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const expectedSlug = generateSlug(data.marca, data.modelo);
      
      // Solo migrar si el ID actual no es el slug esperado
      if (doc.id !== expectedSlug) {
        machines.push({
          oldId: doc.id,
          newId: expectedSlug,
          data
        });
      }
    });
    
    if (machines.length === 0) {
      console.log('✅ Todas las máquinas ya tienen IDs correctos (slugs)');
      return;
    }
    
    console.log(`📋 Máquinas a migrar: ${machines.length}\n`);
    
    for (const machine of machines) {
      console.log(`- ${machine.data.nombre} (${machine.data.marca} ${machine.data.modelo})`);
      console.log(`  ${machine.oldId} → ${machine.newId}`);
    }
    
    console.log('\n⏳ Iniciando migración...');
    
    for (const machine of machines) {
      await migrateMachine(machine.oldId, machine.newId, machine.data);
    }
    
    console.log('\n🎉 Migración completada exitosamente!');
    console.log('\n📝 Notas:');
    console.log('- Los archivos antiguos en Storage fueron copiados (no eliminados)');
    console.log('- Los documentos antiguos en Firestore fueron eliminados');
    console.log('- Verifica la app y elimina archivos antiguos manualmente si todo funciona');
    
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    process.exit(1);
  }
}

main();
