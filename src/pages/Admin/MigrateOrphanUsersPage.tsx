import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import {
    IconUser,
    IconAlertCircle,
    IconCheck,
    IconX,
    IconChevronDown,
    IconChevronUp,
    IconLoader,
    IconSparkles,
    IconInfoCircle
} from '@/components/Common/Icons';

interface MigrationResult {
    email: string;
    user_id?: string;
    status: 'migrated' | 'skipped' | 'failed';
    reason?: string;
    error?: string;
    password_used?: string;
}

interface MigrationResponse {
    success: boolean;
    message: string;
    total: number;
    migrated: number;
    skipped: number;
    failed: number;
    results: MigrationResult[];
}

const ORPHAN_USER_IDS = [
    '11215074-a65c-47c3-82cf-ea68b1afb679',
    '13d689b8-afa9-4db5-b057-da7bbb5d84fb',
    '3076db90-51e1-4065-bb2d-d321ef6d7a48',
    '69c36c20-c0bf-4cc3-ba64-9d5909f6831c',
    '81d98181-84d7-4b7e-844f-d4cb6c541e50',
    '85c02afb-0a6b-4a89-9e83-214955806909',
    '9955437d-85e5-4c65-ba46-6752564cdb23', // Paloma
    'a7b71e72-e4c0-4916-9d1a-c175f0fd26e8',
    'ac0e6e1f-c3ff-47bd-b864-cac642469c84',
    'afdcf53f-9256-44fd-afdd-e942647f20dc',
    'ba7bfc03-1bab-47f0-9156-6b22c92b9191',
    'd4bc22f7-cf23-4329-9c90-a7001961d39f'
];

export default function MigrateOrphanUsersPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<MigrationResponse | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [errorHeader, setErrorHeader] = useState<string | null>(null);

    const handleMigration = async () => {
        setIsLoading(true);
        setResult(null);
        setErrorHeader(null);

        try {
            const { data, error } = await supabase.functions.invoke('migrateUsersToAuth', {
                body: {
                    userIds: ORPHAN_USER_IDS,
                    useIdentityDocumentAsPassword: true,
                    defaultPassword: 'EduSpark2024!'
                }
            });

            if (error) {
                throw error;
            }

            setResult(data);
        } catch (error: any) {
            console.error('Error en migración:', error);
            setErrorHeader(error.message || 'Error al migrar usuarios');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen">
            <div className="flex flex-col space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <IconSparkles className="w-8 h-8 text-blue-600" />
                        Migración de Usuarios Huérfanos
                    </h1>
                    <p className="mt-2 text-gray-600">
                        Sincroniza usuarios de la tabla <code className="bg-gray-100 px-1 rounded text-sm">public.users</code> con <code className="bg-gray-100 px-1 rounded text-sm">auth.users</code>.
                    </p>
                </div>

                {/* Info Alert */}
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-md flex items-start gap-3 shadow-sm">
                    <IconInfoCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
                        <p className="font-bold">¿Qué hace esta herramienta?</p>
                        <p>
                            Crea los registros faltantes en el sistema de autenticación de Supabase para que estos usuarios puedan iniciar sesión.
                        </p>
                    </div>
                </div>

                {/* Status Card */}
                <Card className="overflow-hidden shadow-md">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800">Usuarios Pendientes</h2>
                                <p className="text-sm text-gray-500">{ORPHAN_USER_IDS.length} identidades identificadas sin acceso</p>
                            </div>
                            <span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-sm font-bold border border-red-200 shadow-sm transition-all hover:scale-105">
                                {ORPHAN_USER_IDS.length} Huérfanos
                            </span>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6 flex items-start gap-3">
                            <IconAlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-800">
                                <p className="font-bold">Estrategia de Contraseñas:</p>
                                <ul className="list-disc ml-4 space-y-1 mt-1">
                                    <li><strong>Con Documento:</strong> Se usará su número de identificación como contraseña inicial.</li>
                                    <li><strong>Sin Documento:</strong> Se usará la contraseña genérica: <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold">EduSpark2024!</code></li>
                                </ul>
                            </div>
                        </div>

                        <Button
                            onClick={handleMigration}
                            disabled={isLoading}
                            className={`w-full py-4 text-lg font-bold flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01] active:scale-[0.99] ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                                }`}
                        >
                            {isLoading ? (
                                <>
                                    <IconLoader className="w-6 h-6 animate-spin" />
                                    <span>Procesando Migración...</span>
                                </>
                            ) : (
                                <>
                                    <IconSparkles className="w-6 h-6" />
                                    <span>🚀 Iniciar Migración Masiva</span>
                                </>
                            )}
                        </Button>
                    </div>
                </Card>

                {/* Error Header */}
                {errorHeader && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-3 animate-pulse">
                        <IconX className="w-6 h-6 text-red-600" />
                        <p className="text-red-700 font-semibold">{errorHeader}</p>
                    </div>
                )}

                {/* Results Card */}
                {result && (
                    <Card className="shadow-lg border-t-4 border-t-green-500 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <IconCheck className="w-6 h-6 text-green-600" />
                                    Resultados del Proceso
                                </h3>
                                <button
                                    onClick={() => setShowDetails(!showDetails)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    {showDetails ? <IconChevronUp className="w-6 h-6 text-gray-500" /> : <IconChevronDown className="w-6 h-6 text-gray-500" />}
                                </button>
                            </div>

                            {/* Progress Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center justify-between">
                                    <span className="text-green-700 font-medium">Migrados</span>
                                    <span className="text-2xl font-black text-green-700">{result.migrated}</span>
                                </div>
                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-center justify-between">
                                    <span className="text-amber-700 font-medium">Omitidos</span>
                                    <span className="text-2xl font-black text-amber-700">{result.skipped}</span>
                                </div>
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center justify-between">
                                    <span className="text-red-700 font-medium">Fallidos</span>
                                    <span className="text-2xl font-black text-red-700">{result.failed}</span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-4 mb-8 overflow-hidden">
                                <div
                                    className="bg-green-500 h-4 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${(result.migrated / result.total) * 100}%` }}
                                ></div>
                            </div>

                            <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${result.migrated > 0 ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                                }`}>
                                {result.migrated > 0 ? <IconCheck className="w-5 h-5" /> : <IconInfoCircle className="w-5 h-5" />}
                                <p className="font-medium">{result.message}</p>
                            </div>

                            {/* Detail Table */}
                            {showDetails && (
                                <div className="mt-8 border rounded-xl overflow-hidden shadow-inner bg-white">
                                    <div className="bg-gray-50 px-4 py-3 border-b">
                                        <h4 className="font-bold text-gray-700">Bitácora Detallada</h4>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                <tr>
                                                    <th className="px-6 py-3 border-b">Usuario / Email</th>
                                                    <th className="px-6 py-3 border-b">Estado</th>
                                                    <th className="px-6 py-3 border-b">Contraseña Gen.</th>
                                                    <th className="px-6 py-3 border-b">Observaciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {result.results.map((res, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <IconUser className="w-4 h-4 text-gray-400" />
                                                                <span className="text-sm font-medium text-gray-900">{res.email}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${res.status === 'migrated' ? 'bg-green-100 text-green-800 border border-green-200' :
                                                                res.status === 'skipped' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                                                    'bg-red-100 text-red-800 border border-red-200'
                                                                }`}>
                                                                {res.status === 'migrated' ? 'MIGRADO' : res.status === 'skipped' ? 'OMITIDO' : 'FALLIDO'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {res.password_used === 'identity_document' ? (
                                                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded font-bold border border-blue-100 flex items-center gap-1 w-fit">
                                                                    📄 Documento ID
                                                                </span>
                                                            ) : res.status === 'migrated' ? (
                                                                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono">EduSpark2024!</code>
                                                            ) : (
                                                                <span className="text-xs text-gray-400">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-xs text-gray-500 italic">{res.reason || res.error || 'Procesado'}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Success Info */}
                            {result.migrated > 0 && (
                                <div className="mt-8 bg-green-50 border border-green-200 p-6 rounded-2xl shadow-sm">
                                    <h4 className="flex items-center gap-2 text-green-800 font-black mb-3 text-lg">
                                        <IconSparkles className="w-6 h-6" />
                                        ¡Migración Exitosa!
                                    </h4>
                                    <div className="space-y-3 text-green-700">
                                        <p className="text-md flex items-start gap-2">
                                            <span className="bg-green-200 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold text-green-800 flex-shrink-0 mt-0.5">1</span>
                                            <span>Los usuarios ya pueden ingresar al sistema usando su correo electrónico.</span>
                                        </p>
                                        <p className="text-md flex items-start gap-2">
                                            <span className="bg-green-200 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold text-green-800 flex-shrink-0 mt-0.5">2</span>
                                            <span>Por favor, comunica a los usuarios sus credenciales iniciales.</span>
                                        </p>
                                        <p className="text-md flex items-start gap-2 italic">
                                            <IconAlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                            <span>Se recomienda encarecidamente que los usuarios cambien su contraseña tras el primer ingreso.</span>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
