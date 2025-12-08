// =====================================================
// Componente para renderizar texto con formato Markdown básico
// =====================================================

import React from 'react';

interface MarkdownTextProps {
  text: string;
  className?: string;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({ text, className = '' }) => {
  // Función para procesar el texto markdown y convertirlo a JSX
  const processMarkdown = (content: string): React.ReactNode[] => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    
    lines.forEach((line, index) => {
      // Manejar bloques de código (```)
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // Cerrar bloque de código
          elements.push(
            <pre key={`code-${index}`} className="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto my-2 text-sm font-mono">
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          // Abrir bloque de código
          inCodeBlock = true;
        }
        return;
      }
      
      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }
      
      // Procesar línea normal
      const processedLine = processLine(line);
      if (processedLine) {
        elements.push(processedLine);
      }
    });
    
    // Si queda un bloque de código sin cerrar
    if (inCodeBlock && codeBlockContent.length > 0) {
      elements.push(
        <pre key="code-final" className="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto my-2 text-sm font-mono">
          <code>{codeBlockContent.join('\n')}</code>
        </pre>
      );
    }
    
    return elements;
  };
  
  // Procesar una línea individual
  const processLine = (line: string): React.ReactNode | null => {
    // Líneas vacías
    if (line.trim() === '') {
      return <br key={`br-${Math.random()}`} />;
    }
    
    // Encabezados
    if (line.startsWith('## ')) {
      return <h2 key={`h2-${Math.random()}`} className="text-lg font-bold mt-4 mb-2">{processInlineFormatting(line.substring(3))}</h2>;
    }
    if (line.startsWith('### ')) {
      return <h3 key={`h3-${Math.random()}`} className="text-base font-semibold mt-3 mb-1">{processInlineFormatting(line.substring(4))}</h3>;
    }
    
    // Lista ordenada
    if (/^\d+\.\s/.test(line)) {
      const content = line.replace(/^\d+\.\s/, '');
      return <li key={`ol-${Math.random()}`} className="ml-6 my-1 list-decimal">{processInlineFormatting(content)}</li>;
    }
    
    // Lista no ordenada
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.substring(2);
      return <li key={`ul-${Math.random()}`} className="ml-6 my-1 list-disc">{processInlineFormatting(content)}</li>;
    }
    
    // Cita (blockquote)
    if (line.startsWith('> ')) {
      const content = line.substring(2);
      return (
        <blockquote key={`quote-${Math.random()}`} className="border-l-4 border-blue-500 pl-4 my-2 italic text-gray-700 bg-blue-50 py-2 rounded-r">
          {processInlineFormatting(content)}
        </blockquote>
      );
    }
    
    // Párrafo normal - mejor espaciado para legibilidad
    return <p key={`p-${Math.random()}`} className="my-2 leading-relaxed">{processInlineFormatting(line)}</p>;
  };
  
  // Procesar formato inline (negritas, cursivas, código, etc.)
  const processInlineFormatting = (text: string): React.ReactNode[] => {
    if (!text) return [text];
    
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    let i = 0;
    
    // Función auxiliar para encontrar el índice del siguiente asterisco que no sea parte de ** o ***
    const findSingleAsterisk = (startPos: number): number | null => {
      for (let pos = startPos; pos < text.length; pos++) {
        if (text[pos] === '*') {
          // Verificar contexto
          const prev = pos > 0 ? text[pos - 1] : '';
          const next = pos + 1 < text.length ? text[pos + 1] : '';
          const nextNext = pos + 2 < text.length ? text[pos + 2] : '';
          
          // Si es parte de ***, saltar 3 posiciones
          if (next === '*' && nextNext === '*') {
            pos += 2;
            continue;
          }
          // Si es parte de **, saltar 1 posición
          if (next === '*') {
            pos += 1;
            continue;
          }
          // Es un asterisco simple
          return pos;
        }
      }
      return null;
    };
    
    while (i < text.length) {
      // Buscar patrones en orden de prioridad
      
      // 1. ***texto*** (negrita + cursiva)
      if (text.substring(i).match(/^\*\*\*(.+?)\*\*\*/)) {
        const match = text.substring(i).match(/^\*\*\*(.+?)\*\*\*/)!;
        if (i > 0) parts.push(text.substring(0, i));
        parts.push(<strong key={`bold-italic-${currentIndex++}`}><em>{match[1]}</em></strong>);
        text = text.substring(i + match[0].length);
        i = 0;
        continue;
      }
      
      // 2. **texto** (negrita) - verificar que no sea parte de ***
      if (text.substring(i).match(/^\*\*([^*]+?)\*\*/)) {
        const match = text.substring(i).match(/^\*\*([^*]+?)\*\*/)!;
        // Verificar que no esté dentro de ***
        const before = i > 0 ? text[i - 1] : '';
        const after = i + match[0].length < text.length ? text[i + match[0].length] : '';
        if (before !== '*' && after !== '*') {
          if (i > 0) parts.push(text.substring(0, i));
          parts.push(<strong key={`bold-${currentIndex++}`} className="font-bold">{match[1]}</strong>);
          text = text.substring(i + match[0].length);
          i = 0;
          continue;
        }
      }
      
      // 3. `código`
      if (text.substring(i).match(/^`([^`]+?)`/)) {
        const match = text.substring(i).match(/^`([^`]+?)`/)!;
        if (i > 0) parts.push(text.substring(0, i));
        parts.push(<code key={`code-${currentIndex++}`} className="bg-gray-200 px-1.5 py-0.5 rounded text-sm font-mono">{match[1]}</code>);
        text = text.substring(i + match[0].length);
        i = 0;
        continue;
      }
      
      // 4. *texto* (cursiva) - solo si no es parte de ** o ***
      const singleAsterisk = findSingleAsterisk(i);
      if (singleAsterisk !== null && singleAsterisk === i) {
        // Buscar el asterisco de cierre que no sea parte de **
        const closeIndex = text.indexOf('*', i + 1);
        if (closeIndex > i + 1 && (closeIndex + 1 >= text.length || text[closeIndex + 1] !== '*')) {
          if (i > 0) parts.push(text.substring(0, i));
          parts.push(<em key={`italic-${currentIndex++}`} className="italic">{text.substring(i + 1, closeIndex)}</em>);
          text = text.substring(closeIndex + 1);
          i = 0;
          continue;
        }
      }
      
      i++;
    }
    
    // Agregar texto restante
    if (text.length > 0) {
      parts.push(text);
    }
    
    return parts.length > 0 ? parts : [text];
  };
  
  return (
    <div className={`markdown-content ${className}`}>
      {processMarkdown(text)}
    </div>
  );
};

