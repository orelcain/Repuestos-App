// Script para eliminar máquinas incorrectas y crear Baader 200 con ID correcto
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCB9W0rICCeV8P6aLRAqQ2Z-P7lX7-iYsE",
  authDomain: "app-inventario-repuestos.firebaseapp.com",
  projectId: "app-inventario-repuestos",
  storageBucket: "app-inventario-repuestos.firebasestorage.app",
  messagingSenderId: "462533573856",
  appId: "1:462533573856:web:8c2d30077bff4e3b6bef27"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixBaaderMachine() {
  console.log('🔧 Iniciando corrección de máquina Baader 200...\n');

  try {
    // 1. Listar todas las máquinas existentes
    const machinesSnapshot = await getDocs(collection(db, 'machines'));
    console.log(`📊 Máquinas encontradas: ${machinesSnapshot.size}`);
    
    machinesSnapshot.forEach(doc => {
      console.log(`  - ${doc.id}: ${doc.data().nombre}`);
    });
    console.log('');

    // 2. Eliminar máquinas que NO sean "baader-200"
    for (const machineDoc of machinesSnapshot.docs) {
      if (machineDoc.id !== 'baader-200') {
        console.log(`🗑️  Eliminando máquina incorrecta: ${machineDoc.id}`);
        await deleteDoc(doc(db, 'machines', machineDoc.id));
      }
    }

    // 3. Crear/actualizar máquina Baader 200 con ID correcto
    const baaderDocRef = doc(db, 'machines', 'baader-200');
    const baaderData = {
      nombre: 'Baader 200',
      marca: 'Baader',
      modelo: '200',
      descripcion: 'Máquina principal - Datos de repuestosBaader200',
      activa: true,
      color: '#3b82f6',
      orden: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await setDoc(baaderDocRef, baaderData);
    console.log('\n✅ Máquina Baader 200 creada/actualizada con ID: baader-200');
    console.log('   Nombre:', baaderData.nombre);
    console.log('   Marca:', baaderData.marca);
    console.log('   Modelo:', baaderData.modelo);
    console.log('   Color:', baaderData.color);

    console.log('\n🎉 ¡Corrección completada exitosamente!');
    console.log('   Ahora puedes recargar la app y verás:');
    console.log('   - Pestaña "Baader 200" cargada');
    console.log('   - Repuestos de repuestosBaader200 visibles');
    console.log('   - Backup funcionando');
    console.log('   - Tags cargados\n');

  } catch (error) {
    console.error('❌ Error al corregir máquina:', error);
    throw error;
  }
}

// Ejecutar
fixBaaderMachine()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
