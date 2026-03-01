import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SecureDocumentViewer } from '@/components/Features/SecureDocumentViewer';

const SecureViewerPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const url = searchParams.get('url');
    const title = searchParams.get('title') || 'Documento';

    if (!url) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
                    <p className="text-gray-700 mb-4">No se especificó un documento para visualizar.</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Volver
                    </button>
                </div>
            </div>
        );
    }

    return (
        <SecureDocumentViewer
            documentId="external"
            title={title}
            fileUrl={url}
            onClose={() => navigate(-1)}
        />
    );
};

export default SecureViewerPage;
