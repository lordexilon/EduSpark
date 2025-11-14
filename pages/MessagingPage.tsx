// pages/MessagingPage.tsx
// Página principal de mensajería

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { messagingService, Conversation } from '../services/messagingService';
import { courseService, Course } from '../services/teacherCourses';
import { studentService } from '../services/studentService';
import Card from '../components/Card';
import ChatWindow from '../components/ChatWindow';
import Button from '../components/Button';
import { IconMessage, IconChatAlt2 } from '../components/Icons';

const MessagingPage: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
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
      if (user?.role?.name === 'student') {
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
  }, [user?.id]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await messagingService.getMyConversations();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      if (user?.role?.name === 'teacher' || user?.role?.name === 'admin') {
        const data = await courseService.getMyCourses(user.id);
        setCourses(data);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadAvailableUsers = async (courseId?: number) => {
    try {
      const { supabase } = await import('../lib/supabase');
      
      if (user?.role?.name === 'teacher' || user?.role?.name === 'admin') {
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
              .in('id', studentIds)
              .eq('role_id', 1); // Solo estudiantes

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
      } else if (user?.role?.name === 'student') {
        // Para estudiantes, mostrar docentes de sus cursos
        const { data: enrollments } = await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('student_id', user.id)
          .eq('status', 'active');

        if (enrollments && enrollments.length > 0) {
          const courseIds = enrollments.map(e => e.course_id);
          const { data: courses } = await supabase
            .from('courses')
            .select('teacher_id')
            .in('id', courseIds);

          if (courses && courses.length > 0) {
            const teacherIds = [...new Set(courses.map(c => c.teacher_id))];
            const { data: teachers } = await supabase
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
              .in('id', teacherIds)
              .in('role_id', [2, 3, 4]); // teacher, admin, coordinator

            const teachersMap = new Map();
            (teachers || []).forEach(t => {
              teachersMap.set(t.id, {
                ...t,
                role: t.roles
              });
            });
            setAvailableUsers(Array.from(teachersMap.values()));
          } else {
            setAvailableUsers([]);
          }
        } else {
          setAvailableUsers([]);
        }
      }
    } catch (error) {
      console.error('Error loading available users:', error);
      setAvailableUsers([]);
    }
  };

  const handleStartConversation = async () => {
    if (!selectedUserId || !user?.id) return;

    try {
      const conversation = await messagingService.getOrCreateConversation(
        user.id,
        selectedUserId,
        selectedCourseId || undefined
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
                  <IconChatAlt2 className="mx-auto h-12 w-12 text-gray-400" />
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
                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
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
            <Card className="h-full flex items-center justify-center">
              <div className="text-center">
                <IconChatAlt2 className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  Selecciona una conversación
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Elige una conversación de la lista o inicia una nueva
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Modal para nueva conversación */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Nueva Conversación</h3>
            
            {(user?.role?.name === 'teacher' || user?.role?.name === 'admin') && (
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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

            {user?.role?.name === 'student' && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Se mostrarán los docentes de tus cursos activos
                </p>
                <Button
                  onClick={() => loadAvailableUsers()}
                  variant="secondary"
                  size="sm"
                  className="w-full"
                >
                  Cargar Docentes
                </Button>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {user?.role?.name === 'student' ? 'Docente' : 'Estudiante'}
              </label>
              {availableUsers.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {selectedCourseId 
                    ? 'No hay usuarios disponibles en este curso'
                    : (user?.role?.name === 'teacher' 
                      ? 'Selecciona un curso para ver estudiantes'
                      : 'Cargando docentes...')}
                </p>
              ) : (
                <select
                  value={selectedUserId || ''}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Selecciona un usuario</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleStartConversation}
                disabled={!selectedUserId}
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

