import React, { useState } from 'react';
import { useTenant } from '@/context/TenantContext';
import { EmbeddedChat } from '@/components/EmbeddedChat';
import {
  Building2,
  LineChart,
  Users,
  Settings,
  LogOut,
  MessageSquare,
  Database,
  TrendingUp,
  PieChart,
  ArrowUpRight,
  Wallet,
  MapPin,
  Clock,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const CorporateDashboard: React.FC = () => {
  const { tenant, loading } = useTenant();
  const { logout: signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'chat' | 'sources' | 'portfolio' | 'markets' | 'clients' | 'settings'
  >('chat');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 flex overflow-hidden">
      {/* Sidebar - Estilo PyInvest Corporativo */}
      <aside className="w-64 bg-white dark:bg-[#1e293b] border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-center min-h-[100px]">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} className="h-16 w-full object-contain" />
          ) : (
            <h1 className="text-xl font-bold tracking-tight text-[#c49a45] uppercase">
              {tenant?.name || 'Corporate'}
            </h1>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Principal
          </div>

          <button
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'chat' ? 'bg-slate-100 dark:bg-slate-800/50 text-[#c49a45]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
          >
            <MessageSquare size={18} />
            <span>Asesor Virtual</span>
          </button>

          <button
            onClick={() => setActiveTab('sources')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'sources' ? 'bg-slate-100 dark:bg-slate-800/50 text-[#c49a45]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
          >
            <Database size={18} />
            <span>Data Rooms (RAG)</span>
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'portfolio' ? 'bg-slate-100 dark:bg-slate-800/50 text-[#c49a45]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
          >
            <LineChart size={18} />
            <span>Portafolio</span>
          </button>

          <button
            onClick={() => setActiveTab('markets')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'markets' ? 'bg-slate-100 dark:bg-slate-800/50 text-[#c49a45]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
          >
            <Building2 size={18} />
            <span>Mercados</span>
          </button>

          <div className="px-3 py-2 mt-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Administración
          </div>
          <button
            onClick={() => setActiveTab('clients')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'clients' ? 'bg-slate-100 dark:bg-slate-800/50 text-[#c49a45]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
          >
            <Users size={18} />
            <span>Clientes</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'settings' ? 'bg-slate-100 dark:bg-slate-800/50 text-[#c49a45]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
          >
            <Settings size={18} />
            <span>Configuración</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-slate-500 hover:text-red-500 transition-colors"
          >
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content con LibreChat Embebido */}
      <main className="flex-1 flex flex-col h-screen">
        <header className="h-16 bg-white dark:bg-[#1e293b] border-b border-slate-200 dark:border-slate-800 flex items-center px-6 justify-between shrink-0">
          <h2 className="text-lg font-medium">Análisis y Consultas</h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500">Bienvenido a la red de {tenant?.name}</div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 overflow-hidden bg-slate-50 dark:bg-[#0f172a]">
          {activeTab === 'chat' && (
            <EmbeddedChat chatUrl="http://localhost:3080/c/new?endpoints=custom&models=qwen3.5:4b" />
          )}

          {activeTab === 'sources' && (
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm overflow-auto">
              <h3 className="text-2xl font-bold mb-2">Salas de Datos (RAG)</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8">
                Administra los documentos y bases de conocimiento por nivel de suscripción.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { name: 'Legal & Cumplimiento', count: 12, sub: 'Premium' },
                  { name: 'Contable & Tributario', count: 8, sub: 'Básico' },
                  { name: 'Oportunidades Inmobiliarias', count: 24, sub: 'VIP' },
                ].map((room, i) => (
                  <div
                    key={i}
                    className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-[#c49a45] transition-colors cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 text-[#c49a45] rounded-lg group-hover:bg-[#c49a45] group-hover:text-white transition-colors">
                        <Database size={24} />
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                        {room.sub}
                      </span>
                    </div>
                    <h4 className="font-bold text-lg mb-1">{room.name}</h4>
                    <p className="text-sm text-slate-500">{room.count} documentos vectorizados</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div className="w-full h-full bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm overflow-auto">
              {/* Encabezado del Portafolio */}
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
                <div>
                  <h3 className="text-3xl font-bold mb-2 tracking-tight text-slate-800 dark:text-slate-100">
                    Mi Portafolio
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    Resumen detallado de activos, rendimiento y distribución actual.
                  </p>
                </div>
                <div className="flex items-center gap-6 bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm backdrop-blur-sm">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl">
                    <TrendingUp size={28} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Valor Total Consolidado
                    </div>
                    <div className="text-4xl font-black text-[#c49a45] tracking-tight">
                      $ 2,450,000<span className="text-lg text-slate-400 ml-1">USD</span>
                    </div>
                    <div className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center mt-1">
                      <ArrowUpRight size={14} className="mr-1" /> +12.4% este año
                    </div>
                  </div>
                </div>
              </div>

              {/* Contenido Principal Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Gráfico de Rendimiento */}
                <div className="lg:col-span-2 bg-white dark:bg-[#151e2e] p-7 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                        <LineChart size={20} />
                      </div>
                      <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200">
                        Rendimiento Histórico
                      </h4>
                    </div>
                    <select className="bg-slate-50 dark:bg-slate-800 border-none text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg py-2 pl-3 pr-8 focus:ring-[#c49a45]">
                      <option>Últimos 6 meses</option>
                      <option>Último Año</option>
                      <option>YTD</option>
                    </select>
                  </div>

                  <div className="h-56 flex items-end gap-3 px-2 relative group">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                      <div className="w-full border-b border-slate-500"></div>
                      <div className="w-full border-b border-slate-500"></div>
                      <div className="w-full border-b border-slate-500"></div>
                      <div className="w-full border-b border-slate-500"></div>
                    </div>
                    {/* Bars */}
                    {[
                      { h: 30, val: '$1.2M', lbl: 'Ene' },
                      { h: 45, val: '$1.4M', lbl: 'Feb' },
                      { h: 25, val: '$1.1M', lbl: 'Mar' },
                      { h: 60, val: '$1.8M', lbl: 'Abr' },
                      { h: 75, val: '$2.1M', lbl: 'May' },
                      { h: 50, val: '$1.6M', lbl: 'Jun' },
                      { h: 90, val: '$2.45M', lbl: 'Jul' },
                    ].map((bar, i) => (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-2 group/bar cursor-pointer z-10"
                      >
                        <div className="opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-800 text-white text-xs py-1 px-2 rounded-md font-medium whitespace-nowrap shadow-lg translate-y-2 group-hover/bar:-translate-y-1">
                          {bar.val}
                        </div>
                        <div
                          className="w-full bg-gradient-to-t from-[#c49a45] to-[#e8c678] opacity-70 hover:opacity-100 transition-all rounded-t-md shadow-[0_0_15px_rgba(196,154,69,0.2)] hover:shadow-[0_0_20px_rgba(196,154,69,0.5)] relative"
                          style={{ height: `${bar.h}%` }}
                        >
                          <div className="absolute inset-0 bg-white/10 rounded-t-md opacity-0 group-hover/bar:opacity-100 transition-opacity"></div>
                        </div>
                        <span className="text-xs font-semibold text-slate-400 mt-1">{bar.lbl}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Distribución */}
                <div className="bg-white dark:bg-[#151e2e] p-7 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                      <PieChart size={20} />
                    </div>
                    <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200">
                      Distribución
                    </h4>
                  </div>

                  <div className="flex-1 flex flex-col justify-center gap-6">
                    {[
                      { l: 'Bonos del Tesoro', v: '45%', amt: '$1.10M', color: 'bg-blue-500' },
                      { l: 'Bienes Raíces', v: '30%', amt: '$735k', color: 'bg-[#c49a45]' },
                      { l: 'Acciones Corp.', v: '25%', amt: '$612k', color: 'bg-indigo-500' },
                    ].map((item, i) => (
                      <div key={i} className="group cursor-pointer">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-[#c49a45] transition-colors">
                            {item.l}
                          </span>
                          <div className="text-right">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {item.amt}
                            </span>
                            <span className="text-xs font-medium text-slate-500 ml-2">
                              ({item.v})
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`${item.color} h-2.5 rounded-full`}
                            style={{ width: item.v }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Activos Recientes */}
              <div className="bg-white dark:bg-[#151e2e] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg">
                    <Wallet size={20} />
                  </div>
                  <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200">
                    Actividad Reciente
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-6 py-4 font-semibold tracking-wider">Activo</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">Tipo</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">Fecha</th>
                        <th className="px-6 py-4 font-semibold tracking-wider text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {[
                        {
                          n: 'Fondo Mboi Y',
                          t: 'Bienes Raíces',
                          d: '14 Ago 2026',
                          a: '+$ 150,000',
                          p: true,
                        },
                        {
                          n: 'Bonos Ministerio de Hacienda',
                          t: 'Bonos',
                          d: '02 Ago 2026',
                          a: '+$ 300,000',
                          p: true,
                        },
                        {
                          n: 'Retiro Programado',
                          t: 'Liquidez',
                          d: '28 Jul 2026',
                          a: '-$ 50,000',
                          p: false,
                        },
                      ].map((tx, i) => (
                        <tr
                          key={i}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                        >
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-200">
                            {tx.n}
                          </td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{tx.t}</td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{tx.d}</td>
                          <td
                            className={`px-6 py-4 text-right font-bold ${tx.p ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-slate-200'}`}
                          >
                            {tx.a}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'markets' && (
            <div className="w-full h-full bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm overflow-auto">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                <div>
                  <h3 className="text-3xl font-bold mb-2 tracking-tight text-slate-800 dark:text-slate-100">
                    Oportunidades de Mercado
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    Proyectos de inversión curados y analizados por nuestro equipo de expertos.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:border-[#c49a45] transition-colors">
                    Bienes Raíces
                  </button>
                  <button className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:border-[#c49a45] transition-colors">
                    Bonos
                  </button>
                  <button className="px-4 py-2 bg-[#c49a45] text-white font-medium rounded-lg shadow-sm hover:bg-[#b0873a] transition-colors">
                    Todos
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {[
                  {
                    title: 'Edificio Corporativo "La Torre"',
                    type: 'Desarrollo Inmobiliario',
                    location: 'Asunción, Eje Corporativo',
                    term: '36 meses',
                    risk: 'Medio',
                    yield: '14.5%',
                    raised: 75,
                    goal: '$5M',
                    status: 'Abierto',
                    img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600&auto=format&fit=crop',
                  },
                  {
                    title: 'Fideicomiso Agropecuario Sur',
                    type: 'Bonos Estructurados',
                    location: 'Itapúa, Paraguay',
                    term: '24 meses',
                    risk: 'Bajo',
                    yield: '9.2%',
                    raised: 92,
                    goal: '$2.5M',
                    status: 'Cerrando Pronto',
                    img: 'https://images.unsplash.com/photo-1589923188900-85dae5243404?q=80&w=600&auto=format&fit=crop',
                  },
                  {
                    title: 'Hub Logístico Chaco Boreal',
                    type: 'Fondo de Inversión',
                    location: 'Ruta Transchaco',
                    term: '60 meses',
                    risk: 'Alto',
                    yield: '18.0%',
                    raised: 15,
                    goal: '$12M',
                    status: 'Nuevo',
                    img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=600&auto=format&fit=crop',
                  },
                ].map((opp, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-[#151e2e] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all group flex flex-col"
                  >
                    {/* Header Image */}
                    <div className="h-48 w-full relative overflow-hidden">
                      <div className="absolute inset-0 bg-slate-900/40 z-10 group-hover:bg-slate-900/20 transition-colors"></div>
                      <img
                        src={opp.img}
                        alt={opp.title}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute top-4 left-4 z-20">
                        <span className="px-3 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-slate-800 dark:text-slate-200 rounded-full text-xs font-bold uppercase tracking-wider">
                          {opp.type}
                        </span>
                      </div>
                      <div className="absolute top-4 right-4 z-20">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${opp.status === 'Abierto' ? 'bg-green-500 text-white' : opp.status === 'Nuevo' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'}`}
                        >
                          {opp.status}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex-1 flex flex-col">
                      <h4 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-4 line-clamp-2">
                        {opp.title}
                      </h4>

                      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <MapPin size={16} className="text-[#c49a45]" />
                          <span className="truncate">{opp.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <Clock size={16} className="text-[#c49a45]" />
                          <span>Plazo: {opp.term}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <Shield size={16} className="text-[#c49a45]" />
                          <span>Riesgo: {opp.risk}</span>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                          <TrendingUp size={16} className="text-green-500" />
                          <span className="text-green-600 dark:text-green-400">
                            TIR: {opp.yield}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-auto">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Fondeo de Capital
                          </span>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {opp.raised}% de {opp.goal}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-6">
                          <div
                            className="bg-[#c49a45] h-2 rounded-full"
                            style={{ width: `${opp.raised}%` }}
                          ></div>
                        </div>

                        <button className="w-full py-3 flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800 hover:bg-[#c49a45] hover:text-white text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors">
                          <span>Analizar Oportunidad</span>
                          <ArrowRight size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="w-full h-full flex items-center justify-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-center">
                <Users size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                <h3 className="text-xl font-bold text-slate-500 dark:text-slate-400">
                  Gestión de Clientes
                </h3>
                <p className="text-sm text-slate-400 mt-2">
                  Módulo en construcción para el Administrador.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="w-full h-full flex items-center justify-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-center">
                <Settings size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                <h3 className="text-xl font-bold text-slate-500 dark:text-slate-400">
                  Configuración de la Cuenta
                </h3>
                <p className="text-sm text-slate-400 mt-2">Preferencias y ajustes de seguridad.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CorporateDashboard;
