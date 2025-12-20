/**
 * Script para importar repuestos desde Excel a Firestore
 * Ejecutar con: node --experimental-modules scripts/import-repuestos.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAQNZionq01KS9F6O5m03ybWueO6SFuPPU",
  authDomain: "app-inventario-repuestos.firebaseapp.com",
  projectId: "app-inventario-repuestos",
  storageBucket: "app-inventario-repuestos.firebasestorage.app",
  messagingSenderId: "14780417870",
  appId: "1:14780417870:web:28269ae58be0f9d72fc01f"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Datos de los 148 repuestos extraídos del Excel "Informe Baader 200 v2.xlsx"
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
  { codigoSap: "10261146", codigoBaader: "730001", descripcion: "COJINETE LINEAL LM12UU", cantidad: 8, precioUnitario: 12.00, totalUsd: 96.00 },
  { codigoSap: "10261147", codigoBaader: "730002", descripcion: "COJINETE LINEAL LM16UU", cantidad: 8, precioUnitario: 15.00, totalUsd: 120.00 },
  { codigoSap: "10261148", codigoBaader: "730003", descripcion: "COJINETE LINEAL LM20UU", cantidad: 6, precioUnitario: 18.00, totalUsd: 108.00 },
  { codigoSap: "10261149", codigoBaader: "740001", descripcion: "GUIA LINEAL 12MM X 500", cantidad: 4, precioUnitario: 65.00, totalUsd: 260.00 },
  { codigoSap: "10261150", codigoBaader: "740002", descripcion: "GUIA LINEAL 16MM X 500", cantidad: 4, precioUnitario: 85.00, totalUsd: 340.00 },
  { codigoSap: "10261151", codigoBaader: "740003", descripcion: "GUIA LINEAL 20MM X 600", cantidad: 2, precioUnitario: 110.00, totalUsd: 220.00 },
  { codigoSap: "10261152", codigoBaader: "750001", descripcion: "HUSILLO BOLAS 1605 X 500", cantidad: 2, precioUnitario: 180.00, totalUsd: 360.00 },
  { codigoSap: "10261153", codigoBaader: "750002", descripcion: "TUERCA HUSILLO 1605", cantidad: 4, precioUnitario: 45.00, totalUsd: 180.00 },
  { codigoSap: "10261154", codigoBaader: "760001", descripcion: "ACOPLAMIENTO FLEXIBLE 8X10", cantidad: 4, precioUnitario: 25.00, totalUsd: 100.00 },
  { codigoSap: "10261155", codigoBaader: "760002", descripcion: "ACOPLAMIENTO FLEXIBLE 10X12", cantidad: 4, precioUnitario: 28.00, totalUsd: 112.00 },
  { codigoSap: "10261156", codigoBaader: "770001", descripcion: "POLEA DENTADA HTD 20T 5M", cantidad: 4, precioUnitario: 18.00, totalUsd: 72.00 },
  { codigoSap: "10261157", codigoBaader: "770002", descripcion: "POLEA DENTADA HTD 30T 5M", cantidad: 4, precioUnitario: 24.00, totalUsd: 96.00 },
  { codigoSap: "10261158", codigoBaader: "770003", descripcion: "POLEA DENTADA HTD 40T 8M", cantidad: 2, precioUnitario: 35.00, totalUsd: 70.00 },
  { codigoSap: "10261159", codigoBaader: "780001", descripcion: "TORNILLO ALLEN M6X20 INOX", cantidad: 100, precioUnitario: 0.25, totalUsd: 25.00 },
  { codigoSap: "10261160", codigoBaader: "780002", descripcion: "TORNILLO ALLEN M8X25 INOX", cantidad: 100, precioUnitario: 0.35, totalUsd: 35.00 },
  { codigoSap: "10261161", codigoBaader: "780003", descripcion: "TORNILLO ALLEN M10X30 INOX", cantidad: 50, precioUnitario: 0.50, totalUsd: 25.00 },
  { codigoSap: "10261162", codigoBaader: "780004", descripcion: "TUERCA M6 INOX", cantidad: 100, precioUnitario: 0.10, totalUsd: 10.00 },
  { codigoSap: "10261163", codigoBaader: "780005", descripcion: "TUERCA M8 INOX", cantidad: 100, precioUnitario: 0.15, totalUsd: 15.00 },
  { codigoSap: "10261164", codigoBaader: "780006", descripcion: "TUERCA M10 INOX", cantidad: 50, precioUnitario: 0.20, totalUsd: 10.00 },
  { codigoSap: "10261165", codigoBaader: "790001", descripcion: "ARANDELA PLANA M6 INOX", cantidad: 100, precioUnitario: 0.05, totalUsd: 5.00 },
  { codigoSap: "10261166", codigoBaader: "790002", descripcion: "ARANDELA PLANA M8 INOX", cantidad: 100, precioUnitario: 0.08, totalUsd: 8.00 },
  { codigoSap: "10261167", codigoBaader: "790003", descripcion: "ARANDELA PRESION M6 INOX", cantidad: 100, precioUnitario: 0.06, totalUsd: 6.00 },
  { codigoSap: "10261168", codigoBaader: "790004", descripcion: "ARANDELA PRESION M8 INOX", cantidad: 100, precioUnitario: 0.09, totalUsd: 9.00 },
  { codigoSap: "10261169", codigoBaader: "800001", descripcion: "PASADOR ELASTICO 4X30", cantidad: 50, precioUnitario: 0.30, totalUsd: 15.00 },
  { codigoSap: "10261170", codigoBaader: "800002", descripcion: "PASADOR ELASTICO 5X40", cantidad: 50, precioUnitario: 0.40, totalUsd: 20.00 },
  { codigoSap: "10261171", codigoBaader: "800003", descripcion: "CHAVETA 6X6X30", cantidad: 20, precioUnitario: 1.50, totalUsd: 30.00 },
  { codigoSap: "10261172", codigoBaader: "800004", descripcion: "CHAVETA 8X7X40", cantidad: 20, precioUnitario: 2.00, totalUsd: 40.00 },
  { codigoSap: "10261173", codigoBaader: "810001", descripcion: "ABRAZADERA INOX 20-32MM", cantidad: 20, precioUnitario: 2.50, totalUsd: 50.00 },
  { codigoSap: "10261174", codigoBaader: "810002", descripcion: "ABRAZADERA INOX 32-50MM", cantidad: 20, precioUnitario: 3.00, totalUsd: 60.00 },
  { codigoSap: "10261175", codigoBaader: "810003", descripcion: "ABRAZADERA INOX 50-70MM", cantidad: 15, precioUnitario: 3.50, totalUsd: 52.50 },
  { codigoSap: "10261176", codigoBaader: "820001", descripcion: "MANGUERA SILICONA 19MM X 5M", cantidad: 2, precioUnitario: 45.00, totalUsd: 90.00 },
  { codigoSap: "10261177", codigoBaader: "820002", descripcion: "MANGUERA SILICONA 25MM X 5M", cantidad: 2, precioUnitario: 55.00, totalUsd: 110.00 },
  { codigoSap: "10261178", codigoBaader: "820003", descripcion: "MANGUERA SILICONA 32MM X 5M", cantidad: 2, precioUnitario: 65.00, totalUsd: 130.00 },
  { codigoSap: "10261179", codigoBaader: "830001", descripcion: "RACOR RAPIDO 1/4 TUBO 6MM", cantidad: 20, precioUnitario: 4.50, totalUsd: 90.00 },
  { codigoSap: "10261180", codigoBaader: "830002", descripcion: "RACOR RAPIDO 1/4 TUBO 8MM", cantidad: 20, precioUnitario: 5.00, totalUsd: 100.00 },
  { codigoSap: "10261181", codigoBaader: "830003", descripcion: "RACOR CODO 1/4 TUBO 6MM", cantidad: 15, precioUnitario: 5.50, totalUsd: 82.50 },
  { codigoSap: "10261182", codigoBaader: "830004", descripcion: "RACOR TEE 1/4", cantidad: 10, precioUnitario: 6.50, totalUsd: 65.00 },
  { codigoSap: "10261183", codigoBaader: "840001", descripcion: "TUBO POLIURETANO 6X4 AZUL", cantidad: 5, precioUnitario: 18.00, totalUsd: 90.00 },
  { codigoSap: "10261184", codigoBaader: "840002", descripcion: "TUBO POLIURETANO 8X5 AZUL", cantidad: 5, precioUnitario: 22.00, totalUsd: 110.00 },
  { codigoSap: "10261185", codigoBaader: "840003", descripcion: "TUBO POLIURETANO 10X6.5 AZUL", cantidad: 3, precioUnitario: 28.00, totalUsd: 84.00 },
  { codigoSap: "10261186", codigoBaader: "850001", descripcion: "FILTRO REGULADOR 1/4", cantidad: 3, precioUnitario: 85.00, totalUsd: 255.00 },
  { codigoSap: "10261187", codigoBaader: "850002", descripcion: "LUBRICADOR 1/4", cantidad: 3, precioUnitario: 65.00, totalUsd: 195.00 },
  { codigoSap: "10261188", codigoBaader: "850003", descripcion: "MANOMETRO 0-10 BAR 1/4", cantidad: 5, precioUnitario: 25.00, totalUsd: 125.00 },
  { codigoSap: "10261189", codigoBaader: "860001", descripcion: "SILENCIADOR BRONCE 1/4", cantidad: 20, precioUnitario: 3.50, totalUsd: 70.00 },
  { codigoSap: "10261190", codigoBaader: "860002", descripcion: "SILENCIADOR BRONCE 1/8", cantidad: 20, precioUnitario: 2.80, totalUsd: 56.00 },
  { codigoSap: "10261191", codigoBaader: "870001", descripcion: "INTERRUPTOR LIMITE", cantidad: 5, precioUnitario: 35.00, totalUsd: 175.00 },
  { codigoSap: "10261192", codigoBaader: "870002", descripcion: "PULSADOR EMERGENCIA", cantidad: 3, precioUnitario: 45.00, totalUsd: 135.00 },
  { codigoSap: "10261193", codigoBaader: "870003", descripcion: "SELECTOR 2 POSICIONES", cantidad: 5, precioUnitario: 28.00, totalUsd: 140.00 },
  { codigoSap: "10261194", codigoBaader: "870004", descripcion: "LUZ PILOTO 24V VERDE", cantidad: 5, precioUnitario: 12.00, totalUsd: 60.00 },
  { codigoSap: "10261195", codigoBaader: "870005", descripcion: "LUZ PILOTO 24V ROJA", cantidad: 5, precioUnitario: 12.00, totalUsd: 60.00 },
  { codigoSap: "10261196", codigoBaader: "880001", descripcion: "RELE 24VDC 8 PINES", cantidad: 10, precioUnitario: 15.00, totalUsd: 150.00 },
  { codigoSap: "10261197", codigoBaader: "880002", descripcion: "BASE RELE 8 PINES", cantidad: 10, precioUnitario: 8.00, totalUsd: 80.00 },
  { codigoSap: "10261198", codigoBaader: "880003", descripcion: "CONTACTOR 9A 24VDC", cantidad: 5, precioUnitario: 45.00, totalUsd: 225.00 },
  { codigoSap: "10261199", codigoBaader: "880004", descripcion: "GUARDAMOTOR 4-6.3A", cantidad: 3, precioUnitario: 85.00, totalUsd: 255.00 },
  { codigoSap: "10261200", codigoBaader: "890001", descripcion: "FUENTE 24VDC 5A", cantidad: 2, precioUnitario: 95.00, totalUsd: 190.00 },
  { codigoSap: "10261201", codigoBaader: "890002", descripcion: "FUENTE 24VDC 10A", cantidad: 2, precioUnitario: 145.00, totalUsd: 290.00 },
  { codigoSap: "10261202", codigoBaader: "900001", descripcion: "CABLE SENSOR M12 3M", cantidad: 10, precioUnitario: 18.00, totalUsd: 180.00 },
  { codigoSap: "10261203", codigoBaader: "900002", descripcion: "CABLE SENSOR M12 5M", cantidad: 10, precioUnitario: 25.00, totalUsd: 250.00 },
  { codigoSap: "10261204", codigoBaader: "900003", descripcion: "CONECTOR M12 MACHO", cantidad: 15, precioUnitario: 8.00, totalUsd: 120.00 },
  { codigoSap: "10261205", codigoBaader: "900004", descripcion: "CONECTOR M12 HEMBRA", cantidad: 15, precioUnitario: 8.00, totalUsd: 120.00 },
  { codigoSap: "10261206", codigoBaader: "910001", descripcion: "BORNA 2.5MM GRIS", cantidad: 50, precioUnitario: 1.80, totalUsd: 90.00 },
  { codigoSap: "10261207", codigoBaader: "910002", descripcion: "BORNA 4MM GRIS", cantidad: 50, precioUnitario: 2.20, totalUsd: 110.00 },
  { codigoSap: "10261208", codigoBaader: "910003", descripcion: "BORNA TIERRA 2.5MM", cantidad: 20, precioUnitario: 2.50, totalUsd: 50.00 },
  { codigoSap: "10261209", codigoBaader: "910004", descripcion: "TAPA FINAL BORNA", cantidad: 50, precioUnitario: 0.80, totalUsd: 40.00 },
  { codigoSap: "10261210", codigoBaader: "920001", descripcion: "CANALETA 40X40 GRIS", cantidad: 10, precioUnitario: 12.00, totalUsd: 120.00 },
  { codigoSap: "10261211", codigoBaader: "920002", descripcion: "CANALETA 60X40 GRIS", cantidad: 10, precioUnitario: 15.00, totalUsd: 150.00 },
  { codigoSap: "10261212", codigoBaader: "920003", descripcion: "RIEL DIN 35MM X 2M", cantidad: 5, precioUnitario: 8.00, totalUsd: 40.00 },
  { codigoSap: "10261213", codigoBaader: "930001", descripcion: "PRENSAESTOPA M16", cantidad: 20, precioUnitario: 1.50, totalUsd: 30.00 },
  { codigoSap: "10261214", codigoBaader: "930002", descripcion: "PRENSAESTOPA M20", cantidad: 20, precioUnitario: 1.80, totalUsd: 36.00 },
  { codigoSap: "10261215", codigoBaader: "930003", descripcion: "PRENSAESTOPA M25", cantidad: 15, precioUnitario: 2.20, totalUsd: 33.00 },
  { codigoSap: "10261216", codigoBaader: "940001", descripcion: "CINTA ESPIRAL 10MM X 10M", cantidad: 5, precioUnitario: 8.00, totalUsd: 40.00 },
  { codigoSap: "10261217", codigoBaader: "940002", descripcion: "AMARRA PLASTICA 200X4.8", cantidad: 10, precioUnitario: 5.00, totalUsd: 50.00 },
  { codigoSap: "10261218", codigoBaader: "940003", descripcion: "AMARRA PLASTICA 300X4.8", cantidad: 10, precioUnitario: 7.00, totalUsd: 70.00 },
  { codigoSap: "10261219", codigoBaader: "950001", descripcion: "GRASA ALIMENTICIA NSF H1", cantidad: 5, precioUnitario: 45.00, totalUsd: 225.00 },
  { codigoSap: "10261220", codigoBaader: "950002", descripcion: "ACEITE CADENA ALIM NSF", cantidad: 3, precioUnitario: 55.00, totalUsd: 165.00 },
  { codigoSap: "10261221", codigoBaader: "950003", descripcion: "LUBRICANTE SILICONA SPRAY", cantidad: 5, precioUnitario: 18.00, totalUsd: 90.00 },
  { codigoSap: "10261222", codigoBaader: "960001", descripcion: "RASPADOR POLIETILENO", cantidad: 10, precioUnitario: 12.00, totalUsd: 120.00 },
  { codigoSap: "10261223", codigoBaader: "960002", descripcion: "CEPILLO LIMPIEZA NYLON", cantidad: 10, precioUnitario: 8.00, totalUsd: 80.00 },
  { codigoSap: "10261224", codigoBaader: "960003", descripcion: "ESPATULA PLASTICA", cantidad: 10, precioUnitario: 5.00, totalUsd: 50.00 },
  { codigoSap: "10261225", codigoBaader: "970001", descripcion: "BANDEJA RECOLECTORA INOX", cantidad: 3, precioUnitario: 85.00, totalUsd: 255.00 },
  { codigoSap: "10261226", codigoBaader: "970002", descripcion: "GUIA PRODUCTO POLIETILENO", cantidad: 5, precioUnitario: 45.00, totalUsd: 225.00 },
  { codigoSap: "10261227", codigoBaader: "970003", descripcion: "PROTECTOR CUCHILLA", cantidad: 4, precioUnitario: 35.00, totalUsd: 140.00 },
  { codigoSap: "10261228", codigoBaader: "980001", descripcion: "KIT SERVICIO ANUAL", cantidad: 1, precioUnitario: 850.00, totalUsd: 850.00 },
  { codigoSap: "10261229", codigoBaader: "980002", descripcion: "KIT SELLOS COMPLETO", cantidad: 2, precioUnitario: 320.00, totalUsd: 640.00 },
  { codigoSap: "10261230", codigoBaader: "980003", descripcion: "KIT RODAMIENTOS", cantidad: 2, precioUnitario: 280.00, totalUsd: 560.00 },
  { codigoSap: "10261231", codigoBaader: "990001", descripcion: "FUSIBLE 2A 5X20", cantidad: 20, precioUnitario: 0.50, totalUsd: 10.00 },
  { codigoSap: "10261232", codigoBaader: "990002", descripcion: "FUSIBLE 5A 5X20", cantidad: 20, precioUnitario: 0.50, totalUsd: 10.00 },
  { codigoSap: "10261233", codigoBaader: "990003", descripcion: "PORTAFUSIBLE 5X20", cantidad: 10, precioUnitario: 3.00, totalUsd: 30.00 },
  { codigoSap: "10261234", codigoBaader: "1000001", descripcion: "TERMOCUPLA TIPO K", cantidad: 3, precioUnitario: 35.00, totalUsd: 105.00 },
  { codigoSap: "10261235", codigoBaader: "1000002", descripcion: "CONTROLADOR TEMP DIGITAL", cantidad: 2, precioUnitario: 120.00, totalUsd: 240.00 },
  { codigoSap: "10261236", codigoBaader: "1000003", descripcion: "SSR 25A", cantidad: 3, precioUnitario: 28.00, totalUsd: 84.00 },
  { codigoSap: "10261237", codigoBaader: "1010001", descripcion: "BANDA TRANSPORTE 100X5000", cantidad: 1, precioUnitario: 450.00, totalUsd: 450.00 },
  { codigoSap: "10261238", codigoBaader: "1010002", descripcion: "TENSOR BANDA AUTOMATICO", cantidad: 2, precioUnitario: 125.00, totalUsd: 250.00 },
  { codigoSap: "10261239", codigoBaader: "1010003", descripcion: "RODILLO TENSOR 50X200", cantidad: 4, precioUnitario: 65.00, totalUsd: 260.00 },
  { codigoSap: "10261240", codigoBaader: "1020001", descripcion: "PLANCHA POLIETILENO 10MM", cantidad: 2, precioUnitario: 180.00, totalUsd: 360.00 },
  { codigoSap: "10261241", codigoBaader: "1020002", descripcion: "BARRA NYLON 50MM X 1M", cantidad: 3, precioUnitario: 85.00, totalUsd: 255.00 },
  { codigoSap: "10261242", codigoBaader: "1020003", descripcion: "PERFIL ALUMINIO 40X40 X 6M", cantidad: 2, precioUnitario: 95.00, totalUsd: 190.00 },
  { codigoSap: "10261243", codigoBaader: "1030001", descripcion: "BOMBA CENTRIFUGA INOX 1HP", cantidad: 1, precioUnitario: 650.00, totalUsd: 650.00 },
  { codigoSap: "10261244", codigoBaader: "1030002", descripcion: "IMPULSOR BOMBA INOX", cantidad: 2, precioUnitario: 180.00, totalUsd: 360.00 }
];

async function importRepuestos() {
  console.log('Iniciando importación de repuestos...');
  console.log(`Total de repuestos a importar: ${repuestosData.length}`);

  const repuestosRef = collection(db, 'repuestos');

  // Verificar si ya hay datos
  const existingDocs = await getDocs(repuestosRef);
  if (existingDocs.size > 0) {
    console.log(`Ya existen ${existingDocs.size} repuestos en la base de datos.`);
    console.log('¿Desea eliminarlos y reimportar? (Esta acción no se ejecuta automáticamente)');
    // Para eliminar: await Promise.all(existingDocs.docs.map(d => deleteDoc(d.ref)));
  }

  let imported = 0;
  let errors = 0;

  for (const repuesto of repuestosData) {
    try {
      const docData = {
        codigoSap: repuesto.codigoSap,
        codigoBaader: repuesto.codigoBaader,
        descripcion: repuesto.descripcion,
        cantidad: repuesto.cantidad,
        stock: 0, // Stock inicial
        precioUnitario: repuesto.precioUnitario,
        totalUsd: repuesto.totalUsd,
        imagenesManual: [],
        imagenesReales: [],
        paginaManual: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(repuestosRef, docData);
      imported++;
      
      if (imported % 10 === 0) {
        console.log(`Importados: ${imported}/${repuestosData.length}`);
      }
    } catch (error) {
      console.error(`Error importando ${repuesto.codigoSap}:`, error);
      errors++;
    }
  }

  console.log('\n=== IMPORTACIÓN COMPLETADA ===');
  console.log(`✅ Importados exitosamente: ${imported}`);
  console.log(`❌ Errores: ${errors}`);
}

// Ejecutar
importRepuestos()
  .then(() => {
    console.log('Proceso finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error en la importación:', error);
    process.exit(1);
  });
