import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IconSparkles, IconGraduationCap, IconUsers, IconBookOpen, IconCheckCircle, IconArrowRight, IconStar, IconBrandWhatsapp, IconMenu, IconX } from '@/components/Common/Icons';
import { institutionService, Institution } from '@/services/institutionService';
import { landingConfigService, LandingConfig } from '@/services/landingConfigService';
import { careerService, Career } from '@/services/academicService';

const InstitutionLandingPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loadingInstitutions, setLoadingInstitutions] = useState(true);
    const [config, setConfig] = useState<LandingConfig | null>(null);
    const [institution, setInstitution] = useState<Institution | null>(null);
    const [careers, setCareers] = useState<Career[]>([]);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Load institutions
                const institutionsData = await institutionService.getAllInstitutions();
                setInstitutions(institutionsData);

                // Load data based on slug
                if (slug) {
                    const [configData, institutionData] = await Promise.all([
                        landingConfigService.getBySlug(slug).catch(() => null),
                        institutionService.getBySlug(slug).catch(() => null)
                    ]);
                    if (institutionData) {
                        const careersData = await careerService.getCareersByInstitution(institutionData.id).catch(() => []);
                        setCareers(careersData);
                    }

                    setConfig(configData);
                    setInstitution(institutionData);
                }
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoadingInstitutions(false);
                setLoadingConfig(false);
            }
        };
        loadData();
    }, [slug]);

    return (
        <div className="min-h-screen bg-white font-sans">
            {/* Navigation */}
            <nav className="bg-white/90 backdrop-blur-sm fixed w-full z-50 transition-all duration-300 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center space-x-3">
                            {(config?.logo_url || institution?.logo_url) ? (
                                <img
                                    src={config?.logo_url || institution?.logo_url}
                                    alt={config?.brand_name || institution?.name || 'Logo'}
                                    className="h-12 w-auto object-contain rounded-lg shadow-sm"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg" style={{ backgroundColor: config?.primary_color || '#2563eb', shadowColor: `${config?.primary_color}33` }}>
                                    <IconSparkles className="w-6 h-6 text-white" />
                                </div>
                            )}
                            <span className="text-2xl font-bold text-gray-900 tracking-tight">{config?.brand_name || institution?.name || 'EduSpark'}</span>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#inicio" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Inicio</a>
                            <a href="#cursos" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Cursos</a>
                            <a href="#contacto" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Contacto</a>
                        </div>

                        <div className="hidden md:flex items-center space-x-4">
                            <Link to="/login" className="text-gray-700 hover:text-blue-600 font-medium px-4 py-2 transition-colors">
                                Ingresar
                            </Link>
                            <a
                                href={`https://wa.me/${config?.contact_whatsapp || '595981226970'}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-lg flex items-center gap-2"
                                style={{ backgroundColor: config?.primary_color || '#2563eb', boxShadow: `0 10px 15px -3px ${config?.primary_color}4d` }}
                            >
                                <IconBrandWhatsapp className="w-5 h-5" />
                                WhatsApp
                            </a>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden flex items-center">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="text-gray-600 hover:text-gray-900 p-2 focus:outline-none"
                            >
                                {isMobileMenuOpen ? (
                                    <IconX className="w-6 h-6" />
                                ) : (
                                    <IconMenu className="w-6 h-6" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-100 shadow-lg absolute w-full left-0 top-20 py-4 px-4 flex flex-col space-y-4 animate-fadeIn">
                        <a
                            href="#inicio"
                            className="text-gray-600 hover:text-blue-600 font-medium py-2 border-b border-gray-50"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Inicio
                        </a>
                        <a
                            href="#nosotros"
                            className="text-gray-600 hover:text-blue-600 font-medium py-2 border-b border-gray-50"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Nosotros
                        </a>
                        <a
                            href="#cursos"
                            className="text-gray-600 hover:text-blue-600 font-medium py-2 border-b border-gray-50"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Cursos
                        </a>
                        <a
                            href="#contacto"
                            className="text-gray-600 hover:text-blue-600 font-medium py-2 border-b border-gray-50"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Contacto
                        </a>
                        <div className="flex flex-col space-y-3 pt-2">
                            <Link
                                to="/login"
                                className="text-center text-gray-700 hover:text-blue-600 font-medium px-4 py-2 border border-gray-200 rounded-lg transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Ingresar
                            </Link>
                            <a
                                href={`https://wa.me/${config?.contact_whatsapp || institution?.email || ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white px-5 py-3 rounded-lg font-semibold transition-all shadow-md flex items-center justify-center gap-2"
                                style={{ backgroundColor: config?.primary_color || '#2563eb' }}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <IconBrandWhatsapp className="w-5 h-5" />
                                WhatsApp
                            </a>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section id="inicio" className="relative h-[600px] flex items-center justify-center overflow-hidden">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    <img
                        src={config?.hero_image_url || "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?q=80&w=2069&auto=format&fit=crop"}
                        alt="Estudiantes felices en grupo"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"></div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
                        {config?.hero_title || (institution ? `Bienvenido a ${institution.name}` : 'Tu futuro comienza aquí')} <br />
                        <span style={{ color: config?.primary_color ? '#60a5fa' : undefined }} className={!config?.primary_color ? "text-blue-400" : ""}>{config?.hero_subtitle?.split('. ')[0] || (institution?.description ? '' : 'Educación de Excelencia.')}</span>
                    </h1>
                    <p className="text-xl text-gray-200 mb-10 max-w-3xl mx-auto font-light leading-relaxed drop-shadow-md">
                        {config?.hero_subtitle || institution?.description || 'Formamos líderes para el mañana con tecnología y calidad humana.'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="#cursos"
                            className="text-white px-8 py-4 rounded-lg text-lg font-bold transition-all shadow-xl transform hover:-translate-y-1"
                            style={{ backgroundColor: config?.primary_color || '#2563eb', boxShadow: `0 20px 25px -5px ${config?.primary_color}4d` }}
                        >
                            {config?.hero_button_text || 'Ver Cursos Disponibles'}
                        </a>
                    </div>
                </div>
            </section>

            {/* Notification Bar */}
            {config?.notification_enabled !== false && (
                <div className="py-4 px-4 shadow-md relative z-20" style={{ backgroundColor: config?.primary_color || '#2563eb' }}>
                    <div className="max-w-7xl mx-auto text-center">
                        <p className="text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2">
                            <IconSparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                            <span>{config?.notification_text || '¡Inscripciones abiertas! Consulta nuestra oferta académica.'}</span>
                        </p>
                    </div>
                </div>
            )}

            {/* Philosophy Section */}
            {(config?.philosophy_title || config?.philosophy_content || institution?.description) && (
                <section id="nosotros" className="py-20 bg-white">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h2 className="text-3xl font-bold text-gray-900 mb-8">{config?.philosophy_title || 'Sobre Nosotros'}</h2>
                        <div className="prose prose-lg mx-auto text-gray-600 leading-relaxed">
                            {config?.philosophy_content ? (
                                config.philosophy_content.split('\n\n').map((paragraph, index) => (
                                    <p key={index} className={index === 0 ? 'mb-6' : ''}>
                                        {paragraph}
                                    </p>
                                ))
                            ) : (
                                <p>
                                    {institution?.description || "Comprometidos con la excelencia educativa y el desarrollo integral de nuestros estudiantes."}
                                </p>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* Felicitaciones Section (Ingresantes) - Only show if configured */}
            {config?.featured_students && config.featured_students.length > 0 && (
                <section className="py-20 bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">¡Orgullo {config?.brand_name || institution?.name || 'EduSpark'}!</h2>
                            <div className="w-20 h-1 mx-auto rounded-full" style={{ backgroundColor: config?.primary_color || '#2563eb' }}></div>
                            <p className="mt-4 text-xl text-gray-600">Reconocemos a nuestros estudiantes destacados</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {config.featured_students.map((student, index) => (
                                <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:-translate-y-2 transition-all duration-300">
                                    <div className="h-48 overflow-hidden">
                                        <img src={student.image} alt={student.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="p-6 text-center">
                                        <h3 className="font-bold text-lg text-gray-900">{student.name}</h3>
                                        <p className="font-medium" style={{ color: config?.primary_color || '#2563eb' }}>{student.career}</p>
                                        <div className="mt-3 inline-block bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide">
                                            {student.place}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Galeria Section - Only show if configured */}
            {config?.gallery_images && config.gallery_images.length > 0 && (
                <section className="py-20 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">{config?.gallery_title || 'Nuestra Casa de Estudios'}</h2>
                            <p className="mt-4 text-xl text-gray-600">{config?.gallery_description || 'Un ambiente diseñado para el aprendizaje y la convivencia'}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {config.gallery_images.map((img, index) => (
                                <div key={index} className={`h-64 md:h-96 rounded-2xl overflow-hidden shadow-lg relative group ${index === 0 || index === 3 ? 'md:col-span-2' : ''}`}>
                                    <img src={img.url} alt={img.caption || 'Imagen de galería'} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    {img.caption && (
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
                                            <span className="text-white font-bold text-xl">{img.caption}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Calendar Section - Only show if configured */}
            {config?.calendar_embed_url && (
                <section className="py-20 bg-blue-50">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">Calendario de Actividades</h2>
                            <p className="text-gray-600">Mantente al día con nuestras fechas de inicio y eventos importantes.</p>
                        </div>
                        <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8">
                            <div className="aspect-video w-full">
                                <iframe
                                    src={config.calendar_embed_url}
                                    style={{ border: 0 }}
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    scrolling="no"
                                    title="Calendario Académico"
                                ></iframe>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Courses Section (Circular Cards) */}
            <section id="cursos" className="py-24 bg-blue-50/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4" style={{ color: config?.primary_color || '#2563eb' }}>Nuestros Cursos</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center">
                        {careers.length > 0 ? (
                            careers.map((career) => (
                                <div key={career.id} className="bg-white rounded-full w-full max-w-[350px] aspect-square flex flex-col items-center justify-center p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-4 border-white ring-1 ring-gray-100 text-center relative group">
                                    <div className="absolute inset-0 rounded-full border-2 border-blue-100 scale-95 group-hover:scale-100 transition-transform duration-500"></div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3 relative z-10">{career.name}</h3>
                                    <p className="text-sm text-gray-600 mb-4 leading-tight max-w-[250px] relative z-10 line-clamp-3">
                                        {career.description || 'Formación académica de excelencia.'}
                                    </p>
                                    <div className="mb-3 relative z-10">
                                        <span className="text-xs font-semibold text-blue-600 block mb-1">Duración:</span>
                                        <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] text-gray-700">{career.duration_months} meses</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-3 text-center py-10">
                                <IconBookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 text-lg">Próximamente publicaremos nuestra oferta académica.</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Location Section */}
            <section id="ubicacion" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Nuestra Sede</h2>
                        <div className="w-20 h-1 mx-auto rounded-full" style={{ backgroundColor: config?.primary_color || '#2563eb' }}></div>
                        <p className="mt-4 text-xl text-gray-600">Visítanos en nuestras instalaciones</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-3">
                            <div className="p-8 md:p-12 flex flex-col justify-center bg-gray-50">
                                <h3 className="text-2xl font-bold text-gray-900 mb-6">{institution?.name || 'Nuestra Sede'}</h3>
                                <div className="space-y-6">
                                    <div className="flex items-start space-x-4">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span className="text-xl">📍</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">Dirección</p>
                                            <p className="text-gray-600">{config?.contact_address || institution?.address || 'Ubicación no disponible'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-4">
                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <IconBrandWhatsapp className="w-6 h-6 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">WhatsApp</p>
                                            <a href={`https://wa.me/${config?.contact_whatsapp || '595981226970'}`} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: config?.primary_color || '#2563eb' }}>
                                                {config?.contact_whatsapp || (institution?.website ? 'Contactar' : 'Consultar')}
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-4">
                                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span className="text-xl">✉️</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">Email</p>
                                            <a href={`mailto:${config?.contact_email || institution?.email || ''}`} className="hover:underline" style={{ color: config?.primary_color || '#2563eb' }}>
                                                {config?.contact_email || institution?.email || 'contacto@eduspark.com'}
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-2 h-[400px] md:h-auto relative">
                                <iframe
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3607.6546477694!2d-57.5866166!3d-25.2817944!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x945da87c06765717%3A0x6c7216371710738!2sGral.%20Eugenio%20A.%20Garay%20798%2C%20Asunci%C3%B3n!5e0!3m2!1ses!2spy!4v1700000000000!5m2!1ses!2spy"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    className="absolute inset-0"
                                ></iframe>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer id="contacto" className="bg-gray-900 text-white py-12 border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center space-x-2 mb-6">
                                <IconSparkles className="w-6 h-6 text-blue-400" />
                                <span className="text-2xl font-bold">EduSpark</span>
                            </div>
                            <p className="text-gray-400 leading-relaxed mb-6 max-w-md">
                                Transformando la educación con tecnología de vanguardia. Nuestra misión es hacer el aprendizaje accesible, personalizado y efectivo para todos.
                            </p>
                            <div className="flex space-x-4">
                                {/* Social Icons Placeholders */}
                                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer">
                                    <span className="font-bold">f</span>
                                </div>
                                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-400 transition-colors cursor-pointer">
                                    <span className="font-bold">t</span>
                                </div>
                                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors cursor-pointer">
                                    <span className="font-bold">in</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold mb-6 text-white">Enlaces Rápidos</h3>
                            <ul className="space-y-3">
                                <li><a href="#inicio" className="text-gray-400 hover:text-blue-400 transition-colors">Inicio</a></li>
                                <li><a href="#cursos" className="text-gray-400 hover:text-blue-400 transition-colors">Cursos</a></li>
                                <li><Link to="/login" className="text-gray-400 hover:text-blue-400 transition-colors">Portal de Alumnos</Link></li>
                                <li><Link to="/login" className="text-gray-400 hover:text-blue-400 transition-colors">Portal Docente</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold mb-6 text-white">Contacto</h3>
                            <ul className="space-y-3 text-gray-400">
                                <li className="flex items-center gap-2">
                                    <IconBrandWhatsapp className="w-5 h-5 text-green-500" />
                                    <span>{config?.contact_phone || config?.contact_whatsapp || '+595 981 226970'}</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span>✉️</span>
                                    <a href={`mailto:${config?.contact_email || 'info@eduspark.com'}`} className="hover:text-white">{config?.contact_email || 'info@eduspark.com'}</a>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span>📍</span>
                                    <span>{config?.contact_address || 'Asunción, Paraguay'}</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500 text-sm">
                        <p>&copy; {new Date().getFullYear()} EduSpark. Todos los derechos reservados.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default InstitutionLandingPage;
