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

  return (
    <div 
      className={`rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

