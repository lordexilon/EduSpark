// components/Features/CertificateButton.tsx
import React, { useState } from 'react';
import { certificateService } from '@/services/certificateService';
import { IconAward, IconDownload, IconLoader } from '@/components/Common/Icons';

interface Props {
    studentId: string;
    studentName: string;
    courseId: number;
    courseTitle: string;
    progress: number; // 0-100
}

export const CertificateButton: React.FC<Props> = ({
    studentId,
    studentName,
    courseId,
    courseTitle,
    progress
}) => {
    const [loading, setLoading] = useState(false);
    const isCompleted = progress >= 100;

    const handleDownload = async () => {
        if (!isCompleted) return;
        setLoading(true);
        try {
            const code = await certificateService.issueCertificate(studentId, courseId);
            if (!code) throw new Error("Error emitiendo certificado");

            const pdfBlob = await certificateService.generatePDF({
                studentName,
                courseTitle,
                completionDate: new Date().toLocaleDateString(),
                verificationCode: code
            });

            const url = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Certificado_${courseTitle.replace(/\s/g, '_')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error(error);
            alert("Hubo un error al generar tu certificado.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-2 w-full">
            <button
                onClick={handleDownload}
                disabled={!isCompleted || loading}
                className={`w-full py-4 px-6 rounded-xl flex items-center justify-center gap-3 text-lg font-bold transition-all shadow-lg transform hover:scale-[1.02] active:scale-[0.98] ${isCompleted
                        ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 text-white border-none cursor-pointer'
                        : 'bg-slate-100 text-slate-400 border-dashed border-2 border-slate-200 cursor-not-allowed'
                    }`}
            >
                {loading ? (
                    <IconLoader className="w-6 h-6 animate-spin" />
                ) : (
                    <IconAward className={`w-6 h-6 ${isCompleted ? 'animate-bounce text-white' : 'text-slate-300'}`} />
                )}
                <span className="uppercase tracking-wide">
                    {isCompleted ? '¡Obtener mi Certificado!' : 'Meta: 100% para Certificación'}
                </span>
            </button>
            {!isCompleted && (
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
                    <div
                        className="bg-indigo-500 h-full transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
            {!isCompleted && (
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Progreso actual: {Math.round(progress)}%
                </p>
            )}
        </div>
    );
};
