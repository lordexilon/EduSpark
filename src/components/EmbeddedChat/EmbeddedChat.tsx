import React from 'react';

interface EmbeddedChatProps {
  chatUrl?: string;
}

export const EmbeddedChat: React.FC<EmbeddedChatProps> = ({
  chatUrl = 'http://localhost:3080/',
}) => {
  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
      <div className="bg-slate-800 dark:bg-slate-950 text-white px-4 py-3 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
          <h2 className="font-semibold tracking-wide">Asistente Inteligente</h2>
        </div>
        <div className="text-xs text-slate-400 font-medium bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
          Powered by RAG AI
        </div>
      </div>
      <div className="flex-1 w-full bg-white dark:bg-slate-900 relative">
        <iframe
          src={chatUrl}
          className="absolute inset-0 w-full h-full border-0"
          title="LibreChat AI"
          allow="microphone; camera"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
};
