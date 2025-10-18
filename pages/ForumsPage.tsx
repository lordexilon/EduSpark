
import React from 'react';
import Card from '../components/Card.tsx';
import Button from '../components/Button.tsx';
import { IconChatAlt2, IconPlusCircle } from '../components/Icons.tsx';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.tsx'; // For role-based display (future)

const ForumsPage: React.FC = () => {
  const { user } = useAuth(); // For role-based display (future)
  const forumTopics = [
    { id: 'forum1', title: 'Discusión: Dilemas Éticos en IA (Clase 9)', replies: 15, lastPost: 'hace 2h' },
    { id: 'forum2', title: 'Preguntas sobre el Examen Parcial (Clase 5)', replies: 8, lastPost: 'hace 1d' },
    { id: 'forum3', title: 'Debate: Privacidad de Datos en el Teletrabajo (Clase 4)', replies: 22, lastPost: 'hace 5h' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Foros de Discusión</h1>
        <div>
            {/* Placeholder for ABM: Add New Topic Button */}
            <Button variant="primary" leftIcon={<IconPlusCircle className="w-5 h-5"/>} onClick={() => alert('Funcionalidad para crear nuevo tema (próximamente).')}>
              Crear Nuevo Tema
            </Button>
        </div>
      </div>
      
      {forumTopics.length > 0 ? (
        <div className="space-y-4">
          {forumTopics.map(topic => (
            <Link to={`/forum/${topic.id}`} key={topic.id}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center mb-1">
                      <IconChatAlt2 className="w-5 h-5 text-sky-600 mr-2" />
                      <h2 className="text-lg font-semibold text-slate-700">{topic.title}</h2>
                    </div>
                    <p className="text-xs text-slate-500">{topic.replies} respuestas · Última publicación {topic.lastPost}</p>
                  </div>
                  <button className="text-sm bg-sky-100 text-sky-700 px-3 py-1 rounded-full hover:bg-sky-200 transition-colors">
                    Ver Tema
                  </button>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-slate-600 text-center py-4">No hay temas en el foro aún.</p>
        </Card>
       )}
    </div>
  );
};

export default ForumsPage;