import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { listMaterialsByModule, createMaterial, deleteMaterial, updateMaterial } from '../services/materials';
import { openDrivePicker } from '../services/googleDrive';
import { supabase } from '../lib/supabase';

type MatType = 'text' | 'video' | 'image' | 'document';

const ModuleEditorPage: React.FC = () => {
  const { courseId, moduleId } = useParams();
  const cId = useMemo(() => Number(courseId), [courseId]);
  const mId = useMemo(() => Number(moduleId), [moduleId]);
  const navigate = useNavigate();

  const [course, setCourse] = useState<any>(null);
  const [moduleRow, setModuleRow] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modName, setModName] = useState('');
  const [modOrder, setModOrder] = useState<number>(0);
  const [savingMeta, setSavingMeta] = useState<boolean>(false);
  const [savingMaterial, setSavingMaterial] = useState<boolean>(false);

  // form
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MatType>('text');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [{ data: cData }, { data: mData }] = await Promise.all([
          supabase.from('courses').select('id,title,code').eq('id', cId).single(),
          supabase.from('course_modules').select('id,name,order').eq('id', mId).single(),
        ]);
        if (mounted) {
          setCourse(cData);
          setModuleRow(mData);
          setModName(mData?.name || '');
          setModOrder(mData?.order ?? 0);
        }
        const ms = await listMaterialsByModule(cId, mId);
        if (mounted) setMaterials(ms);
      } catch (e: any) {
        setError(e.message || 'Error cargando datos');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [cId, mId]);

  const addMaterial = async () => {
    const finalTitle = title.trim() || (url?.trim() ? new URL(url.trim()).hostname : 'Recurso');
    try {
      setSavingMaterial(true);
      console.log('➕ Creando material...', { course_id: cId, module_id: mId, title: finalTitle, type, file_url: url, content });
      const created = await createMaterial({
        course_id: cId,
        module_id: mId,
        title: finalTitle,
        type,
        file_url: url || undefined,
        content: content || undefined,
      });
      console.log('✅ Material creado', created);
      setMaterials(prev => [created, ...prev]);
      setTitle(''); setUrl(''); setContent(''); setType('text');
      alert('Material creado correctamente');
    } catch (e: any) {
      console.error('❌ Error creando material', e);
      alert((e && (e.message || e.error_description || e.code)) || 'Error creando material');
    } finally {
      setSavingMaterial(false);
    }
  };

  const removeMaterial = async (id: number) => {
    if (!confirm('¿Eliminar material?')) return;
    try {
      await deleteMaterial(id);
      setMaterials(prev => prev.filter(m => m.id !== id));
    } catch (e: any) {
      alert(e.message || 'Error eliminando material');
    }
  };

  const saveMaterial = async (mat: any) => {
    try {
      const updated = await updateMaterial(mat.id, {
        title: mat.title,
        type: mat.type as MatType,
        file_url: mat.file_url,
        content: mat.content,
      });
      setMaterials(prev => prev.map(m => (m.id === mat.id ? updated : m)));
    } catch (e: any) {
      alert(e.message || 'Error guardando material');
    }
  };

  const addYouTube = async () => {
    const yt = prompt('Pega la URL de YouTube (https://...)');
    if (!yt) return;
    await addQuick('video', yt, title || 'Video de YouTube');
  };

  const addDrive = async () => {
    try {
      await openDrivePicker(async (files) => {
        for (const f of files) {
          const created = await createMaterial({
            course_id: cId,
            module_id: mId,
            title: f.name,
            type: guessType(f.name),
            file_url: f.url,
          });
          setMaterials((prev) => [created, ...prev]);
        }
      });
    } catch (e: any) {
      alert(e.message || 'Error al seleccionar archivos de Drive');
    }
  };

  function guessType(name: string): MatType {
    const ext = name.toLowerCase();
    if (/\.(mp4|mov|webm|avi)$/.test(ext)) return 'video';
    if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(ext)) return 'image';
    if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|md)$/.test(ext)) return 'document';
    return 'text';
  }

  const addQuick = async (t: MatType, link: string, ttitle: string) => {
    try {
      console.log('➕ Creando material rápido...', { course_id: cId, module_id: mId, title: ttitle, type: t, file_url: link });
      const created = await createMaterial({ course_id: cId, module_id: mId, title: ttitle, type: t, file_url: link });
      console.log('✅ Material creado', created);
      setMaterials(prev => [created, ...prev]);
      setTitle('');
      alert('Material creado correctamente');
    } catch (e: any) { alert(e.message); }
  };

  const saveModuleMeta = async () => {
    try {
      setSavingMeta(true);
      console.log('💾 Guardando módulo...', { id: mId, name: modName, order: modOrder });
      const { data, error } = await supabase
        .from('course_modules')
        .update({ name: modName, ['order']: modOrder } as any)
        .eq('id', mId)
        .select('*')
        .single();
      if (error) throw error;
      setModuleRow(data);
      console.log('✅ Módulo actualizado', data);
    } catch (e: any) {
      alert(e.message || 'Error guardando módulo');
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

  return (
    <div className="space-y-6 p-1 md:p-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editor de Módulo</h1>
          <p className="text-gray-600">{course?.title} · Módulo: {moduleRow?.name} (ID {mId})</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/teacher/courses/${cId}/modules`} className="px-3 py-2 bg-gray-600 text-white rounded">Volver a Módulos</Link>
          <Link to={`/#/teacher/tutor?courseId=${cId}&moduleId=${mId}`} className="px-3 py-2 bg-blue-600 text-white rounded">Abrir Tutor</Link>
        </div>
      </div>

      <div className="p-4 border rounded">
        <h2 className="font-semibold mb-3">Datos del módulo</h2>
        <div className="flex flex-col md:flex-row gap-2 mb-3">
          <input className="px-3 py-2 border rounded md:flex-1" value={modName} onChange={e=>setModName(e.target.value)} placeholder="Nombre del módulo" />
          <input className="px-3 py-2 border rounded w-28" type="number" value={modOrder} onChange={e=>setModOrder(Number(e.target.value))} placeholder="Orden" />
          <button onClick={saveModuleMeta} disabled={savingMeta} className={`px-3 py-2 rounded ${savingMeta ? 'bg-blue-400 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{savingMeta ? 'Guardando...' : 'Guardar'}</button>
        </div>

        <hr className="my-4" />

        <h2 className="font-semibold mb-3">Agregar material</h2>
        <div className="flex flex-col md:flex-row gap-2 mb-2">
          <input className="px-3 py-2 border rounded md:flex-1" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título" />
          <select className="px-3 py-2 border rounded" value={type} onChange={e=>setType(e.target.value as MatType)}>
            <option value="text">Texto</option>
            <option value="video">Video</option>
            <option value="image">Imagen</option>
            <option value="document">Documento</option>
          </select>
          <input className="px-3 py-2 border rounded md:flex-1" value={url} onChange={e=>setUrl(e.target.value)} placeholder="URL (opcional)" />
        </div>
        <textarea className="w-full px-3 py-2 border rounded mb-2" rows={4} value={content} onChange={e=>setContent(e.target.value)} placeholder="Contenido (opcional)"></textarea>
        <div className="flex gap-2">
          <button onClick={addMaterial} className="px-3 py-2 bg-indigo-600 text-white rounded">Agregar</button>
          <button onClick={addYouTube} className="px-3 py-2 bg-red-600 text-white rounded">Añadir YouTube</button>
          <button onClick={addDrive} className="px-3 py-2 bg-green-600 text-white rounded">Subir desde Drive</button>
        </div>
      </div>

      <div className="space-y-3">
        {materials.map((mat) => (
          <MaterialRow key={mat.id} mat={mat} onSave={saveMaterial} onDelete={removeMaterial} />
        ))}
        {materials.length === 0 && <div className="text-gray-500">Sin materiales aún.</div>}
      </div>
    </div>
  );
};

const MaterialRow: React.FC<{ mat: any; onSave: (m:any)=>void; onDelete:(id:number)=>void; }> = ({ mat, onSave, onDelete }) => {
  const [local, setLocal] = useState<any>(mat);
  return (
    <div className="border rounded p-3 flex flex-col md:flex-row md:items-center gap-2">
      <input className="px-3 py-2 border rounded md:flex-1" value={local.title || ''} onChange={e=>setLocal({ ...local, title: e.target.value })} />
      <select className="px-3 py-2 border rounded" value={local.type || 'text'} onChange={e=>setLocal({ ...local, type: e.target.value })}>
        <option value="text">Texto</option>
        <option value="video">Video</option>
        <option value="image">Imagen</option>
        <option value="document">Documento</option>
      </select>
      <input className="px-3 py-2 border rounded md:flex-1" value={local.file_url || ''} onChange={e=>setLocal({ ...local, file_url: e.target.value })} placeholder="URL" />
      <div className="flex gap-2">
        <button onClick={()=>onSave(local)} className="px-3 py-2 bg-blue-600 text-white rounded">Guardar</button>
        <button onClick={()=>onDelete(local.id)} className="px-3 py-2 bg-red-600 text-white rounded">Eliminar</button>
        {local.file_url && <a href={local.file_url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 border rounded">Abrir</a>}
      </div>
    </div>
  );
};

export default ModuleEditorPage;


