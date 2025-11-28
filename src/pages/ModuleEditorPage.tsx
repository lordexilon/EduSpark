import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { unitService, materialService, CourseUnit, Material } from '../services/teacherCourses';
import { openDrivePicker } from '../services/googleDrive';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { VideoTranscriptService } from '../services/videoTranscriptService';
import { VideoPlayer } from '../components/VideoPlayer';
import { indexUnitContent } from '../services/contentIndexingService';

type MatType = 'text' | 'video' | 'image' | 'document';

const ModuleEditorPage: React.FC = () => {
  // Soporta tanto moduleId (número) para retrocompatibilidad como unitId (UUID)
  const { courseId, moduleId, unitId } = useParams();
  const cId = useMemo(() => Number(courseId), [courseId]);
  const uId = useMemo(() => unitId || (moduleId ? String(moduleId) : null), [unitId, moduleId]);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState<any>(null);
  const [unitRow, setUnitRow] = useState<CourseUnit | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unitTitle, setUnitTitle] = useState('');
  const [unitDescription, setUnitDescription] = useState('');
  const [unitNumber, setUnitNumber] = useState<number>(1);
  const [unitOrderIndex, setUnitOrderIndex] = useState<number>(0);
  const [savingMeta, setSavingMeta] = useState<boolean>(false);
  const [savingMaterial, setSavingMaterial] = useState<boolean>(false);
  const [transcriptionStatuses, setTranscriptionStatuses] = useState<Record<string, string>>({});
  const transcriptService = useMemo(() => new VideoTranscriptService(), []);

  // form
  const [matTitle, setMatTitle] = useState('');
  const [matKind, setMatKind] = useState<string>('other');
  const [matUrl, setMatUrl] = useState('');
  const [matContent, setMatContent] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('📥 Cargando datos de la unidad...', { courseId: cId, unitId: uId });

        if (!uId) {
          throw new Error('ID de unidad no proporcionado');
        }

        const [courseResult, unitData] = await Promise.all([
          supabase.from('courses').select('id,title,code').eq('id', cId).single(),
          unitService.getUnit(uId),
        ]);

        console.log('📦 Resultado del curso:', { data: courseResult.data, error: courseResult.error });
        console.log('📦 Resultado de la unidad:', { data: unitData });

        if (courseResult.error) {
          console.error('❌ Error cargando curso:', courseResult.error);
          throw new Error(`Error cargando curso: ${courseResult.error.message}`);
        }

        if (!courseResult.data) {
          throw new Error('Curso no encontrado');
        }

        if (!unitData) {
          throw new Error(`Unidad con ID ${uId} no encontrada`);
        }

        const cData = courseResult.data;

        console.log('✅ Datos recibidos:', { curso: cData, unidad: unitData });

        if (mounted) {
          setCourse(cData);
          setUnitRow(unitData);
          setUnitTitle(unitData.title || '');
          setUnitDescription(unitData.description || '');
          setUnitNumber(unitData.number || 1);
          setUnitOrderIndex(unitData.order_index ?? 0);
          console.log('🔄 Estado actualizado:', {
            unitTitle: unitData.title || '',
            unitDescription: unitData.description || '',
            unitNumber: unitData.number || 1,
            unitOrderIndex: unitData.order_index ?? 0
          });
        }

        const ms = await materialService.getUnitMaterials(uId);
        if (mounted) {
          setMaterials(ms);
          console.log('📚 Materiales cargados:', ms.length);

          // Cargar estados de transcripción para videos desde la base de datos
          const videoMaterials = ms.filter((mat: Material) => mat.kind === 'video');
          if (videoMaterials.length > 0) {
            const { data: materialsWithStatus } = await supabase
              .from('materials')
              .select('id, transcription_status')
              .in('id', videoMaterials.map((m: Material) => m.id));

            const statuses: Record<string, string> = {};
            materialsWithStatus?.forEach((m: any) => {
              if (m.transcription_status) {
                statuses[m.id] = m.transcription_status;
              }
            });
            setTranscriptionStatuses(statuses);
          }
        }
      } catch (e: any) {
        console.error('❌ Error completo:', e);
        const errorMessage = e.message || 'Error cargando datos';
        setError(errorMessage);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [cId, uId]);

  const addMaterial = async () => {
    if (!uId) {
      alert('No hay unidad seleccionada');
      return;
    }
    const finalTitle = matTitle.trim() || (matUrl?.trim() ? new URL(matUrl.trim()).hostname : 'Recurso');
    try {
      setSavingMaterial(true);
      // Mapear tipo antiguo a kind nuevo
      const kindMap: Record<string, 'markdown' | 'pdf' | 'link' | 'video' | 'other'> = {
        'text': 'markdown',
        'video': 'video',
        'image': 'other',
        'document': 'pdf'
      };
      const kind = kindMap[matKind] || 'other';

      console.log('➕ Creando material...', { course_id: cId, unit_id: uId, title: finalTitle, kind, url: matUrl });
      const created = await materialService.createMaterial({
        course_id: cId,
        unit_id: uId,
        title: finalTitle,
        kind,
        url: matUrl || undefined,
        metadata: matContent ? { content: matContent } : {}
      });
      console.log('✅ Material creado', created);
      setMaterials(prev => [created, ...prev]);
      setMatTitle(''); setMatUrl(''); setMatContent(''); setMatKind('other');

      // Si es un video, intentar extraer transcripción automáticamente
      if (kind === 'video' && matUrl) {
        const platform = transcriptService.detectPlatform(matUrl);
        if (platform) {
          setTranscriptionStatuses(prev => ({ ...prev, [created.id]: 'processing' }));

          // Extraer transcripción en segundo plano
          transcriptService.extractTranscript(created.id, matUrl)
            .then(result => {
              if (result.success) {
                setTranscriptionStatuses(prev => ({ ...prev, [created.id]: 'completed' }));
                alert('Material creado y transcripción extraída exitosamente');
              } else {
                setTranscriptionStatuses(prev => ({ ...prev, [created.id]: 'failed' }));
                alert(`Material creado. ${result.error || 'No se pudo extraer la transcripción'}`);
              }
            })
            .catch(error => {
              setTranscriptionStatuses(prev => ({ ...prev, [created.id]: 'failed' }));
              console.error('Error extrayendo transcripción:', error);
            });
        } else {
          alert('Material creado correctamente');
        }
      } else {
        alert('Material creado correctamente');
      }
    } catch (e: any) {
      console.error('❌ Error creando material', e);
      alert((e && (e.message || e.error_description || e.code)) || 'Error creando material');
    } finally {
      setSavingMaterial(false);
    }
  };

  const removeMaterial = async (id: string) => {
    if (!confirm('¿Eliminar material?')) return;
    try {
      await materialService.deleteMaterial(id);
      setMaterials(prev => prev.filter(m => m.id !== id));
    } catch (e: any) {
      alert(e.message || 'Error eliminando material');
    }
  };

  const saveMaterial = async (mat: Material) => {
    try {
      const updated = await materialService.updateMaterial(mat.id, {
        title: mat.title,
        kind: mat.kind,
        url: mat.url,
        metadata: mat.metadata
      });
      setMaterials(prev => prev.map(m => (m.id === mat.id ? updated : m)));
    } catch (e: any) {
      alert(e.message || 'Error guardando material');
    }
  };

  const addYouTube = async () => {
    if (!uId) {
      alert('No hay unidad seleccionada');
      return;
    }
    const yt = prompt('Pega la URL de YouTube (https://...)');
    if (!yt) return;

    try {
      setSavingMaterial(true);
      const created = await materialService.createMaterial({
        course_id: cId,
        unit_id: uId,
        title: matTitle || 'Video de YouTube',
        kind: 'video',
        url: yt,
        metadata: {}
      });

      setMaterials(prev => [created, ...prev]);
      setMatTitle('');

      // Extraer transcripción automáticamente
      setTranscriptionStatuses(prev => ({ ...prev, [created.id]: 'processing' }));
      transcriptService.extractTranscript(created.id, yt)
        .then(result => {
          if (result.success) {
            setTranscriptionStatuses(prev => ({ ...prev, [created.id]: 'completed' }));
            alert('Video agregado y transcripción extraída exitosamente');
          } else {
            setTranscriptionStatuses(prev => ({ ...prev, [created.id]: 'failed' }));
            alert(`Video agregado. ${result.error || 'No se pudo extraer la transcripción'}`);
          }
        })
        .catch(error => {
          setTranscriptionStatuses(prev => ({ ...prev, [created.id]: 'failed' }));
          console.error('Error extrayendo transcripción:', error);
        });
    } catch (e: any) {
      console.error('❌ Error agregando YouTube', e);
      alert((e && (e.message || e.error_description || e.code)) || 'Error agregando video');
    } finally {
      setSavingMaterial(false);
    }
  };

  const addDrive = async () => {
    if (!uId) {
      alert('No hay unidad seleccionada');
      return;
    }
    if (!user?.id) {
      alert('Debes estar autenticado para usar Google Drive');
      return;
    }
    try {
      await openDrivePicker(user.id, async (files) => {
        for (const f of files) {
          const kind = guessKind(f.name);
          const created = await materialService.createMaterial({
            course_id: cId,
            unit_id: uId,
            title: f.name,
            kind,
            url: f.url,
            metadata: {}
          });
          setMaterials((prev) => [created, ...prev]);
        }
      });
    } catch (e: any) {
      alert(e.message || 'Error al seleccionar archivos de Drive');
    }
  };

  function guessKind(name: string): 'markdown' | 'pdf' | 'link' | 'video' | 'other' {
    const ext = name.toLowerCase();
    if (/\.(mp4|mov|webm|avi)$/.test(ext)) return 'video';
    if (/\.(pdf)$/.test(ext)) return 'pdf';
    if (/\.(doc|docx|xls|xlsx|ppt|pptx|txt|md)$/.test(ext)) return 'markdown';
    return 'other';
  }

  const addQuick = async (t: string, link: string, ttitle: string) => {
    if (!uId) {
      alert('No hay unidad seleccionada');
      return;
    }
    try {
      const kindMap: Record<string, 'markdown' | 'pdf' | 'link' | 'video' | 'other'> = {
        'text': 'markdown',
        'video': 'video',
        'image': 'other',
        'document': 'pdf'
      };
      const kind = kindMap[t] || 'other';
      console.log('➕ Creando material rápido...', { course_id: cId, unit_id: uId, title: ttitle, kind, url: link });
      const created = await materialService.createMaterial({
        course_id: cId,
        unit_id: uId,
        title: ttitle,
        kind,
        url: link,
        metadata: {}
      });
      console.log('✅ Material creado', created);
      setMaterials(prev => [created, ...prev]);
      setMatTitle('');
      alert('Material creado correctamente');
    } catch (e: any) { alert(e.message); }
  };

  const saveUnitMeta = async () => {
    if (!uId) {
      alert('No hay unidad seleccionada');
      return;
    }
    try {
      setSavingMeta(true);
      const updated = await unitService.updateUnit(uId, {
        title: unitTitle || '',
        description: unitDescription || null,
        number: unitNumber,
        order_index: unitOrderIndex
      });
      setUnitRow(updated);

      // Indexar contenido para RAG
      if (user?.id) {
        indexUnitContent(updated, user.id).catch(err =>
          console.error('Error indexando unidad:', err)
        );
      }

      alert('Unidad guardada correctamente');
    } catch (e: any) {
      console.error('Error guardando unidad:', e);
      alert(e.message || 'Error guardando unidad');
    } finally {
      setSavingMeta(false);
    }
  };

  if (loading) return <div className="p-6">Cargando...</div>;
  if (error) return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded p-4">{error}</div>
      <button onClick={() => navigate(-1)} className="mt-3 px-3 py-2 bg-gray-700 text-white rounded">Volver</button>
    </div>
  );

  console.log('🎥 ModuleEditorPage render - Botones de video disponibles');

  return (
    <div className="space-y-6 p-1 md:p-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editor de Unidad</h1>
          <p className="text-gray-600">{course?.title} · Unidad: {unitRow?.title} (ID {uId?.substring(0, 8)}...)</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/teacher/courses/${cId}/modules`} className="px-3 py-2 bg-gray-600 text-white rounded">Volver a Unidades</Link>
          <Link to={`/#/teacher/tutor?courseId=${cId}&unitId=${uId}`} className="px-3 py-2 bg-blue-600 text-white rounded">Abrir Tutor</Link>
        </div>
      </div>

      {/* Acceso Rápido a Quizzes */}
      {uId && cId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-1">Evaluaciones</h3>
              <p className="text-xs text-blue-700">Crea quizzes, trivias y exámenes para esta unidad</p>
            </div>
            <Link
              to={`/teacher/quizzes/new?courseId=${cId}&unitId=${uId}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Nuevo Quiz
            </Link>
          </div>
        </div>
      )}

      <div className="p-4 border rounded">
        <h2 className="font-semibold mb-3">Datos de la unidad</h2>
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Título</label>
            <input className="px-3 py-2 border rounded" value={unitTitle} onChange={e => setUnitTitle(e.target.value)} placeholder="Título de la unidad" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Descripción</label>
            <textarea className="px-3 py-2 border rounded" rows={3} value={unitDescription} onChange={e => setUnitDescription(e.target.value)} placeholder="Descripción de la unidad" />
          </div>
          <div className="flex gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Número</label>
              <input className="px-3 py-2 border rounded w-28" type="number" min="1" value={unitNumber} onChange={e => setUnitNumber(Number(e.target.value))} placeholder="Número" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Orden</label>
              <input className="px-3 py-2 border rounded w-28" type="number" value={unitOrderIndex} onChange={e => setUnitOrderIndex(Number(e.target.value))} placeholder="Orden" />
            </div>
          </div>
          <div>
            <button onClick={saveUnitMeta} disabled={savingMeta} className={`px-3 py-2 rounded ${savingMeta ? 'bg-blue-400 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{savingMeta ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>

        <hr className="my-4" />

        {/* Sección destacada para agregar videos - MUY VISIBLE */}
        <div className="bg-gradient-to-r from-red-100 via-orange-100 to-red-100 border-4 border-red-500 rounded-xl p-6 mb-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🎥</span>
            <div>
              <h3 className="font-bold text-2xl text-red-900">Agregar Video</h3>
              <p className="text-sm text-red-800 font-medium">Videos de YouTube o Vimeo con transcripción automática</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={() => {
                console.log('🎥 Clic en botón YouTube');
                addYouTube();
              }}
              disabled={savingMaterial}
              className={`px-6 py-3 rounded-lg font-bold text-lg flex items-center gap-2 transition-all ${savingMaterial ? 'bg-red-400 text-white cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl transform hover:scale-105'}`}
            >
              <span className="text-2xl">📺</span>
              <span>Añadir Video de YouTube</span>
            </button>
            <button
              onClick={() => {
                console.log('🎥 Clic en botón Video Manual');
                setMatKind('video');
                setMatUrl('');
                setTimeout(() => {
                  document.getElementById('material-url-input')?.focus();
                }, 100);
              }}
              className="px-6 py-3 rounded-lg font-bold text-lg bg-orange-600 text-white hover:bg-orange-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center gap-2"
            >
              <span className="text-2xl">🎬</span>
              <span>Agregar Video Manualmente</span>
            </button>
          </div>
        </div>

        <h2 className="font-semibold mb-3">Agregar material</h2>
        <div className="flex flex-col md:flex-row gap-2 mb-2">
          <input className="px-3 py-2 border rounded md:flex-1" value={matTitle} onChange={e => setMatTitle(e.target.value)} placeholder="Título" />
          <select className="px-3 py-2 border rounded" value={matKind} onChange={e => setMatKind(e.target.value)}>
            <option value="markdown">Markdown</option>
            <option value="video">Video</option>
            <option value="pdf">PDF</option>
            <option value="link">Enlace</option>
            <option value="other">Otro</option>
          </select>
          <input
            id="material-url-input"
            className="px-3 py-2 border rounded md:flex-1"
            value={matUrl}
            onChange={e => setMatUrl(e.target.value)}
            placeholder="URL (YouTube, Vimeo, etc.)"
          />
        </div>
        <textarea className="w-full px-3 py-2 border rounded mb-2" rows={4} value={matContent} onChange={e => setMatContent(e.target.value)} placeholder="Contenido (opcional, se guardará en metadata)"></textarea>
        <div className="flex flex-wrap gap-2">
          <button onClick={addMaterial} disabled={savingMaterial} className={`px-3 py-2 rounded ${savingMaterial ? 'bg-indigo-400 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>{savingMaterial ? 'Guardando...' : 'Agregar'}</button>
          <button onClick={addYouTube} disabled={savingMaterial} className={`px-3 py-2 rounded ${savingMaterial ? 'bg-red-400 text-white' : 'bg-red-600 text-white hover:bg-red-700'}`}>📺 Añadir YouTube</button>
          <button onClick={addDrive} disabled={savingMaterial} className={`px-3 py-2 rounded ${savingMaterial ? 'bg-green-400 text-white' : 'bg-green-600 text-white hover:bg-green-700'}`}>📁 Subir desde Drive</button>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-lg mb-3">Materiales de la unidad ({materials.length})</h2>
        {materials.map((mat) => (
          <MaterialRow
            key={mat.id}
            mat={mat}
            onSave={saveMaterial}
            onDelete={removeMaterial}
            transcriptionStatus={transcriptionStatuses[mat.id]}
          />
        ))}
        {materials.length === 0 && <div className="text-gray-500 p-4 border rounded">Sin materiales aún. Usa el formulario de arriba para agregar materiales.</div>}
      </div>
    </div>
  );
};

const MaterialRow: React.FC<{
  mat: Material;
  onSave: (m: Material) => void;
  onDelete: (id: string) => void;
  transcriptionStatus?: string;
}> = ({ mat, onSave, onDelete, transcriptionStatus }) => {
  const [local, setLocal] = useState<Material>(mat);

  // Actualizar estado local cuando cambie el material prop
  useEffect(() => {
    if (mat?.id && mat?.id !== local?.id) {
      setLocal(mat);
    }
  }, [mat?.id, local?.id]);

  const materialTitle = local?.title || '';
  const materialKind = local?.kind || 'other';
  const materialUrl = local?.url || '';
  const materialContent = local?.metadata?.content || '';
  const isVideo = materialKind === 'video';

  const getTranscriptionStatusBadge = () => {
    if (!isVideo) return null;

    const status = transcriptionStatus;

    if (status === 'completed') {
      return (
        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
          ✓ Transcripción disponible
        </span>
      );
    }
    if (status === 'processing') {
      return (
        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
          ⏳ Extrayendo transcripción...
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
          ✗ Transcripción no disponible
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
        ⏸ Sin transcripción
      </span>
    );
  };

  // Detectar plataforma y video ID para videos
  const transcriptService = new VideoTranscriptService();
  const platform = isVideo && materialUrl
    ? (mat.video_platform || transcriptService.detectPlatform(materialUrl)?.name || 'other')
    : null;
  const videoId = isVideo && materialUrl && platform
    ? (mat.video_id || transcriptService.detectPlatform(materialUrl)?.extractId(materialUrl) || undefined)
    : undefined;

  return (
    <div className="border rounded p-3 space-y-3">
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <input className="px-3 py-2 border rounded md:flex-1" value={materialTitle} onChange={e => setLocal({ ...local, title: e.target.value })} placeholder="Título" />
        <select className="px-3 py-2 border rounded" value={materialKind} onChange={e => setLocal({ ...local, kind: e.target.value as Material['kind'] })}>
          <option value="markdown">Markdown</option>
          <option value="video">Video</option>
          <option value="pdf">PDF</option>
          <option value="link">Enlace</option>
          <option value="other">Otro</option>
        </select>
        <input className="px-3 py-2 border rounded md:flex-1" value={materialUrl} onChange={e => setLocal({ ...local, url: e.target.value })} placeholder="URL" />
        <div className="flex gap-2">
          <button onClick={() => onSave(local)} className="px-3 py-2 bg-blue-600 text-white rounded">Guardar</button>
          <button onClick={() => onDelete(local.id)} className="px-3 py-2 bg-red-600 text-white rounded">Eliminar</button>
          {materialUrl && <a href={materialUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-2 border rounded">Abrir</a>}
        </div>
      </div>
      {isVideo && (
        <div className="flex items-center gap-2 mb-2">
          {getTranscriptionStatusBadge()}
        </div>
      )}

      {/* Preview del video para el docente */}
      {isVideo && materialUrl && (
        <div className="border-t pt-3 mt-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Vista Previa del Video:</h4>
          <div className="bg-gray-50 p-3 rounded-lg">
            <VideoPlayer
              materialId={local.id}
              url={materialUrl}
              platform={platform || 'other'}
              videoId={videoId}
              title={materialTitle || 'Video'}
              showProgress={false}
              transcription={local.transcription}
              transcriptionStatus={local.transcription_status}
            />
            <p className="text-xs text-gray-500 mt-2">
              Así es como los estudiantes verán este video
            </p>
          </div>
        </div>
      )}

      <textarea
        className="w-full px-3 py-2 border rounded"
        rows={3}
        value={materialContent}
        onChange={e => setLocal({ ...local, metadata: { ...local.metadata, content: e.target.value } })}
        placeholder="Contenido del material"
      />
    </div>
  );
};

export default ModuleEditorPage;


