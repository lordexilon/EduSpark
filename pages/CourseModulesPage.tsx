import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { listModulesByCourse, createModule, updateModule, deleteModule } from '../services/modules';
import { listMaterialsByModule, createMaterial, deleteMaterial } from '../services/materials';
import { openDrivePicker } from '../services/googleDrive';
import { supabase } from '../lib/supabase';

interface CourseRow { id: number; title: string | null; code: string | null; }

const CourseModulesPage: React.FC = () => {
  const { id } = useParams();
  const courseId = useMemo(() => Number(id), [id]);
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseRow | null>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newOrder, setNewOrder] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from('courses')
          .select('id,title,code')
          .eq('id', courseId)
          .single();
        if (error) throw error;
        if (mounted) setCourse(data as CourseRow);
        const ms = await listModulesByCourse(courseId);
        if (mounted) setModules(ms);
      } catch (e: any) {
        setError(e.message || 'Error cargando datos');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [courseId]);

  const addModule = async () => {
    if (!newName.trim()) return;
    try {
      const created = await createModule({ course_id: courseId, name: newName.trim(), order: newOrder });
      setModules(prev => [...prev, created]);
      setNewName('');
      setNewOrder(0);
    } catch (e: any) {
      alert(e.message || 'Error creando módulo');
    }
  };

  const saveModule = async (id: number, name: string, ord: number) => {
    try {
      const updated = await updateModule(id, { name, order: ord });
      setModules(prev => prev.map(m => (m.id === id ? updated : m)));
    } catch (e: any) {
      alert(e.message || 'Error actualizando módulo');
    }
  };

  const removeModule = async (id: number) => {
    if (!confirm('¿Eliminar módulo?')) return;
    try {
      await deleteModule(id);
      setModules(prev => prev.filter(m => m.id !== id));
    } catch (e: any) {
      alert(e.message || 'Error eliminando módulo');
    }
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
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">{error}</p>
        <button onClick={() => navigate(-1)} className="mt-2 px-3 py-1.5 bg-gray-700 text-white rounded">Volver</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Módulos de Curso</h1>
          <p className="text-gray-600">{course?.title} {course?.code ? `· ${course?.code}` : ''}</p>
        </div>
        <Link to={`/teacher/courses/${courseId}`} className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Volver al curso</Link>
      </div>

      <div className="p-4 border rounded-lg">
        <h2 className="font-semibold mb-3">Agregar módulo</h2>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del módulo"
            className="px-3 py-2 border rounded w-64"
          />
          <input
            type="number"
            value={newOrder}
            onChange={(e) => setNewOrder(Number(e.target.value))}
            placeholder="Orden"
            className="px-3 py-2 border rounded w-28"
          />
          <button onClick={addModule} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Agregar</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((m) => (
          <ModuleCard key={m.id} mod={m} onSave={saveModule} onDelete={removeModule} courseId={courseId} />
        ))}
        {modules.length === 0 && (
          <div className="text-gray-500">Aún no hay módulos.</div>
        )}
      </div>
    </div>
  );
};

const ModuleCard: React.FC<{ mod: any; onSave: (id:number, name:string, order:number)=>void; onDelete:(id:number)=>void; courseId:number; }> = ({ mod, onSave, onDelete, courseId }) => {
  const [name, setName] = useState<string>(mod.name || '');
  const [ord, setOrd] = useState<number>(mod.order ?? 0);
  const [mats, setMats] = useState<any[]>([]);
  const [matTitle, setMatTitle] = useState('');
  const [matType, setMatType] = useState<'text'|'video'|'image'|'document'>('text');
  const [matContent, setMatContent] = useState('');
  const [matUrl, setMatUrl] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await listMaterialsByModule(courseId, mod.id);
        setMats(data);
      } catch {}
    })();
  }, [courseId, mod.id]);

  const addMaterial = async () => {
    if (!matTitle.trim()) return;
    try {
      const created = await createMaterial({
        course_id: courseId,
        module_id: mod.id,
        title: matTitle.trim(),
        type: matType,
        content: matContent,
        file_url: matUrl || undefined,
        source_url: undefined,
      });
      setMats(prev => [...prev, created]);
      setMatTitle(''); setMatContent(''); setMatUrl(''); setMatType('text');
    } catch (e:any) { alert(e.message || 'Error creando material'); }
  };

  const removeMaterial = async (id: number) => {
    if (!confirm('¿Eliminar material?')) return;
    try { await deleteMaterial(id); setMats(prev => prev.filter(m => m.id !== id)); } catch (e:any) { alert(e.message); }
  };

  const uploadFromDrive = async () => {
    try {
      await openDrivePicker(async (files) => {
        for (const f of files) {
          const created = await createMaterial({
            course_id: courseId,
            module_id: mod.id,
            title: f.name,
            type: guessTypeByName(f.name),
            file_url: f.url,
          });
          setMats((prev) => [...prev, created]);
        }
      });
    } catch (e: any) {
      alert(e.message || 'Error seleccionando desde Drive');
    }
  };

  const addYouTube = async () => {
    const url = prompt('Pega la URL de YouTube (https://...):');
    if (!url) return;
    // Validación básica y extracción de título opcional
    try {
      const yt = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url);
      if (!yt) {
        alert('URL no parece ser de YouTube');
        return;
      }
      const titleGuess = matTitle || 'Video de YouTube';
      const created = await createMaterial({
        course_id: courseId,
        module_id: mod.id,
        title: titleGuess,
        type: 'video',
        file_url: url
      });
      setMats(prev => [...prev, created]);
      setMatTitle('');
    } catch (e:any) {
      alert(e.message || 'Error agregando video de YouTube');
    }
  };

  function guessTypeByName(name: string): 'text'|'video'|'image'|'document' {
    const ext = name.toLowerCase();
    if (/\.(mp4|mov|webm|avi)$/.test(ext)) return 'video';
    if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(ext)) return 'image';
    if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|md)$/.test(ext)) return 'document';
    return 'text';
  }

  return (
    <div className="border rounded p-4">
      <div className="text-sm text-gray-500 mb-2">ID: {mod.id}</div>
      <div className="flex flex-col gap-2">
        <input className="px-3 py-2 border rounded" value={name} onChange={(e)=>setName(e.target.value)} />
        <input className="px-3 py-2 border rounded w-28" type="number" value={ord} onChange={(e)=>setOrd(Number(e.target.value))} />
        <div className="flex gap-2">
          <button onClick={()=>onSave(mod.id, name, ord)} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
          <button onClick={()=>onDelete(mod.id)} className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700">Eliminar</button>
          <Link to={`/#/teacher/tutor?courseId=${courseId}&moduleId=${mod.id}`} className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300">Abrir Tutor</Link>
          <Link to={`/teacher/courses/${courseId}/modules/${mod.id}`} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Editar módulo</Link>
        </div>
      </div>

      {/* Gestión de materiales movida al editor dedicado */}
      <div className="mt-3 text-xs text-gray-500">
        Gestiona los materiales de este módulo desde "Editar módulo".
      </div>
    </div>
  );
};

export default CourseModulesPage;


