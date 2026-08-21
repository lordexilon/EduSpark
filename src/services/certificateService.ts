// services/certificateService.ts
import { supabase } from '@/lib/supabase';
import { jsPDF } from 'jspdf';

export interface CertificateData {
  studentName: string;
  courseTitle: string;
  completionDate: string;
  grade?: number;
  verificationCode: string;
  institutionLogo?: string;
}

export const certificateService = {
  /**
   * Genera un PDF de certificado profesional
   */
  async generatePDF(data: CertificateData): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // 🎨 Diseño del Certificado
    // Borde decorativo
    doc.setDrawColor(63, 81, 181); // Indigo
    doc.setLineWidth(2);
    doc.rect(5, 5, 287, 200);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 277, 190);

    // Encabezado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(40);
    doc.setTextColor(30, 41, 59); // Slate-900
    doc.text('CERTIFICADO DE COMPLETITUD', 148, 50, { align: 'center' });

    doc.setFontSize(20);
    doc.setFont('helvetica', 'normal');
    doc.text('Este documento certifica que', 148, 70, { align: 'center' });

    // Nombre del Estudiante
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(35);
    doc.setTextColor(63, 81, 181);
    doc.text(data.studentName.toUpperCase(), 148, 90, { align: 'center' });

    // Detalle del Logro
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('ha completado exitosamente el curso', 148, 110, { align: 'center' });

    // Título del Curso
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(25);
    doc.text(`"${data.courseTitle}"`, 148, 125, { align: 'center' });

    // Fecha y Firma (Placeholder)
    doc.setFontSize(14);
    doc.text(`Fecha de emisión: ${data.completionDate}`, 148, 150, { align: 'center' });

    // Pie de página con código de verificación
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(`Código de Verificación: ${data.verificationCode}`, 148, 190, { align: 'center' });
    doc.text('Verifica este certificado en: eduspark.io/verify', 148, 195, { align: 'center' });

    return doc.output('blob');
  },

  /**
   * Registra el certificado en la base de datos
   */
  async issueCertificate(
    studentId: string,
    courseId: number,
    metadata: any = {}
  ): Promise<string | null> {
    const verificationCode = `ESP-${courseId}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const { data, error } = await supabase
      .from('digital_certificates')
      .insert({
        student_id: studentId,
        course_id: courseId,
        certificate_code: verificationCode,
        metadata: metadata,
      })
      .select('certificate_code')
      .single();

    if (error) {
      console.error('Error al registrar certificado:', error);
      return null;
    }

    return data.certificate_code;
  },
};
