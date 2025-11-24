// utils/temporaryFileStorage.ts
// Utilidad para almacenar archivos temporalmente en IndexedDB
// Útil para archivos grandes que se visualizan temporalmente y luego se eliminan

interface TemporaryFile {
  id: string;
  file: File;
  url: string;
  createdAt: number;
  expiresAt: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

const DB_NAME = 'eduspark-temp-files';
const DB_VERSION = 1;
const STORE_NAME = 'files';
const EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 horas

export class TemporaryFileStorage {
  private db: IDBDatabase | null = null;
  private initialized: boolean = false;

  async init(): Promise<void> {
    if (this.initialized && this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Error abriendo IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  /**
   * Almacena un archivo temporalmente y retorna su ID y URL
   */
  async storeFile(file: File): Promise<{ id: string; url: string }> {
    if (!this.db) await this.init();

    const id = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const url = URL.createObjectURL(file);
    const expiresAt = Date.now() + EXPIRY_TIME;

    const tempFile: TemporaryFile = {
      id,
      file,
      url,
      createdAt: Date.now(),
      expiresAt,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(tempFile);

      request.onsuccess = () => {
        console.log(`[TemporaryFileStorage] Archivo almacenado temporalmente: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        resolve({ id, url });
      };
      request.onerror = () => {
        console.error('[TemporaryFileStorage] Error almacenando archivo:', request.error);
        URL.revokeObjectURL(url); // Limpiar si falla
        reject(request.error);
      };
    });
  }

  /**
   * Obtiene la URL de un archivo temporal por su ID
   */
  async getFileUrl(id: string): Promise<string | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const tempFile = request.result as TemporaryFile | undefined;
        if (tempFile && tempFile.expiresAt > Date.now()) {
          resolve(tempFile.url);
        } else {
          if (tempFile) {
            // Archivo expirado, eliminarlo
            this.deleteFile(id).catch(console.error);
          }
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene información del archivo temporal
   */
  async getFileInfo(id: string): Promise<TemporaryFile | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const tempFile = request.result as TemporaryFile | undefined;
        if (tempFile && tempFile.expiresAt > Date.now()) {
          resolve(tempFile);
        } else {
          if (tempFile) {
            this.deleteFile(id).catch(console.error);
          }
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Elimina un archivo temporal y libera su memoria
   */
  async deleteFile(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const tempFile = request.result as TemporaryFile | undefined;
        if (tempFile) {
          URL.revokeObjectURL(tempFile.url); // Liberar memoria del blob
          console.log(`[TemporaryFileStorage] Archivo eliminado: ${tempFile.fileName}`);
        }
        store.delete(id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Limpia todos los archivos expirados
   */
  async cleanupExpired(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('expiresAt');
      const now = Date.now();
      const request = index.openCursor(IDBKeyRange.upperBound(now));

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const tempFile = cursor.value as TemporaryFile;
          URL.revokeObjectURL(tempFile.url); // Liberar memoria
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          if (deletedCount > 0) {
            console.log(`[TemporaryFileStorage] Limpieza completada: ${deletedCount} archivo(s) expirado(s) eliminado(s)`);
          }
          resolve(deletedCount);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene el tamaño total de archivos temporales almacenados
   */
  async getTotalSize(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();
      let totalSize = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const tempFile = cursor.value as TemporaryFile;
          if (tempFile.expiresAt > Date.now()) {
            totalSize += tempFile.fileSize;
          }
          cursor.continue();
        } else {
          resolve(totalSize);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Limpia todos los archivos temporales (útil para limpieza manual)
   */
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const tempFile = cursor.value as TemporaryFile;
          URL.revokeObjectURL(tempFile.url); // Liberar memoria
          cursor.delete();
          cursor.continue();
        } else {
          console.log('[TemporaryFileStorage] Todos los archivos temporales eliminados');
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Instancia global
export const tempFileStorage = new TemporaryFileStorage();

// Inicializar y limpiar archivos expirados al cargar el módulo
if (typeof window !== 'undefined') {
  // Inicializar en el siguiente tick para no bloquear
  setTimeout(() => {
    tempFileStorage.init().then(() => {
      // Limpiar archivos expirados al iniciar
      tempFileStorage.cleanupExpired().catch(console.error);
      
      // Limpiar cada hora
      setInterval(() => {
        tempFileStorage.cleanupExpired().catch(console.error);
      }, 60 * 60 * 1000);
    }).catch(console.error);
  }, 100);
}

