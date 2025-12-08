// =====================================================
// Ejemplo de Integración del Visor Seguro de PDF
// Este archivo muestra cómo usar SecurePDFViewer
// en diferentes contextos de la aplicación
// =====================================================

import React, { useState } from 'react';
import SecurePDFViewer from '../components/SecurePDFViewer';
import { Material } from '../services/teacherCourses';

// =====================================================
// EJEMPLO 1: Integración Simple en Lista de Materiales
// =====================================================

export const SimpleMaterialsList: React.FC<{ materials: Material[] }> = ({ materials }) => {
    const [pdfViewer, setPdfViewer] = useState({
        isOpen: false,
        url: '',
        title: ''
    });

    const handleViewPDF = (material: Material) => {
        setPdfViewer({
            isOpen: true,
            url: material.url || '',
            title: material.title
        });
    };

    return (
        <div className="materials-list">
            {materials.map(material => (
                <div key={material.id} className="material-item">
                    <h3>{material.title}</h3>
                    {material.description && <p>{material.description}</p>}

                    {/* Mostrar botón de visualización solo para PDFs */}
                    {(material.kind === 'pdf' || material.url?.endsWith('.pdf')) && (
                        <button
                            onClick={() => handleViewPDF(material)}
                            className="btn-view-pdf"
                        >
                            Ver Documento Protegido
                        </button>
                    )}
                </div>
            ))}

            {/* Visor seguro de PDF */}
            <SecurePDFViewer
                pdfUrl={pdfViewer.url}
                title={pdfViewer.title}
                isOpen={pdfViewer.isOpen}
                onClose={() => setPdfViewer({ isOpen: false, url: '', title: '' })}
            />
        </div>
    );
};

// =====================================================
// EJEMPLO 2: Integración con SessionDetailPage
// Para mostrar PDFs en el contexto de una sesión de curso
// =====================================================

export const SessionPDFViewer: React.FC<{
    sessionMaterials: Material[];
    sessionTitle: string;
}> = ({ sessionMaterials, sessionTitle }) => {
    const [activePDF, setActivePDF] = useState<{
        isOpen: boolean;
        material: Material | null;
    }>({
        isOpen: false,
        material: null
    });

    const pdfMaterials = sessionMaterials.filter(
        m => m.kind === 'pdf' || m.url?.endsWith('.pdf')
    );

    const openPDF = (material: Material) => {
        setActivePDF({ isOpen: true, material });
    };

    const closePDF = () => {
        setActivePDF({ isOpen: false, material: null });
    };

    return (
        <div className="session-pdf-section">
            <h2>Materiales de Lectura - {sessionTitle}</h2>

            <div className="pdf-materials-grid">
                {pdfMaterials.map(material => (
                    <div key={material.id} className="pdf-card">
                        <div className="pdf-icon">📄</div>
                        <h4>{material.title}</h4>
                        {material.description && (
                            <p className="pdf-description">{material.description}</p>
                        )}
                        <button
                            onClick={() => openPDF(material)}
                            className="btn-open-pdf"
                        >
                            Abrir Documento
                        </button>
                    </div>
                ))}
            </div>

            {activePDF.material && (
                <SecurePDFViewer
                    pdfUrl={activePDF.material.url || ''}
                    title={activePDF.material.title}
                    isOpen={activePDF.isOpen}
                    onClose={closePDF}
                />
            )}
        </div>
    );
};

// =====================================================
// EJEMPLO 3: Integración con MaterialDisplay.tsx
// Modificar el componente existente para usar el visor seguro
// =====================================================

export const EnhancedMaterialDisplay: React.FC<{
    material: Material;
    showFullPlayer?: boolean;
}> = ({ material, showFullPlayer = false }) => {
    const [showSecurePDF, setShowSecurePDF] = useState(false);

    // Detectar si es PDF
    const isPDF = material.kind === 'pdf' || material.url?.endsWith('.pdf');

    // Verificar si el material debe mostrarse con visor seguro
    // (puede basarse en metadata o configuración del material)
    const useSecureViewer = material.metadata?.secure_viewing === true ||
        material.allow_download === false;

    if (isPDF && useSecureViewer) {
        return (
            <div className="material-display-pdf-secure">
                <div className="pdf-preview-card">
                    <div className="pdf-preview-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M14 2V8H20"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <h3>{material.title}</h3>
                    {material.description && <p>{material.description}</p>}

                    <div className="pdf-info">
                        <span className="pdf-badge">📄 Documento PDF</span>
                        <span className="security-badge">🔒 Vista Protegida</span>
                    </div>

                    <button
                        onClick={() => setShowSecurePDF(true)}
                        className="btn-view-secure-pdf"
                    >
                        Ver en Modo Seguro
                    </button>
                </div>

                <SecurePDFViewer
                    pdfUrl={material.url || ''}
                    title={material.title}
                    isOpen={showSecurePDF}
                    onClose={() => setShowSecurePDF(false)}
                />
            </div>
        );
    }

    // Para otros materiales o PDFs no seguros, usar el componente original
    return (
        <div className="material-display-default">
            {/* Renderizado normal del MaterialDisplay */}
            <p>Material: {material.title}</p>
        </div>
    );
};

// =====================================================
// EJEMPLO 4: Hook Personalizado para Gestión de PDF
// =====================================================

