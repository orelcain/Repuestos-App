/**
 * Script para importar repuestos del Informe Baader 200 v2
 * Tag de solicitud: "Solicitud inicial dic 2025 Informe Baader 200v2"
 * 
 * Para ejecutar este script:
 * 1. En el Dashboard, abrir consola del navegador (F12)
 * 2. Ejecutar: await importarRepuestosInformeV2()
 */

import { collection, getDocs, doc, updateDoc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { TagAsignado, TagGlobal } from '../types';

const COLLECTION_NAME = 'repuestosBaader200';
const SETTINGS_DOC = 'settings/tags';

// Datos extraídos del Excel "Informe Baader 200 v2.xlsx" - 147 repuestos
const REPUESTOS_INFORME_V2 = [
  { codigoSAP: "3300067749", codigoBaader: "2004166018", cantidad: 5 },
  { codigoSAP: "3300077568", codigoBaader: "511057", cantidad: 5 },
  { codigoSAP: "3300066936", codigoBaader: "515447", cantidad: 1 },
  { codigoSAP: "3300011620", codigoBaader: "2005902029", cantidad: 1 },
  { codigoSAP: "3300012202", codigoBaader: "1890312000", cantidad: 8 },
  { codigoSAP: "3300011616", codigoBaader: "2005902030", cantidad: 1 },
  { codigoSAP: "3300051217", codigoBaader: "52746-7", cantidad: 2 },
  { codigoSAP: "3300012252", codigoBaader: "512247", cantidad: 12 },
  { codigoSAP: "3300074855", codigoBaader: "1890311000", cantidad: 1 },
  { codigoSAP: "3300053761", codigoBaader: "95270010", cantidad: 1 },
  { codigoSAP: "3300058277", codigoBaader: "515517", cantidad: 1 },
  { codigoSAP: "3300012369", codigoBaader: "95060121", cantidad: 9 },
  { codigoSAP: "3300011775", codigoBaader: "515737", cantidad: 2 },
  { codigoSAP: "3300074743", codigoBaader: "513867", cantidad: 1 },
  { codigoSAP: "3300074824", codigoBaader: "513897", cantidad: 1 },
  { codigoSAP: "3300051216", codigoBaader: "513497", cantidad: 4 },
  { codigoSAP: "3300074825", codigoBaader: "514017", cantidad: 1 },
  { codigoSAP: "3300074826", codigoBaader: "514047", cantidad: 1 },
  { codigoSAP: "3300070230", codigoBaader: "95250063", cantidad: 2 },
  { codigoSAP: "3300015735", codigoBaader: "515467", cantidad: 2 },
  { codigoSAP: "3300012253", codigoBaader: "632697", cantidad: 4 },
  { codigoSAP: "3300070245", codigoBaader: "636997", cantidad: 2 },
  { codigoSAP: "3300135529", codigoBaader: "2004002000 A4", cantidad: 2 },
  { codigoSAP: "3300081177", codigoBaader: "526467", cantidad: 2 },
  { codigoSAP: "3300054470", codigoBaader: "1890310006", cantidad: 4 },
  { codigoSAP: "3300074856", codigoBaader: "2000300021", cantidad: 2 },
  { codigoSAP: "3300061895", codigoBaader: "401107", cantidad: 4 },
  { codigoSAP: "3300054480", codigoBaader: "516127", cantidad: 2 },
  { codigoSAP: "3300017418", codigoBaader: "2001202002", cantidad: 1 },
  { codigoSAP: "3300012203", codigoBaader: "519337", cantidad: 1 },
  { codigoSAP: "3300017417", codigoBaader: "2001202004", cantidad: 1 },
  { codigoSAP: "3300106411", codigoBaader: "2000300002", cantidad: 1 },
  { codigoSAP: "3300012149", codigoBaader: "519317", cantidad: 1 },
  { codigoSAP: "3300070227", codigoBaader: "95250023", cantidad: 2 },
  { codigoSAP: "3300058278", codigoBaader: "634817", cantidad: 1 },
  { codigoSAP: "3300012201", codigoBaader: "1870510012", cantidad: 1 },
  { codigoSAP: "3300012151", codigoBaader: "1870520008", cantidad: 1 },
  { codigoSAP: "3300012205", codigoBaader: "51508-7", cantidad: 2 },
  { codigoSAP: "3300054469", codigoBaader: "511207", cantidad: 4 },
  { codigoSAP: "3300111060", codigoBaader: "515487", cantidad: 1 },
  { codigoSAP: "3300054482", codigoBaader: "1890420001", cantidad: 1 },
  { codigoSAP: "3300073833", codigoBaader: "2000300012", cantidad: 1 },
  { codigoSAP: "3300011830", codigoBaader: "92461630", cantidad: 5 },
  { codigoSAP: "3300074831", codigoBaader: "2001203001", cantidad: 1 },
  { codigoSAP: "3300063798", codigoBaader: "515997", cantidad: 2 },
  { codigoSAP: "3300054471", codigoBaader: "517977", cantidad: 1 },
  { codigoSAP: "3300037826", codigoBaader: "512757", cantidad: 1 },
  { codigoSAP: "3300063797", codigoBaader: "515987", cantidad: 2 },
  { codigoSAP: "3300080954", codigoBaader: "513727", cantidad: 3 },
  { codigoSAP: "3300063795", codigoBaader: "513457", cantidad: 2 },
  { codigoSAP: "3300106403", codigoBaader: "94011760", cantidad: 6 },
  { codigoSAP: "3300051228", codigoBaader: "521727", cantidad: 2 },
  { codigoSAP: "3300035292", codigoBaader: "94000006", cantidad: 12 },
  { codigoSAP: "3300083560", codigoBaader: "513607", cantidad: 2 },
  { codigoSAP: "3300035291", codigoBaader: "94000005", cantidad: 12 },
  { codigoSAP: "3300051231", codigoBaader: "401167", cantidad: 9 },
  { codigoSAP: "3300074736", codigoBaader: "512107", cantidad: 2 },
  { codigoSAP: "3300071219", codigoBaader: "2004902019", cantidad: 1 },
  { codigoSAP: "3300106419", codigoBaader: "2004902018", cantidad: 1 },
  { codigoSAP: "3300038765", codigoBaader: "513617", cantidad: 2 },
  { codigoSAP: "3300091371", codigoBaader: "2004179077", cantidad: 1 },
  { codigoSAP: "3300090774", codigoBaader: "2004179078", cantidad: 1 },
  { codigoSAP: "3300037808", codigoBaader: "510397", cantidad: 1 },
  { codigoSAP: "3300038770", codigoBaader: "519447", cantidad: 1 },
  { codigoSAP: "3300051219", codigoBaader: "631687", cantidad: 1 },
  { codigoSAP: "3300038854", codigoBaader: "2001202011", cantidad: 1 },
  { codigoSAP: "3300011831", codigoBaader: "92461620", cantidad: 3 },
  { codigoSAP: "3300106305", codigoBaader: "1870240002", cantidad: 10 },
  { codigoSAP: "3300073834", codigoBaader: "92204032", cantidad: 2 },
  { codigoSAP: "3300035274", codigoBaader: "2001202010", cantidad: 1 },
  { codigoSAP: "3300053757", codigoBaader: "512907", cantidad: 2 },
  { codigoSAP: "3300035295", codigoBaader: "2002601004", cantidad: 1 },
  { codigoSAP: "3300011882", codigoBaader: "42303087 F", cantidad: 2 },
  { codigoSAP: "3300017044", codigoBaader: "92461640", cantidad: 2 },
  { codigoSAP: "3300061900", codigoBaader: "401247", cantidad: 1 },
  { codigoSAP: "3300011617", codigoBaader: "2001400009", cantidad: 1 },
  { codigoSAP: "3300012367", codigoBaader: "517007", cantidad: 2 },
  { codigoSAP: "3300037854", codigoBaader: "522417", cantidad: 2 },
  { codigoSAP: "3300012318", codigoBaader: "37021202", cantidad: 2 },
  { codigoSAP: "3300037820", codigoBaader: "35406052", cantidad: 18 },
  { codigoSAP: "3300051789", codigoBaader: "200260100xx", cantidad: 1 },
  { codigoSAP: "3300037856", codigoBaader: "2002603001", cantidad: 1 },
  { codigoSAP: "3300071105", codigoBaader: "2004008001", cantidad: 2 },
  { codigoSAP: "3300135530", codigoBaader: "910822535", cantidad: 1 },
  { codigoSAP: "3300011618", codigoBaader: "2001400010", cantidad: 1 },
  { codigoSAP: "3300037815", codigoBaader: "92504025", cantidad: 4 },
  { codigoSAP: "3300035288", codigoBaader: "513417", cantidad: 6 },
  { codigoSAP: "3300103278", codigoBaader: "94011918", cantidad: 3 },
  { codigoSAP: "3300103277", codigoBaader: "94011910", cantidad: 3 },
  { codigoSAP: "3300037807", codigoBaader: "91082524", cantidad: 1 },
  { codigoSAP: "3300071150", codigoBaader: "2004008002", cantidad: 1 },
  { codigoSAP: "3300035287", codigoBaader: "631677", cantidad: 1 },
  { codigoSAP: "3300100619", codigoBaader: "37290121", cantidad: 2 },
  { codigoSAP: "3300061894", codigoBaader: "92461650", cantidad: 1 },
  { codigoSAP: "3300014746", codigoBaader: "1886510007", cantidad: 1 },
  { codigoSAP: "3300017043", codigoBaader: "92462030", cantidad: 1 },
  { codigoSAP: "3300037835", codigoBaader: "512087", cantidad: 2 },
  { codigoSAP: "3300051229", codigoBaader: "91193222", cantidad: 1 },
  { codigoSAP: "3300011829", codigoBaader: "37290120", cantidad: 5 },
  { codigoSAP: "3300012255", codigoBaader: "92204025", cantidad: 2 },
  { codigoSAP: "3300016817", codigoBaader: "92141620", cantidad: 4 },
  { codigoSAP: "3300011770", codigoBaader: "33136006", cantidad: 2 },
  { codigoSAP: "3300012375", codigoBaader: "1891910001", cantidad: 8 },
  { codigoSAP: "3300012377", codigoBaader: "1890770006", cantidad: 4 },
  { codigoSAP: "3300012366", codigoBaader: "39200205", cantidad: 10 },
  { codigoSAP: "3300037849", codigoBaader: "513227", cantidad: 2 },
  { codigoSAP: "3300048094", codigoBaader: "35008001", cantidad: 2 },
  { codigoSAP: "3300038755", codigoBaader: "513527", cantidad: 2 },
  { codigoSAP: "3300011869", codigoBaader: "519647", cantidad: 2 },
  { codigoSAP: "3300038764", codigoBaader: "401257", cantidad: 2 },
  { codigoSAP: "3300011719", codigoBaader: "92143223", cantidad: 2 },
  { codigoSAP: "3300011720", codigoBaader: "92143218", cantidad: 2 },
  { codigoSAP: "3300012254", codigoBaader: "92162525", cantidad: 2 },
  { codigoSAP: "3300070280", codigoBaader: "92162030", cantidad: 2 },
  { codigoSAP: "3300012317", codigoBaader: "37021068", cantidad: 1 },
  { codigoSAP: "3300012145", codigoBaader: "520097", cantidad: 1 },
  { codigoSAP: "3300037811", codigoBaader: "35004007", cantidad: 2 },
  { codigoSAP: "3300045152", codigoBaader: "39100548", cantidad: 1 },
  { codigoSAP: "3300011776", codigoBaader: "35023201", cantidad: 4 },
  { codigoSAP: "3300070557", codigoBaader: "32810070", cantidad: 42 },
  { codigoSAP: "3300011772", codigoBaader: "33066003", cantidad: 6 },
  { codigoSAP: "3300011657", codigoBaader: "34700251", cantidad: 30 },
  { codigoSAP: "3300011777", codigoBaader: "35012502", cantidad: 2 },
  { codigoSAP: "3300037840", codigoBaader: "35013001", cantidad: 2 },
  { codigoSAP: "3300012370", codigoBaader: "30050830", cantidad: 40 },
  { codigoSAP: "3300011820", codigoBaader: "37310102", cantidad: 4 },
  { codigoSAP: "3300012150", codigoBaader: "39200181", cantidad: 8 },
  { codigoSAP: "3300011823", codigoBaader: "37021079", cantidad: 1 },
  { codigoSAP: "3300011773", codigoBaader: "38000082", cantidad: 2 },
  { codigoSAP: "3300011771", codigoBaader: "33066002", cantidad: 2 },
  { codigoSAP: "3300011819", codigoBaader: "37310100", cantidad: 5 },
  { codigoSAP: "3300012422", codigoBaader: "38000367", cantidad: 4 },
  { codigoSAP: "3300012431", codigoBaader: "38010603", cantidad: 3 },
  { codigoSAP: "3300037825", codigoBaader: "33006205", cantidad: 2 },
  { codigoSAP: "3300011623", codigoBaader: "519167", cantidad: 1 },
  { codigoSAP: "3300011622", codigoBaader: "519157", cantidad: 1 },
  { codigoSAP: "3300011612", codigoBaader: "519437", cantidad: 2 },
  { codigoSAP: "3300106506", codigoBaader: "38010132", cantidad: 2 },
  { codigoSAP: "3300012421", codigoBaader: "38010107", cantidad: 2 },
  { codigoSAP: "3300011774", codigoBaader: "38000081", cantidad: 4 },
  { codigoSAP: "3300035294", codigoBaader: "31010351", cantidad: 12 },
  { codigoSAP: "3300037836", codigoBaader: "35300233", cantidad: 2 },
  { codigoSAP: "3300012313", codigoBaader: "31800084", cantidad: 40 },
  { codigoSAP: "3300012420", codigoBaader: "38010161", cantidad: 2 },
  { codigoSAP: "3300070720", codigoBaader: "30834010", cantidad: 6 },
  { codigoSAP: "3300012142", codigoBaader: "37310103", cantidad: 1 },
  { codigoSAP: "3300070716", codigoBaader: "30031045", cantidad: 4 }
];

const TAG_NAME = "Solicitud inicial dic 2025 Informe Baader 200v2";
const TAG_TIPO: 'solicitud' | 'stock' = 'solicitud';

export async function importarRepuestosInformeV2() {
  console.log('🚀 Iniciando importación de Informe Baader 200 v2...');
  console.log(`📋 Total repuestos a procesar: ${REPUESTOS_INFORME_V2.length}`);
  console.log(`🏷️ Tag: "${TAG_NAME}" (tipo: ${TAG_TIPO})`);
  
  // Primero, agregar el tag a la lista global si no existe
  try {
    const settingsRef = doc(db, SETTINGS_DOC);
    const settingsSnap = await getDoc(settingsRef);
    const currentTags: TagGlobal[] = settingsSnap.exists() ? (settingsSnap.data().tags || []) : [];
    
    const tagExists = currentTags.some(t => t.nombre === TAG_NAME);
    if (!tagExists) {
      const newTag: TagGlobal = { nombre: TAG_NAME, tipo: TAG_TIPO };
      await setDoc(settingsRef, {
        tags: [...currentTags, newTag],
        updatedAt: new Date()
      });
      console.log(`✅ Tag "${TAG_NAME}" agregado a la lista global`);
    } else {
      console.log(`ℹ️ Tag "${TAG_NAME}" ya existe en la lista global`);
    }
  } catch (err) {
    console.error('⚠️ Error agregando tag a lista global:', err);
  }
  
  // Obtener todos los repuestos actuales
  const snapshot = await getDocs(collection(db, COLLECTION_NAME));
  const repuestosExistentes = new Map<string, { id: string; tags: (string | TagAsignado)[] }>();
  
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    repuestosExistentes.set(data.codigoSAP, {
      id: docSnap.id,
      tags: data.tags || []
    });
  });
  
  console.log(`📦 Encontrados ${repuestosExistentes.size} repuestos en la base de datos`);
  
  let actualizados = 0;
  let yaExistia = 0;
  let noEncontrados: string[] = [];
  
  for (const item of REPUESTOS_INFORME_V2) {
    const existente = repuestosExistentes.get(item.codigoSAP);
    
    if (existente) {
      // Verificar si ya tiene este tag
      const yaExisteTag = existente.tags.some(t => 
        typeof t === 'object' && t.nombre === TAG_NAME
      );
      
      if (!yaExisteTag) {
        // Crear el nuevo tag
        const nuevoTag: TagAsignado = {
          nombre: TAG_NAME,
          tipo: TAG_TIPO,
          cantidad: item.cantidad,
          fecha: new Date()
        };
        
        const updatedTags = [...existente.tags, nuevoTag];
        
        await updateDoc(doc(db, COLLECTION_NAME, existente.id), {
          tags: updatedTags,
          updatedAt: Timestamp.now()
        });
        
        actualizados++;
        console.log(`✅ ${item.codigoSAP}: Tag agregado (cantidad: ${item.cantidad})`);
      } else {
        yaExistia++;
        console.log(`⏭️ ${item.codigoSAP}: Ya tiene el tag, omitiendo`);
      }
    } else {
      noEncontrados.push(item.codigoSAP);
      console.log(`❌ ${item.codigoSAP}: No encontrado en la BD`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN IMPORTACIÓN:');
  console.log('='.repeat(50));
  console.log(`   ✅ Actualizados: ${actualizados}`);
  console.log(`   ⏭️ Ya tenían tag: ${yaExistia}`);
  console.log(`   ❌ No encontrados: ${noEncontrados.length}`);
  
  if (noEncontrados.length > 0) {
    console.log(`\n📝 Códigos SAP no encontrados en la BD:`);
    noEncontrados.forEach(codigo => console.log(`   - ${codigo}`));
  }
  
  return { actualizados, yaExistia, noEncontrados };
}

// Exportar datos para uso desde consola
export { REPUESTOS_INFORME_V2, TAG_NAME, TAG_TIPO };

export default importarRepuestosInformeV2;
