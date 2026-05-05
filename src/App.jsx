import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, LogOut, Plus, X, CheckCircle2, AlertCircle, Clock,
  RotateCcw, Users, Mail, Phone, FlaskConical, Trash2, FileText,
  History, BarChart3, CalendarX, UserPlus, Fingerprint, MinusCircle,
  Edit3, Save, ArrowRight, ShieldCheck, Zap, CalendarDays, Home,
  Cake, Lock, Unlock, ChevronDown, ChevronUp, Sun, Moon,
  AlertTriangle, Eye, User, BookOpen
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, onSnapshot, doc,
  deleteDoc, updateDoc, increment
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

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
const HOURS_MANHA = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00'];
const HOURS_TARDE = ['15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
const ALL_HOURS = [...HOURS_MANHA, ...HOURS_TARDE];
const PLANOS = ['Mensal', 'Trimestral', 'Semestral'];
const FREQUENCIAS = [
  { label: '1x por semana', value: 1 },
  { label: '2x por semana', value: 2 },
  { label: '3x por semana', value: 3 }
];

// Profissionais responsáveis por turno
const TURNO_MANHA_PROF = 'Andriele Barbosa Lopes';
const TURNO_TARDE_PROF = 'Jessica Rodrigues Ribeiro';

const ADMINS = [
  { cpf: '08439510446', name: 'Anderson Macena', role: 'admin' },
  { cpf: '12582241601', name: 'Jessica Rodrigues Ribeiro', role: 'admin' },
  { cpf: '04712284196', name: 'Andriele Barbosa Lopes', role: 'admin' },
  { cpf: '68930925120', name: 'Mariana Soares Muniz', role: 'admin' },
];

const STATUS_THEME = {
  pendente:            { color: 'text-white',        bg: 'bg-gray-600',        border: 'border-gray-500',        label: 'Agendado',                   icon: <Clock size={10}/> },
  concluida:           { color: 'text-white',        bg: 'bg-emerald-600',     border: 'border-emerald-500',     label: 'Presença',                   icon: <CheckCircle2 size={10}/> },
  falta:               { color: 'text-white',        bg: 'bg-rose-600',        border: 'border-rose-500',        label: 'Falta',                      icon: <AlertCircle size={10}/> },
  desmarcado:          { color: 'text-white',        bg: 'bg-orange-500',      border: 'border-orange-400',      label: 'Desmarcado',                 icon: <CalendarX size={10}/> },
  desmarcado_atrasado: { color: 'text-white',        bg: 'bg-rose-800',        border: 'border-rose-600',        label: 'Desmarcado s/ aviso',        icon: <AlertCircle size={10}/> },
  reposicao:           { color: 'text-white',        bg: 'bg-purple-600',      border: 'border-purple-500',      label: 'Reposição',                  icon: <RotateCcw size={10}/> },
  experimental:        { color: 'text-white',        bg: 'bg-amber-500',       border: 'border-amber-400',       label: 'Experimental',               icon: <FlaskConical size={10}/> },
  bloqueado:           { color: 'text-white',        bg: 'bg-slate-700',       border: 'border-slate-600',       label: 'Bloqueado',                  icon: <Lock size={10}/> },
};

// Helpers
const isManha = h => HOURS_MANHA.includes(h);
const getTurnoProf = h => isManha(h) ? TURNO_MANHA_PROF : TURNO_TARDE_PROF;

const getDaysUntilEnd = (endDate) => {
  if (!endDate) return null;
  const now = new Date();
  const end = new Date(endDate);
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff;
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

  // Agenda: turno ativo
  const [activeTurno, setActiveTurno] = useState('manha'); // 'manha' | 'tarde' | 'semana'

  // Modais
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [editStudentData, setEditStudentData] = useState(null);
  const [showStudentDetailsId, setShowStudentDetailsId] = useState(null);
  const [showProntuarioId, setShowProntuarioId] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEvolution, setNewEvolution] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [alunosSubTab, setAlunosSubTab] = useState('todos'); // 'todos' | 'planoAoFim'
  const [dashSubTab, setDashSubTab] = useState('geral'); // 'geral' | 'andriele' | 'jessica'

  const [newStudent, setNewStudent] = useState({
    name: '', cpf: '', birthDate: '', email: '', address: '', plan: 'Mensal',
    frequency: 1, phone: '', startDate: '', endDate: '',
    fixedSchedules: [{ day: 'Segunda', hour: '07:00' }], credits: 0
  });
  const [scheduleForm, setScheduleForm] = useState({ studentId: '', manualName: '', status: 'pendente' });

  useEffect(() => {
    const initAuth = async () => {
      try {
        const authToken = (() => { try { return typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null; } catch { return null; } })();
        if (authToken) await signInWithCustomToken(auth, authToken);
        else await signInAnonymously(auth);
      } catch (err) {
        console.error(err);
        try { await signInAnonymously(auth); } catch (e) { console.error(e); }
      } finally { setLoading(false); }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, u => setFirebaseUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const refs = ['schedules', 'students', 'logs', 'evolutions'].map(c =>
      collection(db, 'artifacts', appId, 'public', 'data', c)
    );
    const unsubSchedules = onSnapshot(refs[0], snap => setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() }))), err => console.error(err));
    const unsubStudents = onSnapshot(refs[1], snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name));
      setStudents(data);
      if (user && user.role !== 'admin') {
        const upd = data.find(s => s.id === user.id);
        if (upd) setUser(prev => ({ ...prev, ...upd }));
      }
    }, err => console.error(err));
    const unsubLogs = onSnapshot(refs[2], snap => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 80));
    }, err => console.error(err));
    const unsubEvols = onSnapshot(refs[3], snap => setEvolutions(snap.docs.map(d => ({ id: d.id, ...d.data() }))), err => console.error(err));
    return () => { unsubSchedules(); unsubStudents(); unsubLogs(); unsubEvols(); };
  }, [firebaseUser, user?.id]);

  // Notificação de plano próximo ao fim — gera log automático
  useEffect(() => {
    if (!firebaseUser || !user || user.role !== 'admin') return;
    students.forEach(async s => {
      const days = getDaysUntilEnd(s.endDate);
      if (days !== null && days <= 3 && days >= 0) {
        const logKey = `expiry_notif_${s.id}_${s.endDate}`;
        const alreadyLogged = logs.some(l => l.logKey === logKey);
        if (!alreadyLogged) {
          try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), {
              action: `⚠️ Plano de ${s.name} irá acabar em ${days === 0 ? 'hoje' : `${days} dia${days > 1 ? 's' : ''}`}!`,
              user: 'Sistema', timestamp: new Date().toISOString(), logKey, type: 'expiry_warning'
            });
          } catch (e) { console.error(e); }
        }
      }
    });
  }, [students, firebaseUser]);

  const handleLogin = () => {
    setIsLoggingIn(true);
    setLoginError('');
    setTimeout(() => {
      const cleanCpf = loginCpf.replace(/\D/g, '');
      const adminMatch = ADMINS.find(a => a.cpf === cleanCpf);
      if (adminMatch) { setUser(adminMatch); setActiveTab('agenda'); setIsLoggingIn(false); return; }
      const student = students.find(s => s.cpf === cleanCpf);
      if (student) { setUser({ role: 'aluno', ...student }); setActiveTab('agenda'); setIsLoggingIn(false); }
      else { setLoginError('CPF não identificado em nossa base de dados.'); setIsLoggingIn(false); }
    }, 800);
  };

  const createLog = async (action, extra = {}) => {
    if (!firebaseUser) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), {
        action, user: user?.name || 'Sistema', timestamp: new Date().toISOString(), ...extra
      });
    } catch (e) { console.error(e); }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (isSubmitting || !firebaseUser) return;
    setIsSubmitting(true);
    try {
      const freqObj = FREQUENCIAS.find(f => f.value === Number(newStudent.frequency));
      const studentData = { ...newStudent, cpf: newStudent.cpf.replace(/\D/g, ''), createdAt: new Date().toISOString(), frequencyLabel: freqObj ? freqObj.label : '1x por semana' };
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), studentData);
      for (const sched of newStudent.fixedSchedules) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'schedules'), {
          name: studentData.name, studentId: docRef.id, day: sched.day, hour: sched.hour,
          status: 'pendente', isFixed: true, createdBy: user.name, createdAt: new Date().toISOString()
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
      await createLog(`Editou dados do aluno: ${data.name}`);
      setEditStudentData(null);
    } catch (err) { console.error(err); }
  };

  const handleDeleteStudent = async (e, studentId, studentName) => {
    e.stopPropagation();
    if (!confirm(`Excluir permanentemente o aluno "${studentName}"?\n\nEsta ação não pode ser desfeita.`)) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId));
      await createLog(`Excluiu o aluno: ${studentName}`);
    } catch (err) { console.error(err); }
  };

  const handleStudentDesmarcar = async (scheduleId, hour) => {
    if (!firebaseUser || !user) return;
    const now = new Date();
    const [h, m] = hour.split(':').map(Number);
    const sd = new Date(); sd.setHours(h, m, 0, 0);
    const diffH = (sd - now) / (1000 * 60 * 60);
    const newStatus = diffH >= 4 ? 'desmarcado' : 'desmarcado_atrasado';
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'schedules', scheduleId), { status: newStatus });
    if (diffH >= 4) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', user.id), { credits: increment(1) });
    await createLog(`${user.name} desmarcou aula das ${hour}.`);
  };

  const handleReposicao = async (hour) => {
    if (!user || (user.credits || 0) <= 0) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'schedules'), {
      name: user.name, studentId: user.id, day: selectedDay, hour, status: 'reposicao',
      createdBy: user.name, createdAt: new Date().toISOString()
    });
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', user.id), { credits: increment(-1) });
    await createLog(`${user.name} agendou reposição para ${selectedDay} às ${hour}`);
  };

  // Bloquear/desbloquear horário
  const handleToggleBlock = async (hour, day) => {
    const existing = schedules.find(s => s.day === day && s.hour === hour && s.status === 'bloqueado');
    if (existing) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'schedules', existing.id));
      await createLog(`Desbloqueou horário ${day} ${hour}`);
    } else {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'schedules'), {
        name: 'BLOQUEADO', studentId: null, day, hour, status: 'bloqueado',
        createdBy: user.name, createdAt: new Date().toISOString()
      });
      await createLog(`Bloqueou horário ${day} ${hour}`);
    }
  };

  const updateScheduleStatus = async (id, status, name) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'schedules', id), { status });
    await createLog(`Alterou status de ${name} para ${STATUS_THEME[status]?.label ?? status}`);
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

  // Métricas gerais
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

  // Métricas por profissional
  const metricsByProf = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0];
    const mesAtual = hoje.slice(0, 7);
    const calcProf = (profName) => {
      const turnoHours = profName === TURNO_MANHA_PROF ? HOURS_MANHA : HOURS_TARDE;
      const profSchedules = schedules.filter(s => turnoHours.includes(s.hour));
      const daily = profSchedules.filter(s => s.createdAt && s.createdAt.startsWith(hoje) && s.status === 'concluida').length;
      const monthly = profSchedules.filter(s => s.createdAt && s.createdAt.startsWith(mesAtual) && s.status === 'concluida').length;
      const totalConcluidas = profSchedules.filter(s => s.status === 'concluida').length;
      const totalFaltas = profSchedules.filter(s => s.status === 'falta').length;
      return { daily, monthly, totalConcluidas, totalFaltas, total: profSchedules.length };
    };
    return {
      andriele: calcProf(TURNO_MANHA_PROF),
      jessica: calcProf(TURNO_TARDE_PROF)
    };
  }, [schedules]);

  const userStats = useMemo(() => {
    if (!user || user.role === 'admin') return null;
    const us = schedules.filter(s => s.studentId === user.id);
    return {
      presencas: us.filter(s => s.status === 'concluida').length,
      faltas: us.filter(s => s.status === 'falta').length,
      desmarcacoes: us.filter(s => s.status === 'desmarcado' || s.status === 'desmarcado_atrasado').length,
      creditos: user.credits || 0,
      startDate: user.startDate,
      endDate: user.endDate
    };
  }, [user, schedules]);

  const showStudentDetails = useMemo(() => students.find(s => s.id === showStudentDetailsId), [students, showStudentDetailsId]);
  const showProntuarioStudent = useMemo(() => students.find(s => s.id === showProntuarioId), [students, showProntuarioId]);

  // Alunos com plano próximo ao fim (≤3 dias)
  const alunosPlanoAoFim = useMemo(() => students.filter(s => {
    const d = getDaysUntilEnd(s.endDate);
    return d !== null && d <= 3 && d >= 0;
  }), [students]);

  const activeHours = activeTurno === 'manha' ? HOURS_MANHA : activeTurno === 'tarde' ? HOURS_TARDE : ALL_HOURS;

  if (loading) return (
    <div className="min-h-screen bg-[#07090c] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

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
              type="text" placeholder="Digite seu CPF (apenas números)"
              className="w-full bg-[#1a1f26] border border-white/5 rounded-3xl pl-16 pr-6 py-6 text-white font-mono text-lg outline-none focus:border-emerald-500/50 transition-all placeholder:text-gray-700"
              value={loginCpf} onChange={e => setLoginCpf(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>
          {loginError && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3">
              <AlertCircle size={16} className="text-rose-500" />
              <p className="text-rose-500 text-[10px] font-black uppercase">{loginError}</p>
            </div>
          )}
          <button onClick={handleLogin} disabled={isLoggingIn || !loginCpf}
            className="w-full bg-emerald-500 text-black font-black py-6 rounded-3xl uppercase tracking-widest hover:bg-emerald-400 active:scale-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
          >
            {isLoggingIn ? <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin" /> : <>Acessar Studio <ArrowRight size={20} strokeWidth={3} /></>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#07090c] text-white pb-24 lg:pb-8 lg:pl-64">

      {/* NAVEGAÇÃO LATERAL/INFERIOR */}
      <nav className="fixed bottom-0 left-0 right-0 lg:top-0 lg:w-64 lg:h-full bg-[#11141a] border-t lg:border-r border-white/5 z-50 flex lg:flex-col gap-1 p-2 lg:p-4">
        <div className="hidden lg:block px-4 py-6 mb-4">
          <h2 className="text-2xl font-black italic text-emerald-500 tracking-tighter">FISIOBALM</h2>
        </div>
        <div className="flex lg:flex-col gap-1 w-full overflow-x-auto lg:overflow-visible">
          <NavItem active={activeTab === 'agenda'}    icon={<Calendar size={18}/>}  label="Agenda"    onClick={() => setActiveTab('agenda')} />
          {user.role === 'admin' && <>
            <NavItem active={activeTab === 'dashboard'} icon={<BarChart3 size={18}/>} label="Dashboard" onClick={() => setActiveTab('dashboard')} />
            <NavItem active={activeTab === 'alunos'}    icon={<Users size={18}/>}    label="Alunos"    onClick={() => setActiveTab('alunos')} />
            <NavItem active={activeTab === 'historico'} icon={<History size={18}/>}  label="Logs"      onClick={() => setActiveTab('historico')} />
          </>}
        </div>
        {/* BOTÃO SAIR — visível no mobile e desktop */}
        <button
          onClick={() => { setUser(null); setLoginCpf(''); setLoginError(''); }}
          className="flex-shrink-0 flex flex-col lg:flex-row items-center gap-1 lg:gap-3 px-3 lg:px-6 py-2 lg:py-4 text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/5 rounded-2xl transition-all lg:mt-auto ml-auto lg:ml-0"
        >
          <LogOut size={18}/>
          <span className="text-[8px] lg:text-[10px] font-black uppercase whitespace-nowrap">Sair</span>
        </button>
      </nav>

      <main className="p-3 lg:p-10 max-w-7xl mx-auto">

        {/* HEADER DO USUÁRIO */}
        <header className="mb-8">
          <div className="bg-[#11141a] border border-white/5 rounded-[2rem] p-4 lg:p-8 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-emerald-500 rounded-2xl lg:rounded-3xl flex items-center justify-center text-black font-black text-xl lg:text-2xl">{user.name.charAt(0)}</div>
                <div>
                  <h2 className="text-lg lg:text-2xl font-black uppercase italic tracking-tighter">{user.name}</h2>
                  <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{user.role === 'admin' ? 'Administrador' : 'Aluno Ativo'}</span>
                </div>
              </div>
              {user.role !== 'admin' && userStats && (
                <div className="flex flex-wrap gap-3 justify-center">
                  <StatMetric label="Presenças"    value={userStats.presencas}    color="text-emerald-500" />
                  <StatMetric label="Faltas"       value={userStats.faltas}       color="text-rose-500" />
                  <StatMetric label="Desmarcações" value={userStats.desmarcacoes} color="text-orange-500" />
                  <StatMetric label="Créditos"     value={userStats.creditos}     color="text-purple-400" highlight />
                </div>
              )}
            </div>
            {user.role !== 'admin' && userStats && (
              <div className="flex flex-wrap gap-4 pt-3 border-t border-white/5">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500">
                  <CalendarDays size={14} className="text-gray-500"/> Início: <span className="text-white ml-1">{userStats.startDate ? new Date(userStats.startDate).toLocaleDateString() : '---'}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500">
                  <Clock size={14} className="text-gray-500"/> Fim: <span className="text-emerald-500 ml-1">{userStats.endDate ? new Date(userStats.endDate).toLocaleDateString() : '---'}</span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ===== ABA AGENDA ===== */}
        {activeTab === 'agenda' && (
          <div>
            {/* Seletor de dia */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
              {DAYS.map(day => (
                <button key={day} onClick={() => setSelectedDay(day)}
                  className={`px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${selectedDay === day ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-[#11141a] text-gray-400 border border-white/5'}`}
                >{day}</button>
              ))}
            </div>

            {/* Seletor de turno — MELHORIA 1 */}
            <div className="flex gap-2 mb-6">
              <button onClick={() => setActiveTurno('manha')}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all ${activeTurno === 'manha' ? 'bg-amber-500 text-black' : 'bg-[#11141a] text-gray-400 border border-white/5'}`}
              ><Sun size={14}/> Manhã <span className="opacity-60">07–12h</span></button>
              <button onClick={() => setActiveTurno('tarde')}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all ${activeTurno === 'tarde' ? 'bg-blue-500 text-black' : 'bg-[#11141a] text-gray-400 border border-white/5'}`}
              ><Moon size={14}/> Tarde <span className="opacity-60">15–20h</span></button>
              <button onClick={() => setActiveTurno('semana')}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all ${activeTurno === 'semana' ? 'bg-emerald-500 text-black' : 'bg-[#11141a] text-gray-400 border border-white/5'}`}
              ><Calendar size={14}/> Semana</button>
            </div>

            {/* ===== MELHORIA 5: VISÃO SEMANAL ===== */}
            {activeTurno === 'semana' && (
              <div className="overflow-x-auto rounded-3xl border border-white/5 bg-[#11141a]">
                <table className="w-full min-w-[700px] text-[10px]">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="p-3 text-left text-gray-500 font-black uppercase w-16">Hora</th>
                      {DAYS.map(d => (
                        <th key={d} className="p-3 text-center text-gray-400 font-black uppercase">{d.substring(0, 3)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Separador Manhã */}
                    <tr><td colSpan={6} className="bg-amber-500/10 py-1 px-4 text-[9px] font-black uppercase text-amber-400 tracking-widest border-y border-amber-500/20">
                      <Sun size={10} className="inline mr-1"/>Manhã — 07h às 12h
                    </td></tr>
                    {HOURS_MANHA.map(hour => (
                      <tr key={hour} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-2 text-center font-black text-emerald-500">{hour}</td>
                        {DAYS.map(day => {
                          const slots = schedules.filter(s => s.day === day && s.hour === hour && s.status !== 'bloqueado');
                          const blocked = schedules.find(s => s.day === day && s.hour === hour && s.status === 'bloqueado');
                          return (
                            <td key={day} className="p-1 align-top">
                              <div className="space-y-1">
                                {blocked && <div className="bg-slate-700 rounded-lg px-2 py-1 text-[9px] font-black text-slate-300 flex items-center gap-1"><Lock size={8}/>Bloqueado</div>}
                                {slots.map(s => {
                                  const theme = STATUS_THEME[s.status] || STATUS_THEME.pendente;
                                  return (
                                    <div key={s.id} className={`${theme.bg} rounded-lg px-2 py-1 text-[9px] font-black text-white truncate max-w-[90px]`} title={s.name}>
                                      {s.name}
                                    </div>
                                  );
                                })}
                                {!blocked && slots.length < 3 && user.role === 'admin' && (
                                  <button onClick={() => { setSelectedDay(day); setShowScheduleModal({ hour }); }}
                                    className="w-full h-5 rounded-lg border border-dashed border-white/10 text-gray-700 hover:text-emerald-500 hover:border-emerald-500/30 flex items-center justify-center transition-all">
                                    <Plus size={10}/>
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Separador Tarde */}
                    <tr><td colSpan={6} className="bg-blue-500/10 py-1 px-4 text-[9px] font-black uppercase text-blue-400 tracking-widest border-y border-blue-500/20">
                      <Moon size={10} className="inline mr-1"/>Tarde — 15h às 20h
                    </td></tr>
                    {HOURS_TARDE.map(hour => (
                      <tr key={hour} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-2 text-center font-black text-blue-400">{hour}</td>
                        {DAYS.map(day => {
                          const slots = schedules.filter(s => s.day === day && s.hour === hour && s.status !== 'bloqueado');
                          const blocked = schedules.find(s => s.day === day && s.hour === hour && s.status === 'bloqueado');
                          return (
                            <td key={day} className="p-1 align-top">
                              <div className="space-y-1">
                                {blocked && <div className="bg-slate-700 rounded-lg px-2 py-1 text-[9px] font-black text-slate-300 flex items-center gap-1"><Lock size={8}/>Bloqueado</div>}
                                {slots.map(s => {
                                  const theme = STATUS_THEME[s.status] || STATUS_THEME.pendente;
                                  return (
                                    <div key={s.id} className={`${theme.bg} rounded-lg px-2 py-1 text-[9px] font-black text-white truncate max-w-[90px]`} title={s.name}>
                                      {s.name}
                                    </div>
                                  );
                                })}
                                {!blocked && slots.length < 3 && user.role === 'admin' && (
                                  <button onClick={() => { setSelectedDay(day); setShowScheduleModal({ hour }); }}
                                    className="w-full h-5 rounded-lg border border-dashed border-white/10 text-gray-700 hover:text-blue-500 hover:border-blue-500/30 flex items-center justify-center transition-all">
                                    <Plus size={10}/>
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* VISÃO POR TURNO (manhã ou tarde) */}
            {activeTurno !== 'semana' && (
              <div className="space-y-3">
                {/* Badge do turno */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase w-fit ${activeTurno === 'manha' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                  {activeTurno === 'manha' ? <Sun size={12}/> : <Moon size={12}/>}
                  {activeTurno === 'manha' ? `Manhã — Profissional: ${TURNO_MANHA_PROF}` : `Tarde — Profissional: ${TURNO_TARDE_PROF}`}
                </div>

                {activeHours.map(hour => {
                  const daySchedules = schedules.filter(s => s.day === selectedDay && s.hour === hour);
                  const blocked = daySchedules.find(s => s.status === 'bloqueado');
                  const realSlots = daySchedules.filter(s => s.status !== 'bloqueado');
                  const userScheduled = user.role !== 'admin' && realSlots.find(s => s.studentId === user.id);

                  return (
                    <div key={hour} className="flex gap-3 items-start">
                      <div className={`w-16 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 ${activeTurno === 'manha' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
                        <span className={`font-black text-sm ${activeTurno === 'manha' ? 'text-amber-400' : 'text-blue-400'}`}>{hour}</span>
                        <span className="text-[8px] font-bold text-gray-600">{realSlots.length}/3</span>
                      </div>

                      <div className="flex-1 flex flex-wrap gap-2 items-start">
                        {/* Slot bloqueado */}
                        {blocked && (
                          <div className="flex items-center gap-2 bg-slate-700/60 border border-slate-600 px-4 py-3 rounded-2xl">
                            <Lock size={14} className="text-slate-400"/>
                            <span className="text-[10px] font-black text-slate-300 uppercase">Horário Bloqueado</span>
                            {user.role === 'admin' && (
                              <button onClick={() => handleToggleBlock(hour, selectedDay)} className="ml-2 text-slate-500 hover:text-emerald-400 transition-all"><Unlock size={12}/></button>
                            )}
                          </div>
                        )}

                        {/* Slots reais — MELHORIA 2: nomes sempre visíveis, fundo colorido */}
                        {!blocked && realSlots.map(s => {
                          const theme = STATUS_THEME[s.status] || STATUS_THEME.pendente;
                          const isMine = s.studentId === user.id;
                          if (user.role !== 'admin' && !isMine) return null;
                          return (
                            <div key={s.id} className={`relative group ${theme.bg} border ${theme.border} px-4 py-3 rounded-2xl min-w-[120px]`}>
                              {/* MELHORIA 2: nome sempre visível com contraste */}
                              <span className="block text-[11px] font-black text-white uppercase truncate max-w-[130px]">{s.name}</span>
                              <span className={`text-[8px] font-black uppercase text-white/70`}>{theme.label}</span>

                              {user.role === 'admin' && (
                                <div className="mt-2">
                                  <select value={s.status} onChange={e => updateScheduleStatus(s.id, e.target.value, s.name)}
                                    className="w-full bg-black/30 border border-white/10 rounded-lg py-1 px-2 text-[8px] font-black uppercase outline-none text-white appearance-none">
                                    {Object.entries(STATUS_THEME).filter(([k]) => k !== 'bloqueado').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                  </select>
                                  <button onClick={() => deleteSchedule(s.id, s.name)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-white/40 hover:text-rose-400 transition-all"><X size={10}/></button>
                                </div>
                              )}
                              {user.role !== 'admin' && isMine && (s.status === 'pendente' || s.status === 'reposicao') && (
                                <button onClick={() => handleStudentDesmarcar(s.id, hour)} className="mt-2 w-full bg-rose-500/20 text-rose-400 py-1 rounded-lg text-[8px] font-black uppercase">Desmarcar</button>
                              )}
                            </div>
                          );
                        })}

                        {/* Botão adicionar (admin) */}
                        {!blocked && user.role === 'admin' && realSlots.length < 3 && (
                          <div className="flex gap-2">
                            <button onClick={() => setShowScheduleModal({ hour })} className="w-14 h-14 rounded-2xl border border-dashed border-white/10 flex items-center justify-center text-gray-700 hover:text-emerald-500 hover:border-emerald-500/30 transition-all"><Plus size={18}/></button>
                            {/* MELHORIA 6: Botão bloquear horário */}
                            <button onClick={() => handleToggleBlock(hour, selectedDay)} title="Bloquear horário" className="w-14 h-14 rounded-2xl border border-dashed border-slate-700 flex items-center justify-center text-slate-700 hover:text-slate-400 hover:border-slate-500 transition-all"><Lock size={16}/></button>
                          </div>
                        )}

                        {/* Reposição (aluno) */}
                        {!blocked && user.role !== 'admin' && !userScheduled && realSlots.length < 3 && (user.credits || 0) > 0 && (
                          <button onClick={() => handleReposicao(hour)} className="w-14 h-14 rounded-2xl border border-dashed border-purple-500/20 flex flex-col items-center justify-center text-purple-500/40 hover:text-purple-400 hover:border-purple-500/40 transition-all">
                            <RotateCcw size={16} className="mb-1"/><span className="text-[7px] font-black uppercase">Crédito</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== ABA ALUNOS ===== */}
        {activeTab === 'alunos' && user.role === 'admin' && (
          <div>
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
              <h1 className="text-2xl lg:text-3xl font-black uppercase italic">Alunos</h1>
              <div className="flex gap-3 flex-wrap">
                <input type="text" placeholder="Buscar..." className="bg-[#11141a] border border-white/5 rounded-2xl px-5 py-3 text-xs w-48 outline-none text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <button onClick={() => setShowAddStudent(true)} className="bg-emerald-500 text-black px-5 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2"><UserPlus size={16}/> Matricular</button>
              </div>
            </div>

            {/* Sub-abas — MELHORIA 8 */}
            <div className="flex gap-2 mb-6">
              <button onClick={() => setAlunosSubTab('todos')}
                className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${alunosSubTab === 'todos' ? 'bg-white text-black' : 'bg-[#11141a] text-gray-500 border border-white/5'}`}>
                Todos ({students.length})
              </button>
              <button onClick={() => setAlunosSubTab('planoAoFim')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${alunosSubTab === 'planoAoFim' ? 'bg-rose-500 text-white' : 'bg-[#11141a] text-gray-500 border border-white/5'}`}>
                <AlertTriangle size={12}/> Plano ao Fim ({alunosPlanoAoFim.length})
              </button>
            </div>

            {/* Lista de alunos */}
            {(() => {
              const lista = (alunosSubTab === 'planoAoFim' ? alunosPlanoAoFim : students)
                .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {lista.map(s => {
                    const daysLeft = getDaysUntilEnd(s.endDate);
                    const isExpiring = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0;
                    // MELHORIA 10: horários fixos
                    const fixedScheds = (s.fixedSchedules || []).map(fs => `${fs.day.substring(0,3)} ${fs.hour}`).join(' • ');

                    return (
                      <div key={s.id} className={`bg-[#11141a] p-5 rounded-[2rem] border transition-all group relative ${isExpiring ? 'border-rose-500/40 shadow-lg shadow-rose-500/10' : 'border-white/5 hover:border-emerald-500/30'}`}>
                        {isExpiring && (
                          <div className="absolute top-0 left-0 right-0 bg-rose-500/20 rounded-t-[2rem] px-4 py-1.5 flex items-center gap-2">
                            <AlertTriangle size={10} className="text-rose-400"/>
                            <span className="text-[9px] font-black text-rose-400 uppercase">Plano acaba em {daysLeft === 0 ? 'hoje' : `${daysLeft}d`}</span>
                          </div>
                        )}
                        <div className={`${isExpiring ? 'mt-6' : ''}`} onClick={() => setShowStudentDetailsId(s.id)}>
                          <div className="flex items-start gap-3 mb-3 cursor-pointer">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 font-black text-lg shrink-0">{s.name.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                              {/* MELHORIA 2: nome com boa visibilidade */}
                              <h3 className="font-black uppercase text-sm text-white truncate">{s.name}</h3>
                              <p className="text-[9px] text-gray-500 font-bold uppercase">{s.plan} • {s.frequencyLabel}</p>
                            </div>
                          </div>

                          {/* MELHORIA 10: horários fixos visíveis no card */}
                          {fixedScheds && (
                            <div className="bg-white/5 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                              <Clock size={10} className="text-emerald-500 shrink-0"/>
                              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider truncate">{fixedScheds}</span>
                            </div>
                          )}

                          <div className="space-y-1 pt-2 border-t border-white/5">
                            <div className="flex justify-between text-[8px] font-black uppercase">
                              <span className="text-gray-600">Início</span>
                              <span className="text-white">{s.startDate ? new Date(s.startDate).toLocaleDateString() : '---'}</span>
                            </div>
                            <div className="flex justify-between text-[8px] font-black uppercase">
                              <span className="text-gray-600">Fim</span>
                              <span className={isExpiring ? 'text-rose-400' : 'text-emerald-500'}>{s.endDate ? new Date(s.endDate).toLocaleDateString() : '---'}</span>
                            </div>
                          </div>
                        </div>

                        {/* MELHORIA 9: Botões de ação separados e visíveis */}
                        <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                          <button onClick={() => setShowStudentDetailsId(s.id)} title="Ver perfil"
                            className="flex-1 flex items-center justify-center gap-1 py-2 bg-white/5 text-gray-400 rounded-xl hover:bg-emerald-500/20 hover:text-emerald-400 transition-all text-[9px] font-black uppercase">
                            <Eye size={12}/> Perfil
                          </button>
                          {/* MELHORIA 9: Prontuário separado */}
                          <button onClick={() => setShowProntuarioId(s.id)} title="Prontuário"
                            className="flex-1 flex items-center justify-center gap-1 py-2 bg-white/5 text-gray-400 rounded-xl hover:bg-purple-500/20 hover:text-purple-400 transition-all text-[9px] font-black uppercase">
                            <BookOpen size={12}/> Prontuário
                          </button>
                          <button onClick={e => { e.stopPropagation(); setEditStudentData(JSON.parse(JSON.stringify(s))); }} title="Editar"
                            className="py-2 px-3 bg-white/5 text-gray-400 rounded-xl hover:bg-emerald-500 hover:text-black transition-all">
                            <Edit3 size={13}/>
                          </button>
                          <button onClick={e => handleDeleteStudent(e, s.id, s.name)} title="Excluir"
                            className="py-2 px-3 bg-white/5 text-gray-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {lista.length === 0 && (
                    <div className="col-span-full text-center py-16 text-gray-600">
                      <Users size={32} className="mx-auto mb-3 opacity-30"/>
                      <p className="text-[10px] font-black uppercase">Nenhum aluno encontrado</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ===== ABA DASHBOARD ===== */}
        {activeTab === 'dashboard' && user.role === 'admin' && (
          <div>
            <h1 className="text-2xl lg:text-3xl font-black uppercase italic mb-6">Dashboard</h1>

            {/* Sub-abas — MELHORIA 4 */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-1 no-scrollbar">
              {[
                { key: 'geral',    label: 'Geral',    color: 'bg-white text-black' },
                { key: 'andriele', label: 'Andriele · Manhã', color: 'bg-amber-500 text-black' },
                { key: 'jessica',  label: 'Jessica · Tarde',  color: 'bg-blue-500 text-black' },
              ].map(t => (
                <button key={t.key} onClick={() => setDashSubTab(t.key)}
                  className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase whitespace-nowrap transition-all ${dashSubTab === t.key ? t.color : 'bg-[#11141a] text-gray-500 border border-white/5'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Dashboard Geral */}
            {dashSubTab === 'geral' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Agendados"    value={metrics.pendentes}  color="text-gray-400"   icon={<Clock size={22}/>} />
                  <StatCard label="Presenças"    value={metrics.concluidas} color="text-emerald-500" icon={<CheckCircle2 size={22}/>} />
                  <StatCard label="Faltas"       value={metrics.faltas}     color="text-rose-500"   icon={<AlertCircle size={22}/>} />
                  <StatCard label="Desmarcações" value={metrics.desmarcados}color="text-orange-500" icon={<CalendarX size={22}/>} />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <StatCard label="Reposições"   value={metrics.reposicao}    color="text-purple-400" icon={<RotateCcw size={22}/>} />
                  <StatCard label="Experimentais"value={metrics.experimental} color="text-amber-400"  icon={<FlaskConical size={22}/>} />
                  <StatCard label="Total Alunos" value={metrics.alunos}       color="text-blue-500"   icon={<Users size={22}/>} />
                </div>
              </div>
            )}

            {/* Dashboard Andriele — MELHORIA 4 */}
            {dashSubTab === 'andriele' && (
              <ProfDashboard
                name={TURNO_MANHA_PROF}
                turno="Manhã"
                turnoColor="amber"
                data={metricsByProf.andriele}
              />
            )}

            {/* Dashboard Jessica — MELHORIA 4 */}
            {dashSubTab === 'jessica' && (
              <ProfDashboard
                name={TURNO_TARDE_PROF}
                turno="Tarde"
                turnoColor="blue"
                data={metricsByProf.jessica}
              />
            )}
          </div>
        )}

        {/* ===== ABA HISTÓRICO — MELHORIA 7 ===== */}
        {activeTab === 'historico' && user.role === 'admin' && (
          <div className="max-w-4xl mx-auto space-y-2">
            <h1 className="text-2xl font-black uppercase italic mb-6">Logs do Sistema</h1>
            {logs.map(log => {
              const isExpiry = log.type === 'expiry_warning';
              return (
                <div key={log.id} className={`p-4 rounded-2xl border flex justify-between items-center gap-4 ${isExpiry ? 'bg-rose-500/10 border-rose-500/20' : 'bg-[#11141a] border-white/5'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    {isExpiry && <AlertTriangle size={14} className="text-rose-400 shrink-0"/>}
                    <div className="min-w-0">
                      <p className={`text-[10px] font-black uppercase truncate ${isExpiry ? 'text-rose-300' : 'text-white'}`}>{log.action}</p>
                      <p className="text-[8px] font-bold text-gray-600">Por: {log.user}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-gray-700 shrink-0">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ===== MODAL DE MATRÍCULA ===== */}
      {showAddStudent && (
        <Modal title="Nova Matrícula" onClose={() => setShowAddStudent(false)}>
          <form onSubmit={handleAddStudent} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputGroup label="Nome Completo *" value={newStudent.name} onChange={v => setNewStudent({...newStudent, name: v})} required />
              <InputGroup label="CPF *" value={newStudent.cpf} onChange={v => setNewStudent({...newStudent, cpf: v})} required />
              <InputGroup label="Data de Nascimento" type="date" value={newStudent.birthDate} onChange={v => setNewStudent({...newStudent, birthDate: v})} />
              <InputGroup label="WhatsApp" value={newStudent.phone} onChange={v => setNewStudent({...newStudent, phone: v})} />
              <InputGroup label="E-mail" type="email" value={newStudent.email} onChange={v => setNewStudent({...newStudent, email: v})} />
              <InputGroup label="Endereço" value={newStudent.address} onChange={v => setNewStudent({...newStudent, address: v})} />
              <InputGroup label="Início do Plano" type="date" value={newStudent.startDate} onChange={v => setNewStudent({...newStudent, startDate: v})} />
              <InputGroup label="Fim do Plano" type="date" value={newStudent.endDate} onChange={v => setNewStudent({...newStudent, endDate: v})} />
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-600 ml-2">Plano</label>
                <select className="w-full bg-[#1a1f26] border border-white/5 rounded-2xl p-4 text-sm text-white" value={newStudent.plan} onChange={e => setNewStudent({...newStudent, plan: e.target.value})}>
                  {PLANOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-600 ml-2">Frequência</label>
                <select className="w-full bg-[#1a1f26] border border-white/5 rounded-2xl p-4 text-sm text-white" value={newStudent.frequency} onChange={e => {
                  const count = Number(e.target.value);
                  const upd = Array.from({ length: count }).map((_, i) => newStudent.fixedSchedules[i] || { day: 'Segunda', hour: '07:00' });
                  setNewStudent({ ...newStudent, frequency: count, fixedSchedules: upd });
                }}>
                  {FREQUENCIAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>
            <div className="p-6 bg-black/20 rounded-[2rem] border border-white/5">
              <p className="text-[10px] font-black uppercase text-emerald-500 mb-4 tracking-widest">Horários Fixos</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {newStudent.fixedSchedules.map((sched, idx) => (
                  <div key={idx} className="bg-[#1a1f26] p-4 rounded-xl border border-white/5 space-y-2">
                    <select className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-white" value={sched.day} onChange={e => {
                      const copy = [...newStudent.fixedSchedules]; copy[idx].day = e.target.value; setNewStudent({...newStudent, fixedSchedules: copy});
                    }}>{DAYS.map(d => <option key={d} value={d}>{d}</option>)}</select>
                    <select className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-white" value={sched.hour} onChange={e => {
                      const copy = [...newStudent.fixedSchedules]; copy[idx].hour = e.target.value; setNewStudent({...newStudent, fixedSchedules: copy});
                    }}>{ALL_HOURS.map(h => <option key={h} value={h}>{h} — {isManha(h) ? 'Manhã' : 'Tarde'}</option>)}</select>
                  </div>
                ))}
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-500 text-black font-black py-5 rounded-2xl uppercase text-xs tracking-widest hover:scale-[1.01] transition-all disabled:opacity-50">
              {isSubmitting ? 'Salvando...' : 'Finalizar Matrícula'}
            </button>
          </form>
        </Modal>
      )}

      {/* ===== MODAL DE EDIÇÃO ===== */}
      {editStudentData && (
        <Modal title="Editar Aluno" onClose={() => setEditStudentData(null)}>
          <form onSubmit={handleEditStudent} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputGroup label="Nome"           value={editStudentData.name}      onChange={v => setEditStudentData({...editStudentData, name: v})} />
              <InputGroup label="CPF"            value={editStudentData.cpf}       onChange={v => setEditStudentData({...editStudentData, cpf: v})} />
              <InputGroup label="Nascimento" type="date" value={editStudentData.birthDate} onChange={v => setEditStudentData({...editStudentData, birthDate: v})} />
              <InputGroup label="Início"   type="date" value={editStudentData.startDate}   onChange={v => setEditStudentData({...editStudentData, startDate: v})} />
              <InputGroup label="Fim"      type="date" value={editStudentData.endDate}     onChange={v => setEditStudentData({...editStudentData, endDate: v})} />
              <InputGroup label="Fone"           value={editStudentData.phone}     onChange={v => setEditStudentData({...editStudentData, phone: v})} />
              <InputGroup label="E-mail" type="email" value={editStudentData.email} onChange={v => setEditStudentData({...editStudentData, email: v})} />
              <InputGroup label="Endereço"       value={editStudentData.address}   onChange={v => setEditStudentData({...editStudentData, address: v})} />
            </div>
            <div className="p-6 bg-black/20 rounded-[2rem] border border-white/5">
              <p className="text-[10px] font-black uppercase text-emerald-500 mb-4 tracking-widest">Alterar Horários Fixos</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {editStudentData.fixedSchedules?.map((sched, idx) => (
                  <div key={idx} className="bg-[#1a1f26] p-4 rounded-xl border border-white/5 space-y-2">
                    <select className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-white" value={sched.day} onChange={e => {
                      const copy = [...editStudentData.fixedSchedules]; copy[idx].day = e.target.value; setEditStudentData({...editStudentData, fixedSchedules: copy});
                    }}>{DAYS.map(d => <option key={d} value={d}>{d}</option>)}</select>
                    <select className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-white" value={sched.hour} onChange={e => {
                      const copy = [...editStudentData.fixedSchedules]; copy[idx].hour = e.target.value; setEditStudentData({...editStudentData, fixedSchedules: copy});
                    }}>{ALL_HOURS.map(h => <option key={h} value={h}>{h} — {isManha(h) ? 'Manhã' : 'Tarde'}</option>)}</select>
                  </div>
                ))}
              </div>
            </div>
            <button type="submit" className="w-full bg-emerald-500 text-black font-black py-4 rounded-2xl uppercase text-xs flex items-center justify-center gap-2">
              <Save size={16}/> Salvar Alterações
            </button>
          </form>
        </Modal>
      )}

      {/* ===== MODAL AGENDAMENTO (ADMIN) ===== */}
      {showScheduleModal && user.role === 'admin' && (
        <Modal title={`Agendar Sessão — ${selectedDay} ${showScheduleModal.hour}`} onClose={() => { setShowScheduleModal(null); setScheduleForm({ studentId: '', manualName: '', status: 'pendente' }); }} size="sm">
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
          }} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-gray-600 ml-1">Aluno Registrado</label>
              <select className="w-full bg-[#1a1f26] border border-white/5 rounded-2xl p-4 text-white text-xs" value={scheduleForm.studentId} onChange={e => setScheduleForm({...scheduleForm, studentId: e.target.value, manualName: ''})}>
                <option value="">-- Selecionar --</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-gray-600 ml-1">Ou Nome Manual</label>
              <input type="text" placeholder="Nome..." className="w-full bg-[#1a1f26] border border-white/5 rounded-2xl p-4 text-white text-xs outline-none" value={scheduleForm.manualName} onChange={e => setScheduleForm({...scheduleForm, manualName: e.target.value, studentId: ''})} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-gray-600 ml-1">Tipo</label>
              <select className="w-full bg-[#1a1f26] border border-white/5 rounded-2xl p-4 text-white text-xs" value={scheduleForm.status} onChange={e => setScheduleForm({...scheduleForm, status: e.target.value})}>
                <option value="pendente">Sessão Normal</option>
                <option value="experimental">Experimental</option>
                <option value="reposicao">Reposição</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-emerald-500 text-black font-black py-4 rounded-2xl uppercase text-[11px] tracking-widest">Confirmar</button>
          </form>
        </Modal>
      )}

      {/* ===== MODAL DETALHES DO ALUNO ===== */}
      {showStudentDetails && user.role === 'admin' && (
        <Modal title={showStudentDetails.name} onClose={() => setShowStudentDetailsId(null)} size="md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
              <p className="text-[8px] font-black text-purple-400 uppercase mb-2">Créditos de Reposição</p>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-white">{showStudentDetails.credits || 0}</span>
                <div className="flex gap-2">
                  <button onClick={() => adjustCredits(showStudentDetails.id, showStudentDetails.name, -1)} className="p-2 bg-rose-500/20 text-rose-500 rounded-lg"><MinusCircle size={16}/></button>
                  <button onClick={() => adjustCredits(showStudentDetails.id, showStudentDetails.name, 1)}  className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg"><Plus size={16}/></button>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <DetailItem icon={<CalendarDays size={12}/>} label="Plano" value={`${showStudentDetails.plan} (${showStudentDetails.frequencyLabel})`} />
              <DetailItem icon={<Fingerprint size={12}/>}  label="CPF"   value={showStudentDetails.cpf} />
              <DetailItem icon={<Cake size={12}/>}         label="Nasc." value={showStudentDetails.birthDate || '---'} />
            </div>
            <DetailItem icon={<Mail size={12}/>}  label="E-mail"   value={showStudentDetails.email} />
            <DetailItem icon={<Phone size={12}/>} label="Fone"     value={showStudentDetails.phone} />
            <DetailItem icon={<Home size={12}/>}  label="Endereço" value={showStudentDetails.address} />
            <DetailItem icon={<Calendar size={12}/>} label="Vigência" value={`${showStudentDetails.startDate || '---'} até ${showStudentDetails.endDate || '---'}`} />
            {(showStudentDetails.fixedSchedules || []).length > 0 && (
              <div className="md:col-span-2">
                <DetailItem icon={<Clock size={12}/>} label="Horários Fixos"
                  value={(showStudentDetails.fixedSchedules || []).map(fs => `${fs.day} ${fs.hour}`).join(' • ')} />
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ===== MODAL PRONTUÁRIO SEPARADO — MELHORIA 9 ===== */}
      {showProntuarioStudent && user.role === 'admin' && (
        <Modal title={`Prontuário — ${showProntuarioStudent.name}`} onClose={() => setShowProntuarioId(null)} size="lg">
          <div className="bg-[#0a0c10] rounded-2xl p-5 mb-6">
            <p className="text-[9px] font-black uppercase text-emerald-500 mb-3">Nova Evolução Clínica</p>
            <textarea
              placeholder="Descreva a evolução clínica..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-gray-300 outline-none h-28 resize-none"
              value={newEvolution} onChange={e => setNewEvolution(e.target.value)}
            />
            <div className="flex justify-end mt-3">
              <button onClick={async () => {
                if (!newEvolution.trim()) return;
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'evolutions'), {
                  studentId: showProntuarioStudent.id, content: newEvolution, author: user.name, timestamp: new Date().toISOString()
                });
                await createLog(`Adicionou evolução para ${showProntuarioStudent.name}`);
                setNewEvolution('');
              }} className="bg-emerald-500 text-black px-6 py-2 rounded-xl font-black text-[10px] uppercase">
                Salvar Evolução
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {evolutions.filter(e => e.studentId === showProntuarioStudent.id)
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .map(evo => (
                <div key={evo.id} className="bg-[#11141a] p-5 rounded-2xl border border-white/5">
                  <div className="flex justify-between mb-2 text-[9px] font-black uppercase">
                    <span className="text-emerald-500/60">{new Date(evo.timestamp).toLocaleDateString()}</span>
                    <span className="text-gray-600">{evo.author}</span>
                  </div>
                  <p className="text-sm text-gray-400 italic">"{evo.content}"</p>
                </div>
              ))
            }
            {evolutions.filter(e => e.studentId === showProntuarioStudent.id).length === 0 && (
              <p className="text-center text-gray-600 text-[10px] font-black uppercase py-8">Nenhuma evolução registrada</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===== COMPONENTES AUXILIARES =====

function Modal({ title, children, onClose, size = 'md' }) {
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  return (
    <div className="fixed inset-0 bg-black/95 z-[200] flex items-start justify-center p-4 backdrop-blur-xl overflow-y-auto">
      <div className={`bg-[#11141a] w-full ${widths[size]} rounded-[2.5rem] p-6 lg:p-10 border border-white/10 shadow-2xl my-4`}>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl lg:text-2xl font-black italic uppercase">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-2"><X size={24}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NavItem({ active, icon, label, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-3 px-3 lg:px-6 py-2 lg:py-4 rounded-2xl transition-all whitespace-nowrap ${active ? 'bg-emerald-500 text-black' : 'text-gray-500 hover:text-white'}`}>
      {icon} <span className="text-[8px] lg:text-[10px] uppercase font-black">{label}</span>
    </button>
  );
}

function ProfDashboard({ name, turno, turnoColor, data }) {
  const colorMap = {
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', badge: 'bg-amber-500 text-black' },
    blue:  { bg: 'bg-blue-500/10',  border: 'border-blue-500/20',  text: 'text-blue-400',  badge: 'bg-blue-500 text-white' },
  };
  const c = colorMap[turnoColor];
  return (
    <div className="space-y-6">
      <div className={`${c.bg} border ${c.border} rounded-3xl p-6 flex items-center gap-4`}>
        <div className={`${c.badge} px-4 py-2 rounded-2xl font-black text-[10px] uppercase`}>{turno}</div>
        <div>
          <h3 className="font-black text-white italic text-lg uppercase">{name}</h3>
          <p className="text-[9px] text-gray-500 font-black uppercase">Turno da {turno}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#11141a] p-6 rounded-3xl border border-white/5">
          <p className="text-[9px] font-black uppercase text-gray-600 mb-2">Atend. Hoje</p>
          <p className={`text-5xl font-black ${c.text} tracking-tighter`}>{data.daily}</p>
        </div>
        <div className="bg-[#11141a] p-6 rounded-3xl border border-white/5">
          <p className="text-[9px] font-black uppercase text-gray-600 mb-2">Atend. Mensal</p>
          <p className={`text-5xl font-black ${c.text} tracking-tighter`}>{data.monthly}</p>
        </div>
        <div className="bg-[#11141a] p-6 rounded-3xl border border-white/5">
          <p className="text-[9px] font-black uppercase text-gray-600 mb-2">Total Presenças</p>
          <p className="text-4xl font-black text-emerald-500 tracking-tighter">{data.totalConcluidas}</p>
        </div>
        <div className="bg-[#11141a] p-6 rounded-3xl border border-white/5">
          <p className="text-[9px] font-black uppercase text-gray-600 mb-2">Total Faltas</p>
          <p className="text-4xl font-black text-rose-500 tracking-tighter">{data.totalFaltas}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className="bg-[#11141a] p-6 lg:p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
      <div className="absolute top-4 right-4 text-white/5 group-hover:text-white/10 transition-all">{icon}</div>
      <p className="text-[9px] font-black uppercase text-gray-600 mb-3">{label}</p>
      <p className={`text-4xl lg:text-5xl font-black ${color} tracking-tighter`}>{value}</p>
    </div>
  );
}

function StatMetric({ label, value, color, highlight }) {
  return (
    <div className={`text-center px-3 py-2 rounded-2xl ${highlight ? 'bg-white/5' : ''}`}>
      <p className="text-[8px] font-black text-gray-600 uppercase mb-1">{label}</p>
      <p className={`text-base font-black ${color}`}>{value}</p>
    </div>
  );
}

function InputGroup({ label, type = 'text', value, onChange, required = false }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black uppercase text-gray-600 ml-1">{label}</label>
      <input type={type} className="w-full bg-[#1a1f26] border border-white/5 rounded-2xl p-4 text-sm text-white outline-none focus:border-emerald-500/30 transition-all" value={value || ''} onChange={e => onChange(e.target.value)} required={required} />
    </div>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-emerald-500 mb-1 text-[9px] font-black uppercase">{icon}<p>{label}</p></div>
      <p className="text-white text-[11px] leading-tight">{value || '---'}</p>
    </div>
  );
}