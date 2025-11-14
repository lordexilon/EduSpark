import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Card from '../components/Card.tsx';
import Button from '../components/Button.tsx';
import Breadcrumbs from '../components/Breadcrumbs.tsx';
import FilterBar from '../components/FilterBar.tsx';
import { IconClipboardList, IconPlusCircle, IconX, IconUpload, IconFileText, IconCheckCircle, IconClock, IconArrowLeft, IconBookOpen, IconCalendar, IconDownload } from '../components/Icons.tsx';
import { useAuth } from '../hooks/useAuth.tsx';
import { assignmentService, Assignment, AssignmentSubmission } from '../services/assignments';
import { submissionService } from '../services/assignments';
import { courseService, Course } from '../services/teacherCourses';
import { unitService, CourseUnit } from '../services/teacherCourses';
import { sessionService, Session } from '../services/teacherCourses';
import { supabase } from '../lib/supabase';
import { openDrivePicker } from '../services/googleDrive';
import { googleOAuthService } from '../services/googleOAuthService';
import { uploadCourseDocument } from '../services/storageService';

interface AssignmentWithSubmission extends Assignment {
  submission?: AssignmentSubmission;
  submissionStatus?: 'pending' | 'submitted' | 'graded' | 'late';
  course?: Course;
  unit?: CourseUnit;
  session?: Session;
}

// Función helper para procesar HTML y convertir expresiones LaTeX básicas
const processDescription = (html: string): string => {
  if (!html) return '';
  
  let processed = html;
  
  // Primero procesar bloques de matemáticas ($$expresión$$)
  // Usar un marcador temporal para evitar conflictos
  const blockMarkers: string[] = [];
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, expr) => {
    const marker = `__MATH_BLOCK_${blockMarkers.length}__`;
    blockMarkers.push(`<div class="math-block font-mono bg-gray-100 px-2 py-1 rounded my-2 text-sm whitespace-pre-wrap">${expr.trim()}</div>`);
    return marker;
  });
  
  // Luego procesar expresiones matemáticas inline ($expresión$)
  // Evitar procesar si están dentro de bloques ya procesados
  const inlineMarkers: string[] = [];
  processed = processed.replace(/\$([^$\n]+?)\$/g, (match, expr) => {
    // No procesar si contiene solo espacios o está vacío
    if (!expr.trim()) return match;
    const marker = `__MATH_INLINE_${inlineMarkers.length}__`;
    inlineMarkers.push(`<span class="math-inline font-mono bg-gray-100 px-1 py-0.5 rounded text-xs inline-block">${expr.trim()}</span>`);
    return marker;
  });
  
  // Reemplazar marcadores de bloques
  blockMarkers.forEach((replacement, index) => {
    processed = processed.replace(`__MATH_BLOCK_${index}__`, replacement);
  });
  
  // Reemplazar marcadores inline
  inlineMarkers.forEach((replacement, index) => {
    processed = processed.replace(`__MATH_INLINE_${index}__`, replacement);
  });
  
  return processed;
};