export const usePDFViewer = () => {
    const [viewerState, setViewerState] = useState<{
        isOpen: boolean;
        pdfUrl: string;
        title: string;
        bucket?: string;
    }>({
        isOpen: false,
        pdfUrl: '',
        title: '',
        bucket: 'materials'
    });

    const openPDF = (url: string, title: string, bucket: string = 'materials') => {
        setViewerState({
            isOpen: true,
            pdfUrl: url,
            title,
            bucket
        });
    };

    const closePDF = () => {
        setViewerState({
            isOpen: false,
            pdfUrl: '',
            title: '',
            bucket: 'materials'
        });
    };

    const PDFViewerComponent = () => (
        <SecurePDFViewer
            pdfUrl={viewerState.pdfUrl}
            title={viewerState.title}
            isOpen={viewerState.isOpen}
            onClose={closePDF}
            bucket={viewerState.bucket}
        />
    );

    return {
        openPDF,
        closePDF,
        PDFViewerComponent,
        isOpen: viewerState.isOpen
    };
};

// Uso del hook:
// const { openPDF, PDFViewerComponent } = usePDFViewer();
// 
// <button onClick={() => openPDF(material.url, material.title)}>
//   Ver PDF
// </button>
// 
// <PDFViewerComponent />

// =====================================================
// EJEMPLO 5: Integración con Contexto/Provider
// Para gestionar el visor a nivel global de la aplicación
// =====================================================

import { createContext, useContext, ReactNode } from 'react';

interface PDFViewerContextType {
    openPDF: (url: string, title: string, bucket?: string) => void;
    closePDF: () => void;
}

const PDFViewerContext = createContext<PDFViewerContextType | undefined>(undefined);

export const PDFViewerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { openPDF, closePDF, PDFViewerComponent } = usePDFViewer();

    return (
        <PDFViewerContext.Provider value={{ openPDF, closePDF }}>
            {children}
            <PDFViewerComponent />
        </PDFViewerContext.Provider>
    );
};

export const usePDFViewerContext = () => {
    const context = useContext(PDFViewerContext);
    if (!context) {
        throw new Error('usePDFViewerContext must be used within PDFViewerProvider');
    }
    return context;
};

// Uso en App.tsx:
// <PDFViewerProvider>
//   <Routes>
//     ...
//   </Routes>
// </PDFViewerProvider>
//
// Uso en cualquier componente:
// const { openPDF } = usePDFViewerContext();
// <button onClick={() => openPDF(url, title)}>Ver PDF</button>

// =====================================================
// EJEMPLO 6: URLs de Supabase Storage
// Cómo construir correctamente las URLs
// =====================================================

export const SupabaseURLExamples = {
    // URL pública (si el bucket es público)
    publicURL: 'https://your-project.supabase.co/storage/v1/object/public/materials/course-1/document.pdf',

    // Construir URL programáticamente
    buildPublicURL: (bucket: string, path: string) => {
        const supabaseURL = import.meta.env.VITE_SUPABASE_URL;
        return `${supabaseURL}/storage/v1/object/public/${bucket}/${path}`;
    },

    // Ejemplo de uso con material de la base de datos
    getMaterialURL: (material: Material) => {
        // Si el material ya tiene una URL completa, usarla
        if (material.url?.startsWith('http')) {
            return material.url;
        }

        // Si solo tiene el path, construir la URL
        const supabaseURL = import.meta.env.VITE_SUPABASE_URL;
        const bucket = material.metadata?.bucket || 'materials';
        return `${supabaseURL}/storage/v1/object/public/${bucket}/${material.url}`;
    }
};

// =====================================================
// EJEMPLO 7: Integración con Permissions/Roles
// Mostrar visor seguro solo a ciertos roles
// =====================================================

import { useAuth } from '../contexts/AuthContext';

export const RoleBasedPDFViewer: React.FC<{ material: Material }> = ({ material }) => {
    const { user } = useAuth();
    const [showPDF, setShowPDF] = useState(false);

    // Solo estudiantes ven el visor seguro
    // Profesores y admins pueden descargar
    const useSecureViewer = user?.role === 'student';

    const isPDF = material.kind === 'pdf' || material.url?.endsWith('.pdf');

    if (!isPDF) {
        return <div>No es un PDF</div>;
    }

    if (useSecureViewer) {
        return (
            <>
                <button onClick={() => setShowPDF(true)}>
                    Ver Documento (Solo Lectura)
                </button>
                <SecurePDFViewer
                    pdfUrl={material.url || ''}
                    title={material.title}
                    isOpen={showPDF}
                    onClose={() => setShowPDF(false)}
                />
            </>
        );
    }

    // Profesores/Admins pueden descargar
    return (
        <div>
            <a
                href={material.url}
                download
                className="btn-download"
            >
                Descargar PDF
            </a>
        </div>
    );
};

// =====================================================
// ESTILOS CSS SUGERIDOS
// Agregar estos estilos a tu archivo CSS global o módulo
// =====================================================

export const suggestedStyles = `
/* Botones para abrir PDFs */
.btn-view-pdf,
.btn-open-pdf,
.btn-view-secure-pdf {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-view-pdf:hover,
.btn-open-pdf:hover,
.btn-view-secure-pdf:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* Card de preview de PDF */
.pdf-preview-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  transition: all 0.3s ease;
}

.pdf-preview-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.pdf-preview-icon {
  color: #3b82f6;
  margin-bottom: 16px;
}

/* Badges de información */
.pdf-badge,
.security-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin: 8px 4px;
}

.pdf-badge {
  background: #dbeafe;
  color: #1e40af;
}

.security-badge {
  background: #fef3c7;
  color: #92400e;
}

/* Grid de materiales PDF */
.pdf-materials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.pdf-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  transition: all 0.3s ease;
}

.pdf-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #3b82f6;
}

.pdf-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.pdf-description {
  font-size: 14px;
  color: #6b7280;
  margin: 12px 0;
  line-height: 1.5;
}
`;
