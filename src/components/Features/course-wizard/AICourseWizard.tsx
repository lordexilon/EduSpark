import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import { fileExtractionService } from '@/utils/fileExtractionUtils';
import { AiService, CourseStructure } from '@/services/aiService';
import { Flashcard, createFlashcard } from '@/services/flashcardService';
import { courseService, unitService, sessionService } from '@/services/teacherCourses';
import {
  IconUpload,
  IconSparkles,
  IconCheckCircle,
  IconArrowRight,
  IconTrash,
  IconEdit,
  IconLoader,
  IconPlus,
  IconFileText,
  IconVideo,
  IconImage,
  IconX,
  IconChevronDown,
  IconChevronUp,
} from '@/components/Common/Icons';
import PremiumFlashcard from '@/components/Features/flashcards/PremiumFlashcard';

type Step = 'upload' | 'structure' | 'content' | 'finalizing';

const AICourseWizard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [step, setStep] = useState<Step>('upload');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [originalContent, setOriginalContent] = useState('');

  // Data Structure
  const [structure, setStructure] = useState<CourseStructure | null>(null);
  const [generatedCards, setGeneratedCards] = useState<Flashcard[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Actions ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setLoading(true);
    try {
      console.log('Wizard: Extracting text from file...', file.name);
      const content = await fileExtractionService.extractText(file);
      processContent(content);
    } catch (error) {
      console.error('Wizard Error (handleFileUpload):', error);
      alert('Error al procesar el archivo. Revisa el formato.');
      setLoading(false);
    }
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    setLoading(true);
    processContent(textInput);
  };

  const processContent = async (content: string) => {
    setOriginalContent(content);
    try {
      console.log(
        'Wizard: Generating course structure with AI...',
        content.substring(0, 100) + '...'
      );
      setLoadingMessage('Analizando tu contenido exclusivo...');
      const aiStructure = await AiService.generateCourseStructure(content);
      console.log('Wizard: Course structure received:', aiStructure.title);
      setStructure(aiStructure);
      setStep('structure');
    } catch (error) {
      console.error('Wizard Error (processContent):', error);
      alert('Error al diseñar la malla. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmStructure = async () => {
    setStep('content');
    generateAllFlashcards();
  };

  const generateAllFlashcards = async () => {
    if (!structure) return;
    setLoading(true);
    console.log('Wizard: Generating flashcards with AI...');
    setLoadingMessage('Creando material de estudio inteligente...');

    try {
      // Generamos para el curso general por ahora (o podríamos iterar sesiones)
      const context = `Curso: ${structure.title}. Descripción: ${structure.description}`;
      console.log('Wizard: Calling generateFlashcardsWithImages with context:', context);
      const cards = await AiService.generateFlashcardsWithImages(originalContent, context);
      console.log('Wizard: Flashcards generated:', cards.length);
      setGeneratedCards(cards);
    } catch (error) {
      console.error('Wizard Error (generateAllFlashcards):', error);
      alert('Error al generar las flashcards. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!structure || !user) return;
    setLoading(true);
    setLoadingMessage('Creando curso en la base de datos...');

    try {
      // 1. Crear Curso
      const newCourse = await courseService.createCourse({
        title: structure.title,
        description: structure.description,
        teacher_id: user.id,
        status: 'draft',
        institution_id: (user as any).institution_id, // Asumimos que existe
      });

      // 2. Crear Unidades y Sesiones
      for (const unit of structure.units) {
        const newUnit = await unitService.createUnit({
          course_id: newCourse.id,
          number: unit.number,
          title: unit.title,
          description: unit.description,
        });

        for (const session of unit.sessions) {
          await sessionService.createSession({
            course_id: newCourse.id,
            unit_id: newUnit.id,
            title: session.title,
            description: session.description,
            order_index: 0,
          });
        }
      }

      // 3. Crear Flashcards
      await Promise.all(
        generatedCards.map((card) => {
          return createFlashcard({
            course_id: newCourse.id,
            created_by: user.id,
            front_text: card.front_text,
            back_text: card.back_text,
            image_prompt: card.image_prompt,
            difficulty_level: card.difficulty_level || 3,
            tags: card.tags || [],
            is_active: true,
            is_public: false,
            points_value: 0,
          });
        })
      );

      setStep('finalizing');
      setTimeout(() => navigate(`/teacher/courses/${newCourse.id}`), 2000);
    } catch (error) {
      console.error(error);
      alert('Error al guardar el curso.');
    } finally {
      setLoading(false);
    }
  };

  // --- Renders ---

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-fade-in">
        <div className="relative w-32 h-32">
          <div className="absolute inset-0 border-8 border-indigo-100 rounded-full"></div>
          <div className="absolute inset-0 border-8 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          <IconSparkles className="absolute inset-0 m-auto w-12 h-12 text-indigo-600 animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            {loadingMessage}
          </h2>
          <p className="text-slate-500 font-medium">EduSpark IA está trabajando para ti</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Steps Indicator */}
      <div className="flex justify-between max-w-md mx-auto mb-12">
        {[
          { id: 'upload', label: 'Carga' },
          { id: 'structure', label: 'Malla' },
          { id: 'content', label: 'Material' },
        ].map((s, idx) => (
          <div key={s.id} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                step === s.id
                  ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-200'
                  : idx < ['upload', 'structure', 'content'].indexOf(step)
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-200 text-slate-500'
              }`}
            >
              {idx < ['upload', 'structure', 'content'].indexOf(step) ? (
                <IconCheckCircle className="w-6 h-6" />
              ) : (
                idx + 1
              )}
            </div>
            {idx < 2 && (
              <div
                className={`w-12 h-1 mx-2 rounded ${idx < ['upload', 'structure', 'content'].indexOf(step) ? 'bg-green-500' : 'bg-slate-200'}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="text-center space-y-8 animate-fade-in-up">
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold text-slate-900">¿Qué curso crearemos hoy?</h1>
            <p className="text-xl text-slate-600">
              EduSpark diseñará el curso completo basándose <strong>únicamente</strong> en tu
              contenido.
            </p>
          </div>

          <div className="max-w-2xl mx-auto bg-white rounded-3xl p-2 border-2 border-slate-100 flex gap-2">
            <button
              onClick={() => setInputMode('file')}
              className={`flex-1 py-4 rounded-2xl font-bold transition-all ${inputMode === 'file' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Subir Archivo
            </button>
            <button
              onClick={() => setInputMode('text')}
              className={`flex-1 py-4 rounded-2xl font-bold transition-all ${inputMode === 'text' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Pegar Texto
            </button>
          </div>

          {inputMode === 'file' ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative max-w-2xl mx-auto border-4 border-dashed border-slate-200 rounded-[2.5rem] p-16 transition-all hover:border-indigo-400 hover:bg-slate-50 cursor-pointer overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex flex-col items-center space-y-6">
                <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-200 group-hover:scale-110 transition-transform">
                  <IconUpload className="w-12 h-12 text-white" />
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-slate-800">
                    Haz clic para subir tu archivo
                  </p>
                  <p className="text-slate-500">
                    Soportamos <strong>.pdf, .md, .txt</strong>
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.md,.txt"
                onChange={handleFileUpload}
              />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              <textarea
                className="w-full h-80 p-6 border-4 border-slate-100 rounded-[2.5rem] focus:border-indigo-400 outline-none resize-none text-slate-700 bg-slate-50 transition-all font-medium"
                placeholder="Escribe o pega aquí el contenido de tu curso. La IA lo usará como única fuente de verdad..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
              <Button
                variant="primary"
                size="md"
                className="w-full py-6 rounded-3xl text-xl shadow-xl shadow-indigo-200"
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
              >
                <IconSparkles className="mr-2" /> Comenzar a Diseñar
              </Button>
            </div>
          )}

          <div className="flex justify-center gap-8 text-slate-400">
            <div className="flex items-center gap-2">
              <IconCheckCircle className="w-5 h-5 text-green-500" /> Contenido Exclusivo
            </div>
            <div className="flex items-center gap-2">
              <IconCheckCircle className="w-5 h-5 text-green-500" /> Sin Rellenos IA
            </div>
            <div className="flex items-center gap-2">
              <IconCheckCircle className="w-5 h-5 text-green-500" /> Fidelidad 100%
            </div>
          </div>

          {/* Ejemplo de estructura recomendada - siempre visible */}
          <div className="max-w-2xl mx-auto text-left">
            <div className="bg-white border-2 border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 p-5">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <IconFileText className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">¿Cómo debe estar organizado mi PDF?</p>
                  <p className="text-sm text-slate-500">Ejemplo de estructura recomendada</p>
                </div>
              </div>
              <div className="px-5 pb-5 border-t border-slate-100">
                <div className="mt-4 bg-slate-50 rounded-xl p-5 font-mono text-sm text-slate-700 space-y-3">
                  <p className="font-bold text-indigo-700 text-base font-sans">
                    📄 Ejemplo de PDF recomendado:
                  </p>
                  <div className="border-l-4 border-indigo-400 pl-4 space-y-2">
                    <p className="font-bold text-lg">Título del Curso</p>
                    <p className="text-slate-500 italic">
                      Descripción general o introducción al tema...
                    </p>
                  </div>
                  <div className="border-l-4 border-purple-400 pl-4 space-y-2 mt-4">
                    <p className="font-bold">Unidad 1: Fundamentos Básicos</p>
                    <p className="text-slate-500 text-xs">Breve descripción de la unidad...</p>
                    <div className="ml-4 space-y-1 text-slate-600">
                      <p>• Sesión 1.1: Introducción al tema</p>
                      <p>• Sesión 1.2: Conceptos clave</p>
                      <p>• Sesión 1.3: Aplicaciones prácticas</p>
                    </div>
                  </div>
                  <div className="border-l-4 border-purple-400 pl-4 space-y-2 mt-2">
                    <p className="font-bold">Unidad 2: Desarrollo Avanzado</p>
                    <p className="text-slate-500 text-xs">Breve descripción de la unidad...</p>
                    <div className="ml-4 space-y-1 text-slate-600">
                      <p>• Sesión 2.1: Técnicas avanzadas</p>
                      <p>• Sesión 2.2: Casos de estudio</p>
                    </div>
                  </div>
                  <div className="border-l-4 border-purple-400 pl-4 space-y-2 mt-2">
                    <p className="font-bold">Unidad 3: Evaluación y Cierre</p>
                    <p className="text-slate-500 text-xs">...</p>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> No es obligatorio que tu PDF tenga este formato exacto.
                    La IA analizará cualquier contenido educativo y propondrá la mejor estructura.
                    Cuanto más organizado esté, mejores serán los resultados.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Structure Review */}
      {step === 'structure' && structure && (
        <div className="space-y-8 animate-fade-in">
          <div className="flex justify-between items-end">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-slate-900">Revisa tu Malla Curricular</h2>
              <p className="text-slate-500">
                EduSpark ha organizado el contenido basándose en tu archivo.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirmStructure}
              className="px-8 shadow-xl shadow-indigo-200"
            >
              Confirmar Malla <IconArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>

          <div className="grid gap-6">
            <Card className="p-8 border-2 border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center gap-4 text-indigo-600">
                <IconFileText className="w-8 h-8" />
                <h3 className="text-2xl font-bold">{structure.title}</h3>
              </div>
              <p className="text-slate-600 text-lg leading-relaxed">{structure.description}</p>
            </Card>

            {structure.units.map((unit, uIdx) => (
              <div key={uIdx} className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm">
                    {unit.number}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-slate-800">{unit.title}</h4>
                    <p className="text-sm text-slate-500">{unit.description}</p>
                  </div>
                </div>
                <div className="grid gap-3 ml-12">
                  {unit.sessions.map((session, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-4 bg-white rounded-xl border border-slate-100 flex items-center justify-between hover:border-indigo-200 transition-all shadow-sm group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-indigo-400" />
                        <div>
                          <p className="font-semibold text-slate-700">{session.title}</p>
                          <p className="text-xs text-slate-400">{session.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Content Review */}
      {step === 'content' && (
        <div className="space-y-8 animate-fade-in">
          <div className="flex justify-between items-end">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-slate-900">Flashcards e Imágenes</h2>
              <p className="text-slate-500">Revisa las tarjetas creadas para tus alumnos.</p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handleFinalize}
              className="px-8 shadow-xl shadow-indigo-200"
            >
              Crear Curso <IconCheckCircle className="ml-2 w-5 h-5" />
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {generatedCards.map((card, idx) => (
              <div key={idx} className="space-y-4">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-bold uppercase tracking-widest text-xs">
                    Tarjeta {idx + 1}
                  </span>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                      <IconEdit className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg text-red-400">
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <PremiumFlashcard flashcard={card} studyMode={true} />
                {card.image_prompt && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-4">
                    <IconImage className="w-6 h-6 text-amber-600 mt-1" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-amber-800 uppercase">
                        Sugerencia visual para IA:
                      </p>
                      <p className="text-sm text-amber-900 italic">"{card.image_prompt}"</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Finalizing */}
      {step === 'finalizing' && (
        <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center animate-fade-in">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white shadow-2xl shadow-green-200 animate-bounce">
            <IconCheckCircle className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-black text-slate-900">¡Curso Creado con Éxito!</h1>
          <p className="text-xl text-slate-500">
            Redirigiéndote a tu nuevo mundo de aprendizaje...
          </p>
        </div>
      )}

      <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.5s ease-out forwards;
                }
                .animate-fade-in {
                    animation: fadeIn 0.8s ease-out forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .perspective-2000 { perspective: 2000px; }
            `}</style>
    </div>
  );
};

export default AICourseWizard;
