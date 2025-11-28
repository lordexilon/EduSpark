import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { landingConfigService, LandingConfig, GalleryImage, FeaturedStudent } from '../services/landingConfigService';
import { IconSave, IconPlus, IconTrash, IconAlertCircle } from '../components/Icons';

const LandingPageConfigPage: React.FC = () => {
    const { user } = useAuth();
    const [config, setConfig] = useState<LandingConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form state
    const [brandName, setBrandName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [heroTitle, setHeroTitle] = useState('');
    const [heroSubtitle, setHeroSubtitle] = useState('');
    const [heroImageUrl, setHeroImageUrl] = useState('');
    const [heroButtonText, setHeroButtonText] = useState('Ver Cursos Disponibles');
    const [philosophyTitle, setPhilosophyTitle] = useState('Nuestra Filosofía');
    const [philosophyContent, setPhilosophyContent] = useState('');
    const [notificationText, setNotificationText] = useState('');
    const [notificationEnabled, setNotificationEnabled] = useState(true);
    const [primaryColor, setPrimaryColor] = useState('#2563eb');
    const [secondaryColor, setSecondaryColor] = useState('#1e40af');
    const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
    const [featuredStudents, setFeaturedStudents] = useState<FeaturedStudent[]>([]);
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactWhatsapp, setContactWhatsapp] = useState('');
    const [contactAddress, setContactAddress] = useState('');
    const [calendarEmbedUrl, setCalendarEmbedUrl] = useState('');

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await landingConfigService.getForCurrentUser();

            if (data) {
                setConfig(data);
                // Populate form
                setBrandName(data.brand_name);
                setLogoUrl(data.logo_url || '');
                setHeroTitle(data.hero_title);
                setHeroSubtitle(data.hero_subtitle);
                setHeroImageUrl(data.hero_image_url || '');
                setHeroButtonText(data.hero_button_text);
                setPhilosophyTitle(data.philosophy_title);
                setPhilosophyContent(data.philosophy_content || '');
                setNotificationText(data.notification_text || '');
                setNotificationEnabled(data.notification_enabled);
                setPrimaryColor(data.primary_color);
                setSecondaryColor(data.secondary_color);
                setGalleryImages(data.gallery_images || []);
                setFeaturedStudents(data.featured_students || []);
                setContactEmail(data.contact_email || '');
                setContactPhone(data.contact_phone || '');
                setContactWhatsapp(data.contact_whatsapp || '');
                setContactAddress(data.contact_address || '');
                setCalendarEmbedUrl(data.calendar_embed_url || '');
            }
        } catch (err) {
            console.error('Error loading config:', err);
            setError('Error al cargar la configuración');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            const updatedConfig = {
                brand_name: brandName,
                logo_url: logoUrl,
                hero_title: heroTitle,
                hero_subtitle: heroSubtitle,
                hero_image_url: heroImageUrl,
                hero_button_text: heroButtonText,
                philosophy_title: philosophyTitle,
                philosophy_content: philosophyContent,
                notification_text: notificationText,
                notification_enabled: notificationEnabled,
                primary_color: primaryColor,
                secondary_color: secondaryColor,
                gallery_images: galleryImages,
                featured_students: featuredStudents,
                contact_email: contactEmail,
                contact_phone: contactPhone,
                contact_whatsapp: contactWhatsapp,
                contact_address: contactAddress,
                calendar_embed_url: calendarEmbedUrl,
            };

            if (config) {
                await landingConfigService.update(config.id, updatedConfig);
            }

            setSuccess('Configuración guardada exitosamente');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error saving config:', err);
            setError('Error al guardar la configuración');
        } finally {
            setSaving(false);
        }
    };

    const addGalleryImage = () => {
        setGalleryImages([...galleryImages, { url: '', caption: '' }]);
    };

    const updateGalleryImage = (index: number, field: keyof GalleryImage, value: string) => {
        const updated = [...galleryImages];
        updated[index] = { ...updated[index], [field]: value };
        setGalleryImages(updated);
    };

    const removeGalleryImage = (index: number) => {
        setGalleryImages(galleryImages.filter((_, i) => i !== index));
    };

    const addFeaturedStudent = () => {
        setFeaturedStudents([...featuredStudents, { name: '', career: '', place: '', image: '' }]);
    };

    const updateFeaturedStudent = (index: number, field: keyof FeaturedStudent, value: string) => {
        const updated = [...featuredStudents];
        updated[index] = { ...updated[index], [field]: value };
        setFeaturedStudents(updated);
    };

    const removeFeaturedStudent = (index: number) => {
        setFeaturedStudents(featuredStudents.filter((_, i) => i !== index));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!config) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                    <IconAlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-yellow-900 mb-2">No hay configuración disponible</h3>
                        <p className="text-yellow-800">
                            No se encontró configuración de landing page para tu institución.
                            Contacta al administrador del sistema.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración de Landing Page</h1>
                <p className="text-gray-600">Personaliza la página de inicio de tu institución</p>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
                    {success}
                </div>
            )}

            <div className="space-y-8">
                {/* General Information */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Información General</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nombre de la Marca
                            </label>
                            <input
                                type="text"
                                value={brandName}
                                onChange={(e) => setBrandName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="CEC"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                URL del Logo (opcional)
                            </label>
                            <input
                                type="text"
                                value={logoUrl}
                                onChange={(e) => setLogoUrl(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="https://ejemplo.com/logo.png"
                            />
                        </div>
                    </div>
                </section>

                {/* Hero Section */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Sección Hero</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Título Principal
                            </label>
                            <input
                                type="text"
                                value={heroTitle}
                                onChange={(e) => setHeroTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Subtítulo
                            </label>
                            <input
                                type="text"
                                value={heroSubtitle}
                                onChange={(e) => setHeroSubtitle(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                URL de Imagen de Fondo
                            </label>
                            <input
                                type="text"
                                value={heroImageUrl}
                                onChange={(e) => setHeroImageUrl(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="https://ejemplo.com/hero.jpg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Texto del Botón
                            </label>
                            <input
                                type="text"
                                value={heroButtonText}
                                onChange={(e) => setHeroButtonText(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </section>

                {/* Notification Bar */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Barra de Notificación</h2>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={notificationEnabled}
                                onChange={(e) => setNotificationEnabled(e.target.checked)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <label className="text-sm font-medium text-gray-700">
                                Mostrar barra de notificación
                            </label>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Texto de Notificación
                            </label>
                            <input
                                type="text"
                                value={notificationText}
                                onChange={(e) => setNotificationText(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={!notificationEnabled}
                            />
                        </div>
                    </div>
                </section>

                {/* Philosophy Section */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Sección Filosofía/Nosotros</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Título
                            </label>
                            <input
                                type="text"
                                value={philosophyTitle}
                                onChange={(e) => setPhilosophyTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Contenido
                            </label>
                            <textarea
                                value={philosophyContent}
                                onChange={(e) => setPhilosophyContent(e.target.value)}
                                rows={8}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </section>

                {/* Gallery Images */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Galería de Imágenes</h2>
                        <button
                            onClick={addGalleryImage}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <IconPlus className="w-5 h-5" />
                            Agregar Imagen
                        </button>
                    </div>
                    <div className="space-y-4">
                        {galleryImages.map((img, index) => (
                            <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg">
                                <div className="flex-1 space-y-3">
                                    <input
                                        type="text"
                                        value={img.url}
                                        onChange={(e) => updateGalleryImage(index, 'url', e.target.value)}
                                        placeholder="URL de la imagen"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <input
                                        type="text"
                                        value={img.caption}
                                        onChange={(e) => updateGalleryImage(index, 'caption', e.target.value)}
                                        placeholder="Descripción"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <button
                                    onClick={() => removeGalleryImage(index)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <IconTrash className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Featured Students */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Estudiantes Destacados</h2>
                        <button
                            onClick={addFeaturedStudent}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <IconPlus className="w-5 h-5" />
                            Agregar Estudiante
                        </button>
                    </div>
                    <div className="space-y-4">
                        {featuredStudents.map((student, index) => (
                            <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg">
                                <div className="flex-1 grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        value={student.name}
                                        onChange={(e) => updateFeaturedStudent(index, 'name', e.target.value)}
                                        placeholder="Nombre"
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <input
                                        type="text"
                                        value={student.career}
                                        onChange={(e) => updateFeaturedStudent(index, 'career', e.target.value)}
                                        placeholder="Carrera"
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <input
                                        type="text"
                                        value={student.place}
                                        onChange={(e) => updateFeaturedStudent(index, 'place', e.target.value)}
                                        placeholder="Puesto/Logro"
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <input
                                        type="text"
                                        value={student.image}
                                        onChange={(e) => updateFeaturedStudent(index, 'image', e.target.value)}
                                        placeholder="URL de foto"
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <button
                                    onClick={() => removeFeaturedStudent(index)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <IconTrash className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Contact Information */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Información de Contacto</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="info@ejemplo.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Teléfono
                            </label>
                            <input
                                type="text"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="+595 21 123456"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                WhatsApp
                            </label>
                            <input
                                type="text"
                                value={contactWhatsapp}
                                onChange={(e) => setContactWhatsapp(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="595981226970"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Dirección
                            </label>
                            <input
                                type="text"
                                value={contactAddress}
                                onChange={(e) => setContactAddress(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Asunción, Paraguay"
                            />
                        </div>
                    </div>
                </section>

                {/* Calendar */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Google Calendar</h2>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            URL de Embed del Calendario
                        </label>
                        <input
                            type="text"
                            value={calendarEmbedUrl}
                            onChange={(e) => setCalendarEmbedUrl(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="https://calendar.google.com/calendar/embed?src=..."
                        />
                        <p className="mt-2 text-sm text-gray-500">
                            Obtén la URL de embed desde Google Calendar → Configuración → Integrar calendario
                        </p>
                    </div>
                </section>

                {/* Colors */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Colores</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Color Primario
                            </label>
                            <div className="flex gap-3 items-center">
                                <input
                                    type="color"
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    className="w-16 h-10 rounded border border-gray-300"
                                />
                                <input
                                    type="text"
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Color Secundario
                            </label>
                            <div className="flex gap-3 items-center">
                                <input
                                    type="color"
                                    value={secondaryColor}
                                    onChange={(e) => setSecondaryColor(e.target.value)}
                                    className="w-16 h-10 rounded border border-gray-300"
                                />
                                <input
                                    type="text"
                                    value={secondaryColor}
                                    onChange={(e) => setSecondaryColor(e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Save Button */}
                <div className="flex justify-end gap-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <IconSave className="w-5 h-5" />
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LandingPageConfigPage;
