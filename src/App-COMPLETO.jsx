// BLOCO 1/3 — src/App.jsx (linhas 1–420)
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
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
const storageBucketName = firebaseConfig.storageBucket?.replace('.firebasestorage.app', '.appspot.com');
const storage = getStorage(app, `gs://${storageBucketName}`);
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
  bloqueado_parcial:   { color: 'text-white',        bg: 'bg-slate-600',       border: 'border-slate-500',       label: 'Bloqueio parcial',           icon: <Lock size={10}/> },
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
  const [attachments, setAttachments] = useState([]);
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
  const [alunosSubTab, setAlunosSubTab] = useState('todos'); // 'todos' | 'planoAoFim'
  const [dashSubTab, setDashSubTab] = useState('geral'); // 'geral' | 'andriele' | 'jessica'
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');

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
    const refs = ['schedules', 'students', 'logs', 'evolutions', 'attachments'].map(c =>
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
    const unsubAttachments = onSnapshot(refs[4], snap => setAttachments(snap.docs.map(d => ({ id: d.id, ...d.data() }))), err => console.error(err));
    return () => { unsubSchedules(); unsubStudents(); unsubLogs(); unsubEvols(); unsubAttachments(); };
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

  const getPartialBlockRecord = (day, hour) => schedules.find(s => s.day === day && s.hour === hour && s.status === 'bloqueado_parcial');
  const getBlockedSlots = (day, hour) => getPartialBlockRecord(day, hour)?.blockedSlots || 0;

  const handleSetPartialBlock = async (hour, day, blockedSlots) => {
    const partial = getPartialBlockRecord(day, hour);
    if (blockedSlots <= 0) {
      if (partial) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'schedules', partial.id));
      await createLog(`Removeu bloqueio parcial de ${day} ${hour}`);
      return;
    }
    if (partial) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'schedules', partial.id), { blockedSlots });
    } else {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'schedules'), {
        name: 'BLOQUEIO PARCIAL', studentId: null, day, hour, status: 'bloqueado_parcial', blockedSlots,
        createdBy: user.name, createdAt: new Date().toISOString()
      });
    }
    await createLog(`Definiu bloqueio parcial (${blockedSlots} vaga${blockedSlots > 1 ? 's' : ''}) em ${day} ${hour}`);
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
      const totalReposicao = profSchedules.filter(s => s.status === 'reposicao').length;
      const totalExperimental = profSchedules.filter(s => s.status === 'experimental').length;
      return { daily, monthly, totalConcluidas, totalFaltas, totalReposicao, totalExperimental, total: profSchedules.length };
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
  const showAnexosStudentFiles = useMemo(
    () => attachments.filter(a => a.studentId === showAnexosId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [attachments, showAnexosId]
  );

  const handleAttachmentUpload = async (file) => {
    if (!showAnexosStudent || !file || !firebaseUser || attachmentUploading) return;
    setAttachmentUploading(true);
    setAttachmentError('');
    try {
      const safeName = `${Date.now()}-${file.name}`.replace(/\s+/g, '_');
      const storagePath = `artifacts/${appId}/attachments/${showAnexosStudent.id}/${safeName}`;
      const storageRef = ref(storage, storagePath);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tempo limite excedido no upload do anexo.')), 30000);
      });
      await Promise.race([uploadBytes(storageRef, file), timeoutPromise]);
      const url = await Promise.race([getDownloadURL(storageRef), timeoutPromise]);
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'attachments'), {
        studentId: showAnexosStudent.id,
        studentName: showAnexosStudent.name,
        fileName: file.name,
        fileType: file.type || 'desconhecido',
        fileSize: file.size || 0,
        url,
        createdBy: user?.name || 'Sistema',
        timestamp: new Date().toISOString()
      });
      await createLog(`Adicionou anexo para ${showAnexosStudent.name}: ${file.name}`);
    } catch (err) {
      console.error(err);
      setAttachmentError(err?.message || 'Não foi possível enviar o anexo.');
    } finally {
      setAttachmentUploading(false);
    }
  };

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
            // BLOCO 2/3 — src/App.jsx (linhas 421–840)
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
                          const slots = schedules.filter(s => s.day === day && s.hour === hour && !['bloqueado', 'bloqueado_parcial'].includes(s.status));
                          const blocked = schedules.find(s => s.day === day && s.hour === hour && s.status === 'bloqueado');
                          const blockedSlots = getBlockedSlots(day, hour);
                          return (
                            <td key={day} className="p-1 align-top">
                              <div className="space-y-1">
                                {blocked && <div className="bg-slate-700 rounded-lg px-2 py-1 text-[9px] font-black text-slate-300 flex items-center gap-1"><Lock size={8}/>Bloqueado</div>}
                                {!blocked && blockedSlots > 0 && <div className="bg-slate-600 rounded-lg px-2 py-1 text-[9px] font-black text-slate-200 flex items-center gap-1"><Lock size={8}/>{blockedSlots} vaga(s) bloqueada(s)</div>}
                                {slots.map(s => {
                                  const theme = STATUS_THEME[s.status] || STATUS_THEME.pendente;
                                  return (
                                    <div key={s.id} className={`${theme.bg} rounded-lg px-2 py-1 text-[9px] font-black text-white truncate max-w-[90px]`} title={s.name}>
                                      {s.name}
                                    </div>
                                  );
                                })}
                                {!blocked && slots.length < (3 - blockedSlots) && user.role === 'admin' && (
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
                          const slots = schedules.filter(s => s.day === day && s.hour === hour && !['bloqueado', 'bloqueado_parcial'].includes(s.status));
                          const blocked = schedules.find(s => s.day === day && s.hour === hour && s.status === 'bloqueado');
                          const blockedSlots = getBlockedSlots(day, hour);
                          return (
                            <td key={day} className="p-1 align-top">
                              <div className="space-y-1">
                                {blocked && <div className="bg-slate-700 rounded-lg px-2 py-1 text-[9px] font-black text-slate-300 flex items-center gap-1"><Lock size={8}/>Bloqueado</div>}
                                {!blocked && blockedSlots > 0 && <div className="bg-slate-600 rounded-lg px-2 py-1 text-[9px] font-black text-slate-200 flex items-center gap-1"><Lock size={8}/>{blockedSlots} vaga(s) bloqueada(s)</div>}
                                {slots.map(s => {
                                  const theme = STATUS_THEME[s.status] || STATUS_THEME.pendente;
                                  return (
                                    <div key={s.id} className={`${theme.bg} rounded-lg px-2 py-1 text-[9px] font-black text-white truncate max-w-[90px]`} title={s.name}>
                                      {s.name}
                                    </div>
                                  );
                                })}
                                {!blocked && slots.length < (3 - blockedSlots) && user.role === 'admin' && (
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
                  {activeTurno === 'manha' ? `Manhã — Fisioterapeuta: ${TURNO_MANHA_PROF}` : `Tarde — Fisioterapeuta: ${TURNO_TARDE_PROF}`}
                </div>

                {activeHours.map(hour => {
                  const daySchedules = schedules.filter(s => s.day === selectedDay && s.hour === hour);
                  const blocked = daySchedules.find(s => s.status === 'bloqueado');
                  const partialBlock = daySchedules.find(s => s.status === 'bloqueado_parcial');
                  const blockedSlots = partialBlock?.blockedSlots || 0;
                  const capacity = Math.max(0, 3 - blockedSlots);
                  const realSlots = daySchedules.filter(s => !['bloqueado', 'bloqueado_parcial'].includes(s.status));
                  const userScheduled = user.role !== 'admin' && realSlots.find(s => s.studentId === user.id);

                  return (
                    <div key={hour} className="flex gap-3 items-start">
                      <div className={`w-16 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 ${activeTurno === 'manha' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
                        <span className={`font-black text-sm ${activeTurno === 'manha' ? 'text-amber-400' : 'text-blue-400'}`}>{hour}</span>
                        <span className="text-[8px] font-bold text-gray-600">{realSlots.length}/{capacity}</span>
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
                        {!blocked && blockedSlots > 0 && (
                          <div className="flex items-center gap-2 bg-slate-600/60 border border-slate-500 px-4 py-3 rounded-2xl">
                            <Lock size={14} className="text-slate-300"/>
                            <span className="text-[10px] font-black text-slate-200 uppercase">{blockedSlots} vaga(s) bloqueada(s)</span>
                          </div>
                        )}

                        {/* Slots reais */}
                        {!blocked && realSlots.map(s => {
                          const theme = STATUS_THEME[s.status] || STATUS_THEME.pendente;
                          const isMine = s.studentId === user.id;
                          if (user.role !== 'admin' && !isMine) return null;
                          return (
                            <div key={s.id} className={`relative group ${theme.bg} border ${theme.border} px-4 py-3 rounded-2xl min-w-[120px]`}>
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

                        {/* Controles admin */}
                        {!blocked && user.role === 'admin' && (
                          <div className="flex gap-2">
                            {realSlots.length < capacity && <button onClick={() => setShowScheduleModal({ hour })} className="w-14 h-14 rounded-2xl border border-dashed border-white/10 flex items-center justify-center text-gray-700 hover:text-emerald-500 hover:border-emerald-500/30 transition-all"><Plus size={18}/></button>}
                            <button onClick={() => handleToggleBlock(hour, selectedDay)} title="Bloquear horário" className="w-14 h-14 rounded-2xl border border-dashed border-slate-700 flex items-center justify-center text-slate-700 hover:text-slate-400 hover:border-slate-500 transition-all"><Lock size={16}/></button>
                            <button onClick={() => handleSetPartialBlock(hour, selectedDay, blockedSlots === 1 ? 0 : 1)} title="Bloquear 1 vaga" className="px-3 h-14 rounded-2xl border border-dashed border-slate-700 text-[10px] font-black text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all">B1</button>
                            <button onClick={() => handleSetPartialBlock(hour, selectedDay, blockedSlots === 2 ? 0 : 2)} title="Bloquear 2 vagas" className="px-3 h-14 rounded-2xl border border-dashed border-slate-700 text-[10px] font-black text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all">B2</button>
                          </div>
                        )}

                        {/* Reposição (aluno) */}
                        {!blocked && user.role !== 'admin' && !userScheduled && realSlots.length < capacity && (user.credits || 0) > 0 && (
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

            {/* Sub-abas */}
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
            // BLOCO 3/3 — src/App.jsx (linhas 841–1235)
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

      {/* ===== MODAL PRONTUÁRIO ===== */}
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

      {/* ===== MODAL ANEXOS ===== */}
      {showAnexosStudent && user.role === 'admin' && (
        <Modal title={`Anexos — ${showAnexosStudent.name}`} onClose={() => setShowAnexosId(null)} size="lg">
          <div className="bg-[#0a0c10] rounded-2xl p-5 mb-6 border border-white/5">
            <p className="text-[9px] font-black uppercase text-sky-400 mb-3">Adicionar novo arquivo</p>
            <label className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl border border-dashed border-sky-500/30 text-sky-400 hover:bg-sky-500/10 cursor-pointer transition-all text-[10px] font-black uppercase">
              <ImagePlus size={14}/> {attachmentUploading ? 'Enviando...' : 'Selecionar arquivo'}
              <input
                type="file"
                className="hidden"
                disabled={attachmentUploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  await handleAttachmentUpload(file);
                  e.target.value = '';
                }}
              />
            </label>
            {attachmentError && (
              <p className="mt-3 text-[9px] font-black uppercase text-rose-400">{attachmentError}</p>
            )}
          </div>

          <div className="space-y-3">
            {showAnexosStudentFiles.map(file => (
              <div key={file.id} className="bg-[#11141a] p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-white truncate">{file.fileName}</p>
                  <p className="text-[8px] font-bold text-gray-500 uppercase">
                    {file.fileType} • {(file.fileSize / 1024).toFixed(1)} KB • {new Date(file.timestamp).toLocaleString()}
                  </p>
                </div>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 flex items-center gap-1 py-2 px-3 rounded-xl bg-white/5 text-gray-300 hover:bg-sky-500/20 hover:text-sky-300 transition-all text-[9px] font-black uppercase"
                >
                  <Download size={12}/> Abrir
                </a>
              </div>
            ))}
            {showAnexosStudentFiles.length === 0 && (
              <p className="text-center text-gray-600 text-[10px] font-black uppercase py-8">Nenhum anexo registrado</p>
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
        <div className="bg-[#11141a] p-6 rounded-3xl border border-white/5">
          <p className="text-[9px] font-black uppercase text-gray-600 mb-2">Reposições</p>
          <p className="text-4xl font-black text-purple-400 tracking-tighter">{data.totalReposicao}</p>
        </div>
        <div className="bg-[#11141a] p-6 rounded-3xl border border-white/5">
          <p className="text-[9px] font-black uppercase text-gray-600 mb-2">Experimentais</p>
          <p className="text-4xl font-black text-amber-400 tracking-tighter">{data.totalExperimental}</p>
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