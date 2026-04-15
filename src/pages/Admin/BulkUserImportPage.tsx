// pages/BulkUserImportPage.tsx
// Página para importación masiva de usuarios

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserInstitution } from '@/hooks/useUserInstitution';
import { bulkUserImportService, BulkUserData, BulkImportResult } from '@/services/bulkUserImportService';
import { institutionService } from '@/services/institutionService';
import { careerService } from '@/services/academicService';
import { subjectService } from '@/services/academicService';
import { courseService } from '@/services/teacherCourses';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import { IconUpload, IconFileText, IconUsers, IconCheck, IconX, IconXCircle, IconDownload } from '@/components/Common/Icons';

const BulkUserImportPage: React.FC = () => {
  const { user } = useAuth();
  const { institution } = useUserInstitution();
  const isSupervisor = user?.role?.name === 'supervisor';
  const [importMode, setImportMode] = useState<'manual' | 'csv' | 'excel'>('manual');
  const [csvText, setCsvText] = useState('');
  const [users, setUsers] = useState<BulkUserData[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [processingExcel, setProcessingExcel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Datos de referencia
  const [institutions, setInstitutions] = useState<Array<{ id: number; name: string }>>([]);
  const [careers, setCareers] = useState<Array<{ id: number; name: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: number; name: string; career_id?: number }>>([]);
  const [courses, setCourses] = useState<Array<{ id: number; title: string }>>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Formulario manual
  const [formData, setFormData] = useState<BulkUserData>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'student',
    institution_id: 0,
    identity_document: undefined,
    career_id: undefined,
    subject_id: undefined,
    course_id: undefined,
    position: '',
    skip_email_confirmation: true
  });

  // Si es supervisor, pre-seleccionar su institución
  useEffect(() => {
    if (isSupervisor && institution) {
      setFormData(prev => ({ ...prev, institution_id: institution.id }));
    }
  }, [isSupervisor, institution]);

  React.useEffect(() => {
    loadReferenceData();
  }, []);

  const loadReferenceData = async () => {
    try {
      setLoadingData(true);

      // Si es supervisor, solo cargar su institución
      let instData;
      if (isSupervisor && institution) {
        instData = [institution];
      } else {
        instData = await institutionService.getAllInstitutions();
      }

      const [careersData, subjectsData, coursesData] = await Promise.all([
        careerService.getActiveCareers().catch(() => []),
        subjectService.getAllSubjects().catch(() => []),
        courseService.getMyCourses(user?.id || '').catch(() => [])
      ]);

      setInstitutions(instData.map(i => ({ id: i.id, name: i.name })));
      setCareers(careersData.map(c => ({ id: c.id, name: c.name })));
      setSubjects(subjectsData.map(s => ({ id: s.id, name: s.name, career_id: s.career_id })));
      setCourses(coursesData.map(c => ({ id: c.id, title: c.title })));
    } catch (error: any) {
      console.error('Error cargando datos de referencia:', error);
      alert('Error cargando datos: ' + error.message);
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddManualUser = () => {
    const validation = bulkUserImportService.validateUserData(formData);
    if (!validation.valid) {
      alert('Errores de validación:\n' + validation.errors.join('\n'));
      return;
    }

    setUsers([...users, { ...formData }]);
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'student',
      institution_id: formData.institution_id, // Mantener institución
      identity_document: undefined,
      identity_document_type: undefined,
      career_id: undefined,
      subject_id: undefined,
      course_id: undefined,
      position: '',
      skip_email_confirmation: true
    });
  };

  const handleParseCSV = async () => {
    try {
      const parsedUsers = bulkUserImportService.parseCSV(csvText);
      if (parsedUsers.length === 0) {
        alert('No se encontraron usuarios válidos en el CSV');
        return;
      }

      await processParsedUsers(parsedUsers);
    } catch (error: any) {
      alert('Error parseando CSV: ' + error.message);
    }
  };

  const handleExcelFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar que sea un archivo Excel
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      alert('Por favor, selecciona un archivo Excel (.xlsx o .xls)');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      setProcessingExcel(true);
      const parsedUsers = await bulkUserImportService.parseExcelFile(file);

      if (parsedUsers.length === 0) {
        alert('No se encontraron usuarios válidos en el archivo Excel');
        return;
      }

      await processParsedUsers(parsedUsers);
    } catch (error: any) {
      alert('Error parseando archivo Excel: ' + error.message);
      console.error('Error:', error);
    } finally {
      setProcessingExcel(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const processParsedUsers = async (parsedUsers: BulkUserData[]) => {
    // Si es supervisor, forzar institution_id para todos los usuarios
    if (isSupervisor && institution) {
      parsedUsers.forEach(user => {
        user.institution_id = institution.id;
        user.institution_name = institution.name;
      });
    }

    // Resolver nombres a IDs
    const resolvedUsers = await bulkUserImportService.resolveIdsFromNames(
      parsedUsers,
      institutions,
      careers,
      subjects,
      courses
    );

    // Validar cada usuario
    const validUsers: BulkUserData[] = [];
    const invalidUsers: Array<{ email: string; errors: string[] }> = [];

    // Identificar usuarios por identity_document si está disponible
    const usersByIdentityDoc = new Map<string, BulkUserData>();
    parsedUsers.forEach(user => {
      if (user.identity_document) {
        const doc = user.identity_document.trim();
        if (doc.length >= 4) {
          usersByIdentityDoc.set(doc, user);
        }
      }
    });

    // Validar cada usuario (incluyendo relaciones)
    for (const user of resolvedUsers) {
      const validation = bulkUserImportService.validateUserData(user);

      // Si es supervisor, validar que el usuario pertenezca a su institución
      if (isSupervisor && institution && user.institution_id !== institution.id) {
        invalidUsers.push({
          email: user.email || user.identity_document || 'sin identificador',
          errors: [`El usuario debe pertenecer a la institución "${institution.name}"`]
        });
        continue;
      }

      if (!validation.valid) {
        invalidUsers.push({
          email: user.email || user.identity_document || 'sin identificador',
          errors: validation.errors
        });
        continue;
      }

      if (!user.institution_id) {
        invalidUsers.push({
          email: user.email || user.identity_document || 'sin identificador',
          errors: user.institution_name
            ? [`Institución "${user.institution_name}" no encontrada`]
            : ['Institución es requerida']
        });
        continue;
      }

      // Validar relaciones carrera-materia-curso
      const relationshipValidation = await bulkUserImportService.validateRelationships(
        user,
        careers,
        subjects,
        courses
      );

      if (!relationshipValidation.valid) {
        invalidUsers.push({
          email: user.email || user.identity_document || 'sin identificador',
          errors: relationshipValidation.errors
        });
        continue;
      }

      // Validar que los nombres se resolvieron correctamente
      const errors: string[] = [];
      if (user.career_name && !user.career_id) {
        errors.push(`Carrera "${user.career_name}" no encontrada`);
      }
      if (user.subject_name && !user.subject_id) {
        errors.push(`Materia "${user.subject_name}" no encontrada`);
      }
      if (user.course_name && !user.course_id) {
        errors.push(`Curso "${user.course_name}" no encontrado`);
      }

      if (errors.length > 0) {
        invalidUsers.push({
          email: user.email || user.identity_document || 'sin identificador',
          errors
        });
        continue;
      }

      // Usuario válido
      validUsers.push(user);
    }

    if (invalidUsers.length > 0) {
      const errorMsg = `Se encontraron ${invalidUsers.length} usuario(s) con errores:\n\n` +
        invalidUsers.map(u => {
          const identifier = u.email || 'sin identificador';
          return `- ${identifier}: ${u.errors.join(', ')}`;
        }).join('\n');
      alert(errorMsg);
    }

    if (validUsers.length > 0) {
      setUsers([...users, ...validUsers]);
      setCsvText('');
      alert(`Se agregaron ${validUsers.length} usuario(s) válido(s) a la lista de importación`);
    }
  };

  const handleImport = async () => {
    if (users.length === 0) {
      alert('No hay usuarios para importar');
      return;
    }

    // Si es supervisor, verificar que todos los usuarios pertenezcan a su institución
    if (isSupervisor && institution) {
      const usersFromOtherInstitution = users.filter(u =>
        u.institution_id && u.institution_id !== institution.id
      );

      if (usersFromOtherInstitution.length > 0) {
        alert(`Error: No puedes importar usuarios de otras instituciones.\n\n` +
          `${usersFromOtherInstitution.length} usuario(s) no pertenecen a "${institution.name}"`);
        return;
      }

      // Forzar institution_id para todos los usuarios
      users.forEach(user => {
        user.institution_id = institution.id;
      });
    }

    // Resolver nombres a IDs antes de importar
    const resolvedUsers = await bulkUserImportService.resolveIdsFromNames(
      users,
      institutions,
      careers,
      subjects,
      courses
    );

    // Validar que todos tengan institution_id
    const usersWithoutInstitution = resolvedUsers.filter(u => !u.institution_id);
    if (usersWithoutInstitution.length > 0) {
      alert(`Error: ${usersWithoutInstitution.length} usuario(s) no tienen institución válida:\n\n` +
        usersWithoutInstitution.map(u => `- ${u.email}: Institución "${u.institution_name || 'N/A'}" no encontrada`).join('\n'));
      return;
    }

    if (!confirm(`¿Estás seguro de importar ${users.length} usuario(s)?\n\nEsto creará los usuarios sin confirmación de email.`)) {
      return;
    }

    try {
      setImporting(true);
      setImportResult(null);

      const result = await bulkUserImportService.createBulkUsers(resolvedUsers);

      setImportResult(result);

      if (result.success_count > 0) {
        alert(
          `✅ Importación completada:\n\n` +
          `- Total: ${result.total}\n` +
          `- Exitosos: ${result.success_count}\n` +
          `- Fallidos: ${result.failed_count}`
        );

        // Limpiar lista si todo fue exitoso
        if (result.failed_count === 0) {
          setUsers([]);
        }
      } else {
        alert('❌ No se pudo importar ningún usuario. Revisa los errores.');
      }
    } catch (error: any) {
      console.error('Error importando usuarios:', error);
      alert('Error al importar usuarios: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const handleRemoveUser = (index: number) => {
    setUsers(users.filter((_, i) => i !== index));
  };

  const downloadTemplate = async () => {
    try {
      // Importar librería xlsx dinámicamente con fallback para diferentes formatos de módulo
      const xlsxModule = await import('xlsx');
      const XLSX = xlsxModule.default || xlsxModule;

      if (!XLSX || !XLSX.utils) {
        throw new Error('Estructura de la librería Excel no válida');
      }

      // Crear datos de ejemplo que muestren diferentes casos de uso válidos
      const data = [
        {
          'email': 'usuario1@ejemplo.com',
          'password': 'Password123!',
          'first_name': 'Juan',
          'last_name': 'Pérez',
          'role': 'student',
          'institution_name': 'Universidad Ejemplo',
          'identity_document': '12345678',
          'identity_document_type': 'DNI',
          'career_name': 'Ingeniería en Sistemas',
          'subject_name': '',
          'course_name': '',
          'position': ''
        },
        {
          'email': 'usuario2@ejemplo.com',
          'password': 'Password123!',
          'first_name': 'María',
          'last_name': 'González',
          'role': 'teacher',
          'institution_name': 'Universidad Ejemplo',
          'identity_document': '87654321',
          'identity_document_type': 'CEDULA',
          'career_name': 'Ingeniería en Sistemas',
          'subject_name': 'Matemáticas',
          'course_name': 'Álgebra Lineal',
          'position': 'Profesor de Matemáticas'
        },
        {
          'email': 'usuario3@ejemplo.com',
          'password': 'Password123!',
          'first_name': 'Carlos',
          'last_name': 'Rodríguez',
          'role': 'student',
          'institution_name': 'Universidad Ejemplo',
          'identity_document': '11223344',
          'identity_document_type': 'DNI',
          'career_name': 'Ingeniería en Sistemas',
          'subject_name': 'Programación',
          'course_name': 'Programación I',
          'position': ''
        },
        {
          'email': 'usuario4@ejemplo.com',
          'password': 'Password123!',
          'first_name': 'Ana',
          'last_name': 'Martínez',
          'role': 'student',
          'institution_name': 'Universidad Ejemplo',
          'identity_document': '44332211',
          'identity_document_type': 'DNI',
          'career_name': 'Ingeniería en Sistemas',
          'subject_name': '',
          'course_name': 'Base de Datos',
          'position': ''
        }
      ];

      // Crear workbook y worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      // Ajustar ancho de columnas
      ws['!cols'] = [
        { wch: 25 }, // email
        { wch: 15 }, // password
        { wch: 15 }, // first_name
        { wch: 15 }, // last_name
        { wch: 12 }, // role
        { wch: 25 }, // institution_name
        { wch: 18 }, // identity_document
        { wch: 20 }, // identity_document_type
        { wch: 25 }, // career_name
        { wch: 20 }, // subject_name
        { wch: 20 }, // course_name
        { wch: 25 }  // position
      ];

      // Agregar worksheet al workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Datos');

      // Crear hoja de instrucciones
      const instructionsData = [
        ['INSTRUCCIONES PARA PLANTILLA DE IMPORTACIÓN DE USUARIOS'],
        [''],
        ['Columnas requeridas:'],
        ['- email: Email del usuario (REQUERIDO)'],
        ['- first_name: Nombre del usuario (REQUERIDO)'],
        ['- last_name: Apellido del usuario (REQUERIDO)'],
        ['- institution_name: Nombre de la institución (REQUERIDO)'],
        [''],
        ['Columnas opcionales pero recomendadas:'],
        ['- identity_document: Documento de identidad (DNI, cédula, etc.) - IDENTIFICADOR PRINCIPAL'],
        ['  * Si se proporciona, se usa para buscar usuarios existentes antes que el email'],
        ['  * Debe tener al menos 4 caracteres, sin espacios'],
        ['  * Es único e irrepetible en el sistema'],
        ['- identity_document_type: Tipo de documento (DNI, CEDULA, PASAPORTE, LICENCIA, OTRO)'],
        [''],
        ['Columnas opcionales:'],
        ['- password: Contraseña (si no se proporciona, se genera automáticamente)'],
        ['- role: Rol del usuario. Valores aceptados:'],
        ['  * student, estudiante, alumno'],
        ['  * teacher, docente, profesor'],
        ['  * admin, administrador'],
        ['  * admin-campus, admin-campos, admincampus'],
        ['  * coordinator, coordinador'],
        ['  Default: student'],
        ['- career_name: Nombre de la carrera (debe existir en el sistema)'],
        ['- subject_name: Nombre de la materia (debe pertenecer a la carrera si se especifica)'],
        ['- course_name: Nombre del curso (debe pertenecer a la materia si se especifica)'],
        ['- position: Cargo/posición en la institución'],
        [''],
        ['NOTAS IMPORTANTES:'],
        ['1. Use NOMBRES en lugar de IDs para institución, carrera, materia y curso'],
        ['2. Los nombres deben coincidir exactamente con los registrados en el sistema'],
        ['3. El documento de identidad (identity_document) es el IDENTIFICADOR PRINCIPAL'],
        ['   * Si un usuario ya existe con ese documento, se actualizará en lugar de crear uno nuevo'],
        ['   * Si no existe por documento, se buscará por email'],
        ['   * El documento de identidad es único e irrepetible'],
        ['4. Si no se proporciona password, se generará una automáticamente'],
        ['5. Los usuarios se crearán sin confirmación de email por defecto'],
        [''],
        ['VALIDACIÓN DE RELACIONES CARRERA-MATERIA-CURSO:'],
        ['- Si proporciona carrera + materia + curso: se valida que curso pertenezca a materia y materia a carrera'],
        ['- Si proporciona carrera + curso (sin materia): se valida que el curso pertenezca a una materia de esa carrera'],
        ['- Si proporciona materia + carrera: se valida que la materia pertenezca a esa carrera'],
        ['- Si solo proporciona carrera: se asigna solo a la carrera (sin validar relaciones)'],
        [''],
        ['EJEMPLOS EN LA PLANTILLA:'],
        ['- Usuario 1: Estudiante con solo carrera (caso básico)'],
        ['- Usuario 2: Docente con carrera + materia + curso (relación completa, validada)'],
        ['- Usuario 3: Estudiante con carrera + materia + curso (relación completa, validada)'],
        ['- Usuario 4: Estudiante con carrera + curso sin materia (se valida que curso pertenezca a materia de esa carrera)'],
        [''],
        ['IMPORTANTE SOBRE RELACIONES:'],
        ['Los ejemplos muestran diferentes combinaciones válidas. Asegúrate de que:'],
        ['- Si proporciona materia, debe pertenecer a la carrera especificada'],
        ['- Si proporciona curso, debe pertenecer a la materia especificada (si hay materia)'],
        ['- Si proporciona curso sin materia, el curso debe pertenecer a una materia de la carrera'],
        [''],
        ['Ejemplos de valores:'],
        ['- role: student, teacher, admin, administrador, admin-campus, admin-campos, coordinator, coordinador'],
        ['- identity_document_type: DNI, CEDULA, PASAPORTE, LICENCIA, OTRO']
      ];

      const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
      wsInstructions['!cols'] = [{ wch: 80 }];
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

      // Descargar archivo
      XLSX.writeFile(wb, 'plantilla_importacion_usuarios.xlsx');

      alert('✅ Plantilla Excel descargada: plantilla_importacion_usuarios.xlsx');
    } catch (error: any) {
      console.error('Error generando plantilla Excel:', error);
      // Fallback a CSV si falla Excel
      const template = `email,password,first_name,last_name,role,institution_name,identity_document,identity_document_type,career_name,subject_name,course_name,position
usuario1@ejemplo.com,Password123!,Juan,Pérez,student,Universidad Ejemplo,12345678,DNI,Ingeniería en Sistemas,,,
usuario2@ejemplo.com,Password123!,María,González,teacher,Universidad Ejemplo,87654321,CEDULA,Ingeniería en Sistemas,Matemáticas,Álgebra Lineal,Profesor de Matemáticas
usuario3@ejemplo.com,Password123!,Carlos,Rodríguez,student,Universidad Ejemplo,11223344,DNI,Ingeniería en Sistemas,Programación,Programación I,
usuario4@ejemplo.com,Password123!,Ana,Martínez,student,Universidad Ejemplo,44332211,DNI,Ingeniería en Sistemas,,Base de Datos,`;

      const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'plantilla_importacion_usuarios.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert('Se descargó la plantilla en formato CSV. Para Excel, asegúrate de tener la librería xlsx instalada.');
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Importación Masiva de Usuarios</h1>
          <p className="mt-2 text-gray-600">
            Crea usuarios masivamente y asígnalos automáticamente a instituciones, carreras y cursos
          </p>
        </div>

        {/* Selector de modo */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setImportMode('manual')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${importMode === 'manual'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
          >
            <IconUsers className="w-5 h-5 inline mr-2" />
            Ingreso Manual
          </button>
          <button
            onClick={() => setImportMode('excel')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${importMode === 'excel'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
          >
            <IconFileText className="w-5 h-5 inline mr-2" />
            Importar desde Excel
          </button>
          <button
            onClick={() => setImportMode('csv')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${importMode === 'csv'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
          >
            <IconFileText className="w-5 h-5 inline mr-2" />
            Importar desde CSV
          </button>
        </div>

        {/* Modo Manual */}
        {importMode === 'manual' && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Agregar Usuario Manualmente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña (opcional, se genera automáticamente si está vacía)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apellido *
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Documento
                </label>
                <select
                  value={formData.identity_document_type || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    identity_document_type: e.target.value || undefined as any
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar tipo</option>
                  <option value="DNI">DNI</option>
                  <option value="CEDULA">Cédula</option>
                  <option value="PASAPORTE">Pasaporte</option>
                  <option value="LICENCIA">Licencia</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Documento (opcional)
                </label>
                <input
                  type="text"
                  value={formData.identity_document || ''}
                  onChange={(e) => setFormData({ ...formData, identity_document: e.target.value })}
                  placeholder="Número de documento"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Documento único e irrepetible. Mínimo 4 caracteres, sin espacios.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="student">Estudiante</option>
                  <option value="teacher">Docente</option>
                  <option value="admin">Administrador</option>
                  <option value="admin-campus">Admin Campus</option>
                  <option value="coordinator">Coordinador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Institución *
                </label>
                <select
                  value={formData.institution_id}
                  onChange={(e) => setFormData({ ...formData, institution_id: parseInt(e.target.value) })}
                  disabled={isSupervisor && institution !== null}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isSupervisor && institution ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  required
                  title={isSupervisor && institution ? `Solo puedes importar usuarios a ${institution.name}` : ''}
                >
                  <option value="0">Seleccionar...</option>
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
                {isSupervisor && institution && (
                  <p className="text-sm text-gray-500 mt-1">
                    Solo puedes importar usuarios a tu institución: <strong>{institution.name}</strong>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Carrera (opcional)
                </label>
                <select
                  value={formData.career_id || ''}
                  onChange={(e) => setFormData({ ...formData, career_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Ninguna</option>
                  {careers.map(career => (
                    <option key={career.id} value={career.id}>{career.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Materia (opcional)
                </label>
                <select
                  value={formData.subject_id || ''}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Ninguna</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Curso (opcional)
                </label>
                <select
                  value={formData.course_id || ''}
                  onChange={(e) => setFormData({ ...formData, course_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Ninguno</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cargo/Posición (opcional)
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Ej: Profesor de Matemáticas"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleAddManualUser} className="flex items-center gap-2">
                <IconUsers className="w-5 h-5" />
                Agregar a Lista
              </Button>
            </div>
          </Card>
        )}

        {/* Modo Excel */}
        {importMode === 'excel' && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Importar desde Excel</h2>
            <div className="mb-6">
              <Button
                onClick={downloadTemplate}
                variant="secondary"
                className="flex items-center gap-2 mb-2"
              >
                <IconDownload className="w-5 h-5" />
                Descargar Plantilla Excel
              </Button>
              <p className="text-sm text-gray-600">
                Descarga la plantilla Excel (.xlsx) con el formato correcto y ejemplos.
                Incluye hoja de instrucciones detalladas.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar archivo Excel (.xlsx, .xls)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelFile}
                className="hidden"
                id="excel-upload"
              />
              <label
                htmlFor="excel-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
              >
                <IconUpload className="w-5 h-5" />
                {processingExcel ? 'Procesando...' : 'Seleccionar archivo Excel'}
              </label>
              <p className="text-xs text-gray-600 mt-2">
                El archivo Excel debe tener columnas: <code>email</code> (o <code>identity_document</code>),
                <code>first_name</code>, <code>last_name</code>, <code>institution_name</code> (o <code>institution_id</code>),
                <code>identity_document</code> (identificador principal), <code>identity_document_type</code> (opcional),
                <code>career_name</code> (opcional), <code>subject_name</code> (opcional), <code>course_name</code> (opcional).
                <br />
                <strong>Importante:</strong> Se validarán las relaciones carrera-materia-curso. Si proporciona curso y materia,
                el curso debe pertenecer a esa materia. Si proporciona materia y carrera, la materia debe pertenecer a esa carrera.
              </p>
            </div>
          </Card>
        )}

        {/* Modo CSV */}
        {importMode === 'csv' && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Importar desde CSV</h2>
            <div className="mb-4">
              <Button
                onClick={downloadTemplate}
                variant="secondary"
                className="flex items-center gap-2 mb-2"
              >
                <IconDownload className="w-5 h-5" />
                Descargar Plantilla Excel
              </Button>
              <p className="text-sm text-gray-600">
                Descarga la plantilla Excel con el formato correcto para importar usuarios
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pegar contenido CSV
              </label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="email,password,first_name,last_name,role,institution_name,identity_document,identity_document_type,career_name,subject_name,course_name,position"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={10}
              />
            </div>
            <div className="mt-4">
              <Button onClick={handleParseCSV} className="flex items-center gap-2">
                <IconFileText className="w-5 h-5" />
                Parsear CSV y Agregar a Lista
              </Button>
            </div>
          </Card>
        )}

        {/* Lista de usuarios a importar */}
        {users.length > 0 && (
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                Usuarios a Importar ({users.length})
              </h2>
              <Button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Importando...
                  </>
                ) : (
                  <>
                    <IconUpload className="w-5 h-5" />
                    Importar {users.length} Usuario(s)
                  </>
                )}
              </Button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.map((user, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-gray-600">{user.email}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Rol: {user.role} | Institución: {user.institution_id
                        ? institutions.find(i => i.id === user.institution_id)?.name || user.institution_id
                        : user.institution_name || 'N/A'}
                      {user.career_id && ` | Carrera: ${careers.find(c => c.id === user.career_id)?.name || user.career_id}`}
                      {user.career_name && !user.career_id && ` | Carrera: ${user.career_name} (no encontrada)`}
                      {user.course_id && ` | Curso: ${courses.find(c => c.id === user.course_id)?.title || user.course_id}`}
                      {user.course_name && !user.course_id && ` | Curso: ${user.course_name} (no encontrado)`}
                      {user.identity_document && ` | Doc: ${user.identity_document_type ? `${user.identity_document_type} ` : ''}${user.identity_document}`}
                      {!user.email && user.identity_document && ` (identificado por documento)`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveUser(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <IconX className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Resultados de importación */}
        {importResult && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Resultados de Importación</h2>
            <div className="mb-4">
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="font-medium">Total:</span> {importResult.total}
                </div>
                <div className="text-sm text-green-600">
                  <span className="font-medium">Exitosos:</span> {importResult.success_count}
                </div>
                <div className="text-sm text-red-600">
                  <span className="font-medium">Fallidos:</span> {importResult.failed_count}
                </div>
              </div>
            </div>
            {importResult.failed_count > 0 && (
              <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                <h3 className="font-medium text-red-600">Usuarios con errores:</h3>
                {importResult.results
                  .filter(r => !r.success)
                  .map((result, index) => (
                    <div key={index} className="p-2 bg-red-50 rounded text-sm">
                      <div className="font-medium">
                        {result.email || result.identity_document || 'Usuario sin identificador'}
                      </div>
                      <div className="text-red-600">{result.error}</div>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        )}

        {/* Advertencia importante */}
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <IconXCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-900 mb-1">⚠️ Importante</h3>
              <p className="text-sm text-yellow-800">
                Los usuarios se crearán en <code>public.users</code> pero para crear usuarios en <code>auth.users</code>
                sin confirmación de email, se requiere usar Supabase Admin API desde un backend seguro o Edge Function.
                Los usuarios creados aquí necesitarán hacer signup normal o ser creados mediante Admin API.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BulkUserImportPage;

