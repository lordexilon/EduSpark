// SupervisorDashboard.tsx
// Dashboard especial para supervisores

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUserInstitution } from '../hooks/useUserInstitution';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { IconUserGroup, IconBookOpen, IconCalendar, IconChartBar, IconAlertCircle } from '../components/Icons';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  career?: string;
  enrollment_date?: string;
}

interface Career {
  id: number;
  name: string;
  description?: string;
  total_students: number;
}

interface Subject {
  id: number;
  name: string;
  code?: string;
  career_id?: number;
  semester?: number;
}

interface Schedule {
  id: number;
  subject_name: string;
  teacher_name: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  classroom?: string;
}

const SupervisorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { institution, loading: institutionLoading } = useUserInstitution();
  const navigate = useNavigate();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [careers, setCareers] = useState<Career[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'students' | 'careers' | 'subjects' | 'schedules'>('students');

  // Verificar que el usuario es supervisor y tiene institución
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role?.name !== 'supervisor') {
      navigate('/dashboard');
      return;
    }

    // Esperar a que se cargue la institución
    if (!institutionLoading && institution) {
      loadData();
    } else if (!institutionLoading && !institution) {
      setLoading(false);
    }
  }, [user, navigate, institution, institutionLoading]);

  const loadData = async () => {
    if (!institution) {
      console.error('Supervisor sin institución asignada');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Obtener el ID del rol de estudiante
      const { data: studentRole } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'student')
        .single();

      if (!studentRole) {
        console.error('No se encontró el rol de estudiante');
        setLoading(false);
        return;
      }

      // Cargar estudiantes de la institución del supervisor
      // Primero obtener los IDs de usuarios de la institución
      console.log(`🔍 SupervisorDashboard: Buscando usuarios de la institución ${institution.name} (ID: ${institution.id})`);
      
      const { data: userInstitutions, error: uiError } = await supabase
        .from('user_institutions')
        .select('user_id')
        .eq('institution_id', institution.id);

      if (uiError) {
        console.error('❌ Error obteniendo usuarios de la institución:', uiError);
        setLoading(false);
        return;
      }

      console.log(`📊 SupervisorDashboard: Encontrados ${userInstitutions?.length || 0} usuarios en la institución ${institution.id}`);
      
      const userIds = (userInstitutions || []).map((ui: any) => ui.user_id);

      if (userIds.length === 0) {
        console.warn(`⚠️ SupervisorDashboard: No hay usuarios en la institución ${institution.name} (ID: ${institution.id})`);
        setStudents([]);
        setLoading(false);
        return;
      }

      console.log(`👥 SupervisorDashboard: IDs de usuarios encontrados:`, userIds);

      // Luego obtener los estudiantes de esos usuarios
      console.log(`🔍 SupervisorDashboard: Buscando estudiantes con role_id=${studentRole.id} en ${userIds.length} usuarios`);
      console.log(`👥 SupervisorDashboard: IDs de usuarios a buscar:`, userIds);
      
      const { data: studentsData, error: studentsError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          created_at,
          role_id
        `)
        .eq('role_id', studentRole.id)
        .in('id', userIds)
        .order('created_at', { ascending: false });

      console.log(`📊 SupervisorDashboard: Resultado de consulta de estudiantes:`, {
        error: studentsError,
        count: studentsData?.length || 0,
        students: studentsData?.map((s: any) => ({ id: s.id, email: s.email, role_id: s.role_id }))
      });

      if (studentsError) {
        console.error('Error cargando estudiantes:', studentsError);
        setStudents([]);
      } else if (studentsData) {
        const cleanedStudents = studentsData.map((student: any) => ({
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          email: student.email,
          enrollment_date: student.created_at
        }));
        console.log(`✅ SupervisorDashboard: Cargados ${cleanedStudents.length} estudiantes de la institución ${institution.name} (ID: ${institution.id})`);
        setStudents(cleanedStudents);
      } else {
        setStudents([]);
      }

      // Cargar carreras de la institución directamente por institution_id
      console.log(`🔍 SupervisorDashboard: Buscando carreras activas de la institución ${institution.id}`);
      
      const { data: careersData, error: careersError } = await supabase
        .from('careers')
        .select('*')
        .eq('institution_id', institution.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (careersError) {
        console.error('❌ Error obteniendo carreras:', careersError);
      } else {
        console.log(`📚 SupervisorDashboard: Encontradas ${careersData?.length || 0} carreras activas de la institución`);
      }

      if (careersData && careersData.length > 0) {
        const uniqueCareerIds = careersData.map((c: any) => c.id);
        console.log(`📚 SupervisorDashboard: IDs de carreras únicas:`, uniqueCareerIds);

        if (!careersError && careersData) {
          // Contar estudiantes por carrera - contar todos los estudiantes inscritos en la carrera que pertenezcan a la institución
          const careersWithCounts = await Promise.all(
            careersData.map(async (career: any) => {
              // Contar estudiantes inscritos en la carrera que pertenezcan a la institución
              const { count, error: countError } = await supabase
                .from('career_enrollments')
                .select('*', { count: 'exact', head: true })
                .eq('career_id', career.id)
                .eq('status', 'active')
                .in('student_id', userIds);

              if (countError) {
                console.error(`❌ Error contando estudiantes para carrera ${career.id}:`, countError);
              }

              console.log(`📊 Carrera ${career.name} (ID: ${career.id}): ${count || 0} estudiantes inscritos`);

              return {
                id: career.id,
                name: career.name,
                description: career.description,
                total_students: count || 0
              };
            })
          );
          console.log(`✅ SupervisorDashboard: Cargadas ${careersWithCounts.length} carreras de la institución ${institution.name}`);
          setCareers(careersWithCounts);

          // Cargar materias de las carreras de la institución
          // Primero intentar por institution_id, si no existe, filtrar por career_id
          let subjectsQuery = supabase
            .from('subjects')
            .select('*')
            .in('career_id', uniqueCareerIds);
          
          // Si subjects tiene institution_id, filtrar también por eso
          const { data: subjectsData, error: subjectsError } = await subjectsQuery
            .order('career_id', { ascending: true })
            .order('semester', { ascending: true });

          if (!subjectsError && subjectsData) {
            const cleanedSubjects = subjectsData.map((s: any) => ({
              id: s.id,
              name: s.name,
              code: s.code,
              career_id: s.career_id,
              semester: s.semester
            }));
            console.log(`✅ SupervisorDashboard: Cargadas ${cleanedSubjects.length} materias de la institución ${institution.name}`);
            setSubjects(cleanedSubjects);

            // Cargar cronogramas (horarios de cursos) de la institución
            const subjectIds = cleanedSubjects.map(s => s.id);
            console.log(`🔍 SupervisorDashboard: Buscando cursos activos para ${subjectIds.length} materias de la institución ${institution.id}`);
            console.log(`📚 IDs de materias:`, subjectIds);
            
            // Buscar cursos que estén vinculados a las materias de la institución
            // Buscar todos los cursos activos de estas materias (con o sin institution_id)
            const { data: coursesData, error: coursesError } = await supabase
              .from('courses')
              .select('id, title, schedule, subject_id, teacher_id, institution_id')
              .in('subject_id', subjectIds)
              .eq('status', 'active');
            
            // Filtrar cursos que pertenezcan a la institución o que no tengan institution_id asignado
            const filteredCourses = coursesData?.filter((c: any) => 
              !c.institution_id || c.institution_id === institution.id
            ) || [];
            
            console.log(`📖 SupervisorDashboard: ${filteredCourses.length} cursos después de filtrar por institución (de ${coursesData?.length || 0} totales)`);

            if (coursesError) {
              console.error('❌ Error obteniendo cursos:', coursesError);
            } else {
              if (filteredCourses.length > 0) {
                console.log('📖 Detalles de cursos:', filteredCourses.map((c: any) => ({
                  id: c.id,
                  title: c.title,
                  subject_id: c.subject_id,
                  institution_id: c.institution_id,
                  has_schedule: !!c.schedule,
                  schedule_length: Array.isArray(c.schedule) ? c.schedule.length : 0
                })));
              }
            }

            if (!coursesError && filteredCourses.length > 0) {
              // Obtener nombres de docentes
              const teacherIds = [...new Set(coursesData.map((c: any) => c.teacher_id).filter(Boolean))];
              const { data: teachersData } = await supabase
                .from('users')
                .select('id, first_name, last_name')
                .in('id', teacherIds);

              const teachersMap = new Map((teachersData || []).map((t: any) => [t.id, `${t.first_name} ${t.last_name}`]));

              // Procesar cronogramas desde el campo schedule (JSONB)
              const schedulesList: Schedule[] = [];
              filteredCourses.forEach((course: any) => {
                if (course.schedule && Array.isArray(course.schedule) && course.schedule.length > 0) {
                  course.schedule.forEach((scheduleItem: any, index: number) => {
                    schedulesList.push({
                      id: schedulesList.length + 1,
                      subject_name: cleanedSubjects.find(s => s.id === course.subject_id)?.name || course.title,
                      teacher_name: teachersMap.get(course.teacher_id) || 'Docente',
                      day_of_week: scheduleItem.day || scheduleItem.day_of_week || 'N/A',
                      start_time: scheduleItem.start_time || scheduleItem.start || 'N/A',
                      end_time: scheduleItem.end_time || scheduleItem.end || 'N/A',
                      classroom: scheduleItem.classroom || scheduleItem.room || undefined
                    });
                  });
                } else {
                  // Si el curso no tiene schedule pero está activo, crear un cronograma básico
                  schedulesList.push({
                    id: schedulesList.length + 1,
                    subject_name: cleanedSubjects.find(s => s.id === course.subject_id)?.name || course.title,
                    teacher_name: teachersMap.get(course.teacher_id) || 'Docente',
                    day_of_week: 'Sin horario definido',
                    start_time: 'N/A',
                    end_time: 'N/A',
                    classroom: undefined
                  });
                }
              });
              console.log(`✅ SupervisorDashboard: Cargados ${schedulesList.length} cronogramas de la institución ${institution.name}`);
              setSchedules(schedulesList);
            } else if (!coursesError && (!coursesData || coursesData.length === 0)) {
              console.log(`ℹ️ SupervisorDashboard: No hay cursos activos para las materias de la institución ${institution.name}`);
              setSchedules([]);
            }
          }
        }
      } else {
        console.log(`ℹ️ SupervisorDashboard: No hay carreras con estudiantes de la institución ${institution.name}`);
        setCareers([]);
        setSubjects([]);
        setSchedules([]);
      }

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || institutionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Mostrar error si el supervisor no tiene institución asignada
  if (!institution) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <IconAlertCircle className="w-6 h-6 text-red-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Institución no asignada</h3>
              <p className="text-red-700">
                No tienes una institución asignada. Por favor, contacta al administrador para que te asigne a una institución.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard de Supervisión</h1>
        <p className="text-gray-600">
          Monitorea estudiantes, carreras, materias y cronogramas de {institution.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Estudiantes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{students.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <IconUserGroup className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Carreras</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{careers.length}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <IconBookOpen className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Materias</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{subjects.length}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <IconChartBar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cronogramas</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{schedules.length}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <IconCalendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('students')}
              className={`${
                activeTab === 'students'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Estudiantes
            </button>
            <button
              onClick={() => setActiveTab('careers')}
              className={`${
                activeTab === 'careers'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Carreras
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`${
                activeTab === 'subjects'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Materias
            </button>
            <button
              onClick={() => setActiveTab('schedules')}
              className={`${
                activeTab === 'schedules'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Cronogramas
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'students' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Lista de Estudiantes</h3>
              {students.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay estudiantes registrados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Registro</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {students.map((student) => (
                        <tr key={student.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {student.first_name} {student.last_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{student.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {student.enrollment_date 
                              ? new Date(student.enrollment_date).toLocaleDateString('es-ES')
                              : '-'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'careers' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Carreras Disponibles</h3>
              {careers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay carreras activas en esta institución</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {careers.map((career) => (
                    <div key={career.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <h4 className="font-semibold text-gray-900 mb-2">{career.name}</h4>
                      {career.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{career.description}</p>
                      )}
                      <div className="flex items-center text-sm text-gray-500">
                        <IconUserGroup className="w-4 h-4 mr-2" />
                        <span>{career.total_students} estudiante{career.total_students !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'subjects' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Materias por Carrera</h3>
              {subjects.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay materias en las carreras de esta institución</p>
              ) : (
                <div className="space-y-4">
                  {careers.map((career) => {
                    const careerSubjects = subjects.filter(s => s.career_id === career.id);
                    if (careerSubjects.length === 0) return null;
                    
                    return (
                      <div key={career.id} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">{career.name}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {careerSubjects.map((subject) => (
                            <div key={subject.id} className="bg-gray-50 rounded p-3">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-gray-900">{subject.name}</span>
                                {subject.code && (
                                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                                    {subject.code}
                                  </span>
                                )}
                              </div>
                              {subject.semester && (
                                <p className="text-xs text-gray-600">Semestre: {subject.semester}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'schedules' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Cronogramas y Horarios</h3>
              {schedules.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay cronogramas definidos para los cursos activos</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Materia</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Docente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Día</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horario</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aula</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {schedules.map((schedule) => (
                        <tr key={schedule.id}>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                            {schedule.subject_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            {schedule.teacher_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            {schedule.day_of_week}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            {schedule.start_time !== 'N/A' && schedule.end_time !== 'N/A' 
                              ? `${schedule.start_time} - ${schedule.end_time}`
                              : schedule.start_time
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            {schedule.classroom || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupervisorDashboard;

