import React from 'react';
import { Link } from 'react-router-dom';
import { IconSparkles, IconArrowLeft } from '../components/Icons';

const TermsPage: React.FC = () => {
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
              Términos y Condiciones de Uso
            </h1>
            <p className="text-gray-600 mb-8">
              Última actualización: 13 de noviembre de 2025
            </p>

            <div className="prose prose-lg max-w-none">
              <p className="text-gray-700 mb-8">
                Bienvenido a EduSpark-AI (la "Plataforma"). Estos son los Términos y Condiciones ("Términos") que rigen el uso de nuestro servicio. Al crear una cuenta, hacer clic en "Aceptar" o simplemente usar la Plataforma, usted ("Usted" o el "Usuario") acepta estar legalmente obligado por estos Términos y nuestra{' '}
                <Link to="/privacy" className="text-blue-600 hover:underline">
                  Política de Privacidad
                </Link>.
              </p>

              <p className="text-gray-700 mb-8 font-semibold">
                Si no está de acuerdo, no use la Plataforma.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                1. Definiciones Clave (Quién es Quién)
              </h2>
              <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                <li><strong>"Plataforma":</strong> Es el software EduSpark-AI, incluyendo la web, apps, y su tecnología de IA.</li>
                <li><strong>"Institución":</strong> Es la entidad (colegio, universidad, instituto) que contrata nuestros servicios.</li>
                <li><strong>"Docente":</strong> Usuario autorizado por la Institución para crear cursos, gestionar alumnos y usar la Plataforma.</li>
                <li><strong>"Estudiante":</strong> Usuario autorizado por la Institución y el Docente para acceder a los contenidos y a la IA.</li>
                <li><strong>"Contenido de Usuario":</strong> Cualquier material (textos, tareas, videos, exámenes) que la Institución, Docente o Estudiante suba a la Plataforma.</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                2. El Servicio que Ofrecemos
              </h2>
              <p className="text-gray-700 mb-6">
                EduSpark-AI es una plataforma de e-learning que utiliza Inteligencia Artificial para proveer "retroalimentación dinámica" y personalizada. El objetivo es ayudar a los Estudiantes a alcanzar sus metas académicas y a los Docentes a gestionar sus clases con mayor eficiencia.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                3. Cuentas y Responsabilidades
              </h2>
              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                Contratación:
              </h3>
              <p className="text-gray-700 mb-4">
                El servicio se contrata a través de la Institución, la cual firma un acuerdo de servicio separado. Estos Términos complementan ese acuerdo.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                Creación de Cuentas:
              </h3>
              <p className="text-gray-700 mb-4">
                La Institución es responsable de crear y gestionar las cuentas de sus Docentes y Estudiantes.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                Consentimiento (¡CRÍTICO!):
              </h3>
              <p className="text-gray-700 mb-4">
                La Institución declara y garantiza que tiene todos los permisos y consentimientos necesarios (incluyendo el consentimiento parental si los Estudiantes son menores de edad) para crear estas cuentas y permitirnos procesar sus datos según nuestra{' '}
                <Link to="/privacy" className="text-blue-600 hover:underline">
                  Política de Privacidad
                </Link>.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                Seguridad:
              </h3>
              <p className="text-gray-700 mb-6">
                Usted es responsable de mantener su contraseña segura. No la comparta. Notifíquenos inmediatamente si sospecha un uso no autorizado.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                4. Usos Prohibidos (La lista de "No seas ese usuario")
              </h2>
              <p className="text-gray-700 mb-4">
                Usted acepta NO hacer nada de lo siguiente:
              </p>
              <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                <li>Usar la Plataforma para fines ilegales o no autorizados.</li>
                <li>Intentar "hackear", hacer ingeniería inversa o descifrar la Plataforma o su IA.</li>
                <li>Subir Contenido de Usuario que sea ilegal, difamatorio, obsceno o que infrinja derechos de autor de terceros.</li>
                <li>Usar la IA para generar contenido de odio, peligroso o que promueva la desinformación.</li>
                <li>Hacerse pasar por otra persona o institución.</li>
                <li>Revender o alquilar el acceso a la Plataforma.</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                5. Propiedad Intelectual
              </h2>
              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                Lo Nuestro:
              </h3>
              <p className="text-gray-700 mb-4">
                La Plataforma, el nombre "EduSpark-AI", el logo, el código, los algoritmos de IA y todo el software son propiedad exclusiva de [Tu Nombre/Empresa]. Le damos una licencia limitada, no exclusiva y revocable para usar la Plataforma, no para ser su dueño.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                Lo Tuyo:
              </h3>
              <p className="text-gray-700 mb-4">
                Todo el Contenido de Usuario que usted sube (planes de clase, tareas, respuestas) sigue siendo suyo.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                La Licencia que TÚ nos das (Importante para la IA):
              </h3>
              <p className="text-gray-700 mb-4">
                Para que la plataforma funcione, usted nos otorga una licencia mundial, no exclusiva y libre de regalías para usar, copiar, procesar y analizar su Contenido de Usuario únicamente con el fin de:
              </p>
              <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                <li>Prestarle el servicio (mostrarle sus cursos, etc.).</li>
                <li>Permitir que la IA genere la "retroalimentación dinámica".</li>
                <li>Mejorar y entrenar nuestros modelos de IA de forma anónima y agregada (sin identificarlo a usted).</li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                6. El Papel de la IA (El descargo de "Skynet")
              </h2>
              <p className="text-gray-700 mb-4">
                Nuestra Inteligencia Artificial es una herramienta de apoyo, no un sustituto del juicio humano.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                Es un Asistente:
              </h3>
              <p className="text-gray-700 mb-4">
                La IA está diseñada para dar retroalimentación y sugerencias. Puede cometer errores, tener imprecisiones o generar respuestas que no son perfectas.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                No es un Docente Humano:
              </h3>
              <p className="text-gray-700 mb-4">
                La evaluación final, la calificación y la responsabilidad pedagógica recaen siempre en el Docente y la Institución.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                Verificación:
              </h3>
              <p className="text-gray-700 mb-6">
                Los Docentes deben revisar y validar la información crítica generada por la IA antes de tomar decisiones académicas.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                7. Terminación del Servicio
              </h2>
              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                Por Causa:
              </h3>
              <p className="text-gray-700 mb-4">
                Podemos suspender o eliminar su cuenta inmediatamente si usted viola estos Términos.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                Por la Institución:
              </h3>
              <p className="text-gray-700 mb-6">
                Su acceso está ligado al contrato de su Institución. Si la Institución deja de pagar o finaliza su contrato, su acceso se suspenderá.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                8. RENUNCIA DE GARANTÍAS (El "Seamos realistas")
              </h2>
              <p className="text-gray-600 text-sm mb-4 italic">
                (Esta sección debe ir en mayúsculas por motivos legales)
              </p>
              <div className="bg-red-50 border-l-4 border-red-400 p-6 mb-6 rounded-r-lg">
                <p className="text-red-900 font-semibold mb-2 uppercase">
                  LA PLATAFORMA SE OFRECE "TAL CUAL" (AS IS) Y "SEGÚN DISPONIBILIDAD". NO GARANTIZAMOS QUE EL SERVICIO SERÁ ININTERRUMPIDO, LIBRE DE ERRORES O 100% SEGURO.
                </p>
                <p className="text-red-900 font-semibold uppercase">
                  NO OFRECEMOS NINGUNA GARANTÍA SOBRE LA PRECISIÓN, FIABILIDAD O EXACTITUD DE LA RETROALIMENTACIÓN DE LA IA. NO GARANTIZAMOS QUE EL USO DE LA PLATAFORMA RESULTE EN MEJORES CALIFICACIONES O RESULTADOS ACADÉMICOS ESPECÍFICOS.
                </p>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                9. LÍMITE DE RESPONSABILIDAD (El "No nos vas a quebrar")
              </h2>
              <p className="text-gray-600 text-sm mb-4 italic">
                (Esta sección también va en mayúsculas)
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6 rounded-r-lg">
                <p className="text-yellow-900 font-semibold mb-2 uppercase">
                  EN LA MEDIDA MÁXIMA PERMITIDA POR LA LEY, [TU EMPRESA] NO SERÁ RESPONSABLE POR NINGÚN DAÑO INDIRECTO, INCIDENTAL, ESPECIAL O CONSECUENTE (INCLUYENDO PÉRDIDA DE DATOS, PÉRDIDA DE OPORTUNIDADES ACADÉMICAS O DAÑO A LA REPUTACIÓN) DERIVADO DEL USO O LA INCAPACIDAD DE USAR LA PLATAFORMA.
                </p>
                <p className="text-yellow-900 font-semibold uppercase">
                  NUESTRA RESPONSABILIDAD TOTAL MÁXIMA HACIA USTED (O LA INSTITUCIÓN) POR CUALQUIER RECLAMO RELACIONADO CON EL SERVICIO NO EXCEDERÁ [ESTO LO DECIDE TU ABOGADO: puede ser "100 USD" o "el monto pagado por la Institución en los últimos 3 meses"].
                </p>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                10. Modificaciones y Ley Aplicable
              </h2>
              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                Cambios:
              </h3>
              <p className="text-gray-700 mb-4">
                Podemos modificar estos Términos de vez en cuando. Le notificaremos (por email o un aviso en la app). Si continúa usando la Plataforma después del aviso, acepta los nuevos Términos.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                Ley:
              </h3>
              <p className="text-gray-700 mb-6">
                Estos Términos se rigen por las leyes de la República del Paraguay. Cualquier disputa se resolverá en los tribunales competentes de la ciudad de Asunción.
              </p>

              <div className="mt-12 pt-8 border-t border-gray-200">
                <p className="text-gray-600 text-sm">
                  Si tienes preguntas sobre estos términos y condiciones, puedes contactarnos en{' '}
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

export default TermsPage;

