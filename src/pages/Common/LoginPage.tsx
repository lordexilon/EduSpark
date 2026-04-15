
import React, { useState } from 'react';
import LoginForm from "@/components/Auth/LoginForm";
import RegisterForm from "@/components/Auth/RegisterForm";
import { BookOpen, Users, GraduationCap, Sparkles } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  const handleSuccess = () => {
    // La redirección se maneja automáticamente en App.tsx
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Panel izquierdo - Información */}
        <div className="hidden lg:block">
          <div className="max-w-md">
            <div className="flex items-center space-x-3 mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  EduSpark
                </h1>
                <p className="text-gray-600 text-lg">Plataforma educativa inteligente</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-lg">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Aprendizaje Inteligente</h3>
                  <p className="text-gray-600">Accede a contenido educativo personalizado y herramientas de aprendizaje avanzadas.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-purple-100 dark:bg-purple-900/40 p-3 rounded-lg">
                  <GraduationCap className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Tutor Virtual IA</h3>
                  <p className="text-gray-600">Chatea con nuestro asistente inteligente que responde dudas basándose en el contenido del curso.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-green-100 dark:bg-green-900/40 p-3 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Comunidad Educativa</h3>
                  <p className="text-gray-600">Conecta con estudiantes, docentes y administradores en una plataforma unificada.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-white/20 dark:border-slate-700/50">
              <p className="text-gray-600 text-sm">
                "EduSpark revoluciona la educación combinando inteligencia artificial con pedagogía moderna para crear experiencias de aprendizaje únicas."
              </p>
            </div>
          </div>
        </div>

        {/* Panel derecho - Formularios */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          {/* Logo móvil */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                EduSpark
              </h1>
            </div>
            <p className="text-gray-600">Plataforma educativa inteligente</p>
          </div>

          {/* Formularios */}
          {isLogin ? (
            <LoginForm
              onSuccess={handleSuccess}
              onSwitchToRegister={() => setIsLogin(false)}
            />
          ) : (
            <RegisterForm
              onSuccess={handleSuccess}
              onSwitchToLogin={() => setIsLogin(true)}
            />
          )}

          {/* Información adicional */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              ¿Necesitas ayuda?{' '}
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                Contacta soporte
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;