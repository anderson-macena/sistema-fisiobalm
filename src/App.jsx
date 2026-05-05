import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  LogOut, 
  Plus, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  RotateCcw,
  Users,
  Mail,
  Phone,
  FlaskConical,
  Trash2,
  FileText,
  History,
  BarChart3,
  CalendarX,
  UserPlus,
  Fingerprint,
  MinusCircle,
  Edit3,
  Save,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Zap,
  CalendarDays,
  Home,
  Cake
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  updateDoc,
  increment,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

// Verificação de segurança para ambiente local (VS Code / Localhost)
const firebaseConfig = {
  apiKey: "AIzaSyBs65ZgCmJpXPjAqK-tOqF6HE2FqTT65UM",
  authDomain: "fisiobalm-26532.firebaseapp.com",
  projectId: "fisiobalm-26532",
  storageBucket: "fisiobalm-26532.firebasestorage.app",
  messagingSenderId: "498080566980",
  appId: "1:498080566980:web:07c3ca7fe7869b4aab8391"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'fisiobalm-studio-v1';

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const HOURS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
const PLANOS = ['Mensal', 'Trimestral', 'Semestral'];
const FREQUENCIAS = [
  { label: '1x por semana', value: 1 },
  { label: '2x por semana', value: 2 },
  { label: '3x por semana', value: 3 }
];

const ADMINS = [
  { cpf: '08439510446', name: 'Anderson Macena', role: 'admin' },
  { cpf: '12582241601', name: 'Jessica Rodrigues Ribeiro', role: 'admin' },
  { cpf: '04712284196', name: 'Andriele Barbosa Lopes', role: 'admin' },
  { cpf: '68930925120', name: 'Mariana Soares Muniz', role: 'admin' },
];

const STATUS_THEME = {
  pendente: { color: 'text-gray-400', bg: 'bg-gray-500/5', border: 'border-white/10', accent: 'bg-gray-500', label: 'Agendado', icon: <Clock size={12}/> },
  concluida: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', accent: 'bg-emerald-500', label: 'Presença', icon: <CheckCircle2 size={12}/> },
  falta: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', accent: 'bg-rose-500', label: 'Falta', icon: <AlertCircle size={12}/> },
  desmarcado: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', accent: 'bg-orange-500', label: 'Desmarcado', icon: <CalendarX size={12}/> },
  desmarcado_atrasado: { color: 'text-rose-300', bg: 'bg-rose-900/20', border: 'border-rose-500/20', accent: 'bg-rose-500', label: 'Desmarcado (Fora do Prazo)', icon: <AlertCircle size={12}/> },
  reposicao: { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', accent: 'bg-purple-500', label: 'Reposição', icon: <RotateCcw size={12}/> },
  experimental: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', accent: 'bg-amber-500', label: 'Experimental', icon: <FlaskConical size={12}/> },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [activeTab, setActiveTab] = useState('agenda');
  const [selectedDay, setSelectedDay] = useState('Segunda');
  const [schedules, setSchedules] = useState([]);
  const [students, setStudents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [evolutions, setEvolutions] = useState([]);
  const [loginCpf, setLoginCpf] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [editStudentData, setEditStudentData] = useState(null);
  const [showStudentDetailsId, setShowStudentDetailsId] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEvolution, setNewEvolution] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [newStudent, setNewStudent] = useState({ 
    name: '', cpf: '', birthDate: '', email: '', address: '', plan: 'Mensal', 
    frequency: 1, phone: '', startDate: '', endDate: '',
    fixedSchedules: [{ day: 'Segunda', hour: '07:00' }], credits: 0
  });

  const [scheduleForm, setScheduleForm] = useState({ studentId: '', manualName: '', status: 'pendente' });

  // Autenticação Inicial
  useEffect(() => {
    const initAuth = async () => {
      try {
        const authToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (authToken) {
          await signInWithCustomToken(auth, authToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Erro na autenticação:", err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
        setFirebaseUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Sincronização com Firestore
  useEffect(() => {
    if (!firebaseUser) return;

    const schedulesRef = collection(db, 'artifacts', appId, 'public', 'data', 'schedules');
    const studentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'students');
    const logsRef = collection(db, 'artifacts', appId, 'public', 'data', 'logs');
    const evolutionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'evolutions');

    const unsubSchedules = onSnapshot(schedulesRef, (snap) => {
      setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Erro schedules:", err));

    const unsubStudents = onSnapshot(studentsRef, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStudents(data.sort((a, b) => a.name.localeCompare(b.name)));
      
      // Atualiza estado do usuário logado se for aluno
      if (user && user.role !== 'admin') {
        const updatedUser = data.find(s => s.id === user.id);
        if (updatedUser) setUser(prev => ({ ...prev, ...updatedUser }));
      }
    }, (err) => console.error("Erro students:", err));

    const unsubLogs = onSnapshot(logsRef, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 50));
    }, (err) => console.error("Erro logs:", err));

    const unsubEvolutions = onSnapshot(evolutionsRef, (snap) => {
      setEvolutions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Erro evolutions:", err));

    return () => {
      unsubSchedules(); unsubStudents(); unsubLogs(); unsubEvolutions();
    };
  }, [firebaseUser, user?.id]);

  const handleLogin = () => {
    setIsLoggingIn(true);
    setLoginError('');
    
    setTimeout(() => {
      const cleanCpf = loginCpf.replace(/\D/g, '');
      const adminMatch = ADMINS.find(a => a.cpf === cleanCpf);
      
      if (adminMatch) { 
        setUser(adminMatch); 
        setActiveTab('agenda');
        setIsLoggingIn(false);
        return; 
      }
      
      const student = students.find(s => s.cpf === cleanCpf);
      if (student) { 
        setUser({ role: 'aluno', ...student }); 
        setActiveTab('agenda');
        setIsLoggingIn(false);
      } else { 
        setLoginError('CPF não identificado em nossa base de dados.'); 
        setIsLoggingIn(false);
      }
    }, 800);
  };

  const createLog = async (action) => {
    if (!firebaseUser) return;
    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), {
            action, 
            user: user?.name || 'Sistema', 
            timestamp: new Date().toISOString()
        });
    } catch (e) { console.error(e); }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (isSubmitting || !firebaseUser) return;
    setIsSubmitting(true);
    try {
      const freqObj = FREQUENCIAS.find(f => f.value === Number(newStudent.frequency));
      const studentData = { 
        ...newStudent, 
        cpf: newStudent.cpf.replace(/\D/g, ''), 
        createdAt: new Date().toISOString(),
        frequencyLabel: freqObj ? freqObj.label : '1x por semana'
      };
      
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), studentData);
      
      for (const sched of newStudent.fixedSchedules) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'schedules'), {
          name: studentData.name,
          studentId: docRef.id,
          day: sched.day,
          hour: sched.hour,
          status: 'pendente',
          isFixed: true,
          createdBy: user.name,
          createdAt: new Date().toISOString()
        });
      }

      await createLog(`Matriculou o novo aluno: ${studentData.name}`);
      setNewStudent({ name: '', cpf: '', birthDate: '', email: '', address: '', plan: 'Mensal', frequency: 1, phone: '', startDate: '', endDate: '', fixedSchedules: [{ day: 'Segunda', hour: '07:00' }], credits: 0 });
      setShowAddStudent(false);
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    if (!firebaseUser || !editStudentData) return;
    try {
      const { id, ...data } = editStudentData;
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', id), data);
      
      await createLog(`Editou dados/horários do aluno: ${data.name}`);
      setEditStudentData(null);
    } catch (err) { console.error(err); }
  };

  const handleStudentDesmarcar = async (scheduleId, hour) => {
    if (!firebaseUser || !user) return;
    
    const now = new Date();
    const [h, m] = hour.split(':').map(Number);
    const scheduleDate = new Date();
    scheduleDate.setHours(h, m, 0, 0);
    
    const diffMs = scheduleDate - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    let newStatus = 'desmarcado_atrasado';
    let creditBonus = 0;

    if (diffHours >= 4) {
      newStatus = 'desmarcado';
      creditBonus = 1;
    }

    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'schedules', scheduleId), { status: newStatus });
    if (creditBonus > 0) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', user.id), { credits: increment(creditBonus) });
    }
    await createLog(`${user.name} desmarcou aula das ${hour}.`);
  };

  const handleReposicao = async (hour) => {
    if (!user || (user.credits || 0) <= 0) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'schedules'), {
      name: user.name,
      studentId: user.id,
      day: selectedDay,
      hour: hour,
      status: 'reposicao',
      createdBy: user.name,
      createdAt: new Date().toISOString()
    });
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', user.id), { credits: increment(-1) });
    await createLog(`${user.name} agendou reposição para ${selectedDay} às ${hour}`);
  };

  const updateScheduleStatus = async (id, status, name) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'schedules', id), { status });
    await createLog(`Alterou status de ${name} para ${STATUS_THEME[status].label}`);
  };

  const deleteSchedule = async (id, name) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'schedules', id));
    await createLog(`Removeu agendamento de ${name}`);
  };

  const adjustCredits = async (studentId, studentName, amount) => {
    if (!firebaseUser) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId), { credits: increment(amount) });
    await createLog(`Ajustou créditos de ${studentName}: ${amount > 0 ? '+' : ''}${amount}`);
  };

  const metrics = useMemo(() => ({
    total: schedules.length,
    concluidas: schedules.filter(s => s.status === 'concluida').length,
    faltas: schedules.filter(s => s.status === 'falta').length,
    desmarcados: schedules.filter(s => s.status === 'desmarcado' || s.status === 'desmarcado_atrasado').length,
    reposicao: schedules.filter(s => s.status === 'reposicao').length,
    experimental: schedules.filter(s => s.status === 'experimental').length,
    pendentes: schedules.filter(s => s.status === 'pendente').length,
    alunos: students.length
  }), [schedules, students]);

  const userStats = useMemo(() => {
    if (!user || user.role === 'admin') return null;
    const userSchedules = schedules.filter(s => s.studentId === user.id);
    return {
      presencas: userSchedules.filter(s => s.status === 'concluida').length,
      faltas: userSchedules.filter(s => s.status === 'falta').length,
      desmarcacoes: userSchedules.filter(s => s.status === 'desmarcado' || s.status === 'desmarcado_atrasado').length,
      creditos: user.credits || 0,
      startDate: user.startDate,
      endDate: user.endDate
    };
  }, [user, schedules]);

  const showStudentDetails = useMemo(() => {
    return students.find(s => s.id === showStudentDetailsId);
  }, [students, showStudentDetailsId]);

  if (loading) {
    return (
        <div className="min-h-screen bg-[#07090c] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
    );
  }

  if (!user) return (
    <div className="min-h-screen bg-[#07090c] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full" />
      
      <div className="w-full max-w-lg bg-[#11141a]/80 backdrop-blur-2xl rounded-[3.5rem] p-8 lg:p-14 border border-white/5 shadow-2xl relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500 rounded-[2rem] mb-6 shadow-2xl shadow-emerald-500/20">
            <Zap className="text-black" size={32} strokeWidth={3} />
          </div>
          <h1 className="text-5xl font-black text-white italic tracking-tighter mb-3">FISIOBALM</h1>
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-8 bg-emerald-500/30" />
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">Gestão de Studio de Pilates</p>
            <div className="h-px w-8 bg-emerald-500/30" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-500 group-focus-within:text-emerald-500 transition-colors">
              <ShieldCheck size={20} />
            </div>
            <input
              type="text" 
              placeholder="Digite seu CPF (apenas números)"
              className="w-full bg-[#1a1f26] border border-white/5 rounded-3xl pl-16 pr-6 py-6 text-white font-mono text-lg outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all placeholder:text-gray-700"
              value={loginCpf} 
              onChange={e => setLoginCpf(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {loginError && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
              <AlertCircle size={16} className="text-rose-500" />
              <p className="text-rose-500 text-[10px] font-black uppercase">{loginError}</p>
            </div>
          )}

          <button 
            onClick={handleLogin} 
            disabled={isLoggingIn || !loginCpf}
            className="w-full bg-emerald-500 text-black font-black py-6 rounded-3xl uppercase tracking-widest hover:bg-emerald-400 active:scale-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
          >
            {isLoggingIn ? (
              <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                Acessar Studio <ArrowRight size={20} strokeWidth={3} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#07090c] text-white pb-24 lg:pb-8 lg:pl-64">
      
      <nav className="fixed bottom-0 left-0 right-0 lg:top-0 lg:w-64 lg:h-full bg-[#11141a] border-t lg:border-r border-white/5 z-50 p-4 flex lg:flex-col gap-2">
        <div className="hidden lg:block p-6 mb-8">
          <h2 className="text-2xl font-black italic text-emerald-500 tracking-tighter">FISIOBALM</h2>
        </div>
        <div className="flex lg:flex-col gap-1 w-full">
          <NavItem active={activeTab === 'agenda'} icon={<Calendar size={20}/>} label="Agenda" onClick={() => setActiveTab('agenda')} />
          {user.role === 'admin' && (
            <>
              <NavItem active={activeTab === 'dashboard'} icon={<BarChart3 size={20}/>} label="Dashboard" onClick={() => setActiveTab('dashboard')} />
              <NavItem active={activeTab === 'alunos'} icon={<Users size={20}/>} label="Alunos" onClick={() => setActiveTab('alunos')} />
              <NavItem active={activeTab === 'historico'} icon={<History size={20}/>} label="Log de Auditoria" onClick={() => setActiveTab('historico')} />
            </>
          )}
        </div>
        <button onClick={() => setUser(null)} className="lg:mt-auto flex items-center gap-3 px-6 py-4 text-rose-500/50 hover:text-rose-500 transition-all">
          <LogOut size={20}/> <span className="hidden lg:block text-[10px] font-black uppercase">Sair</span>
        </button>
      </nav>

      <main className="p-4 lg:p-12 max-w-7xl mx-auto">
        <header className="mb-12">
          <div className="bg-[#11141a] border border-white/5 rounded-[2.5rem] p-6 lg:p-10 flex flex-col items-stretch gap-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 w-full">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center text-black font-black text-2xl">{user.name.charAt(0)}</div>
                <div>
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter">{user.name}</h2>
                  <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{user.role === 'admin' ? 'Administrador' : 'Aluno Ativo'}</span>
                </div>
              </div>
              {user.role !== 'admin' && userStats && (
                <div className="flex flex-wrap gap-4 justify-center">
                  <StatMetric label="Presenças" value={userStats.presencas} color="text-emerald-500" />
                  <StatMetric label="Faltas" value={userStats.faltas} color="text-rose-500" />
                  <StatMetric label="Desmarcações" value={userStats.desmarcacoes} color="text-orange-500" />
                  <StatMetric label="Créditos" value={userStats.creditos} color="text-purple-400" highlight />
                </div>
              )}
            </div>
            {user.role !== 'admin' && userStats && (
              <div className="flex flex-wrap justify-center md:justify-start gap-8 pt-4 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <CalendarDays size={16} className="text-gray-500"/>
                  <span className="text-[10px] font-black uppercase text-gray-500">Início: <span className="text-white ml-1">{userStats.startDate ? new Date(userStats.startDate).toLocaleDateString() : '---'}</span></span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-gray-500"/>
                  <span className="text-[10px] font-black uppercase text-gray-500">Fim Previsto: <span className="text-emerald-500 ml-1">{userStats.endDate ? new Date(userStats.endDate).toLocaleDateString() : '---'}</span></span>
                </div>
              </div>
            )}
          </div>
        </header>

        {activeTab === 'agenda' && (
          <div>
            <div className="flex gap-2 mb-10 overflow-x-auto pb-4 no-scrollbar">
              {DAYS.map(day => (
                <button 
                  key={day} onClick={() => setSelectedDay(day)} 
                  className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${selectedDay === day ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-[#11141a] text-gray-500 border border-white/5'}`}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              {HOURS.map(hour => {
                const daySchedules = schedules.filter(s => s.day === selectedDay && s.hour === hour);
                const userScheduled = user.role !== 'admin' && daySchedules.find(s => s.studentId === user.id);
                
                return (
                  <div key={hour} className="flex flex-col md:flex-row gap-6">
                    <div className="w-20 h-16 bg-[#11141a] border border-white/5 rounded-3xl flex flex-col items-center justify-center">
                      <span className="font-black text-sm text-emerald-500">{hour}</span>
                      <span className="text-[8px] font-bold text-gray-600">{daySchedules.length}/3</span>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {daySchedules.map(s => {
                        const theme = STATUS_THEME[s.status] || STATUS_THEME.pendente;
                        const isMine = s.studentId === user.id;
                        
                        if (user.role !== 'admin' && !isMine) return null;

                        return (
                          <div key={s.id} className={`p-5 rounded-[2rem] border ${theme.bg} ${theme.border} group relative`}>
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <span className="text-xs font-black uppercase block truncate max-w-[120px]">{s.name}</span>
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${theme.border} ${theme.color}`}>{theme.label}</span>
                              </div>
                              {user.role === 'admin' && (
                                <button onClick={() => deleteSchedule(s.id, s.name)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-600 hover:text-rose-500 transition-all"><Trash2 size={12}/></button>
                              )}
                              {user.role !== 'admin' && isMine && (s.status === 'pendente' || s.status === 'reposicao') && (
                                <button onClick={() => handleStudentDesmarcar(s.id, hour)} className="bg-rose-500/10 text-rose-500 p-2 rounded-xl hover:bg-rose-500 hover:text-black transition-all">
                                  <CalendarX size={14}/>
                                </button>
                              )}
                            </div>
                            {user.role === 'admin' && (
                              <select 
                                value={s.status}
                                onChange={(e) => updateScheduleStatus(s.id, e.target.value, s.name)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-[9px] font-black uppercase outline-none appearance-none"
                              >
                                {Object.entries(STATUS_THEME).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                              </select>
                            )}
                          </div>
                        );
                      })}
                      {user.role === 'admin' && daySchedules.length < 3 && (
                        <button onClick={() => setShowScheduleModal({ hour })} className="h-24 border border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center text-gray-700 hover:text-emerald-500 hover:border-emerald-500/30 transition-all">
                          <Plus size={20}/>
                        </button>
                      )}
                      {user.role !== 'admin' && !userScheduled && daySchedules.length < 3 && (user.credits || 0) > 0 && (
                        <button onClick={() => handleReposicao(hour)} className="h-24 border border-dashed border-purple-500/20 rounded-[2rem] flex flex-col items-center justify-center text-purple-500/40 hover:text-purple-400 hover:border-purple-500/40 transition-all">
                          <RotateCcw size={20} className="mb-1" />
                          <span className="text-[8px] font-black uppercase">Usar Crédito</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'alunos' && user.role === 'admin' && (
          <div>
            <div className="flex flex-col md:flex-row justify-between gap-6 mb-12">
              <h1 className="text-3xl font-black uppercase italic">Alunos</h1>
              <div className="flex gap-4">
                <input type="text" placeholder="Buscar aluno..." className="bg-[#11141a] border border-white/5 rounded-2xl px-6 py-4 text-xs w-64 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <button onClick={() => setShowAddStudent(true)} className="bg-emerald-500 text-black px-6 py-4 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2"><UserPlus size={18}/> Matricular</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                <div key={s.id} className="bg-[#11141a] p-6 rounded-[2.5rem] border border-white/5 hover:border-emerald-500/30 cursor-pointer transition-all group relative">
                  <div onClick={() => setShowStudentDetailsId(s.id)}>
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl mb-6 flex items-center justify-center text-emerald-500 font-black text-xl">{s.name.charAt(0)}</div>
                    <h3 className="font-black uppercase text-sm mb-1 truncate">{s.name}</h3>
                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-4">{s.plan} • {s.frequencyLabel}</p>
                    
                    <div className="space-y-2 pt-4 border-t border-white/5">
                      <div className="flex justify-between items-center text-[8px] font-black uppercase">
                        <span className="text-gray-600">Início</span>
                        <span className="text-white">{s.startDate ? new Date(s.startDate).toLocaleDateString() : '---'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[8px] font-black uppercase">
                        <span className="text-gray-600">Fim</span>
                        <span className="text-emerald-500">{s.endDate ? new Date(s.endDate).toLocaleDateString() : '---'}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditStudentData(JSON.parse(JSON.stringify(s))); }}
                    className="absolute top-6 right-6 p-2 bg-white/5 text-gray-500 rounded-xl hover:bg-emerald-500 hover:text-black transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Edit3 size={16}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && user.role === 'admin' && (
          <div>
            <h1 className="text-3xl font-black uppercase italic mb-10">Dashboard Geral</h1>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard label="Agendados" value={metrics.pendentes} color="text-gray-400" icon={<Clock size={24}/>} />
              <StatCard label="Presenças" value={metrics.concluidas} color="text-emerald-500" icon={<CheckCircle2 size={24}/>} />
              <StatCard label="Faltas" value={metrics.faltas} color="text-rose-500" icon={<AlertCircle size={24}/>} />
              <StatCard label="Desmarcações" value={metrics.desmarcados} color="text-orange-500" icon={<CalendarX size={24}/>} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard label="Reposições" value={metrics.reposicao} color="text-purple-400" icon={<RotateCcw size={24}/>} />
              <StatCard label="Experimentais" value={metrics.experimental} color="text-amber-400" icon={<FlaskConical size={24}/>} />
              <StatCard label="Total Alunos" value={metrics.alunos} color="text-blue-500" icon={<Users size={24}/>} />
            </div>
          </div>
        )}

        {activeTab === 'historico' && user.role === 'admin' && (
          <div className="max-w-4xl mx-auto space-y-3">
             <h1 className="text-2xl font-black uppercase italic mb-6">Logs do Sistema</h1>
             {logs.map(log => (
               <div key={log.id} className="bg-[#11141a] p-5 rounded-2xl border border-white/5 flex justify-between items-center">
                 <div>
                   <p className="text-[10px] font-black uppercase text-white">{log.action}</p>
                   <p className="text-[8px] font-bold text-gray-600">Por: {log.user}</p>
                 </div>
                 <span className="text-[9px] font-bold text-gray-700">{new Date(log.timestamp).toLocaleString()}</span>
               </div>
             ))}
          </div>
        )}
      </main>

      {/* MODAL DE MATRÍCULA */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 backdrop-blur-xl">
          <div className="bg-[#11141a] w-full max-w-4xl rounded-[3.5rem] p-10 border border-white/10 overflow-y-auto max-h-[90vh] no-scrollbar shadow-2xl">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black italic uppercase">Nova Matrícula</h2>
              <button onClick={() => setShowAddStudent(false)} className="text-gray-500 hover:text-white"><X size={32}/></button>
            </div>
            <form onSubmit={handleAddStudent} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup label="Nome Completo *" value={newStudent.name} onChange={v => setNewStudent({...newStudent, name: v})} required />
                <InputGroup label="CPF (Apenas números) *" value={newStudent.cpf} onChange={v => setNewStudent({...newStudent, cpf: v})} required />
                <InputGroup label="Data de Nascimento" type="date" value={newStudent.birthDate} onChange={v => setNewStudent({...newStudent, birthDate: v})} />
                <InputGroup label="WhatsApp" value={newStudent.phone} onChange={v => setNewStudent({...newStudent, phone: v})} />
                <InputGroup label="E-mail" type="email" value={newStudent.email} onChange={v => setNewStudent({...newStudent, email: v})} />
                <InputGroup label="Endereço Completo" value={newStudent.address} onChange={v => setNewStudent({...newStudent, address: v})} />
                <InputGroup label="Início do Plano" type="date" value={newStudent.startDate} onChange={v => setNewStudent({...newStudent, startDate: v})} />
                <InputGroup label="Fim do Plano" type="date" value={newStudent.endDate} onChange={v => setNewStudent({...newStudent, endDate: v})} />
                
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-600 ml-2">Plano</label>
                  <select className="w-full bg-[#1a1f26] border border-white/5 rounded-2xl p-5 text-sm" value={newStudent.plan} onChange={e => setNewStudent({...newStudent, plan: e.target.value})}>
                    {PLANOS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-600 ml-2">Frequência</label>
                  <select className="w-full bg-[#1a1f26] border border-white/5 rounded-2xl p-5 text-sm" value={newStudent.frequency} onChange={e => {
                    const count = Number(e.target.value);
                    const updatedSchedules = Array.from({ length: count }).map((_, i) => (
                      newStudent.fixedSchedules[i] || { day: 'Segunda', hour: '07:00' }
                    ));
                    setNewStudent({ ...newStudent, frequency: count, fixedSchedules: updatedSchedules });
                  }}>
                    {FREQUENCIAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="p-8 bg-black/20 rounded-[2.5rem] border border-white/5">
                <p className="text-[10px] font-black uppercase text-emerald-500 mb-6 tracking-widest">Definir Horários de Aula</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {newStudent.fixedSchedules.map((sched, idx) => (
                    <div key={idx} className="bg-[#1a1f26] p-5 rounded-2xl border border-white/5 space-y-3">
                      <select className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs" value={sched.day} onChange={e => {
                        const copy = [...newStudent.fixedSchedules];
                        copy[idx].day = e.target.value;
                        setNewStudent({...newStudent, fixedSchedules: copy});
                      }}>
                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs" value={sched.hour} onChange={e => {
                        const copy = [...newStudent.fixedSchedules];
                        copy[idx].hour = e.target.value;
                        setNewStudent({...newStudent, fixedSchedules: copy});
                      }}>
                        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-500 text-black font-black py-6 rounded-2xl uppercase text-xs tracking-widest hover:scale-[1.01] transition-all">
                {isSubmitting ? 'Salvando...' : 'Finalizar Matrícula'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {editStudentData && (
        <div className="fixed inset-0 bg-black/95 z-[250] flex items-center justify-center p-4 backdrop-blur-xl">
          <div className="bg-[#11141a] w-full max-w-4xl rounded-[3.5rem] p-10 border border-white/10 overflow-y-auto max-h-[90vh] no-scrollbar shadow-2xl">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black italic uppercase">Editar Aluno</h2>
              <button onClick={() => setEditStudentData(null)} className="text-gray-500 hover:text-white"><X size={32}/></button>
            </div>
            <form onSubmit={handleEditStudent} className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <InputGroup label="Nome" value={editStudentData.name} onChange={v => setEditStudentData({...editStudentData, name: v})} />
                 <InputGroup label="CPF" value={editStudentData.cpf} onChange={v => setEditStudentData({...editStudentData, cpf: v})} />
                 <InputGroup label="Data Nascimento" type="date" value={editStudentData.birthDate} onChange={v => setEditStudentData({...editStudentData, birthDate: v})} />
                 <InputGroup label="Início do Plano" type="date" value={editStudentData.startDate} onChange={v => setEditStudentData({...editStudentData, startDate: v})} />
                 <InputGroup label="Fim do Plano" type="date" value={editStudentData.endDate} onChange={v => setEditStudentData({...editStudentData, endDate: v})} />
                 <InputGroup label="Fone" value={editStudentData.phone} onChange={v => setEditStudentData({...editStudentData, phone: v})} />
                 <InputGroup label="E-mail" type="email" value={editStudentData.email} onChange={v => setEditStudentData({...editStudentData, email: v})} />
                 <InputGroup label="Endereço" value={editStudentData.address} onChange={v => setEditStudentData({...editStudentData, address: v})} />
               </div>

               <div className="p-8 bg-black/20 rounded-[2.5rem] border border-white/5">
                <p className="text-[10px] font-black uppercase text-emerald-500 mb-6 tracking-widest">Alterar Horários de Aula</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {editStudentData.fixedSchedules?.map((sched, idx) => (
                    <div key={idx} className="bg-[#1a1f26] p-5 rounded-2xl border border-white/5 space-y-3">
                      <select className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs" value={sched.day} onChange={e => {
                        const copy = [...editStudentData.fixedSchedules];
                        copy[idx].day = e.target.value;
                        setEditStudentData({...editStudentData, fixedSchedules: copy});
                      }}>
                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs" value={sched.hour} onChange={e => {
                        const copy = [...editStudentData.fixedSchedules];
                        copy[idx].hour = e.target.value;
                        setEditStudentData({...editStudentData, fixedSchedules: copy});
                      }}>
                        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

               <button type="submit" className="w-full bg-emerald-500 text-black font-black py-5 rounded-2xl uppercase text-xs flex items-center justify-center gap-2"><Save size={18}/> Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE AGENDAMENTO (ADMIN) */}
      {showScheduleModal && user.role === 'admin' && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 backdrop-blur-xl">
          <div className="bg-[#11141a] w-full max-w-md rounded-[3rem] p-10 border border-white/10 shadow-2xl">
            <h2 className="text-2xl font-black italic uppercase text-emerald-500 mb-8">Agendar Sessão</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              let name = scheduleForm.manualName || students.find(s => s.id === scheduleForm.studentId)?.name;
              if (!name) return;
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'schedules'), {
                name, studentId: scheduleForm.studentId || null, day: selectedDay, hour: showScheduleModal.hour,
                status: scheduleForm.status, createdBy: user.name, createdAt: new Date().toISOString()
              });
              await createLog(`Agendou ${name} para ${selectedDay} às ${showScheduleModal.hour}`);
              setShowScheduleModal(null);
              setScheduleForm({ studentId: '', manualName: '', status: 'pendente' });
            }} className="space-y-6">
               <div className="space-y-2">
                 <label className="text-[9px] font-black uppercase text-gray-600 ml-2">Aluno Registrado</label>
                 <select className="w-full bg-[#1a1f26] border border-white/5 rounded-2xl p-5 text-white text-xs" value={scheduleForm.studentId} onChange={e => setScheduleForm({...scheduleForm, studentId: e.target.value, manualName: ''})}>
                    <option value="">-- Selecionar --</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
               </div>
               <div className="space-y-2">
                 <label className="text-[9px] font-black uppercase text-gray-600 ml-2">Ou Digitar Nome</label>
                 <input type="text" placeholder="Nome do aluno..." className="w-full bg-[#1a1f26] border border-white/5 rounded-2xl p-5 text-white text-xs outline-none" value={scheduleForm.manualName} onChange={e => setScheduleForm({...scheduleForm, manualName: e.target.value, studentId: ''})} />
               </div>
               <div className="space-y-2">
                 <label className="text-[9px] font-black uppercase text-gray-600 ml-2">Tipo</label>
                 <select className="w-full bg-[#1a1f26] border border-white/5 rounded-2xl p-5 text-white text-xs" value={scheduleForm.status} onChange={e => setScheduleForm({...scheduleForm, status: e.target.value})}>
                    <option value="pendente">Sessão Normal</option>
                    <option value="experimental">Experimental</option>
                    <option value="reposicao">Reposição</option>
                 </select>
               </div>
               <button type="submit" className="w-full bg-emerald-500 text-black font-black py-5 rounded-2xl uppercase text-[11px] tracking-widest shadow-xl shadow-emerald-500/10">Confirmar</button>
               <button type="button" onClick={() => setShowScheduleModal(null)} className="w-full text-gray-600 font-black uppercase text-[9px] mt-2">Fechar</button>
            </form>
          </div>
        </div>
      )}

      {/* DETALHES DO ALUNO / PRONTUÁRIO */}
      {showStudentDetails && user.role === 'admin' && (
        <div className="fixed inset-0 bg-black/95 z-[210] flex items-center justify-center p-4 backdrop-blur-xl">
          <div className="bg-[#11141a] w-full max-w-5xl h-[85vh] rounded-[3.5rem] border border-white/10 flex flex-col md:flex-row overflow-hidden">
            <div className="w-full md:w-80 bg-black/40 p-10 overflow-y-auto border-r border-white/5">
               <div className="w-20 h-20 bg-emerald-500 rounded-3xl mb-8 flex items-center justify-center text-black font-black text-3xl">{showStudentDetails.name.charAt(0)}</div>
               <h2 className="text-2xl font-black italic uppercase leading-none mb-6">{showStudentDetails.name}</h2>
               
               <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 mb-8">
                  <p className="text-[8px] font-black text-purple-400 uppercase mb-2">Créditos de Reposição</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-white">{showStudentDetails.credits || 0}</span>
                    <div className="flex gap-2">
                      <button onClick={() => adjustCredits(showStudentDetails.id, showStudentDetails.name, -1)} className="p-2 bg-rose-500/20 text-rose-500 rounded-lg"><MinusCircle size={18}/></button>
                      <button onClick={() => adjustCredits(showStudentDetails.id, showStudentDetails.name, 1)} className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg"><Plus size={18}/></button>
                    </div>
                  </div>
               </div>

               <div className="space-y-6 text-[10px] uppercase font-black">
                  <DetailItem icon={<CalendarDays size={12}/>} label="Plano" value={`${showStudentDetails.plan} (${showStudentDetails.frequencyLabel})`} />
                  <DetailItem icon={<Fingerprint size={12}/>} label="CPF" value={showStudentDetails.cpf} />
                  <DetailItem icon={<Cake size={12}/>} label="Nasc." value={showStudentDetails.birthDate || '---'} />
                  <DetailItem icon={<Mail size={12}/>} label="E-mail" value={showStudentDetails.email} />
                  <DetailItem icon={<Phone size={12}/>} label="Fone" value={showStudentDetails.phone} />
                  <DetailItem icon={<Home size={12}/>} label="Endereço" value={showStudentDetails.address} />
                  <DetailItem icon={<Calendar size={12}/>} label="Vigência" value={`${showStudentDetails.startDate || '---'} até ${showStudentDetails.endDate || '---'}`} />
               </div>
               
               <button onClick={() => setShowStudentDetailsId(null)} className="mt-10 w-full bg-white/5 text-gray-400 py-5 rounded-2xl font-black uppercase text-[9px]">Sair</button>
            </div>
            
            <div className="flex-1 p-10 overflow-y-auto bg-[#0a0c10] no-scrollbar">
               <h3 className="text-xl font-black italic uppercase mb-10 flex items-center gap-3"><FileText size={20} className="text-emerald-500" /> Prontuário</h3>
               <div className="bg-[#11141a] border border-white/5 rounded-3xl p-6 mb-10">
                 <textarea placeholder="Nova evolução clínica..." className="w-full bg-transparent p-2 text-sm text-gray-300 outline-none h-32 resize-none" value={newEvolution} onChange={e => setNewEvolution(e.target.value)} />
                 <div className="flex justify-end pt-4 border-t border-white/5">
                   <button onClick={async () => {
                     if(!newEvolution.trim()) return;
                     await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'evolutions'), {
                       studentId: showStudentDetails.id, content: newEvolution, author: user.name, timestamp: new Date().toISOString()
                     });
                     await createLog(`Adicionou evolução para ${showStudentDetails.name}`);
                     setNewEvolution(''); 
                   }} className="bg-emerald-500 text-black px-8 py-3 rounded-xl font-black text-[10px] uppercase">Salvar Evolução</button>
                 </div>
               </div>
               <div className="space-y-4">
                  {evolutions.filter(e => e.studentId === showStudentDetails.id).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map(evo => (
                    <div key={evo.id} className="bg-[#11141a] p-8 rounded-3xl border border-white/5">
                      <div className="flex justify-between items-center mb-4 text-[9px] font-black uppercase">
                        <span className="text-emerald-500/50">{new Date(evo.timestamp).toLocaleDateString()}</span>
                        <span className="text-gray-600">{evo.author}</span>
                      </div>
                      <p className="text-sm text-gray-400 italic">"{evo.content}"</p>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ active, icon, label, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col lg:flex-row items-center gap-4 px-6 py-4 rounded-2xl transition-all ${active ? 'bg-emerald-500 text-black' : 'text-gray-500 hover:text-white'}`}>
      {icon} <span className="text-[9px] uppercase font-black">{label}</span>
    </button>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className="bg-[#11141a] p-8 rounded-[3rem] border border-white/5 relative overflow-hidden group">
      <div className="absolute top-6 right-6 text-white/5 group-hover:text-white/10 transition-all">{icon}</div>
      <p className="text-[9px] font-black uppercase text-gray-600 mb-4">{label}</p>
      <p className={`text-5xl font-black ${color} tracking-tighter`}>{value}</p>
    </div>
  );
}

function StatMetric({ label, value, color, highlight }) {
  return (
    <div className={`text-center px-4 py-2 rounded-2xl ${highlight ? 'bg-white/5' : ''}`}>
      <p className="text-[8px] font-black text-gray-600 uppercase mb-1">{label}</p>
      <p className={`text-lg font-black ${color}`}>{value}</p>
    </div>
  );
}

function InputGroup({ label, type = 'text', value, onChange, required = false }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black uppercase text-gray-600 ml-2">{label}</label>
      <input type={type} className="w-full bg-[#1a1f26] border border-white/5 rounded-2xl p-5 text-sm outline-none focus:border-emerald-500/30 transition-all" value={value || ''} onChange={e => onChange(e.target.value)} required={required} />
    </div>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-emerald-500 mb-1">
        {icon} <p>{label}</p>
      </div>
      <p className="text-white text-[11px] normal-case lowercase leading-tight">{value || '---'}</p>
    </div>
  );
}