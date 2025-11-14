import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { unitService, CourseUnit } from '../services/teacherCourses';
import { materialService, Material } from '../services/teacherCourses';
import { supabase } from '../lib/supabase';

interface CourseRow { id: number; title: string | null; code: string | null; }

const CourseModulesPage: React.FC = () => {
  const { id } = useParams();
  const courseId = useMemo(() => Number(id), [id]);
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseRow | null>(null);
  const [units, setUnits] = useState<CourseUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newNumber, setNewNumber] = useState<number>(1);

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
        const unitsData = await unitService.getCourseUnits(courseId);
        if (mounted) setUnits(unitsData);
      } catch (e: any) {
        setError(e.message || 'Error cargando datos');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [courseId]);

  const addUnit = async () => {
    if (!newTitle.trim()) return;
    try {
      // Obtener el siguiente número de unidad
      const maxNumber = units.length > 0 
        ? Math.max(...units.map(u => u.number || 0)) 
        : 0;
      
      const created = await unitService.createUnit({ 
        course_id: courseId, 
        title: newTitle.trim(),
        number: newNumber || maxNumber + 1,
        order_index: units.length,
        description: null
      });
      setUnits(prev => [...prev, created]);
      setNewTitle('');
      setNewNumber(maxNumber + 2);
    } catch (e: any) {
      alert(e.message || 'Error creando unidad');
    }
  };

  const saveUnit = async (id: string, title: string, number: number, orderIndex: number) => {
    try {
      const updated = await unitService.updateUnit(id, { title, number, order_index: orderIndex });
      setUnits(prev => prev.map(u => (u.id === id ? updated : u)));
    } catch (e: any) {
      alert(e.message || 'Error actualizando unidad');
    }
  };

  const removeUnit = async (id: string) => {
    if (!confirm('¿Eliminar unidad?')) return;
    try {
      await unitService.deleteUnit(id);
      setUnits(prev => prev.filter(u => u.id !== id));
    } catch (e: any) {
      alert(e.message || 'Error eliminando unidad');
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
          <h1 className="text-2xl font-bold text-gray-900">Unidades del Curso</h1>
          <p className="text-gray-600">{course?.title} {course?.code ? `· ${course?.code}` : ''}</p>
        </div>
        <Link to={`/teacher/courses/${courseId}`} className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Volver al curso</Link>
      </div>

      <div className="p-4 border rounded-lg">
        <h2 className="font-semibold mb-3">Agregar unidad</h2>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Título de la unidad"
            className="px-3 py-2 border rounded w-64"
          />
          <input
            type="number"
            value={newNumber}
            onChange={(e) => setNewNumber(Number(e.target.value))}
            placeholder="Número"
            min="1"
            className="px-3 py-2 border rounded w-28"
          />
          <button onClick={addUnit} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Agregar</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {units.map((u) => (
          <UnitCard key={u.id} unit={u} onSave={saveUnit} onDelete={removeUnit} courseId={courseId} />
        ))}
        {units.length === 0 && (
          <div className="text-gray-500">Aún no hay unidades.</div>
        )}
      </div>
    </div>
  );
};

const UnitCard: React.FC<{ unit: CourseUnit; onSave: (id:string, title:string, number:number, orderIndex:number)=>void; onDelete:(id:string)=>void; courseId:number; }> = ({ unit, onSave, onDelete, courseId }) => {
  const [title, setTitle] = useState<string>(unit.title || '');
  const [number, setNumber] = useState<number>(unit.number || 1);
  const [orderIndex, setOrderIndex] = useState<number>(unit.order_index ?? 0);

  return (
    <div className="border rounded p-4">
      <div className="text-sm text-gray-500 mb-2">ID: {unit.id}</div>
      <div className="flex flex-col gap-2">
        <input 
          className="px-3 py-2 border rounded" 
          value={title} 
          onChange={(e)=>setTitle(e.target.value)} 
          placeholder="Título de la unidad"
        />
        <div className="flex gap-2">
          <input 
            className="px-3 py-2 border rounded w-28" 
            type="number" 
            value={number} 
            onChange={(e)=>setNumber(Number(e.target.value))}
            placeholder="Número"
            min="1"
          />
          <input 
            className="px-3 py-2 border rounded w-28" 
            type="number" 
            value={orderIndex} 
            onChange={(e)=>setOrderIndex(Number(e.target.value))}
            placeholder="Orden"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={()=>onSave(unit.id, title, number, orderIndex)} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
          <button onClick={()=>onDelete(unit.id)} className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700">Eliminar</button>
          <Link to={`/#/teacher/tutor?courseId=${courseId}&unitId=${unit.id}`} className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300">Abrir Tutor</Link>
          <Link to={`/teacher/courses/${courseId}/units/${unit.id}`} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Editar unidad</Link>
        </div>
      </div>
      {unit.description && (
        <div className="mt-2 text-sm text-gray-600">{unit.description}</div>
      )}
    </div>
  );
};

export default CourseModulesPage;


