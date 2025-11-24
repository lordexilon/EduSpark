import React from 'react';
import { Link } from 'react-router-dom';
import { IconSparkles, IconArrowLeft } from '../components/Icons';

const PrivacyPage: React.FC = () => {
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
              <Link to="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium inline-flex items-center">
                <IconArrowLeft className="w-4 h-4 mr-2" />
                Volver al inicio
              </Link>
              <Link to="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Iniciar Sesión
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <section className="py-12 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Política de Privacidad
            </h1>
            <p className="text-gray-600 mb-8">
              Última actualización: 13 de noviembre de 2025
            </p>

            {/* Advertencia Legal */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8 rounded-r-lg">
              <h2 className="text-xl font-bold text-yellow-800 mb-3">
                ADVERTENCIA LEGAL
              </h2>
              <p className="text-yellow-900 mb-2">
                <strong>No soy abogado. Soy una IA.</strong> Esto que te preparo es un borrador mínimo viable basado en los principios de las leyes paraguayas (como la Ley Nº 1.883/02 y la Nº 6.534/20).
              </p>
              <p className="text-yellow-900 font-semibold">
                NO USES ESTO TAL CUAL. Debes llevarle este documento a un abogado o estudio jurídico en Paraguay para que lo revise, adapte a tu modelo de negocio exacto (especialmente por el tema de la IA) y lo valide legalmente. En serio.
              </p>
            </div>

            <div className="prose prose-lg max-w-none">
              <p className="text-gray-700 mb-8">
                Bienvenido a EduSpark-AI. Tu privacidad es fundamental para nosotros. Esta política explica qué datos recopilamos, por qué los usamos y cómo los protegemos, en cumplimiento con la legislación de la República del Paraguay.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                1. Responsable de los Datos
              </h2>
              <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                <li><strong>Nombre del Responsable:</strong> [Nombre de tu empresa o tu nombre completo si eres unipersonal]</li>
                <li><strong>RUC:</strong> [Tu RUC]</li>
                <li><strong>Domicilio:</strong> [Tu domicilio legal en Paraguay]</li>
                <li><strong>Email de Contacto:</strong> <a href="mailto:albertovillalba@gmail.com" className="text-blue-600 hover:underline">albertovillalba@gmail.com</a> (para consultas de privacidad)</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                2. ¿Qué Información Recopilamos?
              </h2>
              <p className="text-gray-700 mb-4">
                No coleccionamos datos por deporte. Solo pedimos lo necesario para que la plataforma funcione y te brinde la experiencia personalizada que prometemos.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                Información que nos das directamente:
              </h3>
              <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                <li><strong>Datos de Identificación:</strong> Nombre, apellido, dirección de correo electrónico.</li>
                <li><strong>Datos de la Institución:</strong> Nombre del colegio o universidad, rol (docente o estudiante).</li>
                <li><strong>Credenciales de Acceso:</strong> Contraseña (siempre la almacenamos encriptada, ni nosotros podemos verla).</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                Información que generas al usar EduSpark-AI:
              </h3>
              <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                <li><strong>Datos Académicos y de Progreso:</strong> Tus respuestas a exámenes, tareas, cursos completados, tiempo en las lecciones.</li>
                <li><strong>Datos de Interacción con la IA:</strong> Las preguntas que haces, las respuestas que te da la IA y la "retroalimentación dinámica" que se genera. Esto es clave para personalizar tu aprendizaje.</li>
                <li><strong>Datos Técnicos (Cookies básicas):</strong> Información sobre tu navegador, dirección IP y tipo de dispositivo, solo para asegurar que la plataforma funcione bien y sea segura.</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                3. ¿Para Qué Usamos tu Información?
              </h2>
              <p className="text-gray-700 mb-4">
                Usamos tus datos con propósitos claros y definidos:
              </p>
              <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                <li><strong>Para Prestar el Servicio:</strong> Para crear tu cuenta, darte acceso a los cursos y permitir que los docentes vean el progreso de sus alumnos.</li>
                <li><strong>Para la Personalización (El corazón de EduSpark-AI):</strong> Para que nuestra Inteligencia Artificial analice tu progreso y te ofrezca esa "retroalimentación dinámica". Sin tus datos de progreso, la IA no puede ayudarte a mejorar.</li>
                <li><strong>Para Comunicación:</strong> Para enviarte notificaciones importantes sobre tu cuenta o cambios en los cursos (no spam de marketing, a menos que lo pidas).</li>
                <li><strong>Para Seguridad y Mejora:</strong> Para detectar problemas técnicos, prevenir fraudes y entender cómo se usa la plataforma para mejorarla.</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                4. ¿Con Quién Compartimos tus Datos?
              </h2>
              <p className="text-gray-700 mb-4 font-semibold">
                La regla es simple: no vendemos tus datos personales a nadie.
              </p>
              <p className="text-gray-700 mb-4">
                Solo compartimos información en casos muy específicos:
              </p>
              <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                <li><strong>Dentro de tu Institución:</strong> Los docentes pueden ver el progreso de los estudiantes que tienen a su cargo. Los administradores de la institución pueden ver los datos de sus docentes y alumnos.</li>
                <li><strong>Con Proveedores de Servicios (Nuestros "plomeros" digitales):</strong> Usamos servicios de terceros para cosas como el hosting de la plataforma (ej. servidores en la nube) o envío de emails. Estos proveedores están obligados por contrato a proteger tus datos y solo pueden usarlos para la tarea que les pedimos.</li>
                <li><strong>Por Obligación Legal:</strong> Si un juez en Paraguay nos lo ordena con una orden judicial válida, en el marco de una investigación.</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                5. ¿Cómo Protegemos tu Información?
              </h2>
              <p className="text-gray-700 mb-6">
                Tomamos medidas de seguridad técnicas y organizativas razonables para proteger tus datos contra acceso no autorizado, alteración o destrucción. Esto incluye el uso de encriptación (SSL) y controles de acceso estrictos.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                6. Tus Derechos (El Control es Tuyo)
              </h2>
              <p className="text-gray-700 mb-4">
                De acuerdo con la Ley Nº 1.883/02, tienes derecho a:
              </p>
              <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                <li><strong>Acceder:</strong> Saber qué datos tuyos tenemos.</li>
                <li><strong>Rectificar:</strong> Corregir tus datos si son incorrectos o están desactualizados.</li>
                <li><strong>Suprimir (Cancelar):</strong> Pedir que eliminemos tus datos de nuestras bases (siempre y cuando ya no sean necesarios para el fin que fueron recolectados o no tengamos una obligación legal de retenerlos).</li>
              </ul>
              <p className="text-gray-700 mb-6">
                Para ejercer estos derechos (conocidos como Habeas Data), puedes enviarnos un correo a <a href="mailto:albertovillalba@gmail.com" className="text-blue-600 hover:underline">albertovillalba@gmail.com</a> acreditando tu identidad.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                7. Cambios a esta Política
              </h2>
              <p className="text-gray-700 mb-6">
                Si hacemos cambios importantes a esta política, te avisaremos por email o con un aviso dentro de la plataforma.
              </p>

              <div className="mt-12 pt-8 border-t border-gray-200">
                <p className="text-gray-600 text-sm">
                  Si tienes preguntas sobre esta política de privacidad, puedes contactarnos en{' '}
                  <a href="mailto:albertovillalba@gmail.com" className="text-blue-600 hover:underline">
                    albertovillalba@gmail.com
                  </a>
                  {' '}o al teléfono{' '}
                  <a href="tel:+595981226970" className="text-blue-600 hover:underline">
                    +595 981 226970
                  </a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <IconSparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">EduSpark-AI</span>
            </div>
            <p className="text-gray-400 mb-4">
              Plataforma Elearning con Inteligencia Artificial pensada en instituciones, docentes y estudiantes que necesitan una retroalimentación dinámica para alcanzar con mayor eficiencia las metas académicas.
            </p>
            <p className="text-gray-500 text-sm mb-4">
              MVP en etapa de validación
            </p>
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
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPage;

