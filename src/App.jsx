import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, LogOut, Plus, X, CheckCircle2, AlertCircle, Clock,
  RotateCcw, Users, Mail, Phone, FlaskConical, Trash2, FileText,
  History, BarChart3, CalendarX, UserPlus, Fingerprint, MinusCircle,
  Edit3, Save, ArrowRight, ShieldCheck, Zap, CalendarDays, Home,
  Cake, Lock, Unlock, ChevronDown, ChevronUp, Sun, Moon,
  AlertTriangle, Eye, User, BookOpen, Paperclip, ImagePlus, Download
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
  // Compara apenas as datas (sem horas) para evitar divergência de fuso horário
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diff = Math.round((end - today) / (1000 * 60 * 60 * 24));
  return diff;
};

// Retorna a data (dd/mm) do dia da semana atual mais próximo
const getDateForDay = (dayName) => {
  const dayMap = { 'Segunda': 1, 'Terça': 2, 'Quarta': 3, 'Quinta': 4, 'Sexta': 5 };
  const target = dayMap[dayName];
  if (target === undefined) return '';
  const today = new Date();
  const todayDay = today.getDay();
  const mondayOffset = todayDay === 0 ? -6 : 1 - todayDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const targetDate = new Date(monday);
  targetDate.setDate(monday.getDate() + (target - 1));
  return targetDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
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
  const [showAnexosId, setShowAnexosId] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEvolution, setNewEvolution] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [alunosSubTab, setAlunosSubTab] = useState('todos'); // 'todos' | 'planoAoFim' | 'expirados'
  const [dashSubTab, setDashSubTab] = useState('geral'); // 'geral' | 'andriele' | 'jessica'
  const [dashDrillDown, setDashDrillDown] = useState(null); // { label, schedules[] }

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
  // + Remove aulas fixas automaticamente quando o plano expira
  useEffect(() => {
    if (!firebaseUser || !user || user.role !== 'admin') return;
    students.forEach(async s => {
      const days = getDaysUntilEnd(s.endDate);

      // Aviso de 3 dias
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

      // Plano expirado (days < 0) — remove TODOS os agendamentos pendentes do aluno da agenda
      if (days !== null && days < 0) {
        const removeKey = `expiry_removed_${s.id}_${s.endDate}`;
        const alreadyRemoved = logs.some(l => l.logKey === removeKey);
        if (!alreadyRemoved) {
          try {
            // Remove qualquer agendamento pendente ou reposição futura do aluno
            const toRemove = schedules.filter(
              sc => sc.studentId === s.id && (sc.status === 'pendente' || sc.status === 'reposicao')
            );
            for (const sc of toRemove) {
              await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'schedules', sc.id));
            }
            // Gera log (mesmo que não haja agendamentos, registra a expiração)
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), {
              action: toRemove.length > 0
                ? `🔴 Plano de ${s.name} expirou — ${toRemove.length} agendamento(s) removido(s) da agenda.`
                : `🔴 Plano de ${s.name} expirou.`,
              user: 'Sistema', timestamp: new Date().toISOString(), logKey: removeKey, type: 'expiry_removed'
            });
          } catch (e) { console.error(e); }
        }
      }
    });
  }, [students, schedules, firebaseUser]);

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
    const comAntecedencia = diffH >= 4;
    const newStatus = comAntecedencia ? 'desmarcado' : 'desmarcado_atrasado';
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'schedules', scheduleId), { status: newStatus });
    if (comAntecedencia) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', user.id), { credits: increment(1) });
      await createLog(`${user.name} desmarcou aula das ${hour} com antecedência — 1 crédito de reposição gerado.`);
    } else {
      await createLog(`${user.name} desmarcou aula das ${hour} sem antecedência mínima — nenhum crédito gerado.`);
    }
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
      const dailyList     = profSchedules.filter(s => s.createdAt && s.createdAt.startsWith(hoje) && s.status === 'concluida');
      const monthlyList   = profSchedules.filter(s => s.createdAt && s.createdAt.startsWith(mesAtual) && s.status === 'concluida');
      const concluidaList = profSchedules.filter(s => s.status === 'concluida');
      const faltaList     = profSchedules.filter(s => s.status === 'falta');
      const reposicaoList = profSchedules.filter(s => s.status === 'reposicao');
      const experList     = profSchedules.filter(s => s.status === 'experimental');
      const desmarc       = profSchedules.filter(s => s.status === 'desmarcado' || s.status === 'desmarcado_atrasado');
      return {
        daily: dailyList.length,         dailyList,
        monthly: monthlyList.length,     monthlyList,
        totalConcluidas: concluidaList.length, concluidaList,
        totalFaltas: faltaList.length,         faltaList,
        totalReposicao: reposicaoList.length,  reposicaoList,
        totalExperimental: experList.length,   experList,
        totalDesmarcados: desmarc.length,      desmarcList: desmarc,
        total: profSchedules.length,           allList: profSchedules,
      };
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
  const showAnexosStudent = useMemo(() => students.find(s => s.id === showAnexosId), [students, showAnexosId]);

  // Plano acaba em 0–3 dias (ainda ativo, mas próximo)
  const alunosPlanoAoFim = useMemo(() => students.filter(s => {
    const d = getDaysUntilEnd(s.endDate);
    return d !== null && d >= 0 && d <= 3;
  }), [students]);

  // Plano já expirado (< 0 dias)
  const alunosExpirados = useMemo(() => students.filter(s => {
    const d = getDaysUntilEnd(s.endDate);
    return d !== null && d < 0;
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
    <div className="min-h-screen bg-[#f0ede8] text-gray-900 pb-24 lg:pb-8 lg:pl-64">

      {/* NAVEGAÇÃO LATERAL/INFERIOR */}
      <nav className="fixed bottom-0 left-0 right-0 lg:top-0 lg:w-64 lg:h-full bg-white border-t lg:border-r border-gray-200 shadow-sm z-50 flex lg:flex-col gap-1 p-2 lg:p-4">
        <div className="hidden lg:block px-4 py-6 mb-4">
          <h2 className="text-2xl font-black italic text-emerald-600 tracking-tighter">FISIOBALM</h2>
        </div>
        <div className="flex lg:flex-col gap-1 w-full overflow-x-auto lg:overflow-visible">
          <NavItem active={activeTab === 'agenda'}    icon={<Calendar size={18}/>}  label="Agenda"    onClick={() => setActiveTab('agenda')} />
          {user.role === 'admin' && <>
            <NavItem active={activeTab === 'dashboard'} icon={<BarChart3 size={18}/>} label="Dashboard" onClick={() => setActiveTab('dashboard')} />
            <NavItem active={activeTab === 'alunos'}    icon={<Users size={18}/>}    label="Alunos"    onClick={() => setActiveTab('alunos')} />
            <NavItem active={activeTab === 'historico'} icon={<History size={18}/>}  label="Logs"      onClick={() => setActiveTab('historico')} />
          </>}
        </div>
        {/* BOTÃO SAIR */}
        <button
          onClick={() => { setUser(null); setLoginCpf(''); setLoginError(''); }}
          className="flex-shrink-0 flex flex-col lg:flex-row items-center gap-1 lg:gap-3 px-3 lg:px-6 py-2 lg:py-4 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all lg:mt-auto ml-auto lg:ml-0"
        >
          <LogOut size={18}/>
          <span className="text-[8px] lg:text-[10px] font-black uppercase whitespace-nowrap">Sair</span>
        </button>
      </nav>

      <main className="p-3 lg:p-10 max-w-7xl mx-auto">

        {/* HEADER DO USUÁRIO */}
        <header className="mb-8">
          <div className="bg-white border border-gray-200 shadow-sm rounded-[2rem] p-4 lg:p-8 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-emerald-500 rounded-2xl lg:rounded-3xl flex items-center justify-center text-black font-black text-xl lg:text-2xl">{user.name.charAt(0)}</div>
                <div>
                  <h2 className="text-lg lg:text-2xl font-black uppercase italic tracking-tighter text-gray-900">{user.name}</h2>
                  <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{user.role === 'admin' ? 'Administrador' : 'Aluno Ativo'}</span>
                </div>
              </div>
              {user.role !== 'admin' && userStats && (
                <div className="flex flex-wrap gap-3 justify-center">
                  <StatMetric label="Presenças"    value={userStats.presencas}    color="text-emerald-600" />
                  <StatMetric label="Faltas"       value={userStats.faltas}       color="text-rose-600" />
                  <StatMetric label="Desmarcações" value={userStats.desmarcacoes} color="text-orange-600" />
                  <StatMetric label="Créditos"     value={userStats.creditos}     color="text-purple-600" highlight />
                </div>
              )}
            </div>
            {user.role !== 'admin' && userStats && (
              <div className="flex flex-wrap gap-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500">
                  <CalendarDays size={14}/> Início: <span className="text-gray-900 ml-1">{userStats.startDate ? new Date(userStats.startDate).toLocaleDateString() : '---'}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500">
                  <Clock size={14}/> Fim: <span className="text-emerald-600 ml-1">{userStats.endDate ? new Date(userStats.endDate).toLocaleDateString() : '---'}</span>
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
                  className={`px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex flex-col items-center gap-0.5 ${selectedDay === day ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-white text-gray-500 border border-gray-200 shadow-sm'}`}
                >
                  <span>{day}</span>
                  <span className={`text-[9px] font-bold ${selectedDay === day ? 'text-black/70' : 'text-gray-400'}`}>{getDateForDay(day)}</span>
                </button>
              ))}
            </div>

            {/* Seletor de turno */}
            <div className="flex gap-2 mb-6">
              <button onClick={() => setActiveTurno('manha')}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all ${activeTurno === 'manha' ? 'bg-amber-500 text-black' : 'bg-black/10 text-gray-500 border border-black/10'}`}
              ><Sun size={14}/> Manhã <span className="opacity-60">07–12h</span></button>
              <button onClick={() => setActiveTurno('tarde')}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all ${activeTurno === 'tarde' ? 'bg-blue-500 text-white' : 'bg-black/10 text-gray-500 border border-black/10'}`}
              ><Moon size={14}/> Tarde <span className="opacity-60">15–20h</span></button>
              {/* Visão semanal apenas para admin */}
              {user.role === 'admin' && (
                <button onClick={() => setActiveTurno('semana')}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all ${activeTurno === 'semana' ? 'bg-emerald-500 text-black' : 'bg-black/10 text-gray-500 border border-black/10'}`}
                ><Calendar size={14}/> Semana</button>
              )}
            </div>

            {/* ===== MELHORIA 5: VISÃO SEMANAL ===== */}
            {activeTurno === 'semana' && (
              <div className="overflow-x-auto rounded-3xl border border-white/5 bg-[#11141a]">
                <table className="w-full min-w-[700px] text-[10px]">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="p-3 text-left text-gray-500 font-black uppercase w-16 text-[9px]">Hora</th>
                      {DAYS.map(d => (
                        <th key={d} className="p-3 text-center font-black uppercase">
                          <span className="text-gray-400 text-[9px] block">{d.substring(0, 3)}</span>
                          <span className="text-gray-500 text-[8px] font-bold block">{getDateForDay(d)}</span>
                        </th>
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
                          const allSlots = schedules.filter(s => s.day === day && s.hour === hour);
                          const blockedSlots = allSlots.filter(s => s.status === 'bloqueado');
                          const realSlots = allSlots.filter(s => s.status !== 'bloqueado');
                          const totalOcupado = realSlots.length + blockedSlots.length;
                          return (
                            <td key={day} className="p-1 align-top">
                              <div className="space-y-1">
                                {blockedSlots.map(bs => (
                                  <div key={bs.id} className="bg-slate-700 rounded-lg px-2 py-1 text-[9px] font-black text-slate-300 flex items-center gap-1">
                                    <Lock size={8}/>Bloqueada
                                  </div>
                                ))}
                                {realSlots.map(s => {
                                  const theme = STATUS_THEME[s.status] || STATUS_THEME.pendente;
                                  return (
                                    <div key={s.id} className={`${theme.bg} rounded-lg px-2 py-1 text-[9px] font-black text-white truncate max-w-[90px]`} title={s.name}>
                                      {s.name}
                                    </div>
                                  );
                                })}
                                {totalOcupado < 3 && user.role === 'admin' && (
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
                          const allSlots = schedules.filter(s => s.day === day && s.hour === hour);
                          const blockedSlots = allSlots.filter(s => s.status === 'bloqueado');
                          const realSlots = allSlots.filter(s => s.status !== 'bloqueado');
                          const totalOcupado = realSlots.length + blockedSlots.length;
                          return (
                            <td key={day} className="p-1 align-top">
                              <div className="space-y-1">
                                {blockedSlots.map(bs => (
                                  <div key={bs.id} className="bg-slate-700 rounded-lg px-2 py-1 text-[9px] font-black text-slate-300 flex items-center gap-1">
                                    <Lock size={8}/>Bloqueada
                                  </div>
                                ))}
                                {realSlots.map(s => {
                                  const theme = STATUS_THEME[s.status] || STATUS_THEME.pendente;
                                  return (
                                    <div key={s.id} className={`${theme.bg} rounded-lg px-2 py-1 text-[9px] font-black text-white truncate max-w-[90px]`} title={s.name}>
                                      {s.name}
                                    </div>
                                  );
                                })}
                                {totalOcupado < 3 && user.role === 'admin' && (
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
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase w-fit ${activeTurno === 'manha' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {activeTurno === 'manha' ? <Sun size={12}/> : <Moon size={12}/>}
                  {activeTurno === 'manha' ? `Manhã — Fisioterapeuta: ${TURNO_MANHA_PROF}` : `Tarde — Fisioterapeuta: ${TURNO_TARDE_PROF}`}
                </div>

                {activeHours.map(hour => {
                  const daySchedules = schedules.filter(s => s.day === selectedDay && s.hour === hour);
                  // Separa vagas bloqueadas individualmente dos slots reais
                  const blockedSlots = daySchedules.filter(s => s.status === 'bloqueado');
                  const realSlots = daySchedules.filter(s => s.status !== 'bloqueado');
                  // Total ocupado = reais + bloqueados (cada um conta como 1 vaga)
                  const totalOcupado = realSlots.length + blockedSlots.length;
                  const vagasLivres = 3 - totalOcupado;
                  const userScheduled = user.role !== 'admin' && realSlots.find(s => s.studentId === user.id);

                  return (
                    <div key={hour} className="flex gap-3 items-start">
                      <div className={`w-16 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 ${activeTurno === 'manha' ? 'bg-amber-100 border border-amber-200' : 'bg-blue-100 border border-blue-200'}`}>
                        <span className={`font-black text-sm ${activeTurno === 'manha' ? 'text-amber-700' : 'text-blue-700'}`}>{hour}</span>
                        <span className="text-[8px] font-bold text-gray-400">{totalOcupado}/3</span>
                      </div>

                      <div className="flex-1 flex flex-wrap gap-2 items-start">

                        {/* Slots reais — nome sempre visível com contraste */}
                        {realSlots.map(s => {
                          const theme = STATUS_THEME[s.status] || STATUS_THEME.pendente;
                          const isMine = s.studentId === user.id;
                          if (user.role !== 'admin' && !isMine) return null;
                          return (
                            <div key={s.id} className={`relative group ${theme.bg} border ${theme.border} px-4 py-3 rounded-2xl min-w-[120px]`}>
                              <span className="block text-[11px] font-black text-white uppercase truncate max-w-[130px]">{s.name}</span>
                              <span className="text-[8px] font-black uppercase text-white/70">{theme.label}</span>
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

                        {/* Vagas bloqueadas — admin vê "Vaga bloqueada", aluno vê "Sem vagas" */}
                        {blockedSlots.map(bs => (
                          <div key={bs.id} className="bg-slate-200 border border-slate-300 px-4 py-3 rounded-2xl min-w-[110px] flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {user.role === 'admin'
                                ? <><Lock size={12} className="text-slate-500 shrink-0"/><span className="text-[10px] font-black text-slate-700 uppercase">Vaga bloqueada</span></>
                                : <><X size={12} className="text-slate-500 shrink-0"/><span className="text-[10px] font-black text-slate-600 uppercase">Sem vagas</span></>
                              }
                            </div>
                            {user.role === 'admin' && (
                              <button
                                onClick={async () => {
                                  await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'schedules', bs.id));
                                  await createLog(`Desbloqueou 1 vaga em ${selectedDay} ${hour}`);
                                }}
                                className="flex items-center gap-1 mt-1 text-slate-500 hover:text-emerald-600 transition-all text-[8px] font-black uppercase"
                              >
                                <Unlock size={10}/> Desbloquear
                              </button>
                            )}
                          </div>
                        ))}

                        {/* Botões de ação admin — só aparecem se ainda há vagas livres */}
                        {user.role === 'admin' && vagasLivres > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => setShowScheduleModal({ hour })}
                              className="w-14 h-14 rounded-2xl border border-dashed border-gray-300 bg-white flex flex-col items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-400 transition-all gap-0.5 shadow-sm">
                              <Plus size={16}/>
                              <span className="text-[7px] font-black uppercase">Agendar</span>
                            </button>
                            <button
                              onClick={async () => {
                                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'schedules'), {
                                  name: 'VAGA BLOQUEADA', studentId: null, day: selectedDay, hour,
                                  status: 'bloqueado', isSlotBlock: true,
                                  createdBy: user.name, createdAt: new Date().toISOString()
                                });
                                await createLog(`Bloqueou 1 vaga em ${selectedDay} ${hour} (${blockedSlots.length + 1}ª bloqueada)`);
                              }}
                              title={`Bloquear 1 vaga (${vagasLivres} livre${vagasLivres > 1 ? 's' : ''})`}
                              className="w-14 h-14 rounded-2xl border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-500 hover:bg-slate-50 transition-all gap-0.5 shadow-sm">
                              <Lock size={13}/>
                              <span className="text-[7px] font-black uppercase">+1 vaga</span>
                            </button>
                            {vagasLivres > 1 && (
                              <button
                                onClick={async () => {
                                  for (let i = 0; i < vagasLivres; i++) {
                                    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'schedules'), {
                                      name: 'VAGA BLOQUEADA', studentId: null, day: selectedDay, hour,
                                      status: 'bloqueado', isSlotBlock: true,
                                      createdBy: user.name, createdAt: new Date().toISOString()
                                    });
                                  }
                                  await createLog(`Bloqueou todas as ${vagasLivres} vagas restantes em ${selectedDay} ${hour}`);
                                }}
                                title={`Bloquear as ${vagasLivres} vagas restantes`}
                                className="w-14 h-14 rounded-2xl border border-dashed border-rose-300 bg-white flex flex-col items-center justify-center text-rose-400 hover:text-rose-600 hover:border-rose-500 hover:bg-rose-50 transition-all gap-0.5 shadow-sm">
                                <Lock size={13}/>
                                <span className="text-[7px] font-black uppercase">Tudo</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Reposição (aluno) */}
                        {user.role !== 'admin' && !userScheduled && vagasLivres > 0 && (user.credits || 0) > 0 && (
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
              <h1 className="text-2xl lg:text-3xl font-black uppercase italic text-gray-900">Alunos</h1>
              <div className="flex gap-3 flex-wrap">
                <input type="text" placeholder="Buscar..." className="bg-white border border-gray-200 rounded-2xl px-5 py-3 text-xs w-48 outline-none text-gray-900 shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <button onClick={() => setShowAddStudent(true)} className="bg-emerald-500 text-black px-5 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 shadow-sm"><UserPlus size={16}/> Matricular</button>
              </div>
            </div>

            {/* Sub-abas */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <button onClick={() => setAlunosSubTab('todos')}
                className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${alunosSubTab === 'todos' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200 shadow-sm'}`}>
                Todos ({students.length})
              </button>
              <button onClick={() => setAlunosSubTab('planoAoFim')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${alunosSubTab === 'planoAoFim' ? 'bg-rose-500 text-white' : 'bg-white text-gray-500 border border-gray-200 shadow-sm'}`}>
                <AlertTriangle size={12}/> Plano ao Fim ({alunosPlanoAoFim.length})
              </button>
              <button onClick={() => setAlunosSubTab('expirados')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${alunosSubTab === 'expirados' ? 'bg-red-600 text-white' : 'bg-white text-gray-500 border border-gray-200 shadow-sm'}`}>
                <AlertCircle size={12}/> Expirados ({alunosExpirados.length})
              </button>
            </div>

            {/* Lista de alunos */}
            {(() => {
              const lista = (
                alunosSubTab === 'planoAoFim' ? alunosPlanoAoFim :
                alunosSubTab === 'expirados'  ? alunosExpirados :
                students
              ).filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {lista.map(s => {
                    const daysLeft = getDaysUntilEnd(s.endDate);
                    const isExpiring = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0;
                    const isExpired  = daysLeft !== null && daysLeft < 0;
                    const fixedScheds = (s.fixedSchedules || []).map(fs => `${fs.day.substring(0,3)} ${fs.hour}`).join(' • ');

                    return (
                      <div key={s.id} className={`bg-white p-5 rounded-[2rem] border transition-all group relative shadow-sm ${
                        isExpired  ? 'border-red-400 shadow-red-100 bg-red-50/30' :
                        isExpiring ? 'border-rose-300 shadow-rose-100' :
                                     'border-gray-200 hover:border-emerald-300 hover:shadow-md'
                      }`}>
                        {/* Banner de expirado */}
                        {isExpired && (
                          <div className="absolute top-0 left-0 right-0 bg-red-500 rounded-t-[2rem] px-4 py-1.5 flex items-center gap-2">
                            <AlertCircle size={10} className="text-white"/>
                            <span className="text-[9px] font-black text-white uppercase">Plano expirado — renovação necessária</span>
                          </div>
                        )}
                        {/* Banner de expirando em breve */}
                        {!isExpired && isExpiring && (
                          <div className="absolute top-0 left-0 right-0 bg-rose-100 rounded-t-[2rem] px-4 py-1.5 flex items-center gap-2">
                            <AlertTriangle size={10} className="text-rose-500"/>
                            <span className="text-[9px] font-black text-rose-600 uppercase">Plano acaba em {daysLeft === 0 ? 'hoje' : `${daysLeft}d`}</span>
                          </div>
                        )}
                        <div className={`${isExpired || isExpiring ? 'mt-6' : ''}`} onClick={() => setShowStudentDetailsId(s.id)}>
                          <div className="flex items-start gap-3 mb-3 cursor-pointer">
                            {/* Avatar vermelho se expirado */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${isExpired ? 'bg-red-500 text-white' : 'bg-emerald-500 text-black'}`}>
                              {s.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* Nome vermelho se expirado */}
                              <h3 className={`font-black uppercase text-sm leading-tight break-words ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>{s.name}</h3>
                              <p className={`text-[9px] font-bold uppercase mt-0.5 ${isExpired ? 'text-red-400' : 'text-emerald-600'}`}>{s.plan} • {s.frequencyLabel}</p>
                            </div>
                          </div>

                          {fixedScheds && (
                            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                              <Clock size={10} className="text-emerald-600 shrink-0"/>
                              <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider truncate">{fixedScheds}</span>
                            </div>
                          )}

                          <div className="space-y-1 pt-2 border-t border-gray-100">
                            <div className="flex justify-between text-[8px] font-black uppercase">
                              <span className="text-gray-400">Início</span>
                              <span className="text-gray-700">{s.startDate ? new Date(s.startDate).toLocaleDateString() : '---'}</span>
                            </div>
                            <div className="flex justify-between text-[8px] font-black uppercase">
                              <span className="text-gray-400">Fim</span>
                              <span className={isExpired ? 'text-red-600 font-black' : isExpiring ? 'text-rose-600' : 'text-emerald-600'}>
                                {s.endDate ? new Date(s.endDate).toLocaleDateString() : '---'}
                                {isExpired && ' ✕'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                          <button onClick={() => setShowProntuarioId(s.id)} title="Prontuário"
                            className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-50 text-gray-500 rounded-xl hover:bg-purple-100 hover:text-purple-700 transition-all text-[9px] font-black uppercase border border-gray-200">
                            <BookOpen size={12}/> Prontuário
                          </button>
                          <button onClick={e => { e.stopPropagation(); setShowAnexosId(s.id); }} title="Anexos"
                            className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-50 text-gray-500 rounded-xl hover:bg-sky-100 hover:text-sky-700 transition-all text-[9px] font-black uppercase border border-gray-200">
                            <Paperclip size={12}/> Anexos
                          </button>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button onClick={e => { e.stopPropagation(); setEditStudentData(JSON.parse(JSON.stringify(s))); }} title="Editar"
                            className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-50 text-gray-500 rounded-xl hover:bg-emerald-100 hover:text-emerald-700 transition-all text-[9px] font-black uppercase border border-gray-200">
                            <Edit3 size={12}/> Editar
                          </button>
                          <button onClick={e => handleDeleteStudent(e, s.id, s.name)} title="Excluir"
                            className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-50 text-gray-500 rounded-xl hover:bg-rose-100 hover:text-rose-700 transition-all text-[9px] font-black uppercase border border-gray-200">
                            <Trash2 size={12}/> Excluir
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
            <h1 className="text-2xl lg:text-3xl font-black uppercase italic mb-6 text-gray-900">Dashboard</h1>

            {/* Sub-abas */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-1 no-scrollbar">
              {[
                { key: 'geral',    label: 'Geral',    color: 'bg-gray-900 text-white' },
                { key: 'andriele', label: 'Andriele · Manhã', color: 'bg-amber-500 text-black' },
                { key: 'jessica',  label: 'Jessica · Tarde',  color: 'bg-blue-500 text-white' },
              ].map(t => (
                <button key={t.key} onClick={() => setDashSubTab(t.key)}
                  className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase whitespace-nowrap transition-all ${dashSubTab === t.key ? t.color : 'bg-white text-gray-500 border border-gray-200 shadow-sm'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Dashboard Geral */}
            {dashSubTab === 'geral' && (() => {
              const hoje = new Date().toISOString().split('T')[0];
              const openDrill = (label, filter) => setDashDrillDown({ label, items: schedules.filter(filter) });
              return (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Agendados"    value={metrics.pendentes}  color="text-gray-600"   icon={<Clock size={22}/>}
                    onClick={() => openDrill('Agendados', s => s.status === 'pendente')} />
                  <StatCard label="Presenças"    value={metrics.concluidas} color="text-emerald-600" icon={<CheckCircle2 size={22}/>}
                    onClick={() => openDrill('Presenças', s => s.status === 'concluida')} />
                  <StatCard label="Faltas"       value={metrics.faltas}     color="text-rose-600"   icon={<AlertCircle size={22}/>}
                    onClick={() => openDrill('Faltas', s => s.status === 'falta')} />
                  <StatCard label="Desmarcações" value={metrics.desmarcados} color="text-orange-600" icon={<CalendarX size={22}/>}
                    onClick={() => openDrill('Desmarcações', s => s.status === 'desmarcado' || s.status === 'desmarcado_atrasado')} />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <StatCard label="Reposições"   value={metrics.reposicao}    color="text-purple-600" icon={<RotateCcw size={22}/>}
                    onClick={() => openDrill('Reposições', s => s.status === 'reposicao')} />
                  <StatCard label="Experimentais" value={metrics.experimental} color="text-amber-600"  icon={<FlaskConical size={22}/>}
                    onClick={() => openDrill('Experimentais', s => s.status === 'experimental')} />
                  <StatCard label="Total Alunos" value={metrics.alunos}       color="text-blue-600"   icon={<Users size={22}/>}
                    onClick={() => openDrill('Todos os Alunos', () => true)} />
                </div>
              </div>
              );
            })()}

            {/* Dashboard Andriele */}
            {dashSubTab === 'andriele' && (
              <ProfDashboard
                name={TURNO_MANHA_PROF}
                turno="Manhã"
                turnoColor="amber"
                data={metricsByProf.andriele}
                onDrill={(label, items) => setDashDrillDown({ label, items })}
              />
            )}

            {/* Dashboard Jessica */}
            {dashSubTab === 'jessica' && (
              <ProfDashboard
                name={TURNO_TARDE_PROF}
                turno="Tarde"
                turnoColor="blue"
                data={metricsByProf.jessica}
                onDrill={(label, items) => setDashDrillDown({ label, items })}
              />
            )}
          </div>
        )}

        {/* ===== ABA HISTÓRICO — MELHORIA 7 ===== */}
        {activeTab === 'historico' && user.role === 'admin' && (
          <div className="max-w-4xl mx-auto space-y-2">
            <h1 className="text-2xl font-black uppercase italic mb-6 text-gray-900">Logs do Sistema</h1>
            {logs.map(log => {
              const isExpiry = log.type === 'expiry_warning';
              return (
                <div key={log.id} className={`p-4 rounded-2xl border flex justify-between items-center gap-4 shadow-sm ${isExpiry ? 'bg-rose-50 border-rose-200' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    {isExpiry && <AlertTriangle size={14} className="text-rose-500 shrink-0"/>}
                    <div className="min-w-0">
                      <p className={`text-[10px] font-black uppercase truncate ${isExpiry ? 'text-rose-700' : 'text-gray-900'}`}>{log.action}</p>
                      <p className="text-[8px] font-bold text-gray-400">Por: {log.user}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 shrink-0">{new Date(log.timestamp).toLocaleString()}</span>
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
                <label className="text-[9px] font-black uppercase text-gray-500 ml-1">Plano</label>
                <select className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-sm text-gray-900 shadow-sm" value={newStudent.plan} onChange={e => setNewStudent({...newStudent, plan: e.target.value})}>
                  {PLANOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-500 ml-1">Frequência</label>
                <select className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-sm text-gray-900 shadow-sm" value={newStudent.frequency} onChange={e => {
                  const count = Number(e.target.value);
                  const upd = Array.from({ length: count }).map((_, i) => newStudent.fixedSchedules[i] || { day: 'Segunda', hour: '07:00' });
                  setNewStudent({ ...newStudent, frequency: count, fixedSchedules: upd });
                }}>
                  {FREQUENCIAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>
            <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-200">
              <p className="text-[10px] font-black uppercase text-emerald-600 mb-4 tracking-widest">Horários Fixos</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {newStudent.fixedSchedules.map((sched, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
                    <select className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-900" value={sched.day} onChange={e => {
                      const copy = [...newStudent.fixedSchedules]; copy[idx].day = e.target.value; setNewStudent({...newStudent, fixedSchedules: copy});
                    }}>{DAYS.map(d => <option key={d} value={d}>{d}</option>)}</select>
                    <select className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-900" value={sched.hour} onChange={e => {
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
            <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-200">
              <p className="text-[10px] font-black uppercase text-emerald-600 mb-4 tracking-widest">Alterar Horários Fixos</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {editStudentData.fixedSchedules?.map((sched, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
                    <select className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-900" value={sched.day} onChange={e => {
                      const copy = [...editStudentData.fixedSchedules]; copy[idx].day = e.target.value; setEditStudentData({...editStudentData, fixedSchedules: copy});
                    }}>{DAYS.map(d => <option key={d} value={d}>{d}</option>)}</select>
                    <select className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-900" value={sched.hour} onChange={e => {
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
              <label className="text-[9px] font-black uppercase text-gray-500 ml-1">Aluno Registrado</label>
              <select className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-gray-900 text-xs shadow-sm" value={scheduleForm.studentId} onChange={e => setScheduleForm({...scheduleForm, studentId: e.target.value, manualName: ''})}>
                <option value="">-- Selecionar --</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-gray-500 ml-1">Ou Nome Manual</label>
              <input type="text" placeholder="Nome..." className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-gray-900 text-xs outline-none focus:border-emerald-400 shadow-sm" value={scheduleForm.manualName} onChange={e => setScheduleForm({...scheduleForm, manualName: e.target.value, studentId: ''})} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-gray-500 ml-1">Tipo</label>
              <select className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-gray-900 text-xs shadow-sm" value={scheduleForm.status} onChange={e => setScheduleForm({...scheduleForm, status: e.target.value})}>
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
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
              <p className="text-[8px] font-black text-purple-600 uppercase mb-2">Créditos de Reposição</p>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-gray-900">{showStudentDetails.credits || 0}</span>
                <div className="flex gap-2">
                  <button onClick={() => adjustCredits(showStudentDetails.id, showStudentDetails.name, -1)} className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition-all"><MinusCircle size={16}/></button>
                  <button onClick={() => adjustCredits(showStudentDetails.id, showStudentDetails.name, 1)}  className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-all"><Plus size={16}/></button>
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
      {/* ===== MODAL DRILL-DOWN DO DASHBOARD ===== */}
      {dashDrillDown && (
        <Modal title={dashDrillDown.label} onClose={() => setDashDrillDown(null)} size="md">
          {dashDrillDown.items.length === 0 ? (
            <p className="text-center text-gray-400 text-[10px] font-black uppercase py-12">Nenhum registro encontrado</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {dashDrillDown.items.map(s => {
                const theme = STATUS_THEME[s.status] || STATUS_THEME.pendente;
                return (
                  <div key={s.id} className="bg-white border border-gray-200 rounded-2xl px-5 py-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${theme.bg} shrink-0`}/>
                      <div>
                        <p className="text-sm font-black text-gray-900 uppercase">{s.name}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">{s.day} • {s.hour} • {theme.label}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${theme.bg} text-white`}>{theme.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}

      {showProntuarioStudent && user.role === 'admin' && (
        <Modal title={`Prontuário — ${showProntuarioStudent.name}`} onClose={() => setShowProntuarioId(null)} size="lg">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-6">
            <p className="text-[9px] font-black uppercase text-emerald-600 mb-3">Nova Evolução Clínica</p>
            <textarea
              placeholder="Descreva a evolução clínica..."
              className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-900 outline-none h-28 resize-none focus:border-emerald-400 shadow-sm"
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
              }} className="bg-emerald-500 text-black px-6 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-400 transition-all">
                Salvar Evolução
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {evolutions.filter(e => e.studentId === showProntuarioStudent.id)
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .map(evo => (
                <div key={evo.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between mb-2 text-[9px] font-black uppercase">
                    <span className="text-emerald-600">{new Date(evo.timestamp).toLocaleDateString()}</span>
                    <span className="text-gray-400">{evo.author}</span>
                  </div>
                  <p className="text-sm text-gray-700 italic">"{evo.content}"</p>
                </div>
              ))
            }
            {evolutions.filter(e => e.studentId === showProntuarioStudent.id).length === 0 && (
              <p className="text-center text-gray-400 text-[10px] font-black uppercase py-8">Nenhuma evolução registrada</p>
            )}
          </div>
        </Modal>
      )}

      {/* ===== MODAL ANEXOS — funcional com upload base64 ===== */}
      {showAnexosStudent && user.role === 'admin' && (
        <AnexosModal
          student={showAnexosStudent}
          onClose={() => setShowAnexosId(null)}
          db={db}
          appId={appId}
          userName={user.name}
          createLog={createLog}
        />
      )}
    </div>
  );
}

// ===== COMPONENTES AUXILIARES =====

// ===== MODAL DE ANEXOS — upload base64 funcional =====
function AnexosModal({ student, onClose, db, appId, userName, createLog }) {
  const [anexos, setAnexos] = React.useState([]);
  const [uploading, setUploading] = React.useState(false);
  const [preview, setPreview] = React.useState(null);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    const ref = collection(db, 'artifacts', appId, 'public', 'data', 'anexos');
    const unsub = onSnapshot(ref, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAnexos(all.filter(a => a.studentId === student.id).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    });
    return () => unsub();
  }, [student.id]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const MAX = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX) { alert('Arquivo muito grande. Máximo: 2MB.'); return; }
    setUploading(true);
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'anexos'), {
        studentId: student.id,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        data: base64,
        uploadedBy: userName,
        timestamp: new Date().toISOString()
      });
      await createLog(`Adicionou anexo "${file.name}" para ${student.name}`);
    } catch (err) { console.error(err); alert('Erro ao enviar arquivo.'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleDelete = async (anexoId, fileName) => {
    if (!confirm(`Remover o arquivo "${fileName}"?`)) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'anexos', anexoId));
    await createLog(`Removeu anexo "${fileName}" de ${student.name}`);
  };

  const formatSize = (bytes) => bytes < 1024 ? `${bytes}B` : bytes < 1024*1024 ? `${(bytes/1024).toFixed(1)}KB` : `${(bytes/1024/1024).toFixed(1)}MB`;

  const isImage = (type) => type && type.startsWith('image/');

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[200] flex items-start justify-center p-4 backdrop-blur-sm overflow-y-auto">
        <div className="bg-[#f0ede8] w-full max-w-2xl rounded-[2.5rem] p-6 lg:p-10 border border-gray-200 shadow-2xl my-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-black italic uppercase text-gray-900">Anexos</h2>
              <p className="text-[9px] text-gray-500 font-black uppercase mt-1">{student.name}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-900 p-2 transition-all"><X size={24}/></button>
          </div>

          {/* Área de upload */}
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-sky-400 bg-sky-50 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-sky-500 hover:bg-sky-100 transition-all mb-6"
          >
            <Paperclip size={28} className="text-sky-600"/>
            <p className="text-[11px] font-black uppercase text-sky-700">
              {uploading ? 'Enviando...' : 'Clique para anexar arquivo'}
            </p>
            <p className="text-[9px] text-gray-500 font-bold">Imagens, PDF, DOC • Máx. 2MB</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </div>

          {/* Lista de anexos */}
          {anexos.length === 0 && !uploading && (
            <p className="text-center text-gray-400 text-[10px] font-black uppercase py-8">Nenhum anexo ainda</p>
          )}
          <div className="space-y-3">
            {anexos.map(a => (
              <div key={a.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 group shadow-sm">
                {/* Thumbnail para imagens */}
                {isImage(a.fileType) ? (
                  <img
                    src={a.data} alt={a.fileName}
                    className="w-12 h-12 rounded-xl object-cover shrink-0 cursor-pointer border border-gray-200"
                    onClick={() => setPreview(a)}
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 border border-gray-200">
                    <FileText size={20} className="text-gray-500"/>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-gray-900 truncate">{a.fileName}</p>
                  <p className="text-[8px] text-gray-400 font-bold uppercase">
                    {formatSize(a.fileSize)} • {new Date(a.timestamp).toLocaleDateString()} • {a.uploadedBy}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a href={a.data} download={a.fileName}
                    className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-sky-100 hover:text-sky-700 transition-all border border-gray-200"
                    title="Baixar">
                    <Download size={14}/>
                  </a>
                  <button onClick={() => handleDelete(a.id, a.fileName)}
                    className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-rose-100 hover:text-rose-700 transition-all opacity-0 group-hover:opacity-100 border border-gray-200"
                    title="Remover">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preview de imagem */}
      {preview && (
        <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="relative max-w-3xl w-full">
            <button onClick={() => setPreview(null)} className="absolute -top-10 right-0 text-gray-300 hover:text-white"><X size={24}/></button>
            <img src={preview.data} alt={preview.fileName} className="w-full rounded-3xl shadow-2xl"/>
            <p className="text-center text-gray-400 text-[10px] font-black uppercase mt-3">{preview.fileName}</p>
          </div>
        </div>
      )}
    </>
  );
}

function Modal({ title, children, onClose, size = 'md' }) {
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-start justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className={`bg-[#f0ede8] w-full ${widths[size]} rounded-[2.5rem] p-6 lg:p-10 border border-gray-200 shadow-2xl my-4`}>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl lg:text-2xl font-black italic uppercase text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 p-2 transition-all"><X size={24}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NavItem({ active, icon, label, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-3 px-3 lg:px-6 py-2 lg:py-4 rounded-2xl transition-all whitespace-nowrap ${active ? 'bg-emerald-500 text-black font-black shadow-sm' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
      {icon} <span className="text-[8px] lg:text-[10px] uppercase font-black">{label}</span>
    </button>
  );
}

function ProfDashboard({ name, turno, turnoColor, data, onDrill }) {
  const colorMap = {
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-600', badge: 'bg-amber-500 text-black' },
    blue:  { bg: 'bg-blue-500/10',  border: 'border-blue-500/20',  text: 'text-blue-600',  badge: 'bg-blue-500 text-white' },
  };
  const c = colorMap[turnoColor];

  const card = (label, value, color, list, extraClass = '') => (
    <div
      onClick={() => onDrill(label, list)}
      className={`bg-white p-5 rounded-3xl border border-gray-200 shadow-sm cursor-pointer hover:shadow-md hover:border-emerald-300 active:scale-95 transition-all ${extraClass}`}
    >
      <p className="text-[9px] font-black uppercase text-gray-400 mb-2">{label}</p>
      <p className={`text-4xl font-black ${color} tracking-tighter`}>{value}</p>
      <p className="text-[8px] text-gray-300 font-black uppercase mt-1">Ver detalhes</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header da fisioterapeuta */}
      <div className={`bg-white border ${c.border} rounded-3xl p-6 flex items-center gap-4 shadow-sm`}>
        <div className={`${c.badge} px-4 py-2 rounded-2xl font-black text-[10px] uppercase`}>{turno}</div>
        <div>
          <h3 className="font-black text-gray-900 italic text-lg uppercase">{name}</h3>
          <p className="text-[9px] text-gray-500 font-black uppercase">Fisioterapeuta — Turno da {turno}</p>
        </div>
      </div>

      {/* Atendimentos do dia e mensal — cards grandes */}
      <div className="grid grid-cols-2 gap-4">
        <div onClick={() => onDrill('Atend. Hoje', data.dailyList)}
          className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm cursor-pointer hover:shadow-md hover:border-emerald-300 active:scale-95 transition-all">
          <p className="text-[9px] font-black uppercase text-gray-400 mb-2">Atend. Hoje</p>
          <p className={`text-5xl font-black ${c.text} tracking-tighter`}>{data.daily}</p>
          <p className="text-[8px] text-gray-300 font-black uppercase mt-1">Ver detalhes</p>
        </div>
        <div onClick={() => onDrill('Atend. Mensal', data.monthlyList)}
          className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm cursor-pointer hover:shadow-md hover:border-emerald-300 active:scale-95 transition-all">
          <p className="text-[9px] font-black uppercase text-gray-400 mb-2">Atend. Mensal</p>
          <p className={`text-5xl font-black ${c.text} tracking-tighter`}>{data.monthly}</p>
          <p className="text-[8px] text-gray-300 font-black uppercase mt-1">Ver detalhes</p>
        </div>
      </div>

      {/* Totais detalhados — todos clicáveis */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {card('Presenças',    data.totalConcluidas,  'text-emerald-600', data.concluidaList)}
        {card('Faltas',       data.totalFaltas,      'text-rose-600',    data.faltaList)}
        {card('Desmarcações', data.totalDesmarcados, 'text-orange-600',  data.desmarcList)}
        {card('Reposições',   data.totalReposicao,   'text-purple-600',  data.reposicaoList, 'border-purple-200')}
        {card('Experimentais',data.totalExperimental,'text-amber-600',   data.experList,     'border-amber-200')}
        {card('Total Sessões',data.total,            c.text,             data.allList)}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white p-6 lg:p-8 rounded-[2.5rem] border border-gray-200 shadow-sm relative overflow-hidden group transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:border-emerald-300 active:scale-95' : ''}`}
    >
      <div className="absolute top-4 right-4 text-gray-100 group-hover:text-gray-200 transition-all">{icon}</div>
      <p className="text-[9px] font-black uppercase text-gray-400 mb-3">{label}</p>
      <p className={`text-4xl lg:text-5xl font-black ${color} tracking-tighter`}>{value}</p>
      {onClick && <p className="text-[8px] text-gray-300 font-black uppercase mt-2">Clique para ver detalhes</p>}
    </div>
  );
}

function StatMetric({ label, value, color, highlight }) {
  return (
    <div className={`text-center px-3 py-2 rounded-2xl ${highlight ? 'bg-gray-100' : ''}`}>
      <p className="text-[8px] font-black text-gray-400 uppercase mb-1">{label}</p>
      <p className={`text-base font-black ${color}`}>{value}</p>
    </div>
  );
}

function InputGroup({ label, type = 'text', value, onChange, required = false }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black uppercase text-gray-500 ml-1">{label}</label>
      <input type={type} className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-sm text-gray-900 outline-none focus:border-emerald-400 transition-all shadow-sm" value={value || ''} onChange={e => onChange(e.target.value)} required={required} />
    </div>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-emerald-600 mb-1 text-[9px] font-black uppercase">{icon}<p>{label}</p></div>
      <p className="text-gray-900 text-[11px] leading-tight font-bold">{value || '---'}</p>
    </div>
  );
}