
import React, { useState, useEffect } from 'react';
import { auditService, AuditLog, AuditAction, ResourceType } from '@/services/auditService';
import Card from '@/components/Common/Card';
import { formatDateTime } from '@/utils/dateFormat';
import { IconHistory, IconFilter, IconUser, IconBox, IconChevronDown, IconChevronUp, IconSearch } from '@/components/Common/Icons';
import { adminReportsText } from '@/constants/adminReportsLabels';
import { useUiLang } from '@/hooks/useUiLang';

const ACTION_LABELS: Record<string, string> = {
    UPDATE_USER_ROLE: 'Cambio de Rol',
    PUBLISH_COURSE: 'Publicación de Curso',
    UNPUBLISH_COURSE: 'Despublicación/Eliminación',
    ASSIGN_INSTITUTION: 'Asignación de Institución',
    ENROLL_STUDENT: 'Matrícula de Estudiante',
    UNENROLL_STUDENT: 'Desmatrícula',
    GRADE_SUBMISSION: 'Calificación',
    AI_USAGE_EXCEEDED: 'Límite AI Excedido',
};

const ACTION_COLORS: Record<string, string> = {
    UPDATE_USER_ROLE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    PUBLISH_COURSE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    UNPUBLISH_COURSE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    ASSIGN_INSTITUTION: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    AI_USAGE_EXCEEDED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};

const AuditLogPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<{ action?: AuditAction; resourceType?: ResourceType }>({});
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const uiLang = useUiLang();
    const text = adminReportsText[uiLang];

    useEffect(() => {
        loadLogs();
    }, [filter]);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const data = await auditService.getLogs({ ...filter, limit: 100 });
            setLogs(data);
        } catch (error) {
            console.error('Error loading audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedLog(expandedLog === id ? null : id);
    };

    const filteredLogs = logs.filter(log => 
        log.actor?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.actor?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
    <div className="container mx-auto px-6 py-10 space-y-8 max-w-7xl animate-in fade-in duration-500">
      {/* 1. Header Premium "Security Surveillance" */}
      <header className="relative overflow-hidden rounded-[2.5rem] bg-[#020617] p-10 md:p-12 shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-[600px] h-[600px] bg-rose-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px]"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
              <span className="text-[10px] font-black text-rose-100/70 uppercase tracking-[0.2em]">{text.auditTitle.toUpperCase()}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight italic">
              Historial de <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-indigo-400">Auditoría</span>
            </h1>
            <p className="text-blue-100/60 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
              Trazabilidad completa de operaciones administrativas, cambios de integridad y seguridad del sistema.
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-4 shrink-0">
             <div className="relative group">
                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-white/30 group-focus-within:text-rose-400 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Filtrar eventos..." 
                    className="h-16 pl-12 pr-6 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/20 text-sm font-bold focus:ring-4 focus:ring-rose-500/20 outline-none w-72 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <button 
                onClick={loadLogs}
                className="h-14 w-14 bg-white/5 border border-white/10 text-white rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all active:scale-95"
             >
                <span className="material-symbols-outlined">refresh</span>
             </button>
          </div>
        </div>
      </header>

            {/* Quick Stats */}
      {/* 2. Resumen Métrico de Seguridad */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-surface/20 backdrop-blur-xl border-white/10 p-8 rounded-[2rem] hover:border-blue-500/30 transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
          <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
               <IconHistory className="w-6 h-6" />
             </div>
             <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest px-3 py-1 bg-blue-500/10 rounded-full">Histórico</span>
          </div>
          <p className="text-text-light/50 text-[10px] font-black uppercase tracking-widest">{text.recentEvents}</p>
          <h3 className="text-4xl font-black text-text-dark mt-2 tracking-tighter italic">{logs.length}</h3>
        </Card>

        <Card className="bg-surface/20 backdrop-blur-xl border-white/10 p-8 rounded-[2rem] hover:border-green-500/30 transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-2xl group-hover:bg-green-500/10 transition-all"></div>
          <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-green-500/10 rounded-2xl text-green-500">
               <span className="material-symbols-outlined">verified_user</span>
             </div>
             <span className="text-[10px] font-black text-green-500 uppercase tracking-widest px-3 py-1 bg-green-500/10 rounded-full">Actividad 24h</span>
          </div>
          <p className="text-text-light/50 text-[10px] font-black uppercase tracking-widest">{text.last24h}</p>
          <h3 className="text-4xl font-black text-text-dark mt-2 tracking-tighter italic">
            {logs.filter(l => new Date(l.created_at) > new Date(Date.now() - 86400000)).length}
          </h3>
        </Card>

        <Card className="bg-surface/20 backdrop-blur-xl border-white/10 p-8 rounded-[2rem] hover:border-rose-500/30 transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-2xl group-hover:bg-rose-500/10 transition-all"></div>
          <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500">
               <span className="material-symbols-outlined">warning</span>
             </div>
             <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest px-3 py-1 bg-rose-500/10 rounded-full">Alertas IA</span>
          </div>
          <p className="text-text-light/50 text-[10px] font-black uppercase tracking-widest">{text.aiAlerts}</p>
          <h3 className="text-4xl font-black text-text-dark mt-2 tracking-tighter italic">
             {logs.filter(l => l.action === 'AI_USAGE_EXCEEDED').length}
          </h3>
        </Card>
      </div>

            {/* Logs Table */}
      {/* 3. Tabla Cronológica de Auditoría */}
      <Card className="border-none shadow-2xl bg-surface/40 backdrop-blur-2xl dark:bg-gray-900/40 rounded-[2.5rem] overflow-hidden p-0 border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-black/20 border-b border-gray-100 dark:border-white/5">
                <th className="px-8 py-5 text-[10px] font-black text-text-light/50 uppercase tracking-widest">{text.actor}</th>
                <th className="px-6 py-5 text-[10px] font-black text-text-light/50 uppercase tracking-widest">{text.action}</th>
                <th className="px-6 py-5 text-[10px] font-black text-text-light/50 uppercase tracking-widest">{text.resource}</th>
                <th className="px-6 py-5 text-[10px] font-black text-text-light/50 uppercase tracking-widest text-right">{text.dateTime}</th>
                <th className="px-8 py-5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-10">
                      <div className="h-10 bg-gray-100 dark:bg-white/5 rounded-2xl w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                       <IconBox className="size-16" />
                       <p className="text-sm font-black uppercase tracking-widest">Registros de auditoría no encontrados</p>
                    </div>
                  </td>
                </tr>
              ) : (
                                filteredLogs.map(log => (
                                    <React.Fragment key={log.id}>
                  <tr 
                    key={log.id} 
                    className={`group hover:bg-primary/5 transition-all duration-300 cursor-pointer ${expandedLog === log.id ? 'bg-primary/5' : ''}`}
                    onClick={() => toggleExpand(log.id)}
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="size-11 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/10 dark:to-white/5 flex items-center justify-center text-xs font-black shadow-sm group-hover:scale-110 transition-transform">
                          {log.actor ? (
                            <span className="text-text-dark">{log.actor.first_name?.[0]}{log.actor.last_name?.[0]}</span>
                          ) : (
                            <span className="material-symbols-outlined text-text-light">settings_applications</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-text-dark uppercase tracking-tight truncate">
                            {log.actor ? `${log.actor.first_name} ${log.actor.last_name}` : (log.metadata?.actor_email || 'System Account')}
                          </p>
                          <p className="text-[10px] font-black text-text-light/50 uppercase tracking-widest truncate">{log.actor?.email || 'AUTOMATED_TASK'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                        ACTION_COLORS[log.action] || 'bg-gray-100/50 text-gray-500 border-gray-200'
                      }`}>
                         <span className="size-1.5 rounded-full bg-current shadow-[0_0_8px_rgba(current)]"></span>
                         {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-black text-text-light/50 uppercase tracking-widest">{log.resource_type}</span>
                        <span className="text-xs font-mono font-bold text-text-dark tracking-tighter truncate">#{log.resource_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                       <p className="text-sm font-black text-text-dark tracking-tighter leading-none italic uppercase">
                         {new Date(log.created_at).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                       </p>
                       <p className="text-[10px] font-black text-text-light/40 uppercase tracking-widest mt-1">
                         {new Date(log.created_at).toLocaleDateString('es-PY')}
                       </p>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <div className={`p-1.5 rounded-lg transition-all ${expandedLog === log.id ? 'bg-primary text-white rotate-180' : 'text-text-light hover:bg-gray-100'}`}>
                         <IconChevronDown className="size-4" />
                       </div>
                    </td>
                  </tr>
                  {expandedLog === log.id && (
                    <tr>
                      <td colSpan={5} className="px-8 py-2 bg-primary/5">
                        <div className="bg-background dark:bg-black/40 border border-primary/20 rounded-[2rem] p-8 shadow-2xl animate-in zoom-in duration-200">
                           <div className="flex justify-between items-center mb-6">
                              <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px]">data_object</span>
                                Detalle de Operación
                              </h4>
                              <div className="flex items-center gap-4 text-[10px] font-black text-text-light/40 uppercase tracking-widest">
                                 <span>ID: <span className="text-text-dark">{log.id}</span></span>
                                 {log.ip_address && <span>IP: <span className="text-text-dark">{log.ip_address}</span></span>}
                              </div>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-6">
                                <div className="p-5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                                   <p className="text-[10px] font-black text-text-light uppercase tracking-widest mb-3">Contexto del Evento</p>
                                   <div className="space-y-3">
                                      <div className="flex justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                                         <span className="text-xs text-text-light italic">Recurso</span>
                                         <span className="text-xs font-black text-text-dark uppercase">{log.resource_type}</span>
                                      </div>
                                      <div className="flex justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                                         <span className="text-xs text-text-light italic">Acción</span>
                                         <span className="text-xs font-black text-text-dark">{log.action}</span>
                                      </div>
                                      <div className="flex justify-between">
                                         <span className="text-xs text-text-light italic">Timestamp Local</span>
                                         <span className="text-xs font-black text-text-dark uppercase">{log.metadata.timestamp_py || 'N/A'}</span>
                                      </div>
                                   </div>
                                </div>
                             </div>

                             <div className="space-y-4">
                                <p className="text-[10px] font-black text-text-light uppercase tracking-widest mb-1 ml-1">Metadata (JSON)</p>
                                <div className="relative group">
                                   <pre className="text-xs font-mono text-emerald-400 p-6 bg-[#020617] rounded-3xl overflow-auto max-h-60 border border-white/5 shadow-inner">
                                      {JSON.stringify(log.metadata, null, 2)}
                                   </pre>
                                   <div className="absolute top-4 right-4 size-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                </div>
                             </div>
                           </div>
                        </div>
                      </td>
                    </tr>
                  )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default AuditLogPage;
