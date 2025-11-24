// components/RichTextDisplay.tsx
// Componente para mostrar contenido HTML de forma segura

import React from 'react';
import './RichTextEditor.css';

interface RichTextDisplayProps {
  content: string;
  className?: string;
}

export const RichTextDisplay: React.FC<RichTextDisplayProps> = ({ content, className = '' }) => {
  if (!content) {
    return null;
  }

  // Función para procesar HTML y convertir expresiones LaTeX básicas
  const processContent = (html: string): string => {
    if (!html) return '';

    let processed = html;

    // Si el HTML ya contiene elementos HTML estructurados (p, div, etc.), 
    // probablemente ya está formateado correctamente
    const hasHtmlStructure = /<[a-z][\s\S]*>/i.test(processed);

    // Primero procesar bloques de matemáticas ($$expresión$$)
    const blockMarkers: string[] = [];
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, expr) => {
      const marker = `__MATH_BLOCK_${blockMarkers.length}__`;
      blockMarkers.push(`<div class="math-block font-mono bg-gray-100 px-2 py-1 rounded my-2 text-sm whitespace-pre-wrap">${expr.trim()}</div>`);
      return marker;
    });

    // Luego procesar expresiones matemáticas inline ($expresión$)
    const inlineMarkers: string[] = [];
    processed = processed.replace(/\$([^$\n]+?)\$/g, (match, expr) => {
      if (!expr.trim()) return match;
      const marker = `__MATH_INLINE_${inlineMarkers.length}__`;
      inlineMarkers.push(`<span class="math-inline font-mono bg-gray-100 px-1 py-0.5 rounded text-xs inline-block">${expr.trim()}</span>`);
      return marker;
    });

    // Reemplazar marcadores de bloques
    blockMarkers.forEach((replacement, index) => {
      processed = processed.replace(`__MATH_BLOCK_${index}__`, replacement);
    });

    // Reemplazar marcadores inline
    inlineMarkers.forEach((replacement, index) => {
      processed = processed.replace(`__MATH_INLINE_${index}__`, replacement);
    });

    // Solo convertir saltos de línea a <br /> si no hay estructura HTML
    // o si son saltos de línea fuera de elementos HTML
    if (!hasHtmlStructure) {
      processed = processed.replace(/\n/g, '<br />');
    }

    return processed;
  };

  return (
    <div
      className={`rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: processContent(content) }}
    />
  );
};

