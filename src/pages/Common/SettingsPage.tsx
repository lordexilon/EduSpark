import React, { useState, useEffect } from 'react';
import Card from '@/components/Common/Card';
import { IconCog, IconPalette, IconCheck, IconSave, IconBuilding, IconMail, IconPhone, IconMapPin, IconGlobe } from '@/components/Common/Icons';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, Theme } from '@/context/ThemeContext';
import { useUserInstitution } from '@/hooks/useUserInstitution';
import { institutionService } from '@/services/institutionService';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { institution, loading: loadingInst, refreshInstitution } = useUserInstitution();

  const [activeTab, setActiveTab] = useState<'general' | 'appearance'>('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');

  const isAdmin = user?.role?.name === 'admin' || user?.role?.name === 'coordinator' || user?.role?.name === 'admin-campus' || user?.role?.name === 'supervisor';

  useEffect(() => {
    if (institution) {
      setName(institution.name || '');
      setDescription(institution.description || '');
      setWebsite(institution.website || '');
      setAddress(institution.address || '');
      setEmail(institution.email || '');
    }
  }, [institution]);

  const handleSave = async () => {
    if (!institution) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await institutionService.updateInstitution(institution.id, {
        name,
        description,
        website,
        address,
        email
      });

      await refreshInstitution();
      setSuccess('Configuración guardada exitosamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const themes: { id: Theme; name: string; color: string; border: string }[] = [
    { id: 'blue', name: 'Azul (Por defecto)', color: 'bg-blue-50', border: 'border-blue-200' },
    { id: 'slate', name: 'Neutro', color: 'bg-slate-50', border: 'border-slate-200' },
    { id: 'gray', name: 'Alto Contraste', color: 'bg-gray-100', border: 'border-gray-200' },
    { id: 'indigo', name: 'Moderno', color: 'bg-indigo-50', border: 'border-indigo-200' },
    { id: 'corporate', name: 'Corporativo', color: 'bg-slate-100', border: 'border-slate-200' }
  ];

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-center py-8">
            <IconCog className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Acceso Restringido</h2>
            <p className="text-gray-600">No tienes permisos para acceder a esta sección.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (loadingInst) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <IconCog className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Configuración General</h1>
            <p className="text-gray-600">Parámetros del sistema y apariencia</p>
          </div>
        </div>
        {activeTab === 'general' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <IconSave className="w-5 h-5" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'general' ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
            }`}
          onClick={() => setActiveTab('general')}
        >
          Información General
          {activeTab === 'general' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></span>
          )}
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'appearance' ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
            }`}
          onClick={() => setActiveTab('appearance')}
        >
          Apariencia
          {activeTab === 'appearance' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></span>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 mb-6">
          {success}
        </div>
      )}

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <IconBuilding className="w-5 h-5 text-gray-500" />
                Datos de la Institución
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <IconMapPin className="w-5 h-5 text-gray-500" />
                Contacto y Ubicación
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <IconGlobe className="w-4 h-4 text-gray-400" />
                    Sitio Web
                  </label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <IconMail className="w-4 h-4 text-gray-400" />
                    Email de Contacto
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <IconMapPin className="w-4 h-4 text-gray-400" />
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'appearance' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <IconPalette className="w-5 h-5 text-gray-500" />
              Tema de la interfaz
            </h3>
            <p className="text-gray-600 mb-6">Selecciona el esquema de colores que prefieres para la aplicación.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`relative p-4 rounded-lg border-2 text-left transition-all ${theme === t.id
                    ? `border-primary ring-2 ring-primary/20 ${t.color}`
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-semibold ${theme === t.id ? 'text-primary' : 'text-gray-700'}`}>
                      {t.name}
                    </span>
                    {theme === t.id && <IconCheck className="w-5 h-5 text-primary" />}
                  </div>
                  <div className={`w-full h-12 rounded border ${t.border} ${t.color}`}></div>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
