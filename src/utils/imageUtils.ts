// Utilidades para optimización de imágenes

export interface ImageQualityOption {
  label: string;
  value: number;
  description: string;
}

// Opciones de calidad predefinidas
export const QUALITY_OPTIONS: ImageQualityOption[] = [
  { label: 'Máxima', value: 0.95, description: 'Sin pérdida visible, mayor tamaño' },
  { label: 'Alta', value: 0.85, description: 'Excelente calidad, buen balance' },
  { label: 'Media', value: 0.70, description: 'Buena calidad, archivo más pequeño' },
  { label: 'Baja', value: 0.50, description: 'Calidad aceptable, muy comprimido' },
  { label: 'Mínima', value: 0.30, description: 'Solo para previsualizaciones' },
];

// Convertir imagen a WebP con calidad específica
export async function convertToWebP(
  file: File, 
  quality: number = 0.85,
  maxWidth: number = 1920,
  maxHeight: number = 1920
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Calcular dimensiones manteniendo proporción
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      if (!ctx) {
        reject(new Error('No se pudo crear contexto de canvas'));
        return;
      }

      // Dibujar imagen redimensionada
      ctx.drawImage(img, 0, 0, width, height);

      // Convertir a WebP
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('No se pudo convertir la imagen'));
            return;
          }

          // Crear nuevo archivo con extensión .webp
          const originalName = file.name.replace(/\.[^.]+$/, '');
          const webpFile = new File([blob], `${originalName}.webp`, {
            type: 'image/webp',
            lastModified: Date.now(),
          });

          resolve(webpFile);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Error al cargar la imagen'));
    };

    // Cargar imagen desde File
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
}

// Obtener tamaño estimado después de compresión
export async function estimateCompressedSize(
  file: File,
  quality: number
): Promise<number> {
  const webpFile = await convertToWebP(file, quality);
  return webpFile.size;
}

// Formatear tamaño de archivo
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Tipo para imagen con dimensiones
export interface ImageData {
  base64: string;
  width: number;
  height: number;
}

// Convertir imagen URL a base64 con dimensiones (para exportación PDF)
export async function imageUrlToBase64WithDimensions(url: string): Promise<ImageData | null> {
  if (!url) {
    console.warn('URL vacía proporcionada');
    return null;
  }
  
  // Método 1: Usar Image + Canvas
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // Timeout para evitar esperas infinitas
    const timeout = setTimeout(() => {
      console.warn('Timeout cargando imagen:', url.substring(0, 50) + '...');
      resolve(null);
    }, 15000);
    
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const width = img.naturalWidth || img.width || 200;
        const height = img.naturalHeight || img.height || 200;
        
        if (width === 0 || height === 0) {
          console.warn('Imagen con dimensiones 0');
          resolve(null);
          return;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          // Usar JPEG para mejor compatibilidad con jsPDF
          const base64 = canvas.toDataURL('image/jpeg', 0.85);
          resolve({ base64, width, height });
        } else {
          console.warn('No se pudo obtener context 2d');
          resolve(null);
        }
      } catch (err) {
        console.error('Error en canvas:', err);
        resolve(null);
      }
    };
    
    img.onerror = (err) => {
      clearTimeout(timeout);
      console.warn('Error cargando imagen (onerror):', err);
      // Intentar método alternativo con fetch
      fetchImageAsBase64WithDimensions(url).then(resolve);
    };
    
    // NO agregar timestamp a URLs de Firebase (tienen tokens de auth)
    img.src = url;
  });
}

// Convertir imagen URL a base64 (para exportación PDF) - versión simple
export async function imageUrlToBase64(url: string): Promise<string | null> {
  const result = await imageUrlToBase64WithDimensions(url);
  return result?.base64 || null;
}

// Método alternativo con fetch que devuelve dimensiones
async function fetchImageAsBase64WithDimensions(url: string): Promise<ImageData | null> {
  try {
    const response = await fetch(url, { 
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) {
      console.warn('Fetch failed:', response.status);
      return null;
    }
    
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Cargar imagen para obtener dimensiones
        const img = new Image();
        img.onload = () => {
          resolve({ 
            base64, 
            width: img.naturalWidth || 200, 
            height: img.naturalHeight || 200 
          });
        };
        img.onerror = () => resolve({ base64, width: 200, height: 200 });
        img.src = base64;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error en fetch:', error);
    return null;
  }
}

// Precargar imágenes de repuestos y convertir a base64 con dimensiones
export async function preloadImagesWithDimensions(
  repuestos: { imagenesManual: { url: string }[]; fotosReales: { url: string }[] }[]
): Promise<Map<string, ImageData>> {
  const imageMap = new Map<string, ImageData>();
  const urls = new Set<string>();

  // Recolectar todas las URLs únicas
  for (const repuesto of repuestos) {
    for (const img of repuesto.imagenesManual) {
      if (img.url) urls.add(img.url);
    }
    for (const img of repuesto.fotosReales) {
      if (img.url) urls.add(img.url);
    }
  }

  console.log('URLs de imágenes encontradas:', urls.size);

  // Convertir en paralelo (con límite)
  const urlArray = Array.from(urls);
  const batchSize = 3;
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < urlArray.length; i += batchSize) {
    const batch = urlArray.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (url) => {
        console.log('Procesando imagen:', url.substring(0, 60) + '...');
        const data = await imageUrlToBase64WithDimensions(url);
        if (data) {
          console.log(`✓ Imagen OK (${data.width}x${data.height})`);
          successCount++;
        } else {
          console.log('✗ Imagen falló');
          failCount++;
        }
        return { url, data };
      })
    );
    
    for (const { url, data } of results) {
      if (data) {
        imageMap.set(url, data);
      }
    }
  }

  console.log(`Imágenes convertidas: ${successCount} éxito, ${failCount} fallos`);
  return imageMap;
}

// Precargar imágenes de repuestos y convertir a base64 (versión legacy)
export async function preloadImagesAsBase64(
  repuestos: { imagenesManual: { url: string }[]; fotosReales: { url: string }[] }[]
): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>();
  const urls = new Set<string>();

  // Recolectar todas las URLs únicas
  for (const repuesto of repuestos) {
    for (const img of repuesto.imagenesManual) {
      if (img.url) urls.add(img.url);
    }
    for (const img of repuesto.fotosReales) {
      if (img.url) urls.add(img.url);
    }
  }

  console.log('URLs de imágenes encontradas:', urls.size);
  console.log('Primeras 3 URLs:', Array.from(urls).slice(0, 3));

  // Convertir en paralelo (con límite)
  const urlArray = Array.from(urls);
  const batchSize = 3;
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < urlArray.length; i += batchSize) {
    const batch = urlArray.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (url) => {
        console.log('Procesando imagen:', url.substring(0, 80) + '...');
        const base64 = await imageUrlToBase64(url);
        if (base64) {
          console.log('✓ Imagen convertida OK');
          successCount++;
        } else {
          console.log('✗ Imagen falló');
          failCount++;
        }
        return { url, base64 };
      })
    );
    
    for (const { url, base64 } of results) {
      if (base64) {
        imageMap.set(url, base64);
      }
    }
  }

  console.log(`Imágenes convertidas: ${successCount} éxito, ${failCount} fallos`);
  return imageMap;
}
