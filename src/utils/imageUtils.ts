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

// Convertir imagen URL a base64 (para exportación PDF)
export async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    // Usar fetch con mode cors
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error convirtiendo imagen a base64:', error);
    
    // Método alternativo usando Image y Canvas
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          try {
            const base64 = canvas.toDataURL('image/jpeg', 0.8);
            resolve(base64);
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      
      img.onerror = () => {
        resolve(null);
      };
      
      img.src = url;
    });
  }
}

// Precargar imágenes de repuestos y convertir a base64
export async function preloadImagesAsBase64(
  repuestos: { imagenesManual: { url: string }[]; fotosReales: { url: string }[] }[]
): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>();
  const urls = new Set<string>();

  // Recolectar todas las URLs únicas
  for (const repuesto of repuestos) {
    for (const img of repuesto.imagenesManual) {
      urls.add(img.url);
    }
    for (const img of repuesto.fotosReales) {
      urls.add(img.url);
    }
  }

  // Convertir en paralelo (con límite)
  const urlArray = Array.from(urls);
  const batchSize = 5;
  
  for (let i = 0; i < urlArray.length; i += batchSize) {
    const batch = urlArray.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (url) => {
        const base64 = await imageUrlToBase64(url);
        return { url, base64 };
      })
    );
    
    for (const { url, base64 } of results) {
      if (base64) {
        imageMap.set(url, base64);
      }
    }
  }

  return imageMap;
}
