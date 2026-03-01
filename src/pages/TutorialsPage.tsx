/**
 * Página para gestionar y ver tutoriales interactivos
 * Permite al usuario ver tutoriales nuevamente o resetearlos
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import { 
  getCompletedTutorials, 
  resetTutorial, 
  type TutorialId 
} from '@/services/tutorialService';
import { tutorialConfigs } from '@/config/tutorialConfigs';
import { HelpCircle, Play, RotateCcw } from 'lucide-react';

export const TutorialsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [completedTutorials, setCompletedTutorials] = useState<TutorialId[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadCompletedTutorials();
    }
  }, [user?.id]);

  const loadCompletedTutorials = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const completed = await getCompletedTutorials(user.id);
      setCompletedTutorials(completed);
    } catch (error) {
      console.error('Error cargando tutoriales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetTutorial = async (tutorialId: TutorialId) => {
    if (!user?.id) return;

    try {
      setResetting(tutorialId);
      await resetTutorial(user.id, tutorialId);
      await loadCompletedTutorials();
      
      // Mostrar mensaje de éxito
      alert('Tutorial reseteado. Se mostrará la próxima vez que accedas a esa página.');
    } catch (error) {
      console.error('Error reseteando tutorial:', error);
      alert('Error al resetear el tutorial. Por favor, intenta de nuevo.');
    } finally {
      setResetting(null);
    }
  };

  const handleStartTutorial = async (tutorialId: TutorialId) => {
    if (!user?.id) return;

    // Resetear el tutorial primero para que se muestre automáticamente
    try {
      await resetTutorial(user.id, tutorialId);
      await loadCompletedTutorials();
    } catch (error) {
      console.error('Error reseteando tutorial:', error);
    }

    // Navegar a la página correspondiente y el tutorial se iniciará automáticamente
    if (tutorialId === 'course-view') {
      // Necesitamos ir a un curso específico, redirigir a la lista de cursos
      navigate('/my/courses');
    } else if (tutorialId === 'tutor-ai') {
      navigate('/tutor');
    } else {
      // Para otros tutoriales, navegar a la página principal
      navigate('/dashboard');
    }
  };

  const availableTutorials = Object.values(tutorialConfigs);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tutoriales Interactivos</h1>
          <p className="text-gray-600 mt-2">
            Aprende a usar todas las funcionalidades de EduSpark con nuestros tutoriales guiados
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {availableTutorials.map((tutorial) => {
          const isCompleted = completedTutorials.includes(tutorial.id);
          const isResetting = resetting === tutorial.id;

          return (
            <Card key={tutorial.id} className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <HelpCircle className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {tutorial.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {tutorial.description}
                  </p>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs text-gray-500">
                      {tutorial.steps.length} pasos
                    </span>
                    {isCompleted && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        ✓ Completado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      onClick={() => handleStartTutorial(tutorial.id)}
                      leftIcon={<Play className="w-4 h-4" />}
                      className="flex-1"
                    >
                      {isCompleted ? 'Ver Nuevamente' : 'Iniciar Tutorial'}
                    </Button>
                    {isCompleted && (
                      <Button
                        variant="secondary"
                        onClick={() => handleResetTutorial(tutorial.id)}
                        disabled={isResetting}
                        leftIcon={<RotateCcw className="w-4 h-4" />}
                        title="Resetear tutorial para que se muestre automáticamente"
                      >
                        {isResetting ? 'Reseteando...' : 'Resetear'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">¿Cómo funcionan los tutoriales?</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Los tutoriales se muestran automáticamente la primera vez que accedes a una página</li>
              <li>Puedes marcar "No volver a mostrar" al finalizar un tutorial</li>
              <li>Puedes ver cualquier tutorial nuevamente desde esta página</li>
              <li>Al resetear un tutorial, se mostrará automáticamente la próxima vez que accedas a esa página</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TutorialsPage;

