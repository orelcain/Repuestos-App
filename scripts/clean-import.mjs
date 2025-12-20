/**
 * Script para limpiar y reimportar repuestos Baader 200
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, addDoc, doc, writeBatch } from 'firebase/firestore';

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

// Datos de los 148 repuestos
const repuestosData = [
  { codigoSap: "10261097", codigoBaader: "620016", descripcion: "CUCHILLA LARGA DER.", cantidad: 1, precioUnitario: 169.83, totalUsd: 169.83 },
  { codigoSap: "10261098", codigoBaader: "620017", descripcion: "CUCHILLA LARGA IZQ", cantidad: 1, precioUnitario: 169.83, totalUsd: 169.83 },
  { codigoSap: "10261099", codigoBaader: "620018", descripcion: "CUCHILLA CORTA DER", cantidad: 1, precioUnitario: 140.53, totalUsd: 140.53 },
  { codigoSap: "10261100", codigoBaader: "620019", descripcion: "CUCHILLA CORTA IZQ", cantidad: 1, precioUnitario: 140.53, totalUsd: 140.53 },
  { codigoSap: "10261101", codigoBaader: "620701", descripcion: "RESORTE DE CUCHILLA", cantidad: 2, precioUnitario: 4.83, totalUsd: 9.66 },
  { codigoSap: "10261102", codigoBaader: "620702", descripcion: "RESORTE SUJETADOR", cantidad: 2, precioUnitario: 3.45, totalUsd: 6.90 },
  { codigoSap: "10261103", codigoBaader: "600001", descripcion: "RODAMIENTO 6001-2RS", cantidad: 10, precioUnitario: 8.50, totalUsd: 85.00 },
  { codigoSap: "10261104", codigoBaader: "600002", descripcion: "RODAMIENTO 6002-2RS", cantidad: 10, precioUnitario: 9.20, totalUsd: 92.00 },
  { codigoSap: "10261105", codigoBaader: "600003", descripcion: "RODAMIENTO 6003-2RS", cantidad: 8, precioUnitario: 10.50, totalUsd: 84.00 },
  { codigoSap: "10261106", codigoBaader: "600004", descripcion: "RODAMIENTO 6004-2RS", cantidad: 6, precioUnitario: 12.30, totalUsd: 73.80 },
  { codigoSap: "10261107", codigoBaader: "600005", descripcion: "RODAMIENTO 6005-2RS", cantidad: 4, precioUnitario: 15.40, totalUsd: 61.60 },
  { codigoSap: "10261108", codigoBaader: "600201", descripcion: "RODAMIENTO 6201-2RS", cantidad: 8, precioUnitario: 8.90, totalUsd: 71.20 },
  { codigoSap: "10261109", codigoBaader: "600202", descripcion: "RODAMIENTO 6202-2RS", cantidad: 10, precioUnitario: 9.50, totalUsd: 95.00 },
  { codigoSap: "10261110", codigoBaader: "600203", descripcion: "RODAMIENTO 6203-2RS", cantidad: 8, precioUnitario: 10.80, totalUsd: 86.40 },
  { codigoSap: "10261111", codigoBaader: "600204", descripcion: "RODAMIENTO 6204-2RS", cantidad: 6, precioUnitario: 12.60, totalUsd: 75.60 },
  { codigoSap: "10261112", codigoBaader: "630001", descripcion: "CORREA DENTADA HTD 5M-450", cantidad: 2, precioUnitario: 45.00, totalUsd: 90.00 },
  { codigoSap: "10261113", codigoBaader: "630002", descripcion: "CORREA DENTADA HTD 5M-600", cantidad: 2, precioUnitario: 52.00, totalUsd: 104.00 },
  { codigoSap: "10261114", codigoBaader: "630003", descripcion: "CORREA DENTADA HTD 8M-800", cantidad: 2, precioUnitario: 78.00, totalUsd: 156.00 },
  { codigoSap: "10261115", codigoBaader: "630004", descripcion: "CORREA PLANA 50x3x1200", cantidad: 2, precioUnitario: 35.00, totalUsd: 70.00 },
  { codigoSap: "10261116", codigoBaader: "640001", descripcion: "SELLO MECANICO 25MM", cantidad: 4, precioUnitario: 85.00, totalUsd: 340.00 },
  { codigoSap: "10261117", codigoBaader: "640002", descripcion: "SELLO MECANICO 30MM", cantidad: 4, precioUnitario: 95.00, totalUsd: 380.00 },
  { codigoSap: "10261118", codigoBaader: "640003", descripcion: "SELLO MECANICO 35MM", cantidad: 2, precioUnitario: 105.00, totalUsd: 210.00 },
  { codigoSap: "10261119", codigoBaader: "650001", descripcion: "ORING 25X3 VITON", cantidad: 20, precioUnitario: 2.50, totalUsd: 50.00 },
  { codigoSap: "10261120", codigoBaader: "650002", descripcion: "ORING 30X3 VITON", cantidad: 20, precioUnitario: 2.80, totalUsd: 56.00 },
  { codigoSap: "10261121", codigoBaader: "650003", descripcion: "ORING 35X3 VITON", cantidad: 15, precioUnitario: 3.20, totalUsd: 48.00 },
  { codigoSap: "10261122", codigoBaader: "650004", descripcion: "ORING 40X4 VITON", cantidad: 15, precioUnitario: 3.80, totalUsd: 57.00 },
  { codigoSap: "10261123", codigoBaader: "650005", descripcion: "ORING 50X4 VITON", cantidad: 10, precioUnitario: 4.50, totalUsd: 45.00 },
  { codigoSap: "10261124", codigoBaader: "660001", descripcion: "SENSOR INDUCTIVO M12 PNP", cantidad: 5, precioUnitario: 65.00, totalUsd: 325.00 },
  { codigoSap: "10261125", codigoBaader: "660002", descripcion: "SENSOR INDUCTIVO M18 PNP", cantidad: 5, precioUnitario: 75.00, totalUsd: 375.00 },
  { codigoSap: "10261126", codigoBaader: "660003", descripcion: "SENSOR FOTOELECTRICO", cantidad: 3, precioUnitario: 120.00, totalUsd: 360.00 },
  { codigoSap: "10261127", codigoBaader: "670001", descripcion: "MOTOR PASO A PASO NEMA 23", cantidad: 2, precioUnitario: 180.00, totalUsd: 360.00 },
  { codigoSap: "10261128", codigoBaader: "670002", descripcion: "MOTOR PASO A PASO NEMA 34", cantidad: 2, precioUnitario: 280.00, totalUsd: 560.00 },
  { codigoSap: "10261129", codigoBaader: "670003", descripcion: "SERVOMOTOR 400W", cantidad: 1, precioUnitario: 450.00, totalUsd: 450.00 },
  { codigoSap: "10261130", codigoBaader: "680001", descripcion: "CILINDRO NEUMATICO 32x100", cantidad: 4, precioUnitario: 85.00, totalUsd: 340.00 },
  { codigoSap: "10261131", codigoBaader: "680002", descripcion: "CILINDRO NEUMATICO 40x150", cantidad: 3, precioUnitario: 110.00, totalUsd: 330.00 },
  { codigoSap: "10261132", codigoBaader: "680003", descripcion: "CILINDRO NEUMATICO 50x200", cantidad: 2, precioUnitario: 145.00, totalUsd: 290.00 },
  { codigoSap: "10261133", codigoBaader: "690001", descripcion: "ELECTROVALVULA 5/2 1/4", cantidad: 5, precioUnitario: 95.00, totalUsd: 475.00 },
  { codigoSap: "10261134", codigoBaader: "690002", descripcion: "ELECTROVALVULA 5/3 1/4", cantidad: 3, precioUnitario: 120.00, totalUsd: 360.00 },
  { codigoSap: "10261135", codigoBaader: "690003", descripcion: "REGULADOR DE CAUDAL 1/4", cantidad: 10, precioUnitario: 25.00, totalUsd: 250.00 },
  { codigoSap: "10261136", codigoBaader: "700001", descripcion: "PIÑON Z20 PASO 1/2", cantidad: 4, precioUnitario: 35.00, totalUsd: 140.00 },
  { codigoSap: "10261137", codigoBaader: "700002", descripcion: "PIÑON Z25 PASO 1/2", cantidad: 4, precioUnitario: 42.00, totalUsd: 168.00 },
  { codigoSap: "10261138", codigoBaader: "700003", descripcion: "PIÑON Z30 PASO 1/2", cantidad: 3, precioUnitario: 48.00, totalUsd: 144.00 },
  { codigoSap: "10261139", codigoBaader: "700004", descripcion: "CADENA PASO 1/2 X 10M", cantidad: 2, precioUnitario: 85.00, totalUsd: 170.00 },
  { codigoSap: "10261140", codigoBaader: "710001", descripcion: "ENGRANAJE HELICOIDAL Z40", cantidad: 2, precioUnitario: 180.00, totalUsd: 360.00 },
  { codigoSap: "10261141", codigoBaader: "710002", descripcion: "ENGRANAJE HELICOIDAL Z60", cantidad: 2, precioUnitario: 220.00, totalUsd: 440.00 },
  { codigoSap: "10261142", codigoBaader: "720001", descripcion: "RETEN 25X40X7 VITON", cantidad: 10, precioUnitario: 8.50, totalUsd: 85.00 },
  { codigoSap: "10261143", codigoBaader: "720002", descripcion: "RETEN 30X45X7 VITON", cantidad: 10, precioUnitario: 9.20, totalUsd: 92.00 },
  { codigoSap: "10261144", codigoBaader: "720003", descripcion: "RETEN 35X50X8 VITON", cantidad: 8, precioUnitario: 10.50, totalUsd: 84.00 },
  { codigoSap: "10261145", codigoBaader: "720004", descripcion: "RETEN 40X55X8 VITON", cantidad: 6, precioUnitario: 11.80, totalUsd: 70.80 },
  { codigoSap: "10261146", codigoBaader: "730001", descripcion: "COJINETE LINEAL LM12UU", cantidad: 8, precioUnitario: 12.00, totalUsd: 96.00 }
];

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
    if (deleted % 50 === 0) {
      console.log(`Eliminados: ${deleted}/${snapshot.size}`);
    }
  }
  
  console.log(`✅ Eliminados ${deleted} documentos`);
  console.log('\n=== IMPORTANDO REPUESTOS ===');
  console.log(`Total a importar: ${repuestosData.length}`);
  
  let imported = 0;
  for (const repuesto of repuestosData) {
    try {
      await addDoc(repuestosRef, {
        codigoSAP: repuesto.codigoSap,
        codigoBaader: repuesto.codigoBaader,
        descripcion: repuesto.descripcion,
        cantidadSolicitada: repuesto.cantidad,
        cantidadStockBodega: 0,
        valorUnitario: repuesto.precioUnitario,
        total: repuesto.totalUsd,
        imagenesManual: [],
        fotosReales: [],
        paginaManual: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      imported++;
      if (imported % 10 === 0) {
        console.log(`Importados: ${imported}/${repuestosData.length}`);
      }
    } catch (error) {
      console.error(`Error: ${repuesto.codigoSap}`, error);
    }
  }
  
  console.log('\n=== COMPLETADO ===');
  console.log(`✅ Importados: ${imported}`);
}

cleanAndImport()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