// Función para generar y descargar documento Word
const downloadAssignmentAsWord = (assignment: AssignmentWithSubmission) => {
  // Crear un documento HTML que Word puede abrir
  const htmlContent = `
    <!DOCTYPE html>
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <meta name="ProgId" content="Word.Document">
      <meta name="Generator" content="Microsoft Word">
      <meta name="Originator" content="Microsoft Word">
      <title>${assignment.title}</title>
      <style>
        @page {
          size: 8.5in 11in;
          margin: 1in 1.25in 1in 1.25in;
        }
        body {
          font-family: 'Calibri', 'Arial', sans-serif;
          font-size: 11pt;
          line-height: 1.5;
          color: #333;
        }
        h1 {
          font-size: 18pt;
          font-weight: bold;
          color: #1e3a8a;
          margin-top: 12pt;
          margin-bottom: 6pt;
        }
        h2 {
          font-size: 16pt;
          font-weight: bold;
          color: #1e40af;
          margin-top: 12pt;
          margin-bottom: 6pt;
        }
        h3 {
          font-size: 14pt;
          font-weight: bold;
          color: #2563eb;
          margin-top: 10pt;
          margin-bottom: 4pt;
        }
        p {
          margin-bottom: 6pt;
          text-align: justify;
        }
        strong {
          font-weight: bold;
        }
        em {
          font-style: italic;
        }
        ul, ol {
          margin-left: 36pt;
          margin-bottom: 6pt;
        }
        li {
          margin-bottom: 3pt;
        }
        .info-box {
          background-color: #f3f4f6;
          border-left: 4px solid #3b82f6;
          padding: 8pt;
          margin: 12pt 0;
        }
        .info-label {
          font-weight: bold;
          color: #1e40af;
        }
        .math {
          font-family: 'Courier New', monospace;
          background-color: #f9fafb;
          padding: 2pt 4pt;
          border: 1px solid #e5e7eb;
          border-radius: 3pt;
        }
      </style>
    </head>
    <body>
      <h1>${assignment.title}</h1>
      
      <div class="info-box">
        ${assignment.course ? `<p><span class="info-label">Curso:</span> ${assignment.course.title}</p>` : ''}
        ${assignment.unit ? `<p><span class="info-label">Módulo:</span> ${assignment.unit.title}</p>` : ''}
        ${assignment.session ? `<p><span class="info-label">Sesión:</span> ${assignment.session.title}</p>` : ''}
        ${assignment.due_at ? `<p><span class="info-label">Fecha de Entrega:</span> ${new Date(assignment.due_at).toLocaleDateString('es-ES', { dateStyle: 'long' })}</p>` : ''}
        <p><span class="info-label">Puntaje Máximo:</span> ${assignment.max_points} puntos</p>
      </div>
      
      ${assignment.description ? `
        <h2>Descripción de la Tarea</h2>
        <div>
          ${assignment.description
            .replace(/\$([^$]+)\$/g, '<span class="math">$1</span>')
            .replace(/\$\$([^$]+)\$\$/g, '<div class="math" style="display: block; margin: 6pt 0; padding: 4pt;">$1</div>')}
        </div>
      ` : ''}
      
      <div style="margin-top: 24pt; page-break-before: always;">
        <h2>Espacio para Respuestas</h2>
        <p style="color: #6b7280; font-style: italic;">Utiliza este espacio para completar la tarea. Puedes agregar texto, ecuaciones, imágenes o cualquier otro contenido necesario.</p>
        <div style="min-height: 400pt; border: 1px dashed #d1d5db; padding: 12pt; margin-top: 12pt;">
          <!-- Espacio para que el estudiante complete -->
        </div>
      </div>
      
      <div style="margin-top: 24pt; font-size: 9pt; color: #6b7280;">
        <p>Documento generado el ${new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}</p>
      </div>
    </body>
    </html>
  `;
  
  // Crear blob y descargar
  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword'
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${assignment.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const AssignmentDetailModal: React.FC<{ 
  assignment: AssignmentWithSubmission, 
  onClose: () => void,
  onSubmit: (assignmentId: string, url?: string, text?: string) => Promise<void>
}> = ({ assignment, onClose, onSubmit }) => {
  const { user } = useAuth();
  const [submissionUrl, setSubmissionUrl] = useState(assignment.submission?.url || '');
  const [submissionText, setSubmissionText] = useState(assignment.submission?.text || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasDriveConnected, setHasDriveConnected] = useState(false);
  const [checkingDrive, setCheckingDrive] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string; size?: number }>>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Sin fecha';
    return new Date(isoString).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
  };

  // Verificar si el usuario tiene Google Drive conectado
  useEffect(() => {
    const checkDriveConnection = async () => {
      if (!user?.id) {
        setHasDriveConnected(false);
        setCheckingDrive(false);
        return;
      }
      try {
        const hasToken = await googleOAuthService.hasValidToken(user.id, 'drive');
        setHasDriveConnected(hasToken);
      } catch (error) {
        console.error('Error checking Drive connection:', error);
        setHasDriveConnected(false);
      } finally {
        setCheckingDrive(false);
      }
    };
    checkDriveConnection();
  }, [user?.id]);

  const handleSelectFromDrive = async () => {
    if (!user?.id) {
      alert('Debes estar autenticado para usar Google Drive');
      return;
    }
    try {
      await openDrivePicker(user.id, (files) => {
        if (files && files.length > 0) {
          // Usar el primer archivo seleccionado
          setSubmissionUrl(files[0].url);
        }
      });
    } catch (error: any) {
      if (error.message?.includes('No hay token')) {
        alert('No tienes Google Drive conectado. Por favor, conéctalo desde tu perfil primero.');
      } else {
        alert(error.message || 'Error al seleccionar archivo de Drive');
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !assignment.course_id) {
      return;
    }

    setUploadingFile(true);
    try {
      const file = files[0];
      const result = await uploadCourseDocument(assignment.course_id.toString(), file, {
        folder: 'submissions'
      });

      if (result.success && result.url) {
        const newFile = {
          name: file.name,
          url: result.url,
          size: file.size
        };
        setUploadedFiles(prev => [...prev, newFile]);
        // Si no hay URL de entrega, usar la primera URL de archivo subido
        if (!submissionUrl) {
          setSubmissionUrl(result.url);
        }
      } else {
        alert(result.error || 'Error al subir el archivo');
      }
    } catch (err: any) {
      alert(err.message || 'Error al subir el archivo');
      console.error('Error uploading file:', err);
    } finally {
      setUploadingFile(false);
      // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    const removedFile = uploadedFiles[index];
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    // Si la URL de entrega es la del archivo eliminado, limpiarla
    if (submissionUrl === removedFile.url) {
      setSubmissionUrl(uploadedFiles.length > 1 ? uploadedFiles.find((_, i) => i !== index)?.url || '' : '');
    }
  };

  const getStatusChip = (status?: 'pending' | 'submitted' | 'graded' | 'late') => {
    switch (status) {
      case 'graded':
        return <span className="flex items-center text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full"><IconCheckCircle className="w-3 h-3 mr-1" /> Calificado</span>;
      case 'submitted':
        return <span className="flex items-center text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"><IconCheckCircle className="w-3 h-3 mr-1" /> Entregado</span>;
      case 'pending':
      case 'late':
        return <span className={`flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${status === 'late' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}><IconClock className="w-3 h-3 mr-1" /> {status === 'late' ? 'Tarde' : 'Pendiente'}</span>;
      default:
        return <span className="flex items-center text-xs font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Sin entregar</span>;
    }
  };

  const handleSubmit = async () => {
    // Usar la URL del primer archivo subido si hay archivos pero no hay URL manual
    const finalUrl = submissionUrl.trim() || (uploadedFiles.length > 0 ? uploadedFiles[0].url : '');
    
    if (!finalUrl && !submissionText.trim()) {
      alert('Debes proporcionar una URL, subir un archivo o escribir texto para la entrega');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(assignment.id, finalUrl || undefined, submissionText || undefined);
      onClose();
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert('Error al entregar la tarea');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dueDate = assignment.due_at ? new Date(assignment.due_at).toLocaleDateString('es-ES', { dateStyle: 'long' }) : 'Sin fecha límite';
  const statusText = assignment.submissionStatus === 'graded' ? 'Calificado' : 
                     assignment.submissionStatus === 'submitted' ? 'Entregado' :
                     assignment.submissionStatus === 'late' ? 'Vencida' :
                     assignment.submissionStatus === 'pending' ? 'Pendiente' : 'Sin entregar';

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="assignment-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b border-border flex justify-between items-center">
          <div className="flex-1">
            <h2 id="assignment-title" className="text-xl font-bold text-text-dark">{assignment.title}</h2>
            {assignment.course && (
              <p className="text-sm text-gray-600 mt-1">
                Curso: {assignment.course.title}
              </p>
            )}
            {assignment.unit && (
              <p className="text-sm text-gray-600">
                Módulo: {assignment.unit.title}
              </p>
            )}
            {assignment.session && (
              <p className="text-sm text-gray-600">
                Sesión: {assignment.session.title}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => downloadAssignmentAsWord(assignment)}
              leftIcon={<IconDownload className="w-4 h-4" />}
              aria-label="Descargar tarea como Word"
            >
              Descargar
            </Button>
            <Button variant="ghost" size="sm" className="!p-2 text-text-light" onClick={onClose} aria-label="Cerrar modal">
              <IconX className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <main className="p-6 overflow-y-auto space-y-6">
          <div className="flex justify-between items-baseline">
            <div>
              <p className="text-sm text-text-light">Fecha de Entrega</p>
              <p className="font-semibold text-text-dark">{dueDate}</p>
            </div>
            <div className="text-right">
              {getStatusChip(assignment.submissionStatus)}
              {assignment.submission?.grade !== null && assignment.submission?.grade !== undefined && (
                <p className="text-sm font-semibold text-gray-700 mt-1">
                  Calificación: {assignment.submission.grade} / {assignment.max_points}
                </p>
              )}
            </div>
          </div>
          
          {assignment.description && (
            <div className="space-y-2">
              <h3 className="font-semibold text-text-dark">Descripción</h3>
              <div 
                className="text-sm text-text-light
                  [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-text-dark [&_h1]:mt-4 [&_h1]:mb-2
                  [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-text-dark [&_h2]:mt-4 [&_h2]:mb-2
                  [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-text-dark [&_h3]:mt-3 [&_h3]:mb-2
                  [&_p]:mb-3 [&_p]:leading-relaxed
                  [&_strong]:font-semibold [&_strong]:text-text-dark
                  [&_em]:italic
                  [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-3 [&_ul]:space-y-1
                  [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-3 [&_ol]:space-y-1
                  [&_li]:mb-1
                  [&_a]:text-primary [&_a]:underline [&_a]:hover:text-primary-dark
                  [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-3
                  [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
                  [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:my-3"
                dangerouslySetInnerHTML={{ __html: processDescription(assignment.description) }}
              />
            </div>
          )}

          {/* Formulario de entrega */}
          {user?.role?.name === 'student' && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-text-dark mb-3">Entregar Tarea</h3>
              <div className="space-y-3">
                {/* Subir archivo directamente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subir Archivo
                  </label>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="file-upload-submission"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.odt,.ods,.zip,.rar"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                      className="hidden"
                    />
                    <label
                      htmlFor="file-upload-submission"
                      className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                        uploadingFile
                          ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                          : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                      }`}
                    >
                      <IconUpload className={`w-5 h-5 ${uploadingFile ? 'text-gray-400' : 'text-gray-600'}`} />
                      <span className={`text-sm font-medium ${uploadingFile ? 'text-gray-400' : 'text-gray-700'}`}>
                        {uploadingFile ? 'Subiendo archivo...' : 'Seleccionar archivo para subir'}
                      </span>
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                      Formatos permitidos: PDF, Word, Excel, PowerPoint, texto, archivos comprimidos. Tamaño máximo: 35MB
                    </p>
                  </div>

                  {/* Lista de archivos subidos */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <IconFileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                              {file.size && (
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024).toFixed(2)} KB
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              Ver
                            </a>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(index)}
                              className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                              title="Eliminar archivo"
                            >
                              <IconX className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* URL alternativa */}
                <div>
                  <label htmlFor="submission-url" className="block text-sm font-medium text-gray-700 mb-1">
                    URL (Google Drive, Dropbox, etc.) - Opcional
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="submission-url"
                      type="url"
                      value={submissionUrl}
                      onChange={(e) => setSubmissionUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    />
                    {hasDriveConnected && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleSelectFromDrive}
                        title="Seleccionar archivo de Google Drive"
                        className="whitespace-nowrap"
                      >
                        <IconUpload className="w-4 h-4 mr-1" />
                        Drive
                      </Button>
                    )}
                  </div>
                  {!checkingDrive && !hasDriveConnected && (
                    <p className="mt-1 text-xs text-gray-500">
                      <Link to="/profile" className="text-primary hover:underline">
                        Conecta Google Drive
                      </Link>
                      {' '}para seleccionar archivos directamente
                    </p>
                  )}
                </div>

                {/* Texto de entrega */}
                <div>
                  <label htmlFor="submission-text" className="block text-sm font-medium text-gray-700 mb-1">
                    Texto de la entrega (Opcional)
                  </label>
                  <textarea
                    id="submission-text"
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="Escribe tu respuesta aquí..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Historial de entregas */}
          {assignment.submission && (
            <div className="space-y-2 border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-text-dark">Tu Entrega</h3>
              <div className="border border-border rounded-lg p-3 bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    {assignment.submission.url && (
                      <>
                        <IconFileText className="w-5 h-5 text-primary flex-shrink-0" />
                        <div>
                          <a 
                            href={assignment.submission.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            Ver entrega
                          </a>
                          <p className="text-xs text-text-light">Entregado: {formatDate(assignment.submission.submitted_at)}</p>
                        </div>
                      </>
                    )}
                    {assignment.submission.text && !assignment.submission.url && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Entrega de texto</p>
                        <p className="text-xs text-text-light">Entregado: {formatDate(assignment.submission.submitted_at)}</p>
                      </div>
                    )}
                  </div>
                  {getStatusChip(assignment.submissionStatus)}
                </div>
                {assignment.submission.text && (
                  <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{assignment.submission.text}</p>
                  </div>
                )}
                {assignment.submission.feedback && (
                  <div className="mt-3 pl-3 border-l-2 border-primary/20">
                    <p className="text-xs font-semibold text-text-dark">Feedback del Profesor:</p>
                    <blockquote className="text-xs text-text-light italic mt-1">"{assignment.submission.feedback}"</blockquote>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        <footer className="p-4 border-t border-border flex justify-end items-center gap-3 bg-background/50 rounded-b-lg">
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          {user?.role?.name === 'student' && (
            <Button 
              variant="primary" 
              leftIcon={<IconUpload className="w-5 h-5"/>}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : assignment.submission ? 'Actualizar Entrega' : 'Entregar Tarea'}
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
};


const AssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseIdParam = searchParams.get('courseId');
  
  const [assignments, setAssignments] = useState<AssignmentWithSubmission[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [units, setUnits] = useState<CourseUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithSubmission | null>(null);
  
  // Estados de filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [moduleFilter, setModuleFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  useEffect(() => {
    if (user?.id) {
      loadAssignments();
    }
  }, [user?.id, courseIdParam]);

  const loadAssignments = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const courseId = courseIdParam ? parseInt(courseIdParam) : undefined;
      
      // Cargar curso y unidades si hay courseId
      if (courseId) {
        try {
          const [courseData, unitsData] = await Promise.all([
            courseService.getCourse(courseId),
            unitService.getCourseUnits(courseId).catch(() => [])
          ]);
          setCourse(courseData);
          setUnits(unitsData);
        } catch (err) {
          console.error('Error loading course:', err);
        }
      }

      // Cargar assignments
      console.log('🔵 AssignmentsPage - Cargando assignments para estudiante:', user.id, 'curso:', courseId);
      const assignmentsData = await assignmentService.getStudentAssignments(user.id, courseId);
      console.log('🔵 AssignmentsPage - Assignments obtenidos:', assignmentsData.length);
      
      // Enriquecer assignments con información de curso, unidad, sesión y submission
      const enrichedAssignments = await Promise.all(
        assignmentsData.map(async (assignment) => {
          const [courseData, submissionData] = await Promise.all([
            courseService.getCourse(assignment.course_id).catch(() => null),
            submissionService.getStudentSubmission(assignment.id, user.id).catch(() => null)
          ]);

          let unitData: CourseUnit | undefined;
          let sessionData: Session | undefined;

          if (assignment.unit_id && courseData) {
            try {
              // Obtener todas las unidades del curso y buscar la específica
              const units = await unitService.getCourseUnits(courseData.id);
              unitData = units.find(u => u.id === assignment.unit_id);
            } catch (err) {
              console.error('Error loading unit:', err);
            }
          }

          if (assignment.session_id) {
            try {
              sessionData = await sessionService.getSession(assignment.session_id);
            } catch (err) {
              console.error('Error loading session:', err);
            }
          }

          // Determinar estado
          let submissionStatus: 'pending' | 'submitted' | 'graded' | 'late' | undefined;
          if (submissionData) {
            if (submissionData.grade !== null && submissionData.grade !== undefined) {
              submissionStatus = 'graded';
            } else {
              submissionStatus = 'submitted';
            }
          } else if (assignment.due_at) {
            const dueDate = new Date(assignment.due_at);
            const now = new Date();
            if (now > dueDate) {
              submissionStatus = 'late';
            } else {
              submissionStatus = 'pending';
            }
          } else {
            submissionStatus = 'pending';
          }

          return {
            ...assignment,
            submission: submissionData || undefined,
            submissionStatus,
            course: courseData || undefined,
            unit: unitData,
            session: sessionData
          };
        })
      );

      setAssignments(enrichedAssignments);
      
      if (enrichedAssignments.length === 0 && !courseId) {
        console.warn('⚠️ AssignmentsPage - No se encontraron tareas. Verificando inscripciones...');
        // Verificar si el estudiante tiene inscripciones
        try {
          const { data: enrollments } = await supabase
            .from('course_enrollments')
            .select('id, course_id, status')
            .eq('student_id', user.id);
          
          console.log('🔵 AssignmentsPage - Inscripciones del estudiante:', enrollments);
          
          if (!enrollments || enrollments.length === 0) {
            setError('No estás inscrito en ningún curso. Contacta a tu profesor para inscribirte.');
          } else {
            const activeEnrollments = enrollments.filter(e => e.status === 'active');
            if (activeEnrollments.length === 0) {
              setError('No tienes inscripciones activas en ningún curso.');
            } else {
              setError('No hay tareas asignadas en tus cursos inscritos.');
            }
          }
        } catch (enrollmentErr) {
          console.error('Error verificando inscripciones:', enrollmentErr);
        }
      }
    } catch (err: any) {
      console.error('🔴 AssignmentsPage - Error loading assignments:', err);
      setError(err.message || 'Error al cargar las tareas. Verifica tu conexión y vuelve a intentar.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAssignment = async (assignmentId: string, url?: string, text?: string) => {
    if (!user?.id) return;

    try {
      // Verificar si ya existe una entrega
      const existingSubmission = await submissionService.getStudentSubmission(assignmentId, user.id);
      
      if (existingSubmission) {
        // Actualizar entrega existente
        await submissionService.updateSubmission(existingSubmission.id, {
          url,
          text,
          submitted_at: new Date().toISOString()
        });
      } else {
        // Crear nueva entrega
        await submissionService.createSubmission({
          assignment_id: assignmentId,
          student_id: user.id,
          url,
          text
        });
      }

      // Recargar assignments
      await loadAssignments();
      
      // Cerrar modal y mostrar mensaje de éxito
      setSelectedAssignment(null);
      alert('Tarea entregada exitosamente');
    } catch (err: any) {
      console.error('Error submitting assignment:', err);
      alert(`Error al entregar la tarea: ${err.message}`);
      throw err;
    }
  };

  const formatDueDate = (dueAt?: string) => {
    if (!dueAt) return 'Sin fecha límite';
    const date = new Date(dueAt);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `Vencida hace ${Math.abs(diffDays)} días`;
    if (diffDays === 0) return 'Vence hoy';
    if (diffDays === 1) return 'Vence mañana';
    return `Vence en ${diffDays} días`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadAssignments}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      {course ? (
        <Breadcrumbs 
          items={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Mis Cursos', path: '/my/courses' },
            { label: course.title, path: `/courses/${course.id}` },
            { label: 'Tareas' }
          ]}
        />
      ) : (
        <Breadcrumbs 
          items={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Tareas' }
          ]}
        />
      )}
      
      {/* Header con información del curso */}
      {course && (
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/courses/${course.id}`)}
            leftIcon={<IconArrowLeft className="w-4 h-4" />}
          >
            Volver al Curso
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
            <p className="text-gray-600">Tareas del curso • {assignments.length} {assignments.length === 1 ? 'tarea' : 'tareas'}</p>
          </div>
        </div>
      )}

      {!course && (
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-slate-800">Tareas</h1>
          {courseIdParam && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/assignments')}
              leftIcon={<IconArrowLeft className="w-4 h-4" />}
            >
              Ver Todas las Tareas
            </Button>
          )}
        </div>
      )}

      {/* Filtros */}
      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Buscar tareas por título o descripción..."
        filters={[
          {
            key: 'status',
            label: 'Estado',
            options: [
              { value: '', label: 'Todos' },
              { value: 'pending', label: 'Pendientes' },
              { value: 'submitted', label: 'Entregadas' },
              { value: 'graded', label: 'Calificadas' },
              { value: 'late', label: 'Vencidas' }
            ],
            value: statusFilter,
            onChange: setStatusFilter
          },
          ...(course && units.length > 0 ? [{
            key: 'module',
            label: 'Módulo',
            options: [
              { value: '', label: 'Todos' },
              ...units.map(unit => ({ value: unit.id, label: `Módulo ${unit.number}: ${unit.title}` }))
            ],
            value: moduleFilter,
            onChange: setModuleFilter
          }] : []),
          {
            key: 'date',
            label: 'Fecha',
            options: [
              { value: '', label: 'Todas' },
              { value: 'today', label: 'Hoy' },
              { value: 'week', label: 'Esta semana' },
              { value: 'month', label: 'Este mes' },
              { value: 'overdue', label: 'Vencidas' },
              { value: 'upcoming', label: 'Próximas' }
            ],
            value: dateFilter,
            onChange: setDateFilter
          }
        ]}
        onClearFilters={() => {
          setSearchQuery('');
          setStatusFilter('');
          setModuleFilter('');
          setDateFilter('');
        }}
        hasActiveFilters={!!(searchQuery || statusFilter || moduleFilter || dateFilter)}
      />

      {/* Aplicar filtros y mostrar resultados */}
      {(() => {
        let filtered = [...assignments];

        // Filtro de búsqueda
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(a => 
            a.title.toLowerCase().includes(query) ||
            a.description?.toLowerCase().includes(query) ||
            a.course?.title.toLowerCase().includes(query)
          );
        }

        // Filtro por estado
        if (statusFilter) {
          filtered = filtered.filter(a => a.submissionStatus === statusFilter);
        }

        // Filtro por módulo
        if (moduleFilter) {
          filtered = filtered.filter(a => a.unit?.id === moduleFilter);
        }

        // Filtro por fecha
        if (dateFilter) {
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          const monthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

          filtered = filtered.filter(a => {
            if (!a.due_at) return dateFilter === 'upcoming'; // Sin fecha = próximas
            const dueDate = new Date(a.due_at);
            const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

            switch (dateFilter) {
              case 'today':
                return dueDateOnly.getTime() === today.getTime();
              case 'week':
                return dueDate >= today && dueDate <= weekFromNow;
              case 'month':
                return dueDate >= today && dueDate <= monthFromNow;
              case 'overdue':
                return dueDate < today && !a.submission;
              case 'upcoming':
                return dueDate >= today;
              default:
                return true;
            }
          });
        }

        // Mostrar resultados filtrados
        if (filtered.length === 0) {
          return (
            <Card>
              <div className="text-center py-8">
                <IconClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-slate-600">
                  {searchQuery || statusFilter || moduleFilter || dateFilter
                    ? 'No se encontraron tareas con los filtros aplicados.'
                    : courseIdParam 
                      ? 'Este curso no tiene tareas asignadas.' 
                      : 'No tienes tareas asignadas en tus cursos.'}
                </p>
              </div>
            </Card>
          );
        }

        return (
          <>
            {filtered.length < assignments.length && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                Mostrando {filtered.length} de {assignments.length} tareas
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-6">
              {filtered.map(assignment => (
                <Card 
                  key={assignment.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedAssignment(assignment)}
                >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center flex-1">
                  <IconClipboardList className="w-6 h-6 text-primary mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-slate-700">{assignment.title}</h2>
                    {!courseIdParam && assignment.course && (
                      <p className="text-sm text-gray-600 mt-1">{assignment.course.title}</p>
                    )}
                    {assignment.unit && (
                      <p className="text-xs text-gray-500 mt-1">Módulo: {assignment.unit.title}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <IconCalendar className="w-4 h-4 mr-2" />
                  <span>{formatDueDate(assignment.due_at)}</span>
                  {assignment.due_at && (
                    <span className="ml-2 text-gray-400">
                      ({new Date(assignment.due_at).toLocaleDateString('es-ES')})
                    </span>
                  )}
                </div>
                
                {assignment.description && (
                  <p 
                    className="text-sm text-slate-500 line-clamp-2"
                    dangerouslySetInnerHTML={{ 
                      __html: assignment.description
                        .replace(/<[^>]*>/g, '') // Remover tags HTML para preview
                        .replace(/\$[^$]*\$/g, '') // Remover expresiones LaTeX para preview
                        .substring(0, 150) // Limitar longitud
                    }}
                  />
                )}

                <div className="flex items-center justify-between mt-3">
                  {assignment.submissionStatus === 'graded' && assignment.submission?.grade !== null && (
                    <span className="text-sm font-semibold text-green-600">
                      Calificación: {assignment.submission.grade} / {assignment.max_points}
                    </span>
                  )}
                  {assignment.submissionStatus === 'submitted' && (
                    <span className="flex items-center text-sm text-blue-600">
                      <IconCheckCircle className="w-4 h-4 mr-1" />
                      Entregado
                    </span>
                  )}
                  {assignment.submissionStatus === 'late' && (
                    <span className="flex items-center text-sm text-red-600">
                      <IconClock className="w-4 h-4 mr-1" />
                      Vencida
                    </span>
                  )}
                  {assignment.submissionStatus === 'pending' && (
                    <span className="flex items-center text-sm text-amber-600">
                      <IconClock className="w-4 h-4 mr-1" />
                      Pendiente
                    </span>
                  )}
                  <span className="text-primary font-medium text-sm">
                    Ver Detalles →
                  </span>
                </div>
              </div>
                </Card>
              ))}
            </div>
          </>
        );
      })()}

      {selectedAssignment && (
        <AssignmentDetailModal 
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
          onSubmit={handleSubmitAssignment}
        />
      )}
    </div>
  );
};

export default AssignmentsPage;
