// services/firestoreService.ts
// Servicio para interactuar con Firestore

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import type { FileProcessingJob, JobStatus } from '../types/fileProcessing';

// Configuración de Firebase (debe estar en variables de entorno)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAwcdqI2DJfmYY_CAuA35vnZYmYJtuL3rc',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'eduspark-py.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'eduspark-py',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'eduspark-py.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '470326625254',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:470326625254:web:87632d5146a1d0332d0c27',
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let initializationError: Error | null = null;

/**
 * Inicializa Firebase si no está inicializado
 */
function initializeFirebase(): Firestore {
  // Si ya hay un error de inicialización, lanzarlo
  if (initializationError) {
    throw initializationError;
  }

  try {
    if (!app) {
      const apps = getApps();
      if (apps.length === 0) {
        // Validar que la configuración esté completa
        if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
          throw new Error('Configuración de Firebase incompleta. Verifica las variables de entorno.');
        }
        app = initializeApp(firebaseConfig);
      } else {
        app = apps[0];
      }
    }
    
    if (!db) {
      db = getFirestore(app);
    }
    
    return db;
  } catch (error: any) {
    initializationError = error;
    console.error('Error inicializando Firebase:', error);
    throw error;
  }
}

/**
 * Convierte un objeto con fechas a formato Firestore
 */
function convertToFirestore(data: any): any {
  const converted = { ...data };
  
  if (converted.createdAt && !(converted.createdAt instanceof Timestamp)) {
    converted.createdAt = Timestamp.fromDate(new Date(converted.createdAt));
  }
  if (converted.updatedAt && !(converted.updatedAt instanceof Timestamp)) {
    converted.updatedAt = Timestamp.fromDate(new Date(converted.updatedAt));
  }
  if (converted.startedAt && !(converted.startedAt instanceof Timestamp)) {
    converted.startedAt = Timestamp.fromDate(new Date(converted.startedAt));
  }
  if (converted.completedAt && !(converted.completedAt instanceof Timestamp)) {
    converted.completedAt = Timestamp.fromDate(new Date(converted.completedAt));
  }
  
  return converted;
}

/**
 * Convierte un documento de Firestore a objeto JavaScript
 */
function convertFromFirestore(docData: DocumentData, id: string): FileProcessingJob {
  const data = docData;
  
  return {
    id,
    ...data,
    createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
    startedAt: data.startedAt?.toDate?.() || data.startedAt,
    completedAt: data.completedAt?.toDate?.() || data.completedAt,
  } as FileProcessingJob;
}

/**
 * Crea un nuevo trabajo de procesamiento
 */
export async function createJob(job: Omit<FileProcessingJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const firestore = initializeFirebase();
  const jobsCollection = collection(firestore, 'file_processing_jobs');
  
  const now = Timestamp.now();
  const jobData = convertToFirestore({
    ...job,
    createdAt: now,
    updatedAt: now,
  });
  
  const docRef = await addDoc(jobsCollection, jobData);
  return docRef.id;
}

/**
 * Actualiza un trabajo de procesamiento
 */
export async function updateJob(jobId: string, updates: Partial<FileProcessingJob>): Promise<void> {
  const firestore = initializeFirebase();
  const jobRef = doc(firestore, 'file_processing_jobs', jobId);
  
  const updateData = convertToFirestore({
    ...updates,
    updatedAt: Timestamp.now(),
  });
  
  await updateDoc(jobRef, updateData);
}

/**
 * Cancela un trabajo de procesamiento usando Cloud Function
 */
