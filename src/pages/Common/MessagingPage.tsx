// pages/MessagingPage.tsx
// Página principal de mensajería

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { messagingService, Conversation } from '@/services/messagingService';
import { courseService, Course } from '@/services/teacherCourses';
import { studentService } from '@/services/studentService';
import Card from '@/components/Common/Card';
import ChatWindow from '@/components/Features/ChatWindow';
import Button from '@/components/Common/Button';
import { IconPhone, IconVideoCamera, IconArrowLeft, IconSearch, IconX, IconMenu, IconMessage } from '@/components/Common/Icons';

const MessagingPage: React.FC = () => {
  const { user } = useAuth();

  // Derived state for role checks (case insensitive)
  // Derived state for role checks (case insensitive)
  const userRole = user?.role?.name?.toLowerCase();
  const isAdminLike = ['admin', 'admin-campus', 'coordinator', 'supervisor'].includes(userRole || '');
  const isTeacher = userRole === 'teacher';
  const isTeacherOrAdmin = isTeacher || isAdminLike;
  const isStudent = userRole === 'student';
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (user?.id) {
      loadConversations();
      loadCourses();

      // Cargar usuarios disponibles para estudiantes
      // Cargar usuarios disponibles para estudiantes
      if (isStudent) {
        loadAvailableUsers();
      }

      // Suscribirse a nuevas conversaciones y actualizaciones en tiempo real
      messagingService.subscribeToConversations((conversation) => {
        setConversations((prev) => {
          const index = prev.findIndex(c => c.id === conversation.id);
          if (index >= 0) {
            // Actualizar conversación existente
            const updated = [...prev];
            updated[index] = conversation;
            return updated.sort((a, b) =>
              new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
            );
          } else {
            // Agregar nueva conversación
            return [conversation, ...prev].sort((a, b) =>
              new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
            );
          }
        });
      }).then((subscription) => {
        if (subscription) {
          subscriptionRef.current = subscription;
        }
      }).catch((error) => {
        console.error('Error subscribing to conversations:', error);
      });

      return () => {
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
        }
      };
    }
  }, [user?.id, user?.role?.name]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await messagingService.getMyConversations(user?.institution_id);
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      if (isAdminLike) {
        // Admins see all courses
        const data = await courseService.getAllCourses();
        setCourses(data);
      } else if (isTeacher) {
        // Teachers see only their courses
        const data = await courseService.getMyCourses(user.id);
        setCourses(data);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadAvailableUsers = async (courseId?: number) => {
    try {
      setLoadingUsers(true);
      const { supabase } = await import('@/lib/supabase');

      if (isTeacherOrAdmin) {
        // Para docentes, mostrar estudiantes de sus cursos
        if (courseId) {
          const { data: enrollments } = await supabase
            .from('course_enrollments')
            .select('student_id')
            .eq('course_id', courseId)
            .eq('status', 'active');

          if (enrollments && enrollments.length > 0) {
            const studentIds = enrollments.map(e => e.student_id);
            const { data: students } = await supabase
              .from('users')
              .select(`
                id,
                first_name,
                last_name,
                email,
                avatar_url,
                role_id,
                roles(id, name)
              `)
              .in('id', studentIds);
            // .eq('role_id', 1); // Removed strict check to rely on enrollment

            setAvailableUsers(
              (students || []).map(s => ({
                ...s,
                role: s.roles
              }))
            );
          } else {
            setAvailableUsers([]);
          }
        } else {
          setAvailableUsers([]);
        }
      } else if (isStudent) {
        // Para estudiantes, mostrar docentes y compañeros de sus cursos
        console.log('🔍 Buscando usuarios para estudiante:', user.id);

        const { data: enrollments, error: enrollError } = await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('student_id', user.id)
          .eq('status', 'active');

        if (enrollError) console.error('❌ Error fetching enrollments:', enrollError);
        console.log('📚 Inscripciones encontradas:', enrollments);

        if (enrollments && enrollments.length > 0) {
          const courseIds = enrollments.map(e => e.course_id);
          console.log('🎓 IDs de cursos:', courseIds);

          // 1. Obtener docentes de los cursos
          const { data: courses, error: coursesError } = await supabase
            .from('courses')
            .select('id, title, teacher_id')
            .in('id', courseIds);

          if (coursesError) console.error('❌ Error fetching courses:', coursesError);
          console.log('🏫 Cursos encontrados:', courses);

          const teacherIds = courses ? [...new Set(courses.map(c => c.teacher_id).filter(id => id))] : [];
          console.log('👨‍🏫 IDs de docentes:', teacherIds);

          // 2. Obtener compañeros de clase (otros estudiantes en los mismos cursos)
          const { data: classmatesEnrollments, error: classmatesError } = await supabase
            .from('course_enrollments')
            .select('student_id')
            .in('course_id', courseIds)
            .neq('student_id', user.id) // Excluir al usuario actual
            .eq('status', 'active');

          if (classmatesError) console.error('❌ Error fetching classmates:', classmatesError);

          const classmateIds = classmatesEnrollments ? [...new Set(classmatesEnrollments.map(e => e.student_id))] : [];
          console.log('👥 IDs de compañeros:', classmateIds);

          // Combinar IDs de docentes y compañeros
          const allUserIds = [...new Set([...teacherIds, ...classmateIds])];
          console.log('🔢 Total IDs de usuarios a buscar:', allUserIds);

          if (allUserIds.length > 0) {
            // Use service to fetch users (handles RLS bypass via RPC if available)
            const users = await messagingService.getBasicUsersInfo(allUserIds);

            console.log('✅ Usuarios encontrados (detalles service):', users);

            const usersMap = new Map();
            (users || []).forEach(u => {
              usersMap.set(u.id, {
                ...u,
                // Ensure role structure - service provides standardized 'role' property
                role: u.role || u.roles || { name: 'Unknown' }
              });
            });

            // Ordenar: primero docentes, luego estudiantes
            const sortedUsers = Array.from(usersMap.values()).sort((a, b) => {
              const roleA = a.role?.name?.toLowerCase() === 'student' ? 1 : 0;
              const roleB = b.role?.name?.toLowerCase() === 'student' ? 1 : 0;
              return roleA - roleB;
            });

            setAvailableUsers(sortedUsers);
          } else {
            console.warn('⚠️ No se encontraron usuarios (docentes ni compañeros)');
            setAvailableUsers([]);
          }
        } else {
          console.warn('⚠️ El estudiante no tiene inscripciones activas');
          setAvailableUsers([]);
        }
      }
    } catch (error) {
      console.error('Error loading available users:', error);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleStartConversation = async () => {
    if (!selectedUserId || !user?.id) return;

    try {
      const conversation = await messagingService.getOrCreateConversation(
        user.id,
        selectedUserId,
        selectedCourseId || undefined,
        user?.institution_id
      );

      const fullConversation = await messagingService.getConversation(conversation.id);
      setSelectedConversation(fullConversation);
      setShowNewChatModal(false);
      setSelectedUserId(null);
      setSelectedCourseId(null);
      loadConversations();
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (minutes < 1440) return `Hace ${Math.floor(minutes / 60)}h`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mensajería</h1>
            <p className="text-gray-600 mt-1">Comunícate con estudiantes y docentes</p>
          </div>
          <Button onClick={() => setShowNewChatModal(true)}>
            <IconMessage className="w-5 h-5 mr-2" />
            Nueva Conversación
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Lista de conversaciones */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col p-0 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Conversaciones</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <IconMessage className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No tienes conversaciones</p>
                  <Button
                    onClick={() => setShowNewChatModal(true)}
                    className="mt-4"
                    size="sm"
                  >
                    Iniciar conversación
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {conversations.map((conversation) => {
                    const otherUser = conversation.other_user;
                    const isSelected = selectedConversation?.id === conversation.id;
                    return (
                      <button
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          {otherUser?.avatar_url ? (
                            <img
                              src={otherUser.avatar_url}
                              alt={`${otherUser.first_name} ${otherUser.last_name}`}
                              className="w-12 h-12 rounded-full flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-primary font-semibold">
                                {otherUser?.first_name?.[0]}{otherUser?.last_name?.[0]}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {otherUser?.first_name} {otherUser?.last_name}
                              </h3>
                              {conversation.unread_count && conversation.unread_count > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                                  {conversation.unread_count}
                                </span>
                              )}
                            </div>
                            {conversation.last_message && (
                              <p className="text-sm text-gray-600 truncate mt-1">
                                {conversation.last_message.content}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {formatTime(conversation.last_message_at)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Ventana de chat */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            <Card className="h-full p-0 overflow-hidden">
              <ChatWindow
                conversation={selectedConversation}
                onClose={() => setSelectedConversation(null)}
              />
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center bg-gray-50/50">
              <div className="text-center p-8">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  ¡Hola, {user?.first_name}! 👋
                </h3>
                <p className="text-gray-600 max-w-sm mx-auto">
                  Selecciona una conversación de la lista o inicia un nuevo chat para comunicarte con tus compañeros y docentes.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Modal para nueva conversación */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Nueva Conversación</h3>

            {isTeacherOrAdmin && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Curso
                </label>
                <select
                  value={selectedCourseId || ''}
                  onChange={(e) => {
                    const courseId = e.target.value ? parseInt(e.target.value) : null;
                    setSelectedCourseId(courseId);
                    loadAvailableUsers(courseId || undefined);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecciona un curso</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isStudent && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Se mostrarán los docentes y compañeros de tus cursos activos
                </p>
                <Button
                  onClick={() => loadAvailableUsers()}
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  disabled={loadingUsers}
                >
                  {loadingUsers ? 'Cargando...' : 'Recargar Lista'}
                </Button>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isStudent ? 'Seleccionar Destinatario' : 'Estudiante'}
              </label>

              {loadingUsers ? (
                <div className="flex items-center justify-center py-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm text-gray-600">Buscando usuarios...</span>
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                  <p className="text-sm text-gray-500">
                    {selectedCourseId
                      ? 'No hay usuarios disponibles en este curso'
                      : (isTeacherOrAdmin
                        ? 'Selecciona un curso para ver estudiantes'
                        : 'No se encontraron usuarios disponibles')}
                  </p>
                </div>
              ) : (
                <select
                  value={selectedUserId || ''}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecciona un usuario</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.role?.name?.toLowerCase() === 'student' ? 'Estudiante' : 'Docente'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleStartConversation}
                disabled={!selectedUserId || loadingUsers}
                className="flex-1"
              >
                Iniciar Conversación
              </Button>
              <Button
                onClick={() => {
                  setShowNewChatModal(false);
                  setSelectedUserId(null);
                  setSelectedCourseId(null);
                  setAvailableUsers([]);
                }}
                variant="secondary"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagingPage;
