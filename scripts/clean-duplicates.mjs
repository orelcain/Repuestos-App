#!/usr/bin/env node

/**
 * Script para identificar y eliminar máquinas duplicadas en Firestore
 * Mantiene la más reciente de cada nombre duplicado
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  deleteDoc, 
  doc,
  query,
  orderBy
} from 'firebase/firestore';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD9tNQa4_IEmIWLiVSkZnCkvVAW26TiItg",
  authDomain: "baader-200.firebaseapp.com",
  projectId: "baader-200",
  storageBucket: "baader-200.firebasestorage.app",
  messagingSenderId: "393711023896",
  appId: "1:393711023896:web:2c87e56d6e4b1ac5a27c6f"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanDuplicates() {
  try {
    console.log('🔍 Buscando máquinas duplicadas...\n');

    // Obtener todas las máquinas
    const q = query(collection(db, 'machines'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const machines = [];
    snapshot.forEach((doc) => {
      machines.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(0)
      });
    });

    console.log(`📊 Total de máquinas encontradas: ${machines.length}\n`);

    // Agrupar por nombre
    const machinesByName = new Map();
    machines.forEach(machine => {
      const name = machine.nombre || 'Sin nombre';
      if (!machinesByName.has(name)) {
        machinesByName.set(name, []);
      }
      machinesByName.get(name).push(machine);
    });

    // Identificar duplicados
    const duplicates = [];
    machinesByName.forEach((group, name) => {
      if (group.length > 1) {
        duplicates.push({ name, machines: group });
      }
    });

    if (duplicates.length === 0) {
      console.log('✅ No se encontraron máquinas duplicadas');
      return;
    }

    console.log(`⚠️  Encontrados ${duplicates.length} nombres duplicados:\n`);

    // Mostrar duplicados
    duplicates.forEach(({ name, machines }) => {
      console.log(`📁 "${name}" (${machines.length} instancias):`);
      machines.forEach((machine, i) => {
        console.log(`   ${i + 1}. ID: ${machine.id}`);
        console.log(`      Creada: ${machine.createdAt.toLocaleString()}`);
        console.log(`      Activa: ${machine.activa ? '✅' : '❌'}`);
        console.log(`      Modelo: ${machine.modelo || 'N/A'}`);
      });
      console.log('');
    });

    // Preguntar confirmación (en modo script, comentar para auto-eliminar)
    console.log('\n⚠️  MODO DRY-RUN: No se eliminarán máquinas automáticamente');
    console.log('Para eliminar duplicados, descomentar el código de eliminación\n');

    /* DESCOMENTAR PARA ELIMINAR DUPLICADOS AUTOMÁTICAMENTE
    
    console.log('\n🗑️  Eliminando duplicados (manteniendo la más reciente)...\n');

    for (const { name, machines } of duplicates) {
      // Ordenar por fecha de creación (más reciente primero)
      const sorted = machines.sort((a, b) => b.createdAt - a.createdAt);
      
      // Mantener el primero (más reciente), eliminar el resto
      const toKeep = sorted[0];
      const toDelete = sorted.slice(1);

      console.log(`📁 "${name}":`);
      console.log(`   ✅ Manteniendo: ${toKeep.id} (${toKeep.createdAt.toLocaleString()})`);

      for (const machine of toDelete) {
        console.log(`   🗑️  Eliminando: ${machine.id} (${machine.createdAt.toLocaleString()})`);
        await deleteDoc(doc(db, 'machines', machine.id));
      }
      console.log('');
    }

    console.log('✅ Limpieza completada');
    
    */

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar
cleanDuplicates()
  .then(() => {
    console.log('\n✨ Script finalizado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
