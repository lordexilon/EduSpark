// utils/imageOptimization.ts
// Utilidades para optimizar imágenes en el frontend antes de subirlas al Storage

export type ImageMimeType = 'image/webp' | 'image/jpeg' | 'image/png';

export interface OptimizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 - 1
  format?: ImageMimeType;
  force?: boolean;
  returnOriginalIfSmaller?: boolean;
  signal?: AbortSignal;
}

const DEFAULT_OPTIONS: Required<Omit<OptimizeImageOptions, 'signal'>> = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.8,
  format: 'image/webp',
  force: false,
  returnOriginalIfSmaller: true,
};

const WEBP_SUPPORTED =
  typeof document !== 'undefined'
    ? document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp')
    : true;

const MAX_CANVAS_PIXELS = 4096 * 4096; // ~16MP

export class ImageOptimizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageOptimizationError';
  }
}

export const changeFileExtension = (fileName: string, extension: string) => {
  const nameWithoutExt = fileName.includes('.')
    ? fileName.substring(0, fileName.lastIndexOf('.'))
    : fileName;
  return `${nameWithoutExt}.${extension.replace(/^\./, '')}`;
};

const loadImageFromFile = (file: File, signal?: AbortSignal): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    const onAbort = () => {
      cleanup();
      reject(new DOMException('La optimización fue cancelada', 'AbortError'));
    };

    const cleanup = () => {
      URL.revokeObjectURL(url);
      img.onload = null;
      img.onerror = null;
      signal?.removeEventListener('abort', onAbort);
    };

    img.onload = () => {
      cleanup();
      resolve(img);
    };

    img.onerror = (event) => {
      cleanup();
      reject(new ImageOptimizationError(`No se pudo cargar la imagen: ${event}`));
    };

    if (signal) {
      signal.addEventListener('abort', onAbort);
    }

    img.src = url;
  });
};

const calculateTargetSize = (
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
) => {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height, resized: false };
  }

  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const ratio = Math.min(widthRatio, heightRatio);

  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
    resized: true,
  };
};

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new ImageOptimizationError('No se pudo generar el blob optimizado'));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
};

export const optimizeImage = async (
  file: File,
  options: OptimizeImageOptions = {}
): Promise<{ file: File; optimized: boolean; info: string }> => {
  if (!file.type.startsWith('image/')) {
    throw new ImageOptimizationError('El archivo no es una imagen válida');
  }

  const { maxWidth, maxHeight, quality, format, force, returnOriginalIfSmaller, signal } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const targetFormat = format === 'image/webp' && !WEBP_SUPPORTED ? 'image/jpeg' : format;

  try {
    const image = await loadImageFromFile(file, signal);

    if (image.naturalWidth * image.naturalHeight > MAX_CANVAS_PIXELS) {
      throw new ImageOptimizationError(
        'La imagen es demasiado grande para procesarla en el navegador'
      );
    }

    const { width, height, resized } = calculateTargetSize(
      image.naturalWidth,
      image.naturalHeight,
      maxWidth,
      maxHeight
    );

    const shouldConvertFormat = file.type !== targetFormat;
    const shouldOptimize = force || resized || shouldConvertFormat;

    if (!shouldOptimize) {
      return {
        file,
        optimized: false,
        info: 'La imagen ya cumple con los requisitos',
      };
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new ImageOptimizationError('No se pudo obtener el contexto del canvas');
    }

    ctx.drawImage(image, 0, 0, width, height);

    const blob = await toBlob(canvas, targetFormat, quality);

    if (returnOriginalIfSmaller && blob.size >= file.size) {
      return {
        file,
        optimized: false,
        info: 'El archivo original es más pequeño que la versión optimizada',
      };
    }

    const optimizedFile = new File(
      [blob],
      changeFileExtension(file.name, targetFormat === 'image/webp' ? 'webp' : 'jpeg'),
      {
        type: targetFormat,
        lastModified: Date.now(),
      }
    );

    return {
      file: optimizedFile,
      optimized: true,
      info: `Imagen optimizada (${Math.round((blob.size / file.size) * 100)}% del tamaño original)`,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    console.warn(
      '[optimizeImage] No se pudo optimizar la imagen. Se usará el archivo original.',
      error
    );

    return {
      file,
      optimized: false,
      info: 'No se pudo optimizar en frontend, se mantiene original',
    };
  }
};

export const shouldOptimizeInFrontend = (file: File, maxBytes = 1.5 * 1024 * 1024) => {
  if (!file.type.startsWith('image/')) return false;
  return file.size >= maxBytes;
};
