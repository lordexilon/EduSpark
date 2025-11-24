// workers/file-processing-worker/firestoreService.ts
// Servicio para interactuar con Firestore desde el worker

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { FileProcessingJob, JobStatus } from '../../types/fileProcessing';

let db: FirebaseFirestore.Firestore | null = null;

/**
 * Inicializa Firestore Admin
 */
function initializeFirestore(): FirebaseFirestore.Firestore {
  if (db) return db;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID;
  
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID o GOOGLE_CLOUD_PROJECT_ID debe estar configurado');
  }

  const apps = getApps();
  if (apps.length === 0) {
    // Usar Application Default Credentials (ADC) en Cloud Run
    initializeApp({
      projectId,
    });
  }

  db = getFirestore();
  return db;
}

/**
 * Obtiene trabajos pendientes
 */
export async function getPendingJobs(): Promise<FileProcessingJob[]> {
  const firestore = initializeFirestore();
  const snapshot = await firestore
    .collection('file_processing_jobs')
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'asc')
    .limit(10)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
  })) as FileProcessingJob[];
}

/**
 * Actualiza un trabajo
 */
export async function updateJob(
  jobId: string,
  updates: Partial<FileProcessingJob>
): Promise<void> {
  const firestore = initializeFirestore();
  const jobRef = firestore.collection('file_processing_jobs').doc(jobId);
  
  await jobRef.update({
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Crea múltiples trabajos hijos
 */
export async function createChildJobs(
  jobs: Omit<FileProcessingJob, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<void> {
  const firestore = initializeFirestore();
  const batch = firestore.batch();
  const now = Timestamp.now();

  jobs.forEach(job => {
    const docRef = firestore.collection('file_processing_jobs').doc();
    batch.set(docRef, {
      ...job,
      createdAt: now,
      updatedAt: now,
    });
  });

  await batch.commit();
}

/**
 * Obtiene un trabajo por ID
 */
export async function getJob(jobId: string): Promise<FileProcessingJob | null> {
  const firestore = initializeFirestore();
  const doc = await firestore.collection('file_processing_jobs').doc(jobId).get();
  
  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data()?.createdAt?.toDate?.() || new Date(),
    updatedAt: doc.data()?.updatedAt?.toDate?.() || new Date(),
  } as FileProcessingJob;
}

