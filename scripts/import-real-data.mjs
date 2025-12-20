/**
 * Script para limpiar y reimportar los repuestos REALES del Excel
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, addDoc, doc } from 'firebase/firestore';
import { repuestosData } from './repuestos-data.mjs';

const firebaseConfig = {
  apiKey: "AIzaSyAQNZionq01KS9F6O5m03ybWueO6SFuPPU",
  authDomain: "app-inventario-repuestos.firebaseapp.com",
  projectId: "app-inventario-repuestos",
  storageBucket: "app-inventario-repuestos.firebasestorage.app",
  messagingSenderId: "14780417870",
  appId: "1:14780417870:web:28269ae58be0f9d72fc01f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTION_NAME = 'repuestosBaader200';

async function cleanAndImport() {
  console.log('=== LIMPIANDO COLECCIÓN ===');
  
  const repuestosRef = collection(db, COLLECTION_NAME);
  const snapshot = await getDocs(repuestosRef);
  
  console.log(`Encontrados ${snapshot.size} documentos a eliminar...`);
  
  // Eliminar todos los documentos existentes
  let deleted = 0;
  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, COLLECTION_NAME, docSnap.id));
    deleted++;
    if (deleted % 20 === 0) {
      console.log(`Eliminados: ${deleted}/${snapshot.size}`);
    }
  }
  
  console.log(`✅ Eliminados ${deleted} documentos`);
  console.log('\n=== IMPORTANDO REPUESTOS REALES DEL EXCEL ===');
  console.log(`Total a importar: ${repuestosData.length}`);
  
  let imported = 0;
  for (const repuesto of repuestosData) {
    try {
      await addDoc(repuestosRef, {
        codigoSAP: repuesto.codigoSAP,
        codigoBaader: repuesto.codigoBaader,
        descripcion: repuesto.descripcion,
        cantidadSolicitada: repuesto.cantidadSolicitada,
        cantidadStockBodega: repuesto.cantidadStockBodega,
        valorUnitario: repuesto.valorUnitario,
        total: repuesto.total,
        imagenesManual: [],
        fotosReales: [],
        paginaManual: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      imported++;
      if (imported % 20 === 0) {
        console.log(`Importados: ${imported}/${repuestosData.length}`);
      }
    } catch (error) {
      console.error(`Error: ${repuesto.codigoSAP}`, error);
    }
  }
  
  console.log('\n=== COMPLETADO ===');
  console.log(`✅ Importados: ${imported} repuestos reales del Excel`);
}

cleanAndImport()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
