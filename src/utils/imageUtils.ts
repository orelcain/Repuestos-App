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

type CanvasConvertOptions = {
  mimeType: 'image/webp' | 'image/jpeg';
  quality: number;
  maxWidth: number;
  maxHeight: number;
  fileNameSuffix: string;
};

async function sniffImageFormat(blob: Blob): Promise<'webp' | 'jpeg' | 'png' | 'unknown'> {
  try {
    const buf = await blob.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buf);

    // JPEG: FF D8 FF
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
    ) return 'png';

    // WebP: RIFF....WEBP
    const ascii = (i: number) => String.fromCharCode(bytes[i] ?? 0);
    const riff = ascii(0) + ascii(1) + ascii(2) + ascii(3);
    const webp = ascii(8) + ascii(9) + ascii(10) + ascii(11);
    if (riff === 'RIFF' && webp === 'WEBP') return 'webp';
  } catch {
    // ignore
  }

  return 'unknown';
}

async function convertWithCanvas(file: File, options: CanvasConvertOptions): Promise<File> {
  const { mimeType, quality, maxWidth, maxHeight, fileNameSuffix } = options;
  // Preferir createImageBitmap (más eficiente/estable en móvil) y OffscreenCanvas cuando exista.
  // Mantener fallback a Image+ObjectURL para navegadores sin createImageBitmap.
  type Drawable = ImageBitmap | HTMLImageElement;

  const loadDrawable = async (): Promise<Drawable> => {
    if (typeof createImageBitmap === 'function') {
      try {
        return await createImageBitmap(file);
      } catch {
        // Fallback a HTMLImageElement si createImageBitmap(file) falla (común en algunos iOS/formatos).
      }
    }

    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Error al cargar la imagen'));
      };

      img.src = objectUrl;
    });
  };

  const drawable = await loadDrawable();
  const isBitmap = typeof ImageBitmap !== 'undefined' && drawable instanceof ImageBitmap;

  try {
    const sourceW = isBitmap ? (drawable as ImageBitmap).width : (drawable as HTMLImageElement).naturalWidth || (drawable as HTMLImageElement).width;
    const sourceH = isBitmap ? (drawable as ImageBitmap).height : (drawable as HTMLImageElement).naturalHeight || (drawable as HTMLImageElement).height;

    let width = sourceW;
    let height = sourceH;

    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    const targetW = Math.max(1, Math.round(width));
    const targetH = Math.max(1, Math.round(height));

    const canvas: OffscreenCanvas | HTMLCanvasElement =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(targetW, targetH)
        : Object.assign(document.createElement('canvas'), { width: targetW, height: targetH });

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo crear contexto de canvas');
    }

    ctx.drawImage(drawable as CanvasImageSource, 0, 0, targetW, targetH);

    const blob: Blob = await (async () => {
      // OffscreenCanvas puede soportar convertToBlob
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyCanvas: any = canvas;
      if (typeof anyCanvas.convertToBlob === 'function') {
        return anyCanvas.convertToBlob({ type: mimeType, quality });
      }

      return new Promise<Blob>((resolve, reject) => {
        (canvas as HTMLCanvasElement).toBlob(
          (b) => (b ? resolve(b) : reject(new Error('No se pudo convertir la imagen'))),
          mimeType,
          quality
        );
      });
    })();

    // Validación de formato:
    // - Si el navegador devuelve un type distinto (ej: PNG cuando pedimos WebP), fallar para activar fallback.
    // - Si devuelve type vacío, lo aceptamos (algunos navegadores lo hacen) y seguimos.
    if (blob.type && blob.type !== mimeType) {
      throw new Error(`Formato no soportado en este navegador: solicitado ${mimeType}, obtenido ${blob.type}`);
    }

    if (!blob.type) {
      const sniffed = await sniffImageFormat(blob);
      const expected = mimeType === 'image/webp' ? 'webp' : 'jpeg';
      if (sniffed !== expected) {
        throw new Error(`Conversión inválida: solicitado ${expected}, detectado ${sniffed}`);
      }
    }

    const originalName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${originalName}.${fileNameSuffix}`, {
      type: mimeType,
      lastModified: Date.now()
    });
  } finally {
    // Evitar leaks en navegadores que soportan close()
    if (isBitmap) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyBitmap: any = drawable;
      if (typeof anyBitmap.close === 'function') anyBitmap.close();
    }
  }
}

// Convertir imagen a WebP con calidad específica
export async function convertToWebP(
  file: File,
  quality: number = 0.85,
  maxWidth: number = 1920,
  maxHeight: number = 1920
): Promise<File> {
  return convertWithCanvas(file, {
    mimeType: 'image/webp',
    quality,
    maxWidth,
    maxHeight,
    fileNameSuffix: 'webp'
  });
}

export async function convertToJpeg(
  file: File,
  quality: number = 0.85,
  maxWidth: number = 1920,
  maxHeight: number = 1920
): Promise<File> {
  return convertWithCanvas(file, {
    mimeType: 'image/jpeg',
    quality,
    maxWidth,
    maxHeight,
    fileNameSuffix: 'jpg'
  });
}

export type OptimizeImageResult = {
  file: File;
  chosen: {
    format: 'webp' | 'jpeg' | 'original';
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
  };
};

// Optimiza intentando evitar que el resultado pese más que el original.
export async function optimizeImage(
  file: File,
  preferredQuality: number = 0.85
): Promise<OptimizeImageResult> {
  const debug = typeof window !== 'undefined' && window.localStorage?.getItem('debugImageOptimize') === '1';
  const originalSize = file.size;
  const q1 = Math.max(0.3, Math.min(0.95, preferredQuality));
  const q2 = Math.max(0.3, Math.min(0.95, q1 - 0.1));
  const q3 = Math.max(0.3, Math.min(0.95, q1 - 0.2));
  const qualitySteps = Array.from(new Set([q1, q2, q3, 0.6, 0.5, 0.4, 0.3, 0.25])).filter((q) => q >= 0.25 && q <= 0.95);

  const maxDims: Array<[number, number]> = [
    [1920, 1920],
    [1600, 1600],
    [1280, 1280],
    [1024, 1024],
    [800, 800],
    [640, 640],
    [512, 512]
  ];

  let bestWebp: { file: File; chosen: OptimizeImageResult['chosen'] } | null = null;
  let bestJpeg: { file: File; chosen: OptimizeImageResult['chosen'] } | null = null;

  // 1) Intentar WebP primero (suele ser lo mejor)
  for (const [maxWidth, maxHeight] of maxDims) {
    for (const quality of qualitySteps) {
      try {
        const candidate = await convertToWebP(file, quality, maxWidth, maxHeight);
        if (!bestWebp || candidate.size < bestWebp.file.size) {
          bestWebp = { file: candidate, chosen: { format: 'webp', quality, maxWidth, maxHeight } };
        }
      } catch {
        // Si falla WebP, seguimos.
      }
    }
  }

  if (debug) {
    console.log('[optimizeImage] original', { name: file.name, type: file.type, size: originalSize });
    console.log('[optimizeImage] bestWebp', bestWebp ? { type: bestWebp.file.type, size: bestWebp.file.size, chosen: bestWebp.chosen } : null);
  }

  if (bestWebp && bestWebp.file.size < originalSize) {
    return { file: bestWebp.file, chosen: bestWebp.chosen };
  }

  // 2) Fallback a JPEG si WebP no reduce
  for (const [maxWidth, maxHeight] of maxDims) {
    for (const quality of qualitySteps) {
      try {
        const candidate = await convertToJpeg(file, quality, maxWidth, maxHeight);
        if (!bestJpeg || candidate.size < bestJpeg.file.size) {
          bestJpeg = { file: candidate, chosen: { format: 'jpeg', quality, maxWidth, maxHeight } };
        }
      } catch {
        // Si falla la conversión a JPEG, seguimos.
      }
    }
  }

  if (debug) {
    console.log('[optimizeImage] bestJpeg', bestJpeg ? { type: bestJpeg.file.type, size: bestJpeg.file.size, chosen: bestJpeg.chosen } : null);
  }

  if (bestJpeg && bestJpeg.file.size < originalSize) {
    return { file: bestJpeg.file, chosen: bestJpeg.chosen };
  }

  // 3) Si nada reduce, devolver original (evita subir algo más pesado)
  return { file, chosen: { format: 'original' } };
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
