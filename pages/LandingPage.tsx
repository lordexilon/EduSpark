import React from 'react';
import { Link } from 'react-router-dom';
import { IconSparkles, IconGraduationCap, IconUsers, IconBookOpen, IconCheckCircle, IconArrowRight, IconStar } from '../components/Icons';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <IconSparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">EduSpark-AI</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Iniciar Sesión
              </Link>
              <Link to="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Comenzar
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              La educación del futuro
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                está aquí
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-4 max-w-3xl mx-auto">
              EduSpark-AI es la plataforma Elearning con Inteligencia Artificial pensada en instituciones, docentes y estudiantes que necesitan una retroalimentación dinámica para alcanzar con mayor eficiencia las metas académicas.
            </p>
            <p className="text-base text-gray-500 mb-8 max-w-3xl mx-auto">
              <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                MVP en etapa de validación
              </span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/login" className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center justify-center">
                Comenzar Gratis
                <IconArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <button className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors inline-flex items-center justify-center">
                Ver Demo
              </button>
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-32 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-32 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              ¿Por qué elegir EduSpark?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Nuestra plataforma revoluciona la educación con tecnología de vanguardia
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <IconGraduationCap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Tutor Virtual IA</h3>
              <p className="text-gray-600">
                Chatea con nuestro asistente inteligente que responde dudas basándose en el contenido del curso.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <IconBookOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aprendizaje Inteligente</h3>
              <p className="text-gray-600">
                Accede a contenido educativo personalizado y herramientas de aprendizaje avanzadas.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <IconUsers className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Comunidad Educativa</h3>
              <p className="text-gray-600">
                Conecta con estudiantes, docentes y administradores en una plataforma unificada.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-4xl font-bold mb-2">1000+</div>
              <div className="text-blue-100">Estudiantes Activos</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-blue-100">Cursos Disponibles</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">95%</div>
              <div className="text-blue-100">Satisfacción</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-blue-100">Soporte IA</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              ¿Cómo funciona?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comienza tu viaje educativo en solo 3 simples pasos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-xl font-bold">1</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Regístrate</h3>
              <p className="text-gray-600">Crea tu cuenta en minutos y accede a la plataforma</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-xl font-bold">2</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Explora Cursos</h3>
              <p className="text-gray-600">Descubre contenido educativo personalizado para ti</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-xl font-bold">3</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aprende con IA</h3>
              <p className="text-gray-600">Interactúa con nuestro tutor virtual inteligente</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Lo que dicen nuestros usuarios
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <IconStar key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-4">
                "EduSpark ha revolucionado mi forma de aprender. El tutor virtual es increíble y siempre está disponible."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  M
                </div>
                <div className="ml-3">
                  <div className="font-semibold text-gray-900">María García</div>
                  <div className="text-gray-500 text-sm">Estudiante</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <IconStar key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-4">
                "Como docente, EduSpark me permite crear contenido interactivo y monitorear el progreso de mis estudiantes."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                  C
                </div>
                <div className="ml-3">
                  <div className="font-semibold text-gray-900">Carlos López</div>
                  <div className="text-gray-500 text-sm">Docente</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <IconStar key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-4">
                "La interfaz es intuitiva y las herramientas de administración son muy completas. ¡Excelente plataforma!"
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  A
                </div>
                <div className="ml-3">
                  <div className="font-semibold text-gray-900">Ana Martínez</div>
                  <div className="text-gray-500 text-sm">Administradora</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            ¿Listo para transformar tu educación?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Únete a miles de estudiantes y docentes que ya están usando EduSpark
          </p>
          <Link to="/login" className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center">
            Comenzar Ahora
            <IconArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <IconSparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">EduSpark-AI</span>
              </div>
              <p className="text-gray-400 mb-4">
                Plataforma Elearning con Inteligencia Artificial pensada en instituciones, docentes y estudiantes que necesitan una retroalimentación dinámica para alcanzar con mayor eficiencia las metas académicas.
              </p>
              <p className="text-gray-500 text-sm">
                MVP en etapa de validación
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Enlaces</h3>
              <ul className="space-y-2">
                <li><Link to="/login" className="text-gray-400 hover:text-white">Iniciar Sesión</Link></li>
                <li><Link to="/login" className="text-gray-400 hover:text-white">Registrarse</Link></li>
                <li><Link to="/privacy" className="text-gray-400 hover:text-white">Política de Privacidad</Link></li>
                <li><Link to="/terms" className="text-gray-400 hover:text-white">Términos y Condiciones</Link></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Soporte</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Documentación</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Contacto</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="mailto:albertovillalba@gmail.com" className="hover:text-white">albertovillalba@gmail.com</a></li>
                <li><a href="tel:+595981226970" className="hover:text-white">+595 981 226970</a></li>
                <li>Soporte 24/7</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 EduSpark-AI. Todos los derechos reservados.</p>
            <p className="mt-2">
              Desarrollado por{' '}
              <a
                href="https://applicandola.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                ApplicandoLA
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
