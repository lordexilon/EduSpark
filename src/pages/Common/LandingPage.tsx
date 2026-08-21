import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  IconBrain,
  IconUsers,
  IconChartBar,
  IconSparkles,
  IconArrowRight,
  IconGlobe,
  IconTrendingUp,
  IconBuilding,
  IconBookOpen,
} from '@/components/Common/Icons';
import { institutionService, Institution } from '@/services/institutionService';

const LandingPage: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);

  useEffect(() => {
    const loadInstitutions = async () => {
      try {
        const data = await institutionService.getAllInstitutions();
        setInstitutions(data);
      } catch (error) {
        console.error('Error loading institutions:', error);
      } finally {
        setLoadingInstitutions(false);
      }
    };
    loadInstitutions();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link to="/" className="flex items-center space-x-3 group">
              {/* Logo Option: Brain/AI Icon */}
              <div className="w-10 h-10 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                <IconBrain className="w-10 h-10 text-blue-600 drop-shadow-md" />
              </div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-purple-600">
                EduSpark AI
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/login"
                className="bg-blue-600 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 shadow-md shadow-blue-600/20"
              >
                Comenzar
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-sm font-semibold tracking-wide uppercase animate-fade-in-up">
            Revolucionando la Educación
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-8 leading-tight">
            Personalizando el futuro <br className="hidden sm:block" />
            de la educación con{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-300% animate-gradient">
              IA y <br className="hidden sm:block" /> Neurociencias
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            Nuestra misión es cerrar la brecha en la educación tradicional ofreciendo rutas de
            aprendizaje personalizadas impulsadas por neurociencia e Inteligencia Artificial.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/login"
              className="bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/30 flex items-center hover:-translate-y-1"
            >
              Probar Gratis
              <IconArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <button className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all shadow-sm hover:shadow-md hover:-translate-y-1">
              Ver Demo
            </button>
          </div>
        </div>

        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl -z-10 pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-purple-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
          <div className="absolute top-40 right-10 w-96 h-96 bg-blue-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-pink-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
        </div>
      </section>

      {/* El Problema Section */}
      <section className="py-24 bg-white dark:bg-gray-950 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">El Problema</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Educación uniforme y alta carga administrativa para docentes en Paraguay. Un sistema
              desactualizado que no se adapta a las necesidades individuales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Item 1 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-all duration-300 shadow-sm">
                <IconUsers className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Educación uniforme
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Educación uniforme con la misma carga para maestros y docentes en Paraguay.
              </p>
            </div>
            {/* Item 2 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-20 h-20 bg-purple-50 dark:bg-purple-900/30 rounded-3xl flex items-center justify-center mb-6 text-purple-600 dark:text-purple-400 group-hover:scale-110 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-all duration-300 shadow-sm">
                <IconChartBar className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Analítica Predictiva
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Identificación temprana de riesgos y adaptación a necesidades constantes.
              </p>
            </div>
            {/* Item 3 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-20 h-20 bg-cyan-50 dark:bg-cyan-900/30 rounded-3xl flex items-center justify-center mb-6 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/50 transition-all duration-300 shadow-sm">
                <IconSparkles className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Adaptabilidad
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Evolución del perfil cognitivo interactiva con tutor virtual inteligente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* La Solución Section */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="lg:w-1/2 space-y-8">
              <div>
                <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight block">
                  La Solución:
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    La Magia de EduSpark
                  </span>
                </h2>
              </div>

              <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                Una plataforma diseñada con estándares de alta calidad, enfocada en ofrecer una
                solución integral para el aprendizaje personalizado mediante tecnología de
                vanguardia.
              </p>

              <div className="space-y-6">
                <div className="flex gap-5 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-shrink-0 w-14 h-14 bg-blue-100 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <IconBrain className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Aprendizaje personalizado
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Rutas de aprendizaje adaptativas asistidas por IA basadas en perfiles
                      neurológicos para las necesidades individuales.
                    </p>
                  </div>
                </div>
                <div className="flex gap-5 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-shrink-0 w-14 h-14 bg-purple-100 dark:bg-purple-900/40 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <IconGlobe className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Contenido bilingüe
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Contenido bilingüe integral accesible tanto en español como en inglés.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 w-full">
              <div className="relative rounded-2xl shadow-2xl bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 transform hover:scale-[1.02] transition-transform duration-500">
                <div className="bg-gray-900 rounded-xl aspect-video flex items-center justify-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-gray-900 opacity-95"></div>

                  {/* Dashboard Graphic Mockup */}
                  <div className="absolute inset-4 border border-gray-700/50 rounded-lg flex flex-col gap-4 p-4">
                    {/* Header */}
                    <div className="h-8 w-full border-b border-gray-700 flex justify-between items-center px-2">
                      <div className="w-24 h-3 bg-gray-700 rounded-full"></div>
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20"></div>
                        <div className="w-6 h-6 rounded-full bg-purple-500/20"></div>
                      </div>
                    </div>
                    {/* Body */}
                    <div className="flex-1 flex gap-4">
                      {/* Sidebar */}
                      <div className="w-16 h-full border-r border-gray-700 hidden sm:flex flex-col gap-3 py-2 items-center">
                        <div className="w-8 h-8 rounded-lg bg-gray-700/50"></div>
                        <div className="w-8 h-8 rounded-lg bg-gray-700/50"></div>
                        <div className="w-8 h-8 rounded-lg bg-gray-700/50"></div>
                      </div>
                      {/* Content */}
                      <div className="flex-1 flex items-center justify-center relative">
                        {/* Brain Pulse */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-32 h-32 bg-blue-500/20 rounded-full animate-pulse filter blur-xl"></div>
                        </div>
                        <IconBrain className="w-32 h-32 text-white relative z-10 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />

                        {/* Floating Cards */}
                        <div className="absolute top-0 right-0 p-3 bg-gray-800/90 backdrop-blur rounded-lg border border-gray-600 shadow-xl animate-float">
                          <div className="w-20 h-2 bg-gray-500 rounded mb-2"></div>
                          <div className="w-12 h-2 bg-blue-500 rounded"></div>
                        </div>

                        <div className="absolute bottom-0 left-0 p-3 bg-gray-800/90 backdrop-blur rounded-lg border border-gray-600 shadow-xl animate-float animation-delay-2000">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center text-[10px] text-green-400">
                              ✓
                            </div>
                            <div className="w-16 h-2 bg-gray-500 rounded"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Laptop Base */}
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-[120%] h-5 bg-gray-200 dark:bg-gray-700 rounded-b-xl shadow-xl -z-10"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Innovación y Características Section */}
      <section className="py-24 bg-gradient-to-br from-blue-700 via-indigo-800 to-purple-900 text-white relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-blue-500 rounded-full mix-blend-screen filter blur-[128px] opacity-20 -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-purple-500 rounded-full mix-blend-screen filter blur-[128px] opacity-20 translate-x-1/2 translate-y-1/2"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 tracking-tight">
              Innovación y Características
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto font-light">
              Conoce la más avanzada tecnología educativa explicada en simples conceptos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="group bg-white/5 backdrop-blur-xl border border-white/10 p-1 rounded-3xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1">
              <div className="p-8 h-full flex flex-col items-center text-center">
                <div className="w-full aspect-video bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-2xl mb-8 flex items-center justify-center border border-white/10 relative overflow-hidden shadow-inner group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all">
                  <div className="absolute inset-0 bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors"></div>
                  <IconBrain className="w-20 h-20 text-blue-300 drop-shadow-[0_0_20px_rgba(147,197,253,0.6)]" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">IA Generativa</h3>
                <p className="text-gray-300 leading-relaxed">
                  Creación automática de recursos y personalización dinámica para nuestra
                  plataforma.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="group bg-white/5 backdrop-blur-xl border border-white/10 p-1 rounded-3xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1">
              <div className="p-8 h-full flex flex-col items-center text-center">
                <div className="w-full aspect-video bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl mb-8 flex items-center justify-center border border-white/10 relative overflow-hidden shadow-inner group-hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all">
                  <div className="absolute inset-0 bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors"></div>
                  <IconChartBar className="w-20 h-20 text-purple-300 drop-shadow-[0_0_20px_rgba(216,180,254,0.6)]" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">Analítica Predictiva</h3>
                <p className="text-gray-300 leading-relaxed">
                  Identificación temprana de riesgos y acompañamiento a través de recomendaciones
                  predictivas.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="group bg-white/5 backdrop-blur-xl border border-white/10 p-1 rounded-3xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1">
              <div className="p-8 h-full flex flex-col items-center text-center">
                <div className="w-full aspect-video bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl mb-8 flex items-center justify-center border border-white/10 relative overflow-hidden shadow-inner group-hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all">
                  <div className="absolute inset-0 bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors"></div>
                  <IconSparkles className="w-20 h-20 text-cyan-300 drop-shadow-[0_0_20px_rgba(103,232,249,0.6)]" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">Adaptabilidad</h3>
                <p className="text-gray-300 leading-relaxed">
                  Evolución del perfil cognitivo y adaptación de temas con un tutor tecnológico
                  avanzado.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modelo de Negocio Section */}
      <section className="py-24 bg-white dark:bg-gray-950 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Modelo de Negocio
            </h2>
            <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* B2B */}
            <div className="bg-gradient-to-b from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900 rounded-2xl p-8 border border-blue-100 dark:border-blue-800/50 hover:shadow-xl transition-all duration-300 group hover:-translate-y-1">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <IconBuilding className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                B2B (Escuelas)
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Venta de licencias de software anuales de suscripción para instituciones educativas.
              </p>
            </div>
            {/* B2G */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 hover:border-purple-100 dark:hover:border-purple-800">
              <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/40 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <IconGlobe className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                B2G (Sector Público)
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Grandes licencias institucionales para entidades gubernamentales y educación
                pública.
              </p>
            </div>
            {/* B2C */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 hover:border-green-100 dark:hover:border-green-800">
              <div className="w-14 h-14 bg-green-50 dark:bg-green-900/40 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors">
                <IconUsers className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">B2C (Padres)</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Venta directa a representantes para el refuerzo escolar y autogestión del
                aprendizaje.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Impacto Social Section */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Impacto Social
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 font-light">
              El impacto esperado en el ecosistema educativo de Paraguay.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl flex items-center gap-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="flex-shrink-0 w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                <IconBookOpen className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Alfabetización
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Mejora promovida del 50% en habilidades visuales y de lectura.
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl flex items-center gap-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="flex-shrink-0 w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                <IconTrendingUp className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Mejora Lógica
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Incremento del 20% en lógica matemática y habilidades remediables.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="flex items-center space-x-2 mb-6 group">
                <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30 group-hover:bg-blue-600/30 transition-colors">
                  <IconBrain className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-2xl font-bold tracking-tight">EduSpark-AI</span>
              </Link>
              <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-sm">
                Plataforma Elearning con Inteligencia Artificial pensada en instituciones, docentes
                y estudiantes que necesitan una retroalimentación dinámica para alcanzar con mayor
                eficiencia las metas académicas.
              </p>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-900/30 border border-blue-800 text-blue-300 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-400 mr-2 animate-pulse"></span>
                MVP en etapa de validación
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-6 text-white tracking-wide">Enlaces</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    to="/login"
                    className="text-gray-400 hover:text-white hover:translate-x-1 transition-all inline-block"
                  >
                    Iniciar Sesión
                  </Link>
                </li>
                <li>
                  <Link
                    to="/register"
                    className="text-gray-400 hover:text-white hover:translate-x-1 transition-all inline-block"
                  >
                    Regístrate
                  </Link>
                </li>
                <li>
                  <Link
                    to="/privacy"
                    className="text-gray-400 hover:text-white hover:translate-x-1 transition-all inline-block"
                  >
                    Política de Privacidad
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="text-gray-400 hover:text-white hover:translate-x-1 transition-all inline-block"
                  >
                    Términos y Condiciones
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-6 text-white tracking-wide">Contacto</h3>
              <ul className="space-y-4 text-sm text-gray-400">
                <li className="flex items-center">
                  <span className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center mr-3 text-gray-500">
                    @
                  </span>
                  <a
                    href="mailto:albertovillalba@gmail.com"
                    className="hover:text-white transition-colors"
                  >
                    albertovillalba@gmail.com
                  </a>
                </li>
                <li className="flex items-center">
                  <span className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center mr-3 text-gray-500">
                    #
                  </span>
                  <a href="tel:+595981226970" className="hover:text-white transition-colors">
                    +595 981 226970
                  </a>
                </li>
                <li className="flex items-center">
                  <span className="w-6 h-6 rounded-full bg-green-900/30 flex items-center justify-center mr-3 text-green-500">
                    •
                  </span>
                  Soporte 24/7
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-16 pt-8 text-center text-gray-500 text-sm">
            <p>&copy; 2025 EduSpark-AI. Todos los derechos reservados.</p>
            <p className="mt-2">
              Desarrollado por{' '}
              <a
                href="https://applicandola.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
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
