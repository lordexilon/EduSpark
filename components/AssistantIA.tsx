import React, { useState, useRef, useEffect } from 'react';
import { getAiAssistantResponse } from '../services/ragService.ts';
import { IconSparkles, IconX, IconPaperAirplane } from './Icons.tsx';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

interface AssistantIAProps {
  courseId: string;
}

const AssistantIA: React.FC<AssistantIAProps> = ({ courseId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: '¡Hola! Soy tu asistente para el curso de Ética Profesional. ¿Cómo puedo ayudarte con el material de esta clase?',
      sender: 'ai',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() === '' || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const aiResponseText = await getAiAssistantResponse(inputValue, courseId);
      const aiMessage: Message = {
        id: Date.now() + 1,
        text: aiResponseText,
        sender: 'ai',
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: 'Lo siento, no pude procesar tu pregunta en este momento. Por favor, inténtalo de nuevo.',
        sender: 'ai',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleToggle}
        className="fixed bottom-6 right-6 bg-secondary text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:bg-purple-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary z-40"
        aria-label="Abrir asistente de IA"
      >
        <IconSparkles className="w-8 h-8" />
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-full max-w-sm h-[60vh] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-border">
          {/* Header */}
          <header className="flex items-center justify-between p-4 border-b border-border bg-background rounded-t-2xl">
            <div className="flex items-center">
              <IconSparkles className="w-6 h-6 text-secondary mr-2" />
              <h2 className="font-bold text-lg text-text-dark">Asistente del Curso</h2>
            </div>
            <button onClick={handleToggle} className="text-text-light hover:text-text-dark" aria-label="Cerrar chat">
              <IconX className="w-6 h-6" />
            </button>
          </header>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-white space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <IconSparkles className="w-5 h-5 text-secondary" />
                  </div>
                )}
                <div
                  className={`max-w-xs md:max-w-sm px-4 py-2 rounded-2xl ${
                    msg.sender === 'user'
                      ? 'bg-primary text-white rounded-br-none'
                      : 'bg-gray-100 text-text-dark rounded-bl-none'
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-end gap-2">
                 <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <IconSparkles className="w-5 h-5 text-secondary" />
                  </div>
                <div className="px-4 py-2 rounded-2xl bg-gray-100 text-text-dark rounded-bl-none">
                    <div className="flex items-center justify-center space-x-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                    </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-background rounded-b-2xl">
            <div className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Pregunta sobre la clase..."
                className="w-full bg-white border border-border rounded-full py-2 pl-4 pr-12 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || inputValue.trim() === ''}
                aria-label="Enviar mensaje"
              >
                <IconPaperAirplane className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default AssistantIA;