#!/usr/bin/env node

/**
 * Script de migración: repuestosBaader200 → machines/baader-200/repuestos
 * 
 * Este script migra todos los datos de la colección antigua a la nueva estructura multi-máquina.
 * 
 * IMPORTANTE: Ejecutar DESPUÉS de aplicar las nuevas Firebase Rules
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  writeBatch,
  Timestamp,
  query,
  orderBy
} from 'firebase/firestore';

// Configuración de Firebase (usar las mismas credenciales de la app)
const firebaseConfig = {
  apiKey: "AIzaSyD9K-KwUKqZBfQxHp-_xKxK3n5mJKqv-ww",
  authDomain: "baader200.firebaseapp.com",
  projectId: "baader200",
  storageBucket: "baader200.firebasestorage.app",
  messagingSenderId: "1026445646866",
  appId: "1:1026445646866:web:60c4c0dc0b2c8e0c0b0b0b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Constantes
const OLD_COLLECTION = 'repuestosBaader200';
const MACHINE_ID = 'baader-200';
const NEW_COLLECTION = `machines/${MACHINE_ID}/repuestos`;

console.log('🔄 Iniciando migración de datos Baader 200...\n');

async function createBaader200Machine() {
  console.log('📝 Creando documento de máquina Baader 200...');
  
  const machineRef = doc(db, 'machines', MACHINE_ID);
  await setDoc(machineRef, {
    id: MACHINE_ID,
    nombre: 'Baader 200',
    marca: 'Baader',
    modelo: '200',
    descripcion: 'Máquina principal de procesamiento',
    activa: true,
    color: '#3b82f6', // Azul
    orden: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  
  console.log('✅ Máquina Baader 200 creada\n');
}

async function migrateRepuestos() {
  console.log('📦 Migrando repuestos...');
  
  // Leer todos los repuestos de la colección antigua
  const oldSnapshot = await getDocs(collection(db, OLD_COLLECTION));
  const totalRepuestos = oldSnapshot.size;
  
  console.log(`   Encontrados ${totalRepuestos} repuestos para migrar\n`);
  
  let migratedCount = 0;
  let batch = writeBatch(db);
  let batchCount = 0;
  const BATCH_SIZE = 500; // Firestore permite máx 500 operaciones por batch
  
  for (const docSnap of oldSnapshot.docs) {
    const repuestoData = docSnap.data();
    const repuestoId = docSnap.id;
    
    // Crear documento en nueva ubicación
    const newDocRef = doc(db, NEW_COLLECTION, repuestoId);
    batch.set(newDocRef, repuestoData);
    batchCount++;
    migratedCount++;
    
    // Migrar historial (subcolección)
    try {
      const historialRef = collection(db, OLD_COLLECTION, repuestoId, 'historial');
      const historialSnapshot = await getDocs(query(historialRef, orderBy('fecha', 'desc')));
      
      if (!historialSnapshot.empty) {
        for (const histDoc of historialSnapshot.docs) {
          const newHistorialRef = doc(db, NEW_COLLECTION, repuestoId, 'historial', histDoc.id);
          batch.set(newHistorialRef, histDoc.data());
          batchCount++;
          
          // Commit batch si alcanzamos el límite
          if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            batch = writeBatch(db);
            batchCount = 0;
            console.log(`   ⏳ Procesados ${migratedCount}/${totalRepuestos}...`);
          }
        }
      }
    } catch (err) {
      console.warn(`   ⚠️  Error migrando historial de ${repuestoId}:`, err.message);
    }
    
    // Commit batch si alcanzamos el límite
    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
      console.log(`   ⏳ Procesados ${migratedCount}/${totalRepuestos}...`);
    }
  }
  
  // Commit batch final
  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`\n✅ ${migratedCount} repuestos migrados exitosamente\n`);
  return migratedCount;
}

async function migrateTags() {
  console.log('🏷️  Migrando tags globales...');
  
  try {
    // Leer tags de settings antigua
    const oldSettingsRef = doc(db, 'settings', 'tags');
    const oldSettingsSnap = await getDocs(collection(db, 'settings'));
    
    if (oldSettingsSnap.empty) {
      console.log('   ℹ️  No se encontraron tags para migrar\n');
      return;
    }
    
    // Copiar a nueva ubicación
    const newSettingsRef = doc(db, `machines/${MACHINE_ID}/settings`, 'tags');
    
    for (const docSnap of oldSettingsSnap.docs) {
      if (docSnap.id === 'tags') {
        await setDoc(newSettingsRef, docSnap.data());
        console.log('✅ Tags migrados exitosamente\n');
        return;
      }
    }
    
    console.log('   ℹ️  No se encontró documento de tags\n');
  } catch (err) {
    console.warn('⚠️  Error migrando tags:', err.message, '\n');
  }
}

async function verifyMigration() {
  console.log('🔍 Verificando migración...');
  
  const newSnapshot = await getDocs(collection(db, NEW_COLLECTION));
  const newCount = newSnapshot.size;
  
  const oldSnapshot = await getDocs(collection(db, OLD_COLLECTION));
  const oldCount = oldSnapshot.size;
  
  console.log(`   Colección antigua: ${oldCount} repuestos`);
  console.log(`   Colección nueva:   ${newCount} repuestos`);
  
  if (newCount === oldCount) {
    console.log('✅ Migración verificada correctamente\n');
  } else {
    console.warn(`⚠️  Diferencia detectada: ${oldCount - newCount} repuestos no migrados\n`);
  }
}

async function main() {
  try {
    // 1. Crear máquina Baader 200
    await createBaader200Machine();
    
    // 2. Migrar repuestos con historial
    await migrateRepuestos();
    
    // 3. Migrar tags
    await migrateTags();
    
    // 4. Verificar
    await verifyMigration();
    
    console.log('🎉 Migración completada exitosamente!');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Recargar la app en el navegador');
    console.log('   2. Verás la máquina "Baader 200" en las tabs');
    console.log('   3. Todos tus repuestos estarán disponibles');
    console.log('   4. Los datos antiguos permanecen intactos (read-only)\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

main();
