import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function check() {
  const snap = await getDocs(collection(db, 'repuestosBaader200'));
  console.log(`Total repuestos en repuestosBaader200: ${snap.size}`);
  
  const snap2 = await getDocs(collection(db, 'repuestos'));
  console.log(`Total repuestos en repuestos: ${snap2.size}`);
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
