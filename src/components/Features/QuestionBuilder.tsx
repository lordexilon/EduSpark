// components/QuestionBuilder.tsx
// Constructor de preguntas para quizzes

import React, { useState, useEffect } from 'react';
import { Question } from '@/services/quizService';
import Button from "@/components/Common/Button";
import Card from "@/components/Common/Card";
import { IconPlus, IconTrash, IconCheck, IconX } from "@/components/Common/Icons";

interface QuestionBuilderProps {
  question?: Partial<Question>;
  onSave: (question: Partial<Question>) => void;
  onCancel: () => void;
}

export const QuestionBuilder: React.FC<QuestionBuilderProps> = ({ question, onSave, onCancel }) => {
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'true_false' | 'short_answer' | 'essay'>('multiple_choice');
  const [points, setPoints] = useState(1);
  const [options, setOptions] = useState<Array<{ id: string; text: string; correct: boolean }>>([]);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [explanation, setExplanation] = useState('');

  useEffect(() => {
    if (question) {
      setQuestionText(question.question_text || '');
      setQuestionType(question.question_type || 'multiple_choice');
      setPoints(question.points || 1);
      setOptions(question.options || []);
      setCorrectAnswer(question.correct_answer || '');
      setExplanation(question.explanation || '');
    }
  }, [question]);

  const addOption = () => {
    const newOption = {
      id: `opt_${Date.now()}`,
      text: '',
      correct: false
    };
    setOptions(prev => [...prev, newOption]);
  };

  const updateOption = (index: number, field: 'text' | 'correct', value: any) => {
    if (field === 'correct') {
      // Comportamiento de Radio Button: solo una correcta
      setOptions(prev => prev.map((opt, i) =>
        ({ ...opt, correct: i === index ? value : false })
      ));
    } else {
      setOptions(prev => prev.map((opt, i) =>
        i === index ? { ...opt, [field]: value } : opt
      ));
    }
  };

  const removeOption = (index: number) => {
    setOptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!questionText.trim()) {
      alert('Completa el texto de la pregunta');
      return;
    }

    if (questionType === 'multiple_choice' && options.length < 2) {
      alert('Agrega al menos 2 opciones');
      return;
    }

    if (questionType === 'multiple_choice' && !options.some(opt => opt.correct)) {
      alert('Marca una opción como correcta');
      return;
    }

    // Obtener la respuesta correcta para multiple_choice
    let finalCorrectAnswer = correctAnswer;
    if (questionType === 'multiple_choice') {
      const correctOption = options.find(opt => opt.correct);
      finalCorrectAnswer = correctOption ? correctOption.id : '';
    }

    const questionData: Partial<Question> = {
      question_text: questionText.trim(),
      question_type: questionType,
      points: points,
      options: questionType === 'multiple_choice' ? options : undefined,
      correct_answer: finalCorrectAnswer,
      explanation: explanation.trim() || undefined,
      order_index: 0
    };

    onSave(questionData);
  };

  return (
    <Card>
      <div className="space-y-4">
        {/* Tipo de Pregunta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Pregunta
          </label>
          <select
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value as any)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="multiple_choice">Opción Múltiple</option>
            <option value="true_false">Verdadero/Falso</option>
            <option value="short_answer">Respuesta Corta</option>
            <option value="essay">Ensayo</option>
          </select>
        </div>

        {/* Texto de la Pregunta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pregunta *
          </label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Escribe tu pregunta aquí..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Opciones (solo para multiple_choice) */}
        {questionType === 'multiple_choice' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Opciones de Respuesta *
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={addOption}
                leftIcon={<IconPlus className="w-4 h-4" />}
              >
                Agregar
              </Button>
            </div>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <div className="pt-1">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={option.correct}
                      onChange={() => updateOption(index, 'correct', true)}
                      className="w-5 h-5 text-primary border-gray-300 focus:ring-primary cursor-pointer"
                      title="Marcar como respuesta correcta"
                    />
                  </div>
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => updateOption(index, 'text', e.target.value)}
                    placeholder={`Opción ${index + 1}`}
                    className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${option.correct ? 'border-green-500 bg-green-50' : 'border-gray-300'
                      }`}
                  />
                  <button
                    onClick={() => removeOption(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar opción"
                  >
                    <IconTrash className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            {options.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                💡 Agrega al menos 2 opciones para opción múltiple
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              * Selecciona el círculo (radio button) para marcar la respuesta correcta.
            </p>
          </div>
        )}

        {/* Respuesta Correcta (para true_false y short_answer) */}
        {['true_false', 'short_answer'].includes(questionType) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Respuesta Correcta *
            </label>
            {questionType === 'true_false' ? (
              <select
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Selecciona...</option>
                <option value="true">Verdadero</option>
                <option value="false">Falso</option>
              </select>
            ) : (
              <input
                type="text"
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                placeholder="Respuesta esperada..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            )}
          </div>
        )}

        {/* Puntos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Puntos
          </label>
          <input
            type="number"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            min="0.5"
            step="0.5"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Explicación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Explicación (Opcional)
          </label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Explica por qué esta es la respuesta correcta..."
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Botones */}
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Guardar Pregunta
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default QuestionBuilder;

