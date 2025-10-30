import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card.tsx';
import ProgressBar from '../components/ProgressBar.tsx';
import Button from '../components/Button.tsx';
import { IconChevronRight, IconChevronLeft, IconPlusCircle, IconFilter, IconPhone, IconMessage } from '../components/Icons.tsx';
import { useAuth } from '../hooks/useAuth.tsx';

// --- SUB-COMPONENTS ---

const WelcomeHeader = ({ name }: { name: string }) => (
    <div className="mb-8">
        <p className="text-text-light">Bienvenida de nuevo, {name} 👋</p>
        <div className="flex items-center gap-4 mt-1">
            <h1 className="text-3xl font-bold text-text-dark">¡Hagamos que aprender sea divertido!</h1>
            <span className="bg-primary/20 text-primary text-sm font-semibold px-3 py-1 rounded-full">Miembro Pro</span>
        </div>
    </div>
);

const CourseCard = ({ imageUrl, title, tags, progress }: { imageUrl: string, title: string, tags: string[], progress: number }) => (
    <div 
        className={`relative p-6 rounded-2xl text-white w-full h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-end min-h-[220px] overflow-hidden group`}
    >
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
          style={{ backgroundImage: `url(${imageUrl})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-2xl"></div>
        <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <div className="flex items-center gap-2 mb-4">
                {tags.map(tag => <span key={tag} className="bg-white/20 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded">{tag}</span>)}
            </div>
            <p className="text-sm font-medium mb-1 opacity-80">En Progreso</p>
            <div className="flex items-center gap-3">
                <ProgressBar value={progress} color="white" height="6px" className="bg-white/30" />
                <span className="text-sm font-semibold">{progress}%</span>
            </div>
        </div>
    </div>
);

const CurrentClasses = () => {
    return (
        <Card className="col-span-12 lg:col-span-7 !p-0 overflow-hidden">
             <div className="p-6 pb-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Clases en Curso</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" className="!p-2 text-text-light"><IconChevronLeft className="w-5 h-5"/></Button>
                        <Button variant="secondary" size="sm" className="!p-2 text-text-light"><IconChevronRight className="w-5 h-5"/></Button>
                    </div>
                </div>
            </div>
            <div className="flex flex-col md:flex-row gap-6 p-6 pt-4">
                <Link to="/sessions" className="block w-full md:w-1/2">
                    <CourseCard 
                        imageUrl="https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?q=80&w=800&auto=format&fit=crop"
                        title="Diseño UI Básico"
                        tags={["Diseño", "Thinking", "Principiante"]}
                        progress={65}
                    />
                </Link>
                <Link to="/sessions" className="block w-full md:w-1/2">
                    <CourseCard 
                        imageUrl="https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=800&auto=format&fit=crop"
                        title="Desarrollo Web"
                        tags={["Desarrollo", "Software", "Web"]}
                        progress={80}
                    />
                </Link>
            </div>
        </Card>
    );
};

const LearningHours = () => {
    const [timeframe, setTimeframe] = useState('monthly'); // 'monthly' or 'weekly'

    const monthlyData = {
        points: [ {day: 'Mar 1', hours: 8}, {day: 'Mar 8', hours: 9}, {day: 'Mar 15', hours: 6}, {day: 'Mar 22', hours: 9}, {day: 'Mar 29', hours: 8.5}],
        maxHours: 10
    };
    
    const weeklyData = {
        points: [ {day: 'Lu', hours: 2.5}, {day: 'Ma', hours: 1}, {day: 'Mi', hours: 3}, {day: 'Ju', hours: 2}, {day: 'Vi', hours: 4.5}],
        maxHours: 5
    };

    const { points: data, maxHours } = timeframe === 'monthly' ? monthlyData : weeklyData;
    
    return (
    <Card className="col-span-12 lg:col-span-5">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Horas de Aprendizaje</h2>
             <div className="flex items-center gap-2">
                <select 
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="text-sm border-none bg-gray-100 rounded-md p-1 focus:ring-0 cursor-pointer"
                >
                    <option value="monthly">Mensual</option>
                    <option value="weekly">Semanal</option>
                </select>
                <Button variant="secondary" size="sm" className="!p-2 text-text-light"><IconFilter className="w-5 h-5"/></Button>
            </div>
        </div>
        <div className="flex justify-around items-end h-32 mb-4 gap-3 px-2">
            {data.map(d => (
                <div key={d.day} className="flex flex-col items-center w-full group relative">
                    <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-800 text-white text-xs px-2 py-1 rounded-md pointer-events-none">
                        {d.hours} hrs
                    </div>
                    <div className="w-5 bg-gray-200 rounded-md flex-grow flex items-end">
                        <div className="w-full bg-primary rounded-md transition-all duration-300" style={{height: `${(d.hours/maxHours)*100}%`}}></div>
                    </div>
                    <span className="text-xs text-text-light mt-2">{d.day}</span>
                </div>
            ))}
        </div>
        <div className="flex justify-around border-t border-border pt-3">
             <div className="text-center">
                <p className="text-xs text-text-light">Diseño UI</p>
                <p className="font-bold">1h 15m</p>
            </div>
             <div className="text-center">
                <p className="text-xs text-text-light">Desarrollo</p>
                <p className="font-bold">1h 2m</p>
            </div>
            <div className="text-center">
                <p className="text-xs text-text-light">Diseño de Logo</p>
                <p className="font-bold">0h 30m</p>
            </div>
        </div>
    </Card>
    )
};

const PendingTasks = () => {
    const tasks = [
        { id: 't1', title: 'Análisis de Caso Ético', creationDate: '2025-06-20', dueDate: '2025-06-28', status: 'pending' },
        { id: 't2', title: 'Creación de Código de Ética Personal', creationDate: '2025-06-25', dueDate: '2025-07-05', status: 'pending' },
        { id: 't3', title: 'Presentación de noticias sobre violación ética', creationDate: '2025-06-15', dueDate: '2025-06-26', status: 'completed' },
        { id: 't4', title: 'Análisis comparativo de leyes', creationDate: '2025-06-10', dueDate: '2025-06-24', status: 'pending' },
    ];

    const today = new Date('2025-06-25T12:00:00Z');

    const TaskProgress = ({ task }: { task: typeof tasks[0] }) => {
        const startDate = new Date(task.creationDate);
        const dueDate = new Date(task.dueDate);

        const totalDuration = dueDate.getTime() - startDate.getTime();
        const elapsedDuration = today.getTime() - startDate.getTime();
        const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

        let progress = 0;
        let label = '';
        let color = 'var(--primary)';
        let textColor = 'text-text-light';

        if (task.status === 'completed') {
            progress = 100;
            label = 'Completada';
            color = 'var(--primary)';
            textColor = 'text-green-600';
        } else if (daysRemaining < 0) {
            progress = 100;
            label = 'Vencida';
            color = '#EF4444'; // red-500
            textColor = 'text-red-600';
        } else {
            progress = totalDuration > 0 ? Math.max(0, Math.min(100, (elapsedDuration / totalDuration) * 100)) : 0;
            label = `Faltan ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}`;
            if (daysRemaining <= 3) {
                color = '#F59E0B'; // amber-500
                textColor = 'text-amber-600';
            } else {
                color = '#3B82F6'; // blue-500
                textColor = 'text-blue-600';
            }
        }

        return (
            <div>
                <ProgressBar value={progress} color={color} height="6px" className="my-2" />
                <p className={`text-xs font-medium ${textColor}`}>{label}</p>
            </div>
        );
    };

    return (
        <Card className="col-span-12">
            <h2 className="text-lg font-bold mb-4">Tareas Pendientes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tasks.map(task => (
                    <Link key={task.id} to="/assignments" className="block">
                        <div 
                            className="bg-background p-4 rounded-lg border border-border hover:bg-gray-100 hover:border-primary/50 transition-all h-full"
                        >
                            <h3 className="font-semibold text-sm text-text-dark">{task.title}</h3>
                            <TaskProgress task={task} />
                        </div>
                    </Link>
                ))}
            </div>
        </Card>
    );
};

const StudentProgress = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    const progressData = [
        { id: 'clase-1', session: 'Clase 1: Introducción a la Ética', completed: 8, total: 8 },
        { id: 'clase-2', session: 'Clase 2: Valores Morales y Éticos', completed: 5, total: 5 },
        { id: 'clase-3', session: 'Clase 3: Problemas Éticos Actuales', completed: 3, total: 4 },
        { id: 'clase-4', session: 'Clase 4: Ética en la Informática', completed: 1, total: 5 },
        { id: 'clase-5', session: 'Clase 5: Deontología Profesional', completed: 0, total: 3 },
        { id: 'clase-6', session: 'Clase 6: Normativas y Regulaciones', completed: 0, total: 4 },
        { id: 'clase-7', session: 'Clase 7: Valores Humanos', completed: 0, total: 3 },
    ];

    const displayedProgress = isExpanded ? progressData : progressData.slice(0, 5);

    return (
        <Card className="col-span-12">
            <h2 className="text-lg font-bold mb-4">Progreso del Estudiante</h2>
            <ul className="space-y-2">
                {displayedProgress.map((item) => {
                    const percentage = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
                    return (
                        <li key={item.id}>
                            <Link 
                                to={`/session/${item.id}`}
                                className="block p-2 -mx-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <p className="font-semibold text-sm text-text-dark">{item.session}</p>
                                    <p className="text-xs text-text-light">{item.completed}/{item.total} actividades</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <ProgressBar value={percentage} color="var(--primary)" height="6px" />
                                    <span className="text-sm font-semibold w-12 text-right">{percentage}%</span>
                                </div>
                            </Link>
                        </li>
                    );
                })}
            </ul>
            {progressData.length > 5 && (
                <div className="mt-4 text-center">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        aria-expanded={isExpanded}
                    >
                        {isExpanded ? 'Mostrar menos' : `Ver todas las ${progressData.length} sesiones`}
                    </Button>
                </div>
            )}
        </Card>
    );
};

const Messages = () => {
    const messages = [
        { name: 'Arlene McCoy', status: 'En línea', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&h=100&auto=format&fit=crop' },
        { name: 'Jerome Bell', status: 'En línea', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&h=100&auto=format&fit=crop' },
        { name: 'Annette Pena', status: 'hace 8 minutos', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=100&h=100&auto=format&fit=crop' },
        { name: 'Brenda Clarence', status: 'hace 1 hora', avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?q=80&w=100&h=100&auto=format&fit=crop' },
    ];
    return (
        <Card className="col-span-12 md:col-span-6 lg:col-span-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Mensajes</h2>
                <Button variant="secondary" size="sm" className="!p-2 text-text-light"><IconPlusCircle className="w-5 h-5"/></Button>
            </div>
            <input type="text" placeholder="Buscar aquí..." className="w-full text-sm bg-background border-border border rounded-md p-2 mb-4 focus:ring-1 focus:ring-primary/50 outline-none"/>
            <ul className="space-y-3">
                {messages.map(msg => (
                <li key={msg.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={msg.avatar} alt={msg.name} className="w-10 h-10 rounded-full object-cover"/>
                        <div>
                            <p className="font-semibold text-sm">{msg.name}</p>
                            <p className="text-xs text-text-light">{msg.status}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-text-light">
                        <IconPhone className="w-5 h-5 cursor-pointer hover:text-text-dark"/>
                        <IconMessage className="w-5 h-5 cursor-pointer hover:text-text-dark"/>
                    </div>
                </li>
                ))}
            </ul>
        </Card>
    );
}

const Calendar = () => {
    // Simplified calendar logic for display
    const days = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];
    const dates = Array.from({ length: 31 }, (_, i) => i + 1);
    return (
         <Card className="col-span-12 md:col-span-6 lg:col-span-4">
             <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Calendario</h2>
                <select className="text-sm border-none bg-gray-100 rounded-md p-1 focus:ring-0">
                    <option>Junio 2025</option>
                </select>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-text-light mb-2">
                {days.map(d => <span key={d} className="font-semibold uppercase">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 text-center text-sm gap-y-1">
                 {dates.map(d => (
                    <div key={d} className={`p-1.5 rounded-full flex items-center justify-center cursor-pointer ${d === 25 ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}>
                        {d}
                    </div>
                 ))}
            </div>
         </Card>
    )
}

