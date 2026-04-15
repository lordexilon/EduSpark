
import React, { useState, useRef } from 'react';
import Button from '@/components/Common/Button';
import Card from '@/components/Common/Card';
import PremiumFlashcard from './PremiumFlashcard';
import EditFlashcardModal from './EditFlashcardModal';
import { Flashcard } from '@/services/flashcardService';
import { AiService, ExtractedTopic } from '@/services/aiService';
import { extractTextFromPdf } from '@/utils/pdfUtils';
import {
    IconSparkles, IconVideo, IconFileText, IconLoader, IconUpload,
    IconCheckCircle, IconXCircle, IconTrash, IconArrowRight, IconCheck, IconRefreshCw
} from '@/components/Common/Icons';



interface GeneratorFlashcard extends Flashcard {
    image_prompt?: string;
}

interface FlashcardGeneratorProps {
    onSave?: (flashcards: Flashcard[]) => Promise<void>;
}

const FlashcardGenerator: React.FC<FlashcardGeneratorProps> = ({ onSave }) => {
    // UI State
    const [step, setStep] = useState<'input' | 'selection' | 'results'>('input');
    const [mode, setMode] = useState<'text' | 'video' | 'pdf'>('video');

    // Data State
    const [inputValue, setInputValue] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Processing State
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [processingStep, setProcessingStep] = useState(0);
    const [topics, setTopics] = useState<ExtractedTopic[]>([]);
    const [generatedCards, setGeneratedCards] = useState<GeneratorFlashcard[]>([]);
    // Nota: La generación de imágenes se realiza individualmente desde el modal de edición
    const [editingCard, setEditingCard] = useState<GeneratorFlashcard | null>(null);
    const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());

    const handleEditCard = (card: Flashcard) => {
        // Al editar, aseguramos que tenga el campo image_prompt (puede venir vacío si no se generó)
        setEditingCard(card as GeneratorFlashcard);
    };

    const saveEditedCard = (updatedCard: GeneratorFlashcard) => {
        setGeneratedCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
        setEditingCard(null);
    };

    // Selección múltiple para eliminar
    const toggleCardSelection = (cardId: string) => {
        setSelectedForDeletion(prev => {
            const next = new Set(prev);
            if (next.has(cardId)) next.delete(cardId);
            else next.add(cardId);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedForDeletion.size === generatedCards.length) {
            setSelectedForDeletion(new Set());
        } else {
            setSelectedForDeletion(new Set(generatedCards.map(c => c.id)));
        }
    };

    const deleteSelectedCards = () => {
        if (selectedForDeletion.size === 0) return;
        const count = selectedForDeletion.size;
        if (!confirm(`¿Eliminar ${count} tarjeta${count > 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) return;
        setGeneratedCards(prev => prev.filter(c => !selectedForDeletion.has(c.id)));
        setSelectedForDeletion(new Set());
    };

    const MAX_FILE_SIZE_MB = 50;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setFileError(null);
        setSelectedFile(null);

        if (!file) return;

        if (file.type !== 'application/pdf') {
            setFileError('Solo se permiten archivos PDF.');
            return;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            setFileError(`El archivo excede el límite de ${MAX_FILE_SIZE_MB}MB.`);
            return;
        }

        setSelectedFile(file);
    };

    const handleAnalyze = () => {
        setIsProcessing(true);
        setProcessingStep(0);

        let steps = [
            "Conectando con la fuente...",
            "Analizando contenido...",
            "Identificando temas clave...",
        ];

        if (mode === 'pdf') {
            steps = [
                "Subiendo documento PDF...",
                `Procesando ${selectedFile?.name}...`,
                "Extrayendo texto...",
                "Identificando temas clave...",
            ];
        }

        let currentStep = 0;
        const interval = setInterval(() => {
            currentStep++;
            setProcessingStep(currentStep);

            if (currentStep >= steps.length) {
                clearInterval(interval);
                finishAnalysis();
            }
        }, 800);
    };

    const finishAnalysis = async () => {
        try {
            let contentToAnalyze = inputValue;

            if (mode === 'pdf' && selectedFile) {
                // Paso extra: Extraer texto del PDF
                try {
                    contentToAnalyze = await extractTextFromPdf(selectedFile);
                } catch (pdfError) {
                    console.error("Error reading PDF:", pdfError);
                    setFileError("Error al leer el PDF. Asegúrate que no está encriptado.");
                    setIsProcessing(false);
                    return;
                }
            }

            // Guardar el contenido extraído para usarlo después en la generación de cartas
            if (mode === 'pdf') {
                setInputValue(contentToAnalyze);
            }

            const topics = await AiService.analyzeContent({
                type: mode,
                content: contentToAnalyze
            });
            setTopics(topics);
            setIsProcessing(false);
            setStep('selection');
        } catch (error) {
            console.error("Error generating topics", error);
            setIsProcessing(false);
            setFileError("Error al conectar con la IA. Inténtalo de nuevo.");
        }
    };

    const toggleTopic = (id: string) => {
        setTopics(topics.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
    };

    const updateTopicCount = (id: string, delta: number) => {
        setTopics(topics.map(t => {
            if (t.id === id) {
                const newCount = Math.max(1, Math.min(10, t.cardCount + delta));
                return { ...t, cardCount: newCount };
            }
            return t;
        }));
    };

    const handleGenerateCards = async () => {
        setIsProcessing(true);
        setProcessingStep(0); // Reusar loader visual

        try {
            const cards = await AiService.generateCards(topics, inputValue || (mode === 'pdf' ? 'pdf' : ''));

            // Las tarjetas se crean sin imágenes. El usuario puede generar imágenes
            // individualmente desde el modal de edición de cada tarjeta.
            const processedCards: GeneratorFlashcard[] = cards.map(c => ({ ...c }));

            setGeneratedCards(processedCards);
            setIsProcessing(false);
            setStep('results');
        } catch (error) {
            console.error("Error generating cards", error);
            setIsProcessing(false);
        }
    };

    const handleSaveToCollection = async () => {
        if (!onSave) return;

        setIsSaving(true);
        try {
            // Eliminar propiedades extra como image_prompt antes de guardar
            const cleanCards = generatedCards.map(({ image_prompt, ...rest }) => rest);
            await onSave(cleanCards);
        } finally {
            setIsSaving(false);
        }
    };

    const isReady = () => {
        if (mode === 'pdf') return !!selectedFile;
        return !!inputValue;
    };

    // Render Components

    // 1. Processing Loader
    if (isProcessing) {
        return (
            <div className="py-32 text-center space-y-6">
                <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                    <IconSparkles className="absolute inset-0 m-auto w-8 h-8 text-indigo-600 animate-pulse" />
                </div>
                <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-pink-600 animate-pulse">
                    {step === 'input'
                        ? ["Analizando fuente...", "Extrayendo estructura...", "Identificando conceptos..."][Math.min(processingStep, 2)]
                        : "Generando tus Flashcards..."}
                </div>
                <p className="text-gray-500">Esto puede tomar unos segundos</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto p-6 space-y-8">
            {/* Header Steps */}
            <div className="flex justify-center mb-8">
                <div className="flex items-center gap-4 text-sm font-medium">
                    <span className={`flex items-center gap-2 ${step === 'input' ? 'text-indigo-600' : 'text-green-600'}`}>
                        <span className="w-8 h-8 rounded-full flex items-center justify-center bg-current text-white">1</span>
                        Fuente
                    </span>
                    <div className="w-12 h-0.5 bg-gray-200"></div>
                    <span className={`flex items-center gap-2 ${step === 'selection' ? 'text-indigo-600' : step === 'results' ? 'text-green-600' : 'text-gray-400'}`}>
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'selection' || step === 'results' ? 'bg-current border-current text-white' : 'border-gray-200'}`}>2</span>
                        Selección
                    </span>
                    <div className="w-12 h-0.5 bg-gray-200"></div>
                    <span className={`flex items-center gap-2 ${step === 'results' ? 'text-indigo-600' : 'text-gray-400'}`}>
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'results' ? 'bg-current border-current text-white' : 'border-gray-200'}`}>3</span>
                        Resultados
                    </span>
                </div>
            </div>

            {/* STEP 1: INPUT */}
            {step === 'input' && (
                <div className="animate-fade-in-up">
                    <div className="text-center space-y-4 mb-12">
                        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                            ¿Qué quieres aprender hoy?
                        </h1>
                        <p className="text-lg text-gray-500">
                            Sube tu material y deja que la IA organice el estudio por ti.
                        </p>
                    </div>

                    <Card className="p-1 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-2xl shadow-xl">
                        <div className="bg-white rounded-xl p-8">
                            <div className="flex gap-4 mb-8 justify-center flex-wrap">
                                {['video', 'text', 'pdf'].map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setMode(m as any)}
                                        className={`px-6 py-3 rounded-full font-medium flex items-center gap-2 transition-all ${mode === m
                                            ? 'bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200 shadow-sm'
                                            : 'text-gray-500 hover:bg-gray-50'
                                            }`}
                                    >
                                        {m === 'video' && <IconVideo />}
                                        {m === 'text' && <IconFileText />}
                                        {m === 'pdf' && <IconUpload />}
                                        <span className="capitalize">{m === 'video' ? 'YouTube' : m}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="max-w-2xl mx-auto space-y-6">
                                {mode === 'video' && (
                                    <input
                                        type="text"
                                        placeholder="Pega la URL del video de YouTube..."
                                        className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-lg"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                    />
                                )}

                                {mode === 'text' && (
                                    <textarea
                                        rows={6}
                                        placeholder="Pega tu texto, apuntes o artículo aquí..."
                                        className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-lg resize-none"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                    />
                                )}

                                {mode === 'pdf' && (
                                    <div className="w-full">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept="application/pdf"
                                            className="hidden"
                                            onChange={handleFileSelect}
                                        />
                                        {!selectedFile ? (
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                                            >
                                                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                    <IconUpload className="w-8 h-8 text-indigo-600" />
                                                </div>
                                                <p className="text-lg font-medium text-gray-700">Subir PDF</p>
                                                <p className="text-sm text-gray-400">Máx. 50MB</p>
                                            </div>
                                        ) : (
                                            <div className="w-full border border-green-200 bg-green-50 rounded-xl p-6 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <IconCheckCircle className="w-8 h-8 text-green-600" />
                                                    <div>
                                                        <p className="font-semibold text-gray-800">{selectedFile.name}</p>
                                                        <p className="text-sm text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-red-500">
                                                    <IconTrash />
                                                </button>
                                            </div>
                                        )}
                                        {fileError && <p className="mt-2 text-red-600 text-sm flex items-center gap-1"><IconXCircle className="w-4 h-4" /> {fileError}</p>}
                                    </div>
                                )}

                                <div className="pt-4 flex justify-end">
                                    <Button
                                        variant="primary"
                                        disabled={!isReady()}
                                        onClick={handleAnalyze}
                                        className="px-6 py-2 text-base bg-indigo-600 hover:bg-indigo-700 shadow-md"
                                    >
                                        <IconSparkles className="mr-2 w-4 h-4" /> Analizar Contenido
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* STEP 2: SELECTION */}
            {step === 'selection' && (
                <div className="animate-fade-in-up">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Temas Identificados</h2>
                        <span className="text-sm text-gray-500">Selecciona los temas para generar tus tarjetas</span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-8">
                        {topics.map(topic => (
                            <div
                                key={topic.id}
                                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${topic.selected
                                    ? 'border-indigo-500 bg-indigo-50/50'
                                    : 'border-gray-200 hover:border-indigo-200 bg-white'
                                    }`}
                                onClick={() => toggleTopic(topic.id)}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-6 h-6 rounded border flex items-center justify-center flex-shrink-0 mt-1 transition-colors ${topic.selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'
                                        }`}>
                                        {topic.selected && <IconCheck className="w-4 h-4 text-white" />}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className={`font-bold text-lg mb-1 ${topic.selected ? 'text-indigo-900' : 'text-gray-700'}`}>
                                            {topic.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                                            {topic.snippet}
                                        </p>

                                        {topic.selected && (
                                            <div className="flex items-center gap-3 mt-2" onClick={e => e.stopPropagation()}>
                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tarjetas:</span>
                                                <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                                                    <button
                                                        onClick={() => updateTopicCount(topic.id, -1)}
                                                        className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-4 text-center font-bold text-indigo-600">{topic.cardCount}</span>
                                                    <button
                                                        onClick={() => updateTopicCount(topic.id, 1)}
                                                        className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs font-bold px-2 py-1 bg-gray-100 rounded-lg text-gray-500">
                                        {topic.relevance}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center border-t pt-6">
                        <Button variant="ghost" onClick={() => setStep('input')}>
                            Atrás
                        </Button>

                        <Button
                            variant="primary"
                            onClick={handleGenerateCards}
                            disabled={!topics.some(t => t.selected)}
                            className="px-8 py-3 text-lg shadow-xl shadow-indigo-200"
                        >
                            <IconSparkles className="mr-2" /> Generar Flashcards
                        </Button>
                    </div>
                </div>
            )}

            {/* STEP 3: RESULTS */}
            {step === 'results' && (
                <div className="animate-fade-in-up">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-800">Tus Flashcards Mágicas</h2>
                        <Button variant="ghost" onClick={() => setStep('selection')}>
                            Revisar Selección
                        </Button>
                    </div>

                    {/* Barra de selección múltiple */}
                    <div className="flex items-center justify-between mb-6 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-gray-600">
                                <input
                                    type="checkbox"
                                    checked={selectedForDeletion.size === generatedCards.length && generatedCards.length > 0}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                Seleccionar todas
                            </label>
                            {selectedForDeletion.size > 0 && (
                                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                                    {selectedForDeletion.size} seleccionada{selectedForDeletion.size > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        {selectedForDeletion.size > 0 && (
                            <button
                                onClick={deleteSelectedCards}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium border border-red-200"
                            >
                                <IconTrash className="w-4 h-4" />
                                Eliminar ({selectedForDeletion.size})
                            </button>
                        )}
                    </div>

                    <div className="grid gap-12 mb-12">
                        {generatedCards.map((card, idx) => (
                            <div key={card.id} className="relative group">
                                <div className="absolute -left-10 md:-left-12 top-0 text-4xl md:text-6xl font-black text-gray-100 -z-10 select-none">
                                    {idx + 1}
                                </div>
                                {/* Checkbox de selección */}
                                <div className="absolute -left-1 md:-left-2 top-1/2 -translate-y-1/2 z-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedForDeletion.has(card.id)}
                                        onChange={() => toggleCardSelection(card.id)}
                                        className="w-5 h-5 rounded border-gray-300 text-red-500 focus:ring-red-400 cursor-pointer shadow-sm"
                                    />
                                </div>
                                <div className={`transition-all duration-200 ${selectedForDeletion.has(card.id) ? 'opacity-50 scale-[0.98] ring-2 ring-red-300 rounded-2xl' : ''}`}>
                                    <PremiumFlashcard
                                        flashcard={card}
                                        studyMode={true}
                                        showAnswer={false}
                                        onEdit={handleEditCard}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col md:flex-row justify-center gap-4 border-t pt-8">
                        <Button variant="danger" className="w-full md:w-auto" onClick={() => setStep('input')}>
                            <IconTrash className="mr-2" /> Descartar
                        </Button>
                        <Button
                            variant="primary"
                            className="w-full md:w-auto text-lg px-8"
                            onClick={handleSaveToCollection}
                            disabled={!onSave || isSaving}
                        >
                            {isSaving ? <IconLoader className="mr-2 animate-spin" /> : <IconCheckCircle className="mr-2" />}
                            {isSaving ? 'Guardando...' : 'Guardar en mi Colección'}
                        </Button>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {/* EDIT MODAL */}
            {editingCard && (
                <EditFlashcardModal
                    card={editingCard}
                    onClose={() => setEditingCard(null)}
                    onSave={saveEditedCard}
                />
            )}

            <style>{`
              @keyframes fadeInUp {
                  from { opacity: 0; transform: translateY(20px); }
                  to { opacity: 1; transform: translateY(0); }
              }
              .animate-fade-in-up {
                  animation: fadeInUp 0.5s ease-out forwards;
              }
            `}</style>
        </div>
    );
};

export default FlashcardGenerator;
