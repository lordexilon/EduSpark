import React from 'react';
import { useUiLang, setUiLang } from '@/hooks/useUiLang';

/**
 * Selector ES / GN (Ley de Lenguas). Por ahora prioriza textos de la tarjeta «Información general» en vista de curso; el alcance puede ampliarse.
 */
const UiLangToggle: React.FC = () => {
  const locale = useUiLang();

  return (
    <div
      className="flex items-center rounded-lg border border-border overflow-hidden text-[11px] sm:text-xs font-bold uppercase tracking-wide shrink-0"
      role="group"
      aria-label="Idioma de la interfaz: español o guaraní"
    >
      <button
        type="button"
        onClick={() => setUiLang('es')}
        className={`px-2 py-1.5 sm:px-2.5 transition-colors ${
          locale === 'es'
            ? 'bg-primary text-white'
            : 'bg-background text-text-light hover:bg-muted dark:hover:bg-brand-dark'
        }`}
        title="Español"
      >
        ES
      </button>
      <button
        type="button"
        onClick={() => setUiLang('gn')}
        className={`px-2 py-1.5 sm:px-2.5 transition-colors border-l border-border ${
          locale === 'gn'
            ? 'bg-primary text-white'
            : 'bg-background text-text-light hover:bg-muted dark:hover:bg-brand-dark'
        }`}
        title="Avañe'ẽ (guaraní)"
      >
        GN
      </button>
    </div>
  );
};

export default UiLangToggle;