const ClassPlanner = () => {
    const classes = [
        { title: 'Clase de Diseño UI', time: '10am - 12am', progress: 75, color: '#6366F1' },
        { title: 'Clase de Diseño de Logo', time: '1pm - 2pm', progress: 100, color: '#10B981' },
        { title: 'Clase de Desarrollo Web', time: '3pm - 4pm', progress: 80, color: '#8B5CF6' },
    ];
    return (
         <Card className="col-span-12 lg:col-span-4">
             <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Planificador de Clases</h2>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" className="!p-2 text-text-light"><IconChevronLeft className="w-5 h-5"/></Button>
                    <Button variant="secondary" size="sm" className="!p-2 text-text-light"><IconChevronRight className="w-5 h-5"/></Button>
                </div>
            </div>
            <ul className="space-y-2">
                {classes.map(c => (
                    <li key={c.title}>
                        <Link
                            to="/sessions"
                            className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <div className="text-center">
                               <p className="font-bold text-sm">27</p>
                               <p className="text-xs text-text-light">Mar</p>
                            </div>
                            <div className="flex-1 p-3 rounded-lg">
                                <p className="font-semibold text-sm">{c.title}</p>
                                <p className="text-xs text-text-light mb-2">{c.time}</p>
                                <ProgressBar value={c.progress} color={c.color} height="5px" />
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </Card>
    );
};


// --- MAIN DASHBOARD APP ---
const DashboardPage: React.FC = () => {
    const { user } = useAuth();
  
  return (
    <div>
        <WelcomeHeader name={user?.first_name || 'Estudiante'} />
        <main className="grid grid-cols-12 gap-6">
            <CurrentClasses />
            <LearningHours />
            <PendingTasks />
            <StudentProgress />
            <Messages />
            <Calendar />
            <ClassPlanner />
        </main>
    </div>
  );
};

export default DashboardPage;