// Página de prueba para el visor PDF seguro
import React, { useState, useEffect } from 'react';
import SecurePDFViewer from '@/components/Features/SecurePDFViewer';
import { supabase } from '@/lib/supabase';

export default function TestPDFViewer() {
  const [viewer, setViewer] = useState({
    isOpen: false,
    url: '',
    title: '',
  });
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar archivos reales del bucket
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from('materials')
        .list('', { limit: 20, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) throw error;
      setFiles(data || []);
    } catch (err: any) {
      console.error('Error cargando archivos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openPDF = (fileName: string) => {
    // Construimos la URL pública (el visor se encargará de firmarla si es necesario)
    // NOTA: Aunque sea pública aquí, el bucket es privado, así que el visor
    // usará createSignedUrl internamente.
    const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/materials/${fileName}`;
    setViewer({ isOpen: true, url, title: fileName });
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔒 Test de Visor PDF Seguro</h1>

      <div
        style={{
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <h3 style={{ marginTop: 0 }}>✅ Estado del Sistema</h3>
        <ul style={{ marginBottom: 0 }}>
          <li>
            ✅ Bucket: <strong>materials</strong> (Privado)
          </li>
          <li>
            ✅ Archivos encontrados: <strong>{files.length}</strong>
          </li>
        </ul>
      </div>

      {error && (
        <div
          style={{
            padding: '16px',
            background: '#fee2e2',
            color: '#b91c1c',
            borderRadius: '8px',
            marginBottom: '20px',
          }}
        >
          ❌ Error: {error}
        </div>
      )}

      <h2>📂 Archivos en tu Bucket 'materials':</h2>

      {loading ? (
        <p>Cargando archivos...</p>
      ) : files.length === 0 ? (
        <div
          style={{
            padding: '20px',
            background: '#f3f4f6',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <p>⚠️ No hay archivos en el bucket 'materials'.</p>
          <p>Por favor sube un PDF en el panel de Supabase.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {files.map((file) => (
            <div
              key={file.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                background: 'white',
              }}
            >
              <div>
                <strong>{file.name}</strong>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {(file.metadata?.size / 1024 / 1024).toFixed(2)} MB •{' '}
                  {new Date(file.created_at).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => openPDF(file.name)}
                style={{
                  padding: '8px 16px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Abrir Seguro 🔒
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: '32px',
          padding: '16px',
          background: '#e0f2fe',
          borderRadius: '8px',
          border: '1px solid #38bdf8',
        }}
      >
        <h3 style={{ marginTop: 0 }}>💡 Instrucciones de Prueba:</h3>
        <ol>
          <li>Haz clic en "Abrir Seguro" en cualquiera de los archivos arriba.</li>
          <li>Verifica que el PDF cargue correctamente.</li>
          <li>Intenta descargar (Ctrl+S) o imprimir (Ctrl+P).</li>
        </ol>
      </div>

      <SecurePDFViewer
        pdfUrl={viewer.url}
        title={viewer.title}
        isOpen={viewer.isOpen}
        onClose={() => setViewer({ isOpen: false, url: '', title: '' })}
      />
    </div>
  );
}
