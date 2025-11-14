/**
 * Componente de Formulario de Registro
 * Para nuevos usuarios del sistema EduSpark
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Mail, Lock, User, Loader2, ArrowLeft, UserPlus } from 'lucide-react';
import { rolesAPI } from '../services/api';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

interface Role {
  id: number;
  name: string;
  description?: string;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const { register, loading, user } = useAuth();
  const isAdmin = user?.role?.name === 'admin';
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    roleId: isAdmin ? '' : '1' // Solo estudiantes por defecto, admin puede elegir (1=student)
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

          // Cargar roles disponibles solo si es administrador
          useEffect(() => {
            if (isAdmin) {
              const loadRoles = async () => {
                try {
                  const result = await rolesAPI.getRoles();
                  
                  if (result.success && result.data) {
                    setRoles(result.data);
                  } else {
                    console.error('Error al cargar roles:', result.error);
                  }
                } catch (error) {
                  console.error('Error al cargar roles:', error);
                } finally {
                  setLoadingRoles(false);
                }
              };

              loadRoles();
            } else {
              // Si no es admin, no necesita cargar roles
              setLoadingRoles(false);
            }
          }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError('Todos los campos son requeridos');
      return;
    }

    // ⚠️ SEGURIDAD: Todos los usuarios se crean como estudiantes (role_id: 1)
    // El rol solo puede ser cambiado DESPUÉS del registro por un administrador
    // Esto previene que alguien se registre como admin durante el proceso de registro
    // Mapeo correcto: 1=student, 2=teacher, 3=admin, 4=coordinator
    const roleIdToUse = 1; // Siempre estudiante, sin excepción

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      const result = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email.trim().toLowerCase(), // Normalizar email
        password: formData.password,
        roleId: roleIdToUse
      });
      
      if (result.success) {
        // Limpiar el formulario
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          confirmPassword: '',
          roleId: isAdmin ? '' : '1' // Siempre estudiante (1=student) por defecto
        });
        setError('');
        onSuccess?.();
      } else {
        setError(result.error || 'Error en el registro. Por favor, verifica los datos e intenta nuevamente.');
      }
    } catch (error: any) {
      console.error('Error inesperado en registro:', error);
      setError(error?.message || 'Ocurrió un error inesperado. Por favor, intenta nuevamente.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
        <div className="text-center mb-6">
          <div className="flex items-center justify-between mb-4">
            {onSwitchToLogin && (
              <button
                onClick={onSwitchToLogin}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Únete a EduSpark!
              </h2>
              <p className="text-gray-600">
                Crea tu cuenta y comienza a aprender
              </p>
            </div>
            {onSwitchToLogin && <div className="w-5"></div>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-3 py-3 pl-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200"
                  placeholder="Nombre"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Apellido
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200"
                placeholder="Apellido"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-3 pl-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200"
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          {/* Solo mostrar selector de roles si es administrador */}
          {isAdmin ? (
            <div>
              <label htmlFor="roleId" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Cuenta <span className="text-red-500">*</span>
              </label>
              <select
                id="roleId"
                name="roleId"
                value={formData.roleId}
                onChange={handleChange}
                className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200"
                disabled={loadingRoles}
                required
              >
                {loadingRoles ? (
                  <option>Cargando roles...</option>
                ) : roles.length === 0 ? (
                  <option>No hay roles disponibles</option>
                ) : (
                  <>
                    <option value="">Selecciona un rol</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name === 'admin' ? 'Administrador' : 
                         role.name === 'teacher' ? 'Docente' : 
                         role.name === 'student' ? 'Estudiante' : role.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Como administrador, puedes asignar el rol del nuevo usuario
              </p>
            </div>
           ) : (
             <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
               <p className="text-sm text-blue-800">
                 <strong>Nota:</strong> Todas las cuentas nuevas se crean como <strong>Estudiante</strong>. Un administrador puede cambiar tu rol después del registro si es necesario.
               </p>
             </div>
           )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-3 pl-10 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200"
                placeholder="Mínimo 6 caracteres"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-3 py-3 pl-10 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200"
                placeholder="Repite tu contraseña"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || loadingRoles}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Creando cuenta...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Crear Cuenta
              </>
            )}
          </button>
        </form>

        {onSwitchToLogin && (
          <div className="mt-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">¿Ya tienes cuenta?</span>
              </div>
            </div>
            <button
              onClick={onSwitchToLogin}
              className="mt-4 w-full bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center"
            >
              Iniciar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterForm;