export async function cancelJob(jobId: string): Promise<void> {
  // Obtener token de autenticación de Supabase
  const { supabase } = await import('../lib/supabase');
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
  }

  // URL de la Cloud Function (puede estar en variable de entorno)
  const cancelJobUrl = import.meta.env.VITE_CANCEL_JOB_URL || 'https://us-central1-eduspark-py.cloudfunctions.net/cancelFileProcessingJob';
  
  const response = await fetch(cancelJobUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ jobId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(errorData.error || `Error cancelando job: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Error cancelando job');
  }
}

/**
 * Obtiene un trabajo por ID
 */
export async function getJob(jobId: string): Promise<FileProcessingJob | null> {
  const firestore = initializeFirebase();
  const jobRef = doc(firestore, 'file_processing_jobs', jobId);
  const jobSnap = await getDoc(jobRef);
  
  if (!jobSnap.exists()) {
    return null;
  }
  
  return convertFromFirestore(jobSnap.data(), jobSnap.id);
}

/**
 * Obtiene todos los trabajos de un archivo
 */
export async function getJobsByFileId(sourceFileId: string): Promise<FileProcessingJob[]> {
  const firestore = initializeFirebase();
  const jobsCollection = collection(firestore, 'file_processing_jobs');
  const q = query(
    jobsCollection,
    where('sourceFileId', '==', sourceFileId),
    orderBy('createdAt', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertFromFirestore(doc.data(), doc.id));
}

/**
 * Obtiene trabajos pendientes
 */
export async function getPendingJobs(): Promise<FileProcessingJob[]> {
  const firestore = initializeFirebase();
  const jobsCollection = collection(firestore, 'file_processing_jobs');
  const q = query(
    jobsCollection,
    where('status', '==', 'pending'),
    orderBy('createdAt', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertFromFirestore(doc.data(), doc.id));
}

/**
 * Obtiene todos los trabajos de un usuario (sin listener en tiempo real)
 */
export async function getAllJobs(userId: string): Promise<FileProcessingJob[]> {
  try {
    const firestore = initializeFirebase();
    const jobsCollection = collection(firestore, 'file_processing_jobs');
    const q = query(jobsCollection, orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    const allJobs = querySnapshot.docs.map(doc => convertFromFirestore(doc.data(), doc.id));
    
    // Filtrar por userId en metadata
    return allJobs.filter(job => job.metadata?.userId === userId);
  } catch (error: any) {
    console.error('Error obteniendo jobs:', error);
    return [];
  }
}

/**
 * Escucha cambios en trabajos de un archivo (tiempo real)
 */
export function subscribeToFileJobs(
  sourceFileId: string,
  callback: (jobs: FileProcessingJob[]) => void
): () => void {
  try {
    const firestore = initializeFirebase();
    const jobsCollection = collection(firestore, 'file_processing_jobs');
    const q = query(
      jobsCollection,
      where('sourceFileId', '==', sourceFileId),
      orderBy('createdAt', 'asc')
    );
    
    return onSnapshot(
      q, 
      (snapshot: QuerySnapshot) => {
        try {
          const jobs = snapshot.docs.map(doc => convertFromFirestore(doc.data(), doc.id));
          callback(jobs);
        } catch (error) {
          console.error('Error procesando snapshot de Firestore:', error);
          callback([]);
        }
      },
      (error) => {
        console.error('Error en listener de Firestore:', error);
        callback([]);
      }
    );
  } catch (error) {
    console.error('Error inicializando listener de Firestore:', error);
    return () => {};
  }
}

/**
 * Escucha cambios en todos los trabajos (tiempo real)
 * Filtra por userId en metadata para seguridad
 * Si falla el listener en tiempo real, usa polling como fallback
 */
export function subscribeToAllJobs(
  userId: string,
  callback: (jobs: FileProcessingJob[]) => void
): () => void {
  let unsubscribe: (() => void) | null = null;
  let pollingInterval: NodeJS.Timeout | null = null;
  let usePolling = false;
  let lastErrorTime = 0;
  const POLLING_INTERVAL = 5000; // 5 segundos
  const ERROR_COOLDOWN = 30000; // 30 segundos antes de reintentar tiempo real

  const startPolling = () => {
    if (pollingInterval) return; // Ya está en polling
    
    console.warn('⚠️ Firestore: Cambiando a modo polling debido a errores de conexión');
    usePolling = true;
    
    const poll = async () => {
      try {
        const firestore = initializeFirebase();
        const jobsCollection = collection(firestore, 'file_processing_jobs');
        const q = query(jobsCollection, orderBy('createdAt', 'desc'));
        
        const querySnapshot = await getDocs(q);
        const allJobs = querySnapshot.docs.map(doc => convertFromFirestore(doc.data(), doc.id));
        const userJobs = allJobs.filter(job => job.metadata?.userId === userId);
        callback(userJobs);
      } catch (error) {
        console.error('Error en polling de Firestore:', error);
        callback([]);
      }
    };
    
    // Poll inmediatamente
    poll();
    
    // Luego cada intervalo
    pollingInterval = setInterval(poll, POLLING_INTERVAL);
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    usePolling = false;
  };

  const tryRealtime = () => {
    if (usePolling) return; // Ya estamos en modo polling
    
    try {
      const firestore = initializeFirebase();
      const jobsCollection = collection(firestore, 'file_processing_jobs');
      const q = query(jobsCollection, orderBy('createdAt', 'desc'));
      
      unsubscribe = onSnapshot(
        q, 
        (snapshot: QuerySnapshot) => {
          try {
            const allJobs = snapshot.docs.map(doc => convertFromFirestore(doc.data(), doc.id));
            const userJobs = allJobs.filter(job => job.metadata?.userId === userId);
            callback(userJobs);
            
            // Si el listener funciona, detener polling si estaba activo
            if (usePolling) {
              console.log('✅ Firestore: Listener en tiempo real restaurado');
              stopPolling();
            }
          } catch (error) {
            console.error('Error procesando snapshot de Firestore:', error);
            callback([]);
          }
        },
        (error) => {
          const now = Date.now();
          console.error('Error en listener de Firestore:', error);
          
          // Si hay muchos errores seguidos, cambiar a polling
          if (now - lastErrorTime < 5000) {
            // Dos errores en menos de 5 segundos, cambiar a polling
            if (!usePolling) {
              startPolling();
            }
          }
          
          lastErrorTime = now;
          callback([]);
        }
      );
    } catch (error) {
      console.error('Error inicializando listener de Firestore:', error);
      // Si falla la inicialización, usar polling
      startPolling();
    }
  };

  // Intentar tiempo real primero
  tryRealtime();

  // Retornar función de limpieza
  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
    stopPolling();
  };
}

