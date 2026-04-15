// @ts-nocheck
// workers/file-processing-worker/firestoreService.ts
// Wrapper para redirigir llamadas de Firestore a Supabase Service
// Esto permite mantener la compatibilidad con el resto del worker sin cambiar todas las importaciones

import type { FileProcessingJob } from './fileProcessing';
import {
  getPendingJobs as supabaseGetPendingJobs,
  updateJob as supabaseUpdateJob,
  createChildJobs as supabaseCreateChildJobs,
  getJob as supabaseGetJob,
  createJob as supabaseCreateJob
} from './supabaseService';

/**
 * Obtiene trabajos pendientes (Redirige a Supabase)
 */
export async function getPendingJobs(): Promise<FileProcessingJob[]> {
  return supabaseGetPendingJobs();
}

/**
 * Actualiza un trabajo (Redirige a Supabase)
 */
export async function updateJob(
  jobId: string,
  updates: Partial<FileProcessingJob>
): Promise<void> {
  return supabaseUpdateJob(jobId, updates);
}

/**
 * Crea múltiples trabajos hijos (Redirige a Supabase)
 */
export async function createChildJobs(
  jobs: Omit<FileProcessingJob, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<void> {
  return supabaseCreateChildJobs(jobs);
}

/**
 * Obtiene un trabajo por ID (Redirige a Supabase)
 */
export async function getJob(jobId: string): Promise<FileProcessingJob | null> {
  return supabaseGetJob(jobId);
}

/**
 * Crea un nuevo trabajo (Redirige a Supabase)
 */
export async function createJob(
  job: Omit<FileProcessingJob, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  return supabaseCreateJob(job);
}
