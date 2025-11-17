import React, { useState, useRef, useEffect } from 'react';
import { useAgentSystem } from '../audio-tutor/hooks/useAgentSystem';
import { IconSparkles, IconX, IconPaperAirplane, IconDownload, IconChevronDown, IconChevronUp } from './Icons.tsx';
import { useAuth } from '../hooks/useAuth';
import { MarkdownText } from './MarkdownText.tsx';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

interface ExpandedMessages {
  [key: number]: boolean;
}

interface AssistantIAProps {
  courseId: string;
  sessionId?: string;
}

const AssistantIA: React.FC<AssistantIAProps> = ({ courseId, sessionId }) => {
  const { user } = useAuth();
  const agentSystem = useAgentSystem(courseId);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [expandedMessages, setExpandedMessages] = useState<ExpandedMessages>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Longitud mínima para considerar un mensaje como "largo" (caracteres)
  const LONG_MESSAGE_THRESHOLD = 200;

  // Convertir mensajes del sistema de agentes al formato del componente
  const messages: Message[] = React.useMemo(() => {
    if (agentSystem.messages.length === 0) {
      return [{
        id: 1,
        text: '¡Hola! Soy tu asistente para el curso. ¿Cómo puedo ayudarte con el material de esta clase?',
        sender: 'ai',
      }];
    }
    return agentSystem.messages.map((msg, index) => ({
      id: index + 1,
      text: msg.text,
      sender: msg.role === 'user' ? 'user' : 'ai',
    }));
  }, [agentSystem.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, agentSystem.isProcessing]);

  // Inicializar sistema de agentes cuando se abre el chat
  useEffect(() => {
    if (isOpen && user && courseId && !agentSystem.isInitialized && !agentSystem.isProcessing) {
      agentSystem.initializeAgentSystem(user, sessionId);
    }
  }, [isOpen, user, courseId, sessionId, agentSystem.isInitialized, agentSystem.isProcessing]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const toggleMessageExpand = (messageId: number) => {
    setExpandedMessages(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const handleExportConversation = async () => {
    try {
      const conversationText = messages.map((msg, index) => {
        const timestamp = new Date().toLocaleString('es-ES');
        return `${msg.sender === 'user' ? 'Tú' : 'Asistente IA'}: ${msg.text}`;
      }).join('\n\n---\n\n');

      const blob = new Blob([conversationText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `conversacion-eduspark-${dateStr}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exportando conversación:', error);
      alert('Error al exportar la conversación. Por favor, inténtalo de nuevo.');
    }
  };

  const isLongMessage = (text: string): boolean => {
    return text.length > LONG_MESSAGE_THRESHOLD;
  };

  const truncateMessage = (text: string, maxLength: number = LONG_MESSAGE_THRESHOLD): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() === '' || agentSystem.isProcessing || !agentSystem.isInitialized) return;

    const currentMessage = inputValue;
    setInputValue('');

    try {
      // Usar el sistema A2A local para obtener respuesta
      // El hook maneja los mensajes internamente
      await agentSystem.sendMessage(currentMessage);
    } catch (error) {
      console.error('Error al obtener respuesta del asistente:', error);
    }
  };

  return (
    <>
      <button
        onClick={handleToggle}
        className="fixed bottom-6 right-6 bg-secondary text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:bg-purple-700 transition-all transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-secondary z-40 border-2 border-white"
        style={{ 
          backgroundColor: '#9333ea', // purple-600
          opacity: 1,
          boxShadow: '0 10px 25px rgba(147, 51, 234, 0.4), 0 0 0 2px rgba(255, 255, 255, 0.1)'
        }}
        aria-label="Abrir asistente de IA"
      >
        <IconSparkles className="w-8 h-8 text-white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-full max-w-sm h-[60vh] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-border">
          {/* Header */}
          <header className="flex items-center justify-between p-4 border-b border-border bg-background rounded-t-2xl">
            <div className="flex items-center flex-1">
              <IconSparkles className="w-6 h-6 text-secondary mr-2" />
              <h2 className="font-bold text-lg text-text-dark">
                {sessionId ? 'Asistente de la Sesión' : 'Asistente del Curso'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 1 && (
                <button 
                  onClick={handleExportConversation}
                  className="p-2 text-text-light hover:text-secondary hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Exportar conversación"
                  title="Exportar conversación"
                >
                  <IconDownload className="w-5 h-5" />
                </button>
              )}
              <button onClick={handleToggle} className="text-text-light hover:text-text-dark p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Cerrar chat">
                <IconX className="w-6 h-6" />
              </button>
            </div>
          </header>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-white space-y-4">
            {messages.map((msg) => {
              const isLong = isLongMessage(msg.text);
              const isExpanded = expandedMessages[msg.id] || false;
              const displayText = isLong && !isExpanded ? truncateMessage(msg.text) : msg.text;
              
              return (
                <div key={msg.id} className={`flex items-start gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                  {msg.sender === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <IconSparkles className="w-5 h-5 text-secondary" />
                    </div>
                  )}
                  <div
                    className={`max-w-xs md:max-w-sm px-4 py-3 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-primary text-white rounded-br-none'
                        : 'bg-gray-100 text-text-dark rounded-bl-none'
                    }`}
                  >
                    <div className={`text-sm ${msg.sender === 'user' ? 'text-white' : 'text-gray-800'}`}>
                      {msg.sender === 'ai' ? (
                        <MarkdownText text={displayText} className="prose prose-sm max-w-none" />
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{displayText}</p>
                      )}
                    </div>
                    {isLong && (
                      <button
                        onClick={() => toggleMessageExpand(msg.id)}
                        className={`mt-2 text-xs font-medium flex items-center gap-1 ${
                          msg.sender === 'user' 
                            ? 'text-white/80 hover:text-white' 
                            : 'text-gray-600 hover:text-gray-800'
                        } transition-colors`}
                      >
                        {isExpanded ? (
                          <>
                            <IconChevronUp className="w-3 h-3" />
                            <span>Mostrar menos</span>
                          </>
                        ) : (
                          <>
                            <IconChevronDown className="w-3 h-3" />
                            <span>Mostrar más</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {agentSystem.isProcessing && (
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
                placeholder={sessionId ? "Pregunta sobre esta sesión..." : "Pregunta sobre la clase..."}
                className="w-full bg-white border border-border rounded-full py-2 pl-4 pr-12 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition"
                disabled={agentSystem.isProcessing}
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={agentSystem.isProcessing || inputValue.trim() === '' || !agentSystem.isInitialized}
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