import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, LogOut, Plus, X, CheckCircle2, AlertCircle, Clock, RotateCcw,
  Users, Mail, Phone, FlaskConical, Trash2, FileText, History, BarChart3,
  CalendarX, UserPlus, Fingerprint, MinusCircle, Edit3, Save, ArrowRight,
  ShieldCheck, Zap, CalendarDays, Home, Cake, Lock, Unlock, Sun, Moon,
  AlertTriangle, BookOpen, Paperclip, Download
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

// ─── FIREBASE ────────────────────────────────────────────────────────────────
const FB_CONFIG = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : { apiKey:"AIzaSyBs65ZgCmJpXPjAqK-tOqF6HE2FqTT65UM", authDomain:"fisiobalm-26532.firebaseapp.com",
      projectId:"fisiobalm-26532", storageBucket:"fisiobalm-26532.firebasestorage.app",
      messagingSenderId:"498080566980", appId:"1:498080566980:web:07c3ca7fe7869b4aab8391" };

const fbApp = getApps().length ? getApp() : initializeApp(FB_CONFIG);
const auth  = getAuth(fbApp);
const db    = getFirestore(fbApp);
const APP_ID = (() => { try { return typeof __app_id !== 'undefined' ? __app_id : 'fisiobalm-v1'; } catch { return 'fisiobalm-v1'; } })();

// ─── Caminhos Firestore centralizados num único lugar ────────────────────────
// Todos os dados ficam em: fisiobalm/{APP_ID}/
// Subcolecções: students, schedules, logs, evolutions, anexos
const C = {
  students:   () => collection(db, 'fisiobalm', APP_ID, 'students'),
  schedules:  () => collection(db, 'fisiobalm', APP_ID, 'schedules'),
  logs:       () => collection(db, 'fisiobalm', APP_ID, 'logs'),
  evolutions: () => collection(db, 'fisiobalm', APP_ID, 'evolutions'),
  anexos:     () => collection(db, 'fisiobalm', APP_ID, 'anexos'),
  student:    id => doc(db, 'fisiobalm', APP_ID, 'students',   id),
  schedule:   id => doc(db, 'fisiobalm', APP_ID, 'schedules',  id),
  log:        id => doc(db, 'fisiobalm', APP_ID, 'logs',       id),
  evolution:  id => doc(db, 'fisiobalm', APP_ID, 'evolutions', id),
  anexo:      id => doc(db, 'fisiobalm', APP_ID, 'anexos',     id),
};

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const DAYS        = ['Segunda','Terça','Quarta','Quinta','Sexta'];
const HOURS_M     = ['07:00','08:00','09:00','10:00','11:00','12:00'];
const HOURS_T     = ['15:00','16:00','17:00','18:00','19:00','20:00'];
const ALL_HOURS   = [...HOURS_M, ...HOURS_T];
const PLANOS      = ['Mensal','Trimestral','Semestral'];
const FREQS       = [{label:'1x por semana',value:1},{label:'2x por semana',value:2},{label:'3x por semana',value:3}];
const PROF_MANHA  = 'Andriele Barbosa Lopes';
const PROF_TARDE  = 'Jessica Rodrigues Ribeiro';

// CPFs dos admins — comparação feita só no cliente, Firebase Auth anônimo para leitura
const ADMINS = [
  {cpf:'08439510446', name:'Anderson Macena',           role:'admin'},
  {cpf:'12582241601', name:'Jessica Rodrigues Ribeiro', role:'admin'},
  {cpf:'04712284196', name:'Andriele Barbosa Lopes',    role:'admin'},
  {cpf:'68930925120', name:'Mariana Soares Muniz',      role:'admin'},
];

const ST = {
  pendente:            {bg:'bg-gray-600',     border:'border-gray-500',    label:'Agendado'},
  concluida:           {bg:'bg-emerald-600',  border:'border-emerald-500', label:'Presença'},
  falta:               {bg:'bg-rose-600',     border:'border-rose-500',    label:'Falta'},
  desmarcado:          {bg:'bg-orange-500',   border:'border-orange-400',  label:'Desmarcado'},
  desmarcado_atrasado: {bg:'bg-rose-800',     border:'border-rose-600',    label:'Desmarcado s/ aviso'},
  reposicao:           {bg:'bg-purple-600',   border:'border-purple-500',  label:'Reposição'},
  experimental:        {bg:'bg-amber-500',    border:'border-amber-400',   label:'Experimental'},
  bloqueado:           {bg:'bg-slate-700',    border:'border-slate-600',   label:'Bloqueado'},
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const isManha = h => HOURS_M.includes(h);

const daysUntilEnd = end => {
  if (!end) return null;
  const a = new Date(); a.setHours(0,0,0,0);
  const b = new Date(end); b.setHours(0,0,0,0);
  return Math.round((b-a)/(864e5));
};

const dateForDay = name => {
  const map = {Segunda:0,Terça:1,Quarta:2,Quinta:3,Sexta:4};
  const offset = map[name];
  if(offset === undefined) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  const dow = today.getDay(); // 0=dom,1=seg,...,6=sab
  // Se for sábado(6) ou domingo(0), mostra a PRÓXIMA semana
  const daysToMon = dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow;
  const mon = new Date(today); mon.setDate(today.getDate() + daysToMon);
  const target = new Date(mon); target.setDate(mon.getDate() + offset);
  return target.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
};

const ts = () => new Date().toISOString();

// ── Validação de CPF (algoritmo oficial brasileiro) ───────────────────────────
const validarCPF = cpf => {
  const n = cpf.replace(/\D/g,'');
  if(n.length!==11||/^(\d)\1+$/.test(n)) return false;
  const calc = (len) => {
    let s=0;
    for(let i=0;i<len;i++) s+=parseInt(n[i])*(len+1-i);
    const r=(s*10)%11;
    return r===10||r===11?0:r;
  };
  return calc(9)===parseInt(n[9])&&calc(10)===parseInt(n[10]);
};

// ── Chave da semana ATUAL (ex: "2025-W20") ────────────────────────────────────
const getCurrentWeekKey = () => {
  const d = new Date(); d.setHours(0,0,0,0);
  const dow = d.getDay();
  // Recua para a segunda-feira da semana atual
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diffToMon);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 864e5 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2,'0')}`;
};

// ── Chave da PRÓXIMA semana (ex: "2025-W21") ──────────────────────────────────
const getWeekKey = () => {
  // Calcula a segunda-feira da PRÓXIMA semana
  const d = new Date(); d.setHours(0,0,0,0);
  const dow = d.getDay();
  // Avança para a próxima segunda-feira
  const daysToNextMon = dow === 0 ? 1 : 8 - dow;
  d.setDate(d.getDate() + daysToNextMon);
  // Calcula número da semana ISO da próxima segunda
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 864e5 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2,'0')}`;
};

// ── Segunda-feira da próxima semana ──────────────────────────────────────────
const getNextWeekMonday = () => {
  const d = new Date(); d.setHours(0,0,0,0);
  const dow = d.getDay();
  const daysToNextMon = dow === 0 ? 1 : 8 - dow;
  d.setDate(d.getDate() + daysToNextMon);
  return d;
};

// ─── COMPONENTES ATÔMICOS ────────────────────────────────────────────────────
const NavItem = ({active,icon,label,onClick}) => (
  <button onClick={onClick} className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-3 px-3 lg:px-6 py-2 lg:py-4 rounded-2xl transition-all whitespace-nowrap ${active?'bg-emerald-500 text-black font-black shadow-sm':'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
    {icon}<span className="text-[8px] lg:text-[10px] uppercase font-black">{label}</span>
  </button>
);

const StatCard = ({label,value,color,icon,onClick}) => (
  <div onClick={onClick} className={`bg-white p-6 lg:p-8 rounded-[2.5rem] border border-gray-200 shadow-sm relative overflow-hidden group transition-all ${onClick?'cursor-pointer hover:shadow-md hover:border-emerald-300 active:scale-95':''}`}>
    <div className="absolute top-4 right-4 text-gray-100 group-hover:text-gray-200 transition-all">{icon}</div>
    <p className="text-[9px] font-black uppercase text-gray-400 mb-3">{label}</p>
    <p className={`text-4xl lg:text-5xl font-black ${color} tracking-tighter`}>{value}</p>
    {onClick && <p className="text-[8px] text-gray-300 font-black uppercase mt-2">Clique para ver detalhes</p>}
  </div>
);

const StatMetric = ({label,value,color,highlight}) => (
  <div className={`text-center px-3 py-2 rounded-2xl ${highlight?'bg-gray-100':''}`}>
    <p className="text-[8px] font-black text-gray-400 uppercase mb-1">{label}</p>
    <p className={`text-base font-black ${color}`}>{value}</p>
  </div>
);

const InputGroup = ({label,type='text',value,onChange,required=false}) => (
  <div className="space-y-1">
    <label className="text-[9px] font-black uppercase text-gray-500 ml-1">{label}</label>
    <input type={type} className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-sm text-gray-900 outline-none focus:border-emerald-400 transition-all shadow-sm" value={value||''} onChange={e=>onChange(e.target.value)} required={required}/>
  </div>
);

const DetailItem = ({icon,label,value}) => (
  <div>
    <div className="flex items-center gap-2 text-emerald-600 mb-1 text-[9px] font-black uppercase">{icon}<p>{label}</p></div>
    <p className="text-gray-900 text-[11px] leading-tight font-bold">{value||'---'}</p>
  </div>
);

const Modal = ({title,children,onClose,size='md'}) => {
  const w = {sm:'max-w-md',md:'max-w-2xl',lg:'max-w-3xl',xl:'max-w-5xl'};
  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-start justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className={`bg-[#f0ede8] w-full ${w[size]} rounded-[2.5rem] p-6 lg:p-10 border border-gray-200 shadow-2xl my-4`}>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl lg:text-2xl font-black italic uppercase text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 p-2 transition-all"><X size={24}/></button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ─── DRILL-DOWN LIST (reutilizado em Geral e Profissionais) ───────────────────
const DrillList = ({items}) => (
  items.length === 0
    ? <p className="text-center text-gray-400 text-[10px] font-black uppercase py-12">Nenhum registro</p>
    : <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {items.map(s => {
          const t = ST[s.status]||ST.pendente;
          return (
            <div key={s.id} className="bg-white border border-gray-200 rounded-2xl px-5 py-3 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-sm font-black text-gray-900 uppercase">{s.name}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase">{s.day} • {s.hour} • {t.label}</p>
              </div>
              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg text-white ${t.bg}`}>{t.label}</span>
            </div>
          );
        })}
      </div>
);

// ─── PROF DASHBOARD ───────────────────────────────────────────────────────────
const ProfDashboard = ({name,turno,turnoColor,data,onDrill}) => {
  const C2 = {
    amber:{border:'border-amber-500/20',text:'text-amber-600',badge:'bg-amber-500 text-black'},
    blue: {border:'border-blue-500/20', text:'text-blue-600', badge:'bg-blue-500 text-white'},
  }[turnoColor];
  const Tile = ({label,value,color,list,cls=''}) => (
    <div onClick={()=>onDrill(label,list)} className={`bg-white p-5 rounded-3xl border border-gray-200 shadow-sm cursor-pointer hover:shadow-md hover:border-emerald-300 active:scale-95 transition-all ${cls}`}>
      <p className="text-[9px] font-black uppercase text-gray-400 mb-2">{label}</p>
      <p className={`text-4xl font-black ${color} tracking-tighter`}>{value}</p>
      <p className="text-[8px] text-gray-300 font-black uppercase mt-1">Ver detalhes</p>
    </div>
  );
  return (
    <div className="space-y-6">
      <div className={`bg-white border ${C2.border} rounded-3xl p-6 flex items-center gap-4 shadow-sm`}>
        <div className={`${C2.badge} px-4 py-2 rounded-2xl font-black text-[10px] uppercase`}>{turno}</div>
        <div>
          <h3 className="font-black text-gray-900 italic text-lg uppercase">{name}</h3>
          <p className="text-[9px] text-gray-500 font-black uppercase">Fisioterapeuta — Turno da {turno}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[['Atend. Hoje',data.daily,C2.text,data.dailyList],['Atend. Mensal',data.monthly,C2.text,data.monthlyList]].map(([l,v,c,ls])=>(
          <div key={l} onClick={()=>onDrill(l,ls)} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm cursor-pointer hover:shadow-md hover:border-emerald-300 active:scale-95 transition-all">
            <p className="text-[9px] font-black uppercase text-gray-400 mb-2">{l}</p>
            <p className={`text-5xl font-black ${c} tracking-tighter`}>{v}</p>
            <p className="text-[8px] text-gray-300 font-black uppercase mt-1">Ver detalhes</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Tile label="Presenças"    value={data.totalConcluidas}  color="text-emerald-600" list={data.concluidaList}/>
        <Tile label="Faltas"       value={data.totalFaltas}      color="text-rose-600"    list={data.faltaList}/>
        <Tile label="Desmarcações" value={data.totalDesmarcados} color="text-orange-600"  list={data.desmarcList}/>
        <Tile label="Reposições"   value={data.totalReposicao}   color="text-purple-600"  list={data.reposicaoList} cls="border-purple-200"/>
        <Tile label="Experimentais"value={data.totalExperimental}color="text-amber-600"   list={data.experList}     cls="border-amber-200"/>
        <Tile label="Total Sessões"value={data.total}            color={C2.text}          list={data.allList}/>
      </div>
    </div>
  );
};

// ─── MODAL ANEXOS ─────────────────────────────────────────────────────────────
const AnexosModal = ({student,onClose,userName,createLog}) => {
  const [anexos,setAnexos]   = React.useState([]);
  const [uploading,setUpl]   = React.useState(false);
  const [preview,setPreview] = React.useState(null);
  const ref = React.useRef(null);

  React.useEffect(()=>{
    return onSnapshot(C.anexos(), snap=>{
      setAnexos(snap.docs.map(d=>({id:d.id,...d.data()}))
        .filter(a=>a.studentId===student.id)
        .sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)));
    });
  },[student.id]);

  const upload = async e=>{
    const file = e.target.files[0]; if(!file) return;
    if(file.size>2*1024*1024){alert('Máximo 2MB.');return;}
    setUpl(true);
    try{
      const b64 = await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});
      await addDoc(C.anexos(),{studentId:student.id,fileName:file.name,fileType:file.type,fileSize:file.size,data:b64,uploadedBy:userName,timestamp:ts()});
      await createLog(`Adicionou anexo "${file.name}" para ${student.name}`);
    }catch(err){console.error(err);alert('Erro ao enviar.');}
    finally{setUpl(false);e.target.value='';}
  };

  const remove = async (id,name)=>{
    if(!confirm(`Remover "${name}"?`)) return;
    await deleteDoc(C.anexo(id));
    await createLog(`Removeu anexo "${name}" de ${student.name}`);
  };

  const fmtSize = b => b<1024?`${b}B`:b<1048576?`${(b/1024).toFixed(1)}KB`:`${(b/1048576).toFixed(1)}MB`;

  return(
    <>
      <div className="fixed inset-0 bg-black/60 z-[200] flex items-start justify-center p-4 backdrop-blur-sm overflow-y-auto">
        <div className="bg-[#f0ede8] w-full max-w-2xl rounded-[2.5rem] p-6 lg:p-10 border border-gray-200 shadow-2xl my-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-black italic uppercase text-gray-900">Anexos</h2>
              <p className="text-[9px] text-gray-500 font-black uppercase mt-1">{student.name}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-900 p-2"><X size={24}/></button>
          </div>
          <div onClick={()=>ref.current?.click()} className="border-2 border-dashed border-sky-400 bg-sky-50 rounded-3xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:bg-sky-100 transition-all mb-6">
            <Paperclip size={28} className="text-sky-600"/>
            <p className="text-[11px] font-black uppercase text-sky-700">{uploading?'Enviando...':'Clique para anexar'}</p>
            <p className="text-[9px] text-gray-500 font-bold">Imagens, PDF, DOC • Máx. 2MB</p>
            <input ref={ref} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={upload} disabled={uploading}/>
          </div>
          {anexos.length===0&&!uploading&&<p className="text-center text-gray-400 text-[10px] font-black uppercase py-8">Nenhum anexo ainda</p>}
          <div className="space-y-3">
            {anexos.map(a=>(
              <div key={a.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 group shadow-sm">
                {a.fileType?.startsWith('image/')
                  ?<img src={a.data} alt={a.fileName} className="w-12 h-12 rounded-xl object-cover shrink-0 cursor-pointer border border-gray-200" onClick={()=>setPreview(a)}/>
                  :<div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0"><FileText size={20} className="text-gray-500"/></div>}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-gray-900 truncate">{a.fileName}</p>
                  <p className="text-[8px] text-gray-400 font-bold uppercase">{fmtSize(a.fileSize)} • {new Date(a.timestamp).toLocaleDateString()} • {a.uploadedBy}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a href={a.data} download={a.fileName} className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-sky-100 hover:text-sky-700 transition-all border border-gray-200"><Download size={14}/></a>
                  <button onClick={()=>remove(a.id,a.fileName)} className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-rose-100 hover:text-rose-700 transition-all opacity-0 group-hover:opacity-100 border border-gray-200"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {preview&&(
        <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4" onClick={()=>setPreview(null)}>
          <div className="relative max-w-3xl w-full">
            <button onClick={()=>setPreview(null)} className="absolute -top-10 right-0 text-gray-300 hover:text-white"><X size={24}/></button>
            <img src={preview.data} alt={preview.fileName} className="w-full rounded-3xl shadow-2xl"/>
            <p className="text-center text-gray-400 text-[10px] font-black uppercase mt-3">{preview.fileName}</p>
          </div>
        </div>
      )}
    </>
  );
};

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App() {
  // State
  const [user,setUser]                 = useState(null);
  const [fbUser,setFbUser]             = useState(null);
  const [activeTab,setActiveTab]       = useState('agenda');
  const [selectedDay,setSelectedDay]   = useState('Segunda');
  const [activeTurno,setActiveTurno]   = useState('manha');
  const [schedules,setSchedules]       = useState([]);
  const [students,setStudents]         = useState([]);
  const [logs,setLogs]                 = useState([]);
  const [evolutions,setEvolutions]     = useState([]);
  const [loginCpf,setLoginCpf]         = useState('');
  const [loginError,setLoginError]     = useState('');
  const [loading,setLoading]           = useState(true);
  const [isLoggingIn,setIsLoggingIn]   = useState(false);
  const [searchTerm,setSearchTerm]     = useState('');
  const [newEvolution,setNewEvolution] = useState('');
  const [isSubmitting,setIsSubmitting] = useState(false);
  const [alunosSubTab,setAlunosSubTab] = useState('todos');
  const [dashSubTab,setDashSubTab]     = useState('geral');
  const [dashDrill,setDashDrill]       = useState(null);

  // Modal IDs
  const [addStudent,setAddStudent]         = useState(false);
  const [editStudent,setEditStudent]       = useState(null);
  const [detailsId,setDetailsId]           = useState(null);
  const [prontuarioId,setProntuarioId]     = useState(null);
  const [anexosId,setAnexosId]             = useState(null);
  const [scheduleModal,setScheduleModal]   = useState(null);
  const [scheduleForm,setScheduleForm]     = useState({studentId:'',manualName:'',status:'pendente'});

  const [newStudent,setNewStudent] = useState({
    name:'',cpf:'',birthDate:'',email:'',address:'',plan:'Mensal',
    frequency:1,phone:'',startDate:'',endDate:'',
    fixedSchedules:[{day:'Segunda',hour:'07:00'}],credits:0
  });

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(()=>{
    const init = async ()=>{
      try{
        const tok=(()=>{try{return typeof __initial_auth_token!=='undefined'?__initial_auth_token:null;}catch{return null;}})();
        if(tok) await signInWithCustomToken(auth,tok); else await signInAnonymously(auth);
      }catch(e){console.error(e);try{await signInAnonymously(auth);}catch(e2){console.error(e2);}}
      finally{setLoading(false);}
    };
    init();
    return onAuthStateChanged(auth,u=>setFbUser(u));
  },[]);

  // ── Firestore listeners ──────────────────────────────────────────────────────
  useEffect(()=>{
    if(!fbUser) return;
    const unsubSched = onSnapshot(C.schedules(), snap=>setSchedules(snap.docs.map(d=>({id:d.id,...d.data()}))), console.error);
    const unsubStud  = onSnapshot(C.students(),  snap=>{
      const data = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.name.localeCompare(b.name));
      setStudents(data);
      if(user&&user.role!=='admin'){const u=data.find(s=>s.id===user.id);if(u)setUser(p=>({...p,...u}));}
    }, console.error);
    const unsubLogs  = onSnapshot(C.logs(),  snap=>setLogs(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).slice(0,80)), console.error);
    const unsubEvol  = onSnapshot(C.evolutions(), snap=>setEvolutions(snap.docs.map(d=>({id:d.id,...d.data()}))), console.error);
    return ()=>{unsubSched();unsubStud();unsubLogs();unsubEvol();};
  },[fbUser,user?.id]);

  // ── Expiração automática ─────────────────────────────────────────────────────
  useEffect(()=>{
    if(!fbUser||!user||user.role!=='admin') return;
    students.forEach(async s=>{
      const days = daysUntilEnd(s.endDate);
      // Aviso 3 dias antes
      if(days!==null&&days>=0&&days<=3){
        const key=`warn_${s.id}_${s.endDate}`;
        if(!logs.some(l=>l.logKey===key))
          await addDoc(C.logs(),{action:`⚠️ Plano de ${s.name} acaba em ${days===0?'hoje':`${days}d`}!`,user:'Sistema',timestamp:ts(),logKey:key,type:'expiry_warning'}).catch(console.error);
      }
      // Remove agendamentos ao expirar
      if(days!==null&&days<0){
        const key=`rm_${s.id}_${s.endDate}`;
        if(!logs.some(l=>l.logKey===key)){
          const toRm=schedules.filter(sc=>sc.studentId===s.id&&(sc.status==='pendente'||sc.status==='reposicao'));
          for(const sc of toRm) await deleteDoc(C.schedule(sc.id)).catch(console.error);
          await addDoc(C.logs(),{
            action:toRm.length>0?`🔴 Plano de ${s.name} expirou — ${toRm.length} agendamento(s) removido(s).`:`🔴 Plano de ${s.name} expirou.`,
            user:'Sistema',timestamp:ts(),logKey:key,type:'expiry_removed'
          }).catch(console.error);
        }
      }
    });
  },[students,schedules,fbUser]);

  // ── Gestão semanal da agenda ─────────────────────────────────────────────────
  // Roda sempre que schedules, students ou logs mudam (quando admin está logado).
  // Lógica:
  //   1. Apaga TODOS os schedules de semanas anteriores (fixos ou não)
  //   2. Se a semana atual ainda não tem aulas fixas criadas, cria todas com status "pendente"
  // Resultado: Anderson faltou semana passada? Na segunda seguinte aparece "Agendado" limpo.
  useEffect(()=>{
    if(!fbUser||!user||user.role!=='admin') return;
    if(!students.length||!schedules.length&&!logs.length) return;

    const currentKey = getCurrentWeekKey();
    const dayMap = {Segunda:0,Terça:1,Quarta:2,Quinta:3,Sexta:4};

    // Segunda-feira da semana ATUAL
    const getThisWeekMonday = ()=>{
      const d = new Date(); d.setHours(0,0,0,0);
      const dow = d.getDay();
      const diff = dow===0 ? -6 : 1-dow;
      d.setDate(d.getDate()+diff);
      return d;
    };

    const manage = async ()=>{
      // ── PASSO 1: Apaga TUDO de semanas anteriores ──────────────────────────
      // Inclui fixas com status "falta", "concluida" etc — já foram registradas,
      // não devem aparecer na nova semana.
      const oldSchedules = schedules.filter(sc=>{
        if(!sc.weekKey) return false;          // sem weekKey = antigo, ignora
        return sc.weekKey < currentKey;        // de semana anterior
      });
      for(const sc of oldSchedules){
        await deleteDoc(C.schedule(sc.id)).catch(console.error);
      }

      // ── PASSO 2: Cria aulas fixas da semana atual se ainda não existem ─────
      const renewKey = `weekly_${currentKey}`;
      const alreadyCreated = logs.some(l=>l.logKey===renewKey);
      if(alreadyCreated) return;

      const thisMonday = getThisWeekMonday();
      const active = students.filter(s=>{ const d=daysUntilEnd(s.endDate); return d===null||d>=0; });
      let count=0;

      for(const s of active){
        for(const fs of (s.fixedSchedules||[])){
          const offset = dayMap[fs.day]??0;
          const aulaDate = new Date(thisMonday);
          aulaDate.setDate(thisMonday.getDate()+offset);
          const dateStr = aulaDate.toISOString().split('T')[0];

          // Evita duplicata (caso o log falhe e rode duas vezes)
          const exists = schedules.some(sc=>
            sc.studentId===s.id && sc.day===fs.day &&
            sc.hour===fs.hour  && sc.weekKey===currentKey
          );
          if(!exists){
            await addDoc(C.schedules(),{
              name:s.name, studentId:s.id,
              day:fs.day,  hour:fs.hour,
              status:'pendente',     // sempre começa limpo
              isFixed:true,
              scheduleDate:dateStr,
              weekKey:currentKey,    // chave da semana ATUAL
              createdBy:'Sistema',   createdAt:ts()
            }).catch(console.error);
            count++;
          }
        }
      }

      // Marca como feito no log
      await addDoc(C.logs(),{
        action:`📅 Agenda ${currentKey} criada (${count} aula${count!==1?'s':''}). ${oldSchedules.length>0?`| 🧹 ${oldSchedules.length} registro(s) antigo(s) removido(s).`:''}`,
        user:'Sistema', timestamp:ts(), logKey:renewKey, type:'weekly_renewal'
      }).catch(console.error);
    };

    manage();
  },[students,schedules,logs,fbUser]);

  // ── Renovação da PRÓXIMA semana (sexta/sábado/domingo) ───────────────────────
  // Antecipa a criação das aulas fixas da próxima semana para que no domingo
  // à noite / segunda de manhã a agenda já esteja pronta.
  useEffect(()=>{
    if(!fbUser||!user||user.role!=='admin') return;
    if(!students.length) return;

    const today = new Date(); today.setHours(0,0,0,0);
    const dow = today.getDay();
    if(dow!==5&&dow!==6&&dow!==0) return; // só sex/sáb/dom

    const nextKey    = getWeekKey();
    const nextMonday = getNextWeekMonday();
    const dayMap     = {Segunda:0,Terça:1,Quarta:2,Quinta:3,Sexta:4};
    const logKey     = `weekly_${nextKey}`;
    if(logs.some(l=>l.logKey===logKey)) return; // já criado

    const active = students.filter(s=>{ const d=daysUntilEnd(s.endDate); return d===null||d>=0; });
    if(!active.length) return;

    const create = async ()=>{
      let count=0;
      for(const s of active){
        for(const fs of (s.fixedSchedules||[])){
          const offset = dayMap[fs.day]??0;
          const aulaDate = new Date(nextMonday);
          aulaDate.setDate(nextMonday.getDate()+offset);
          const dateStr = aulaDate.toISOString().split('T')[0];
          const exists = schedules.some(sc=>
            sc.studentId===s.id && sc.day===fs.day &&
            sc.hour===fs.hour  && sc.weekKey===nextKey
          );
          if(!exists){
            await addDoc(C.schedules(),{
              name:s.name, studentId:s.id,
              day:fs.day,  hour:fs.hour,
              status:'pendente', isFixed:true,
              scheduleDate:dateStr, weekKey:nextKey,
              createdBy:'Sistema', createdAt:ts()
            }).catch(console.error);
            count++;
          }
        }
      }
      await addDoc(C.logs(),{
        action:`📅 Agenda ${nextKey} preparada antecipadamente (${count} aula${count!==1?'s':''}).`,
        user:'Sistema', timestamp:ts(), logKey, type:'weekly_renewal'
      }).catch(console.error);
    };
    create();
  },[students,schedules,logs,fbUser]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const log = async (action,extra={})=>{
    if(!fbUser) return;
    await addDoc(C.logs(),{action,user:user?.name||'Sistema',timestamp:ts(),...extra}).catch(console.error);
  };

  const handleLogin = ()=>{
    setIsLoggingIn(true); setLoginError('');
    setTimeout(()=>{
      const cpf = loginCpf.replace(/\D/g,'');
      const adm = ADMINS.find(a=>a.cpf===cpf);
      if(adm){setUser(adm);setActiveTab('agenda');setIsLoggingIn(false);return;}
      const stu = students.find(s=>s.cpf===cpf);
      if(stu){setUser({role:'aluno',...stu});setActiveTab('agenda');setIsLoggingIn(false);}
      else{setLoginError('CPF não identificado.');setIsLoggingIn(false);}
    },800);
  };

  const [cpfError,setCpfError] = useState('');

  const handleAddStudent = async e=>{
    e.preventDefault(); if(isSubmitting||!fbUser) return;
    // Valida CPF antes de salvar
    const cpfLimpo=newStudent.cpf.replace(/\D/g,'');
    if(!validarCPF(cpfLimpo)){setCpfError('CPF inválido. Verifique os números digitados.');return;}
    // Verifica duplicata
    if(students.some(s=>s.cpf===cpfLimpo)){setCpfError('Já existe um aluno cadastrado com esse CPF.');return;}
    setCpfError('');
    setIsSubmitting(true);
    try{
      const freq = FREQS.find(f=>f.value===Number(newStudent.frequency));
      const data = {...newStudent, cpf:cpfLimpo, createdAt:ts(), frequencyLabel:freq?.label||'1x por semana'};
      const ref  = await addDoc(C.students(), data);
      for(const s of newStudent.fixedSchedules)
        await addDoc(C.schedules(),{name:data.name,studentId:ref.id,day:s.day,hour:s.hour,status:'pendente',isFixed:true,createdBy:user.name,createdAt:ts()});
      await log(`Matriculou: ${data.name}`);
      setNewStudent({name:'',cpf:'',birthDate:'',email:'',address:'',plan:'Mensal',frequency:1,phone:'',startDate:'',endDate:'',fixedSchedules:[{day:'Segunda',hour:'07:00'}],credits:0});
      setAddStudent(false);
    }catch(e){console.error(e);}finally{setIsSubmitting(false);}
  };

  const handleEditStudent = async e=>{
    e.preventDefault(); if(!fbUser||!editStudent) return;
    const {id,...data}=editStudent;
    await updateDoc(C.student(id),data);
    await log(`Editou: ${data.name}`);
    setEditStudent(null);
  };

  const handleDeleteStudent = async (e,id,name)=>{
    e.stopPropagation();
    if(!confirm(`Excluir "${name}" permanentemente?`)) return;
    await deleteDoc(C.student(id));
    await log(`Excluiu: ${name}`);
  };

  const handleDesmarcar = async (schedId,hour)=>{
    if(!fbUser||!user) return;
    const now=new Date(); const [h,m]=hour.split(':').map(Number);
    const aula=new Date(); aula.setHours(h,m,0,0);
    const ok=(aula-now)/3.6e6>=4;
    await updateDoc(C.schedule(schedId),{status:ok?'desmarcado':'desmarcado_atrasado'});
    if(ok) await updateDoc(C.student(user.id),{credits:increment(1)});
    await log(ok?`${user.name} desmarcou ${hour} — 1 crédito gerado.`:`${user.name} desmarcou ${hour} — sem crédito.`);
  };

  const handleReposicao = async hour=>{
    if(!user||(user.credits||0)<=0) return;
    await addDoc(C.schedules(),{
      name:user.name, studentId:user.id,
      day:selectedDay, hour,
      status:'reposicao',
      isFixed:false,              // não é aula fixa — uso único
      weekKey:getCurrentWeekKey(), // será limpa ao virar a semana
      createdBy:user.name, createdAt:ts()
    });
    await updateDoc(C.student(user.id),{credits:increment(-1)});
    await log(`${user.name} agendou reposição ${selectedDay} ${hour}`);
  };

  const handleToggleBlock = async (hour,day)=>{
    const ex=schedules.find(s=>s.day===day&&s.hour===hour&&s.status==='bloqueado'&&!s.isSlotBlock);
    if(ex){await deleteDoc(C.schedule(ex.id));await log(`Desbloqueou ${day} ${hour}`);}
    else{await addDoc(C.schedules(),{name:'BLOQUEADO',studentId:null,day,hour,status:'bloqueado',createdBy:user.name,createdAt:ts()});await log(`Bloqueou ${day} ${hour}`);}
  };

  const updateStatus = async (id,status,name)=>{
    await updateDoc(C.schedule(id),{status});
    await log(`Status de ${name} → ${ST[status]?.label}`);
  };
  const delSchedule = async (id,name)=>{await deleteDoc(C.schedule(id));await log(`Removeu agendamento de ${name}`);};
  const adjCredits  = async (sid,sname,amt)=>{await updateDoc(C.student(sid),{credits:increment(amt)});await log(`Créditos de ${sname}: ${amt>0?'+':''}${amt}`);};

  // ── Memos ────────────────────────────────────────────────────────────────────
  const metrics = useMemo(()=>({
    concluidas:schedules.filter(s=>s.status==='concluida').length,
    faltas:schedules.filter(s=>s.status==='falta').length,
    desmarcados:schedules.filter(s=>s.status==='desmarcado'||s.status==='desmarcado_atrasado').length,
    reposicao:schedules.filter(s=>s.status==='reposicao').length,
    experimental:schedules.filter(s=>s.status==='experimental').length,
    pendentes:schedules.filter(s=>s.status==='pendente').length,
    alunos:students.length,
  }),[schedules,students]);

  const metricsByProf = useMemo(()=>{
    const hoje=new Date().toISOString().split('T')[0];
    const mes=hoje.slice(0,7);
    const calc=prof=>{
      const hrs=prof===PROF_MANHA?HOURS_M:HOURS_T;
      const ps=schedules.filter(s=>hrs.includes(s.hour));
      const fl=(fn)=>ps.filter(fn);
      const dailyList=fl(s=>s.createdAt?.startsWith(hoje)&&s.status==='concluida');
      const monthlyList=fl(s=>s.createdAt?.startsWith(mes)&&s.status==='concluida');
      return{
        daily:dailyList.length,dailyList,monthly:monthlyList.length,monthlyList,
        totalConcluidas:(concluidaList=>concluidaList.length)(fl(s=>s.status==='concluida')),
        concluidaList:fl(s=>s.status==='concluida'),
        totalFaltas:(l=>l.length)(fl(s=>s.status==='falta')), faltaList:fl(s=>s.status==='falta'),
        totalReposicao:(l=>l.length)(fl(s=>s.status==='reposicao')), reposicaoList:fl(s=>s.status==='reposicao'),
        totalExperimental:(l=>l.length)(fl(s=>s.status==='experimental')), experList:fl(s=>s.status==='experimental'),
        totalDesmarcados:(l=>l.length)(fl(s=>s.status==='desmarcado'||s.status==='desmarcado_atrasado')),
        desmarcList:fl(s=>s.status==='desmarcado'||s.status==='desmarcado_atrasado'),
        total:ps.length,allList:ps,
      };
    };
    return{andriele:calc(PROF_MANHA),jessica:calc(PROF_TARDE)};
  },[schedules]);

  const userStats = useMemo(()=>{
    if(!user||user.role==='admin') return null;
    const us=schedules.filter(s=>s.studentId===user.id);
    return{
      presencas:us.filter(s=>s.status==='concluida').length,
      faltas:us.filter(s=>s.status==='falta').length,
      desmarcacoes:us.filter(s=>s.status==='desmarcado'||s.status==='desmarcado_atrasado').length,
      creditos:user.credits||0, startDate:user.startDate, endDate:user.endDate,
    };
  },[user,schedules]);

  const detailsStudent  = useMemo(()=>students.find(s=>s.id===detailsId),[students,detailsId]);
  const prontuarioStu   = useMemo(()=>students.find(s=>s.id===prontuarioId),[students,prontuarioId]);
  const anexosStu       = useMemo(()=>students.find(s=>s.id===anexosId),[students,anexosId]);
  const alunosPlanoFim  = useMemo(()=>students.filter(s=>{const d=daysUntilEnd(s.endDate);return d!==null&&d>=0&&d<=3;}),[students]);
  const alunosExpirados = useMemo(()=>students.filter(s=>{const d=daysUntilEnd(s.endDate);return d!==null&&d<0;}),[students]);

  const activeHours = activeTurno==='manha'?HOURS_M:activeTurno==='tarde'?HOURS_T:ALL_HOURS;

  // ── Loading / Login ──────────────────────────────────────────────────────────
  if(loading) return(
    <div className="min-h-screen bg-[#07090c] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"/>
    </div>
  );

  if(!user) return(
    <div className="min-h-screen bg-[#07090c] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full"/>
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full"/>
      <div className="w-full max-w-lg bg-[#11141a]/80 backdrop-blur-2xl rounded-[3.5rem] p-8 lg:p-14 border border-white/5 shadow-2xl relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500 rounded-[2rem] mb-6 shadow-2xl shadow-emerald-500/20"><Zap className="text-black" size={32} strokeWidth={3}/></div>
          <h1 className="text-5xl font-black text-white italic tracking-tighter mb-3">FISIOBALM</h1>
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-8 bg-emerald-500/30"/>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">Gestão de Studio de Pilates</p>
            <div className="h-px w-8 bg-emerald-500/30"/>
          </div>
        </div>
        <div className="space-y-6">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-500 group-focus-within:text-emerald-500 transition-colors"><ShieldCheck size={20}/></div>
            <input type="text" placeholder="Digite seu CPF (apenas números)"
              className="w-full bg-[#1a1f26] border border-white/5 rounded-3xl pl-16 pr-6 py-6 text-white font-mono text-lg outline-none focus:border-emerald-500/50 transition-all placeholder:text-gray-700"
              value={loginCpf} onChange={e=>setLoginCpf(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
          </div>
          {loginError&&<div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3"><AlertCircle size={16} className="text-rose-500"/><p className="text-rose-500 text-[10px] font-black uppercase">{loginError}</p></div>}
          <button onClick={handleLogin} disabled={isLoggingIn||!loginCpf}
            className="w-full bg-emerald-500 text-black font-black py-6 rounded-3xl uppercase tracking-widest hover:bg-emerald-400 active:scale-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale">
            {isLoggingIn?<div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin"/>:<>Acessar Studio<ArrowRight size={20} strokeWidth={3}/></>}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Interface principal ──────────────────────────────────────────────────────
  const isAdmin = user.role==='admin';

  return(
    <div className="min-h-screen bg-[#f0ede8] text-gray-900 pb-24 lg:pb-8 lg:pl-64">

      {/* NAV */}
      <nav className="fixed bottom-0 left-0 right-0 lg:top-0 lg:w-64 lg:h-full bg-white border-t lg:border-r border-gray-200 shadow-sm z-50 flex lg:flex-col gap-1 p-2 lg:p-4">
        <div className="hidden lg:block px-4 py-6 mb-4"><h2 className="text-2xl font-black italic text-emerald-600 tracking-tighter">FISIOBALM</h2></div>
        <div className="flex lg:flex-col gap-1 w-full overflow-x-auto lg:overflow-visible">
          <NavItem active={activeTab==='agenda'}    icon={<Calendar size={18}/>}  label="Agenda"    onClick={()=>setActiveTab('agenda')}/>
          {isAdmin&&<>
            <NavItem active={activeTab==='dashboard'} icon={<BarChart3 size={18}/>} label="Dashboard" onClick={()=>setActiveTab('dashboard')}/>
            <NavItem active={activeTab==='alunos'}    icon={<Users size={18}/>}    label="Alunos"    onClick={()=>setActiveTab('alunos')}/>
            <NavItem active={activeTab==='historico'} icon={<History size={18}/>}  label="Logs"      onClick={()=>setActiveTab('historico')}/>
          </>}
        </div>
        <button onClick={()=>{setUser(null);setLoginCpf('');setLoginError('');}}
          className="flex-shrink-0 flex flex-col lg:flex-row items-center gap-1 lg:gap-3 px-3 lg:px-6 py-2 lg:py-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all lg:mt-auto ml-auto lg:ml-0">
          <LogOut size={18}/><span className="text-[8px] lg:text-[10px] font-black uppercase whitespace-nowrap">Sair</span>
        </button>
      </nav>

      <main className="p-3 lg:p-10 max-w-7xl mx-auto">

        {/* HEADER USUÁRIO */}
        <header className="mb-8">
          <div className="bg-white border border-gray-200 shadow-sm rounded-[2rem] p-4 lg:p-8 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-black font-black text-xl lg:text-2xl">{user.name.charAt(0)}</div>
                <div>
                  <h2 className="text-lg lg:text-2xl font-black uppercase italic tracking-tighter text-gray-900">{user.name}</h2>
                  <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{isAdmin?'Administrador':'Aluno Ativo'}</span>
                </div>
              </div>
              {!isAdmin&&userStats&&(
                <div className="flex flex-wrap gap-3 justify-center">
                  <StatMetric label="Presenças"    value={userStats.presencas}    color="text-emerald-600"/>
                  <StatMetric label="Faltas"       value={userStats.faltas}       color="text-rose-600"/>
                  <StatMetric label="Desmarcações" value={userStats.desmarcacoes} color="text-orange-600"/>
                  <StatMetric label="Créditos"     value={userStats.creditos}     color="text-purple-600" highlight/>
                </div>
              )}
            </div>
            {!isAdmin&&userStats&&(
              <div className="flex flex-wrap gap-4 pt-3 border-t border-gray-100">
                <span className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-2"><CalendarDays size={14}/>Início: <span className="text-gray-900 ml-1">{userStats.startDate?new Date(userStats.startDate).toLocaleDateString():'---'}</span></span>
                <span className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-2"><Clock size={14}/>Fim: <span className="text-emerald-600 ml-1">{userStats.endDate?new Date(userStats.endDate).toLocaleDateString():'---'}</span></span>
              </div>
            )}
          </div>
        </header>

        {/* ── AGENDA ── */}
        {activeTab==='agenda'&&(
          <div>
            {/* Dias */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
              {DAYS.map(day=>(
                <button key={day} onClick={()=>setSelectedDay(day)}
                  className={`px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex flex-col items-center gap-0.5 ${selectedDay===day?'bg-emerald-500 text-black shadow-lg':'bg-white text-gray-500 border border-gray-200 shadow-sm'}`}>
                  <span>{day}</span>
                  <span className={`text-[9px] font-bold ${selectedDay===day?'text-black/70':'text-gray-400'}`}>{dateForDay(day)}</span>
                </button>
              ))}
            </div>

            {/* Turno */}
            <div className="flex gap-2 mb-6">
              {[['manha',<Sun size={14}/>,'Manhã','07–12h','bg-amber-500 text-black','bg-black/10 text-gray-500 border border-black/10'],
                ['tarde',<Moon size={14}/>,'Tarde','15–20h','bg-blue-500 text-white','bg-black/10 text-gray-500 border border-black/10']
              ].map(([k,ic,label,sub,active,inactive])=>(
                <button key={k} onClick={()=>setActiveTurno(k)} className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all ${activeTurno===k?active:inactive}`}>
                  {ic}{label}<span className="opacity-60">{sub}</span>
                </button>
              ))}
              {isAdmin&&<button onClick={()=>setActiveTurno('semana')} className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all ${activeTurno==='semana'?'bg-emerald-500 text-black':'bg-black/10 text-gray-500 border border-black/10'}`}><Calendar size={14}/>Semana</button>}
            </div>

            {/* Badge fisioterapeuta */}
            {activeTurno!=='semana'&&(
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase w-fit mb-4 ${activeTurno==='manha'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700'}`}>
                {activeTurno==='manha'?<Sun size={12}/>:<Moon size={12}/>}
                {activeTurno==='manha'?`Manhã — Fisioterapeuta: ${PROF_MANHA}`:`Tarde — Fisioterapeuta: ${PROF_TARDE}`}
              </div>
            )}

            {/* Visão semanal */}
            {activeTurno==='semana'&&(
              <div className="overflow-x-auto rounded-3xl border border-white/5 bg-[#11141a]">
                <table className="w-full min-w-[700px] text-[10px]">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="p-3 text-left text-gray-500 font-black uppercase w-16 text-[9px]">Hora</th>
                      {DAYS.map(d=>(
                        <th key={d} className="p-3 text-center font-black uppercase">
                          <span className="text-gray-400 text-[9px] block">{d.substring(0,3)}</span>
                          <span className="text-gray-500 text-[8px] font-bold block">{dateForDay(d)}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[['manha',HOURS_M,'text-emerald-500','bg-amber-500/10','text-amber-400','border-amber-500/20',<Sun size={10}/>,'07h às 12h'],
                      ['tarde',HOURS_T,'text-blue-400',   'bg-blue-500/10', 'text-blue-400', 'border-blue-500/20', <Moon size={10}/>,'15h às 20h']
                    ].map(([tid,hrs,hCol,sepBg,sepTxt,sepBorder,icon,range])=>(
                      <React.Fragment key={tid}>
                        <tr><td colSpan={6} className={`${sepBg} py-1 px-4 text-[9px] font-black uppercase ${sepTxt} tracking-widest border-y ${sepBorder}`}>{icon} {tid==='manha'?'Manhã':'Tarde'} — {range}</td></tr>
                        {hrs.map(hour=>(
                          <tr key={hour} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className={`p-2 text-center font-black ${hCol}`}>{hour}</td>
                            {DAYS.map(day=>{
                              const all=schedules.filter(s=>s.day===day&&s.hour===hour);
                              const blocked=all.filter(s=>s.status==='bloqueado');
                              const real=all.filter(s=>s.status!=='bloqueado');
                              const occ=real.length+blocked.length;
                              return(
                                <td key={day} className="p-1 align-top">
                                  <div className="space-y-1">
                                    {blocked.map(b=><div key={b.id} className="bg-slate-700 rounded-lg px-2 py-1 text-[9px] font-black text-slate-300 flex items-center gap-1"><Lock size={8}/>Bloqueada</div>)}
                                    {real.map(s=><div key={s.id} className={`${ST[s.status]?.bg||'bg-gray-600'} rounded-lg px-2 py-1 text-[9px] font-black text-white truncate max-w-[90px]`} title={s.name}>{s.name}</div>)}
                                    {occ<3&&isAdmin&&<button onClick={()=>{setSelectedDay(day);setScheduleModal({hour});}} className="w-full h-5 rounded-lg border border-dashed border-white/10 text-gray-700 hover:text-emerald-500 flex items-center justify-center transition-all"><Plus size={10}/></button>}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Visão por turno */}
            {activeTurno!=='semana'&&(
              <div className="space-y-3">
                {activeHours.map(hour=>{
                  const all=schedules.filter(s=>s.day===selectedDay&&s.hour===hour);
                  const blocked=all.filter(s=>s.status==='bloqueado');
                  const real=all.filter(s=>s.status!=='bloqueado');
                  const total=real.length+blocked.length;
                  const free=3-total;
                  const mine=!isAdmin&&real.find(s=>s.studentId===user.id);
                  return(
                    <div key={hour} className="flex gap-3 items-start">
                      <div className={`w-16 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 ${activeTurno==='manha'?'bg-amber-100 border border-amber-200':'bg-blue-100 border border-blue-200'}`}>
                        <span className={`font-black text-sm ${activeTurno==='manha'?'text-amber-700':'text-blue-700'}`}>{hour}</span>
                        <span className="text-[8px] font-bold text-gray-400">{total}/3</span>
                      </div>
                      <div className="flex-1 flex flex-wrap gap-2 items-start">
                        {/* Slots reais */}
                        {real.map(s=>{
                          const t=ST[s.status]||ST.pendente;
                          const isMe=s.studentId===user.id;
                          if(!isAdmin&&!isMe) return null;
                          return(
                            <div key={s.id} className={`relative group ${t.bg} border ${t.border} px-4 py-3 rounded-2xl min-w-[120px]`}>
                              <span className="block text-[11px] font-black text-white uppercase">{s.name}</span>
                              <span className="text-[8px] font-black uppercase text-white/70">{t.label}</span>
                              {isAdmin&&<div className="mt-2">
                                <select value={s.status} onChange={e=>updateStatus(s.id,e.target.value,s.name)}
                                  className="w-full bg-black/30 border border-white/10 rounded-lg py-1 px-2 text-[8px] font-black uppercase outline-none text-white appearance-none">
                                  {Object.entries(ST).filter(([k])=>k!=='bloqueado').map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                                </select>
                                <button onClick={()=>delSchedule(s.id,s.name)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-white/40 hover:text-rose-400 transition-all"><X size={10}/></button>
                              </div>}
                              {!isAdmin&&isMe&&(s.status==='pendente'||s.status==='reposicao')&&
                                <button onClick={()=>handleDesmarcar(s.id,hour)} className="mt-2 w-full bg-rose-500/20 text-rose-400 py-1 rounded-lg text-[8px] font-black uppercase">Desmarcar</button>}
                            </div>
                          );
                        })}
                        {/* Bloqueadas */}
                        {blocked.map(b=>(
                          <div key={b.id} className="bg-slate-200 border border-slate-300 px-4 py-3 rounded-2xl min-w-[110px] flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {isAdmin?<><Lock size={12} className="text-slate-500"/><span className="text-[10px] font-black text-slate-700 uppercase">Vaga bloqueada</span></>
                                      :<><X size={12} className="text-slate-500"/><span className="text-[10px] font-black text-slate-600 uppercase">Sem vagas</span></>}
                            </div>
                            {isAdmin&&<button onClick={async()=>{await deleteDoc(C.schedule(b.id));await log(`Desbloqueou vaga ${selectedDay} ${hour}`);}} className="flex items-center gap-1 mt-1 text-slate-500 hover:text-emerald-600 text-[8px] font-black uppercase"><Unlock size={10}/>Desbloquear</button>}
                          </div>
                        ))}
                        {/* Botões admin */}
                        {isAdmin&&free>0&&(
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={()=>setScheduleModal({hour})} className="w-14 h-14 rounded-2xl border border-dashed border-gray-300 bg-white flex flex-col items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-400 transition-all gap-0.5 shadow-sm"><Plus size={16}/><span className="text-[7px] font-black uppercase">Agendar</span></button>
                            <button onClick={async()=>{await addDoc(C.schedules(),{name:'VAGA BLOQUEADA',studentId:null,day:selectedDay,hour,status:'bloqueado',isSlotBlock:true,createdBy:user.name,createdAt:ts()});await log(`Bloqueou vaga ${selectedDay} ${hour}`);}} title="Bloquear 1 vaga" className="w-14 h-14 rounded-2xl border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-500 hover:bg-slate-50 transition-all gap-0.5 shadow-sm"><Lock size={13}/><span className="text-[7px] font-black uppercase">+1 vaga</span></button>
                            {free>1&&<button onClick={async()=>{for(let i=0;i<free;i++)await addDoc(C.schedules(),{name:'VAGA BLOQUEADA',studentId:null,day:selectedDay,hour,status:'bloqueado',isSlotBlock:true,createdBy:user.name,createdAt:ts()});await log(`Bloqueou ${free} vagas ${selectedDay} ${hour}`);}} title="Bloquear tudo" className="w-14 h-14 rounded-2xl border border-dashed border-rose-300 bg-white flex flex-col items-center justify-center text-rose-400 hover:text-rose-600 hover:border-rose-500 hover:bg-rose-50 transition-all gap-0.5 shadow-sm"><Lock size={13}/><span className="text-[7px] font-black uppercase">Tudo</span></button>}
                          </div>
                        )}
                        {/* Reposição aluno */}
                        {!isAdmin&&!mine&&free>0&&(user.credits||0)>0&&(
                          <button onClick={()=>handleReposicao(hour)} className="w-14 h-14 rounded-2xl border border-dashed border-purple-500/20 flex flex-col items-center justify-center text-purple-500/40 hover:text-purple-400 hover:border-purple-500/40 transition-all"><RotateCcw size={16} className="mb-1"/><span className="text-[7px] font-black uppercase">Crédito</span></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ALUNOS ── */}
        {activeTab==='alunos'&&isAdmin&&(
          <div>
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
              <h1 className="text-2xl lg:text-3xl font-black uppercase italic text-gray-900">Alunos</h1>
              <div className="flex gap-3 flex-wrap">
                <input type="text" placeholder="Buscar..." className="bg-white border border-gray-200 rounded-2xl px-5 py-3 text-xs w-48 outline-none text-gray-900 shadow-sm" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                <button onClick={()=>setAddStudent(true)} className="bg-emerald-500 text-black px-5 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 shadow-sm"><UserPlus size={16}/>Matricular</button>
              </div>
            </div>
            {/* Sub-abas */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {[['todos','Todos',`(${students.length})`,'bg-gray-900 text-white'],
                ['planoAoFim','Plano ao Fim',`(${alunosPlanoFim.length})`,'bg-rose-500 text-white'],
                ['expirados','Expirados',`(${alunosExpirados.length})`,'bg-red-600 text-white'],
              ].map(([k,label,count,active])=>(
                <button key={k} onClick={()=>setAlunosSubTab(k)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${alunosSubTab===k?active:'bg-white text-gray-500 border border-gray-200 shadow-sm'}`}>
                  {k==='planoAoFim'&&<AlertTriangle size={12}/>}{k==='expirados'&&<AlertCircle size={12}/>}{label} {count}
                </button>
              ))}
            </div>
            {/* Cards */}
            {(()=>{
              const src=alunosSubTab==='planoAoFim'?alunosPlanoFim:alunosSubTab==='expirados'?alunosExpirados:students;
              const lista=src.filter(s=>s.name.toLowerCase().includes(searchTerm.toLowerCase()));
              return(
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {lista.map(s=>{
                    const days=daysUntilEnd(s.endDate);
                    const exp=days!==null&&days<0;
                    const soon=days!==null&&days>=0&&days<=3;
                    const fix=(s.fixedSchedules||[]).map(f=>`${f.day.substring(0,3)} ${f.hour}`).join(' • ');
                    return(
                      <div key={s.id} className={`bg-white p-5 rounded-[2rem] border transition-all group relative shadow-sm ${exp?'border-red-400 shadow-red-100 bg-red-50/30':soon?'border-rose-300 shadow-rose-100':'border-gray-200 hover:border-emerald-300 hover:shadow-md'}`}>
                        {exp&&<div className="absolute top-0 left-0 right-0 bg-red-500 rounded-t-[2rem] px-4 py-1.5 flex items-center gap-2"><AlertCircle size={10} className="text-white"/><span className="text-[9px] font-black text-white uppercase">Plano expirado</span></div>}
                        {!exp&&soon&&<div className="absolute top-0 left-0 right-0 bg-rose-100 rounded-t-[2rem] px-4 py-1.5 flex items-center gap-2"><AlertTriangle size={10} className="text-rose-500"/><span className="text-[9px] font-black text-rose-600 uppercase">Acaba em {days===0?'hoje':`${days}d`}</span></div>}
                        <div className={`${exp||soon?'mt-6':''}`} onClick={()=>setDetailsId(s.id)}>
                          <div className="flex items-start gap-3 mb-3 cursor-pointer">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${exp?'bg-red-500 text-white':'bg-emerald-500 text-black'}`}>{s.name.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-black uppercase text-sm leading-tight break-words ${exp?'text-red-600':'text-gray-900'}`}>{s.name}</h3>
                              <p className={`text-[9px] font-bold uppercase mt-0.5 ${exp?'text-red-400':'text-emerald-600'}`}>{s.plan} • {s.frequencyLabel}</p>
                            </div>
                          </div>
                          {fix&&<div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-3 flex items-center gap-2"><Clock size={10} className="text-emerald-600 shrink-0"/><span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider truncate">{fix}</span></div>}
                          <div className="space-y-1 pt-2 border-t border-gray-100">
                            <div className="flex justify-between text-[8px] font-black uppercase"><span className="text-gray-400">Início</span><span className="text-gray-700">{s.startDate?new Date(s.startDate).toLocaleDateString():'---'}</span></div>
                            <div className="flex justify-between text-[8px] font-black uppercase"><span className="text-gray-400">Fim</span><span className={exp?'text-red-600 font-black':soon?'text-rose-600':'text-emerald-600'}>{s.endDate?new Date(s.endDate).toLocaleDateString():'---'}{exp?' ✕':''}</span></div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                          <button onClick={()=>setProntuarioId(s.id)} className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-50 text-gray-500 rounded-xl hover:bg-purple-100 hover:text-purple-700 transition-all text-[9px] font-black uppercase border border-gray-200"><BookOpen size={12}/>Prontuário</button>
                          <button onClick={e=>{e.stopPropagation();setAnexosId(s.id);}} className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-50 text-gray-500 rounded-xl hover:bg-sky-100 hover:text-sky-700 transition-all text-[9px] font-black uppercase border border-gray-200"><Paperclip size={12}/>Anexos</button>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button onClick={e=>{e.stopPropagation();setEditStudent(JSON.parse(JSON.stringify(s)));}} className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-50 text-gray-500 rounded-xl hover:bg-emerald-100 hover:text-emerald-700 transition-all text-[9px] font-black uppercase border border-gray-200"><Edit3 size={12}/>Editar</button>
                          <button onClick={e=>handleDeleteStudent(e,s.id,s.name)} className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-50 text-gray-500 rounded-xl hover:bg-rose-100 hover:text-rose-700 transition-all text-[9px] font-black uppercase border border-gray-200"><Trash2 size={12}/>Excluir</button>
                        </div>
                      </div>
                    );
                  })}
                  {lista.length===0&&<div className="col-span-full text-center py-16 text-gray-400"><Users size={32} className="mx-auto mb-3 opacity-30"/><p className="text-[10px] font-black uppercase">Nenhum aluno</p></div>}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {activeTab==='dashboard'&&isAdmin&&(
          <div>
            <h1 className="text-2xl lg:text-3xl font-black uppercase italic mb-6 text-gray-900">Dashboard</h1>
            <div className="flex gap-2 mb-8 overflow-x-auto pb-1 no-scrollbar">
              {[['geral','Geral','bg-gray-900 text-white'],['andriele','Andriele · Manhã','bg-amber-500 text-black'],['jessica','Jessica · Tarde','bg-blue-500 text-white']].map(([k,l,a])=>(
                <button key={k} onClick={()=>setDashSubTab(k)} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase whitespace-nowrap transition-all ${dashSubTab===k?a:'bg-white text-gray-500 border border-gray-200 shadow-sm'}`}>{l}</button>
              ))}
            </div>
            {dashSubTab==='geral'&&(()=>{
              const open=(label,fn)=>setDashDrill({label,items:schedules.filter(fn)});
              return(
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Agendados"    value={metrics.pendentes}   color="text-gray-600"   icon={<Clock size={22}/>}        onClick={()=>open('Agendados',   s=>s.status==='pendente')}/>
                    <StatCard label="Presenças"    value={metrics.concluidas}  color="text-emerald-600" icon={<CheckCircle2 size={22}/>}  onClick={()=>open('Presenças',   s=>s.status==='concluida')}/>
                    <StatCard label="Faltas"       value={metrics.faltas}      color="text-rose-600"   icon={<AlertCircle size={22}/>}   onClick={()=>open('Faltas',      s=>s.status==='falta')}/>
                    <StatCard label="Desmarcações" value={metrics.desmarcados} color="text-orange-600" icon={<CalendarX size={22}/>}     onClick={()=>open('Desmarcações',s=>s.status==='desmarcado'||s.status==='desmarcado_atrasado')}/>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard label="Reposições"    value={metrics.reposicao}    color="text-purple-600" icon={<RotateCcw size={22}/>}    onClick={()=>open('Reposições',   s=>s.status==='reposicao')}/>
                    <StatCard label="Experimentais" value={metrics.experimental} color="text-amber-600"  icon={<FlaskConical size={22}/>} onClick={()=>open('Experimentais',s=>s.status==='experimental')}/>
                    <StatCard label="Total Alunos"  value={metrics.alunos}       color="text-blue-600"   icon={<Users size={22}/>}        onClick={()=>open('Todos',        ()=>true)}/>
                  </div>
                </div>
              );
            })()}
            {dashSubTab==='andriele'&&<ProfDashboard name={PROF_MANHA} turno="Manhã" turnoColor="amber" data={metricsByProf.andriele} onDrill={(l,items)=>setDashDrill({label:l,items})}/>}
            {dashSubTab==='jessica' &&<ProfDashboard name={PROF_TARDE} turno="Tarde" turnoColor="blue"  data={metricsByProf.jessica}  onDrill={(l,items)=>setDashDrill({label:l,items})}/>}
          </div>
        )}

        {/* ── LOGS ── */}
        {activeTab==='historico'&&isAdmin&&(
          <div className="max-w-4xl mx-auto space-y-2">
            <h1 className="text-2xl font-black uppercase italic mb-6 text-gray-900">Logs do Sistema</h1>
            {logs.map(log=>{
              const exp=log.type==='expiry_warning'||log.type==='expiry_removed';
              return(
                <div key={log.id} className={`p-4 rounded-2xl border flex justify-between items-center gap-4 shadow-sm ${exp?'bg-rose-50 border-rose-200':'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    {exp&&<AlertTriangle size={14} className="text-rose-500 shrink-0"/>}
                    <div className="min-w-0">
                      <p className={`text-[10px] font-black uppercase truncate ${exp?'text-rose-700':'text-gray-900'}`}>{log.action}</p>
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

      {/* ── MODAIS ── */}

      {/* Drill-down dashboard */}
      {dashDrill&&<Modal title={dashDrill.label} onClose={()=>setDashDrill(null)}><DrillList items={dashDrill.items}/></Modal>}

      {/* Detalhes aluno */}
      {detailsStudent&&isAdmin&&(
        <Modal title={detailsStudent.name} onClose={()=>setDetailsId(null)} size="md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
              <p className="text-[8px] font-black text-purple-600 uppercase mb-2">Créditos de Reposição</p>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-gray-900">{detailsStudent.credits||0}</span>
                <div className="flex gap-2">
                  <button onClick={()=>adjCredits(detailsStudent.id,detailsStudent.name,-1)} className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200"><MinusCircle size={16}/></button>
                  <button onClick={()=>adjCredits(detailsStudent.id,detailsStudent.name,1)}  className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200"><Plus size={16}/></button>
                </div>
              </div>
            </div>
            <DetailItem icon={<CalendarDays size={12}/>} label="Plano"     value={`${detailsStudent.plan} (${detailsStudent.frequencyLabel})`}/>
            <DetailItem icon={<Fingerprint size={12}/>}  label="CPF"       value={detailsStudent.cpf}/>
            <DetailItem icon={<Cake size={12}/>}         label="Nasc."     value={detailsStudent.birthDate||'---'}/>
            <DetailItem icon={<Mail size={12}/>}         label="E-mail"    value={detailsStudent.email}/>
            <DetailItem icon={<Phone size={12}/>}        label="Fone"      value={detailsStudent.phone}/>
            <DetailItem icon={<Home size={12}/>}         label="Endereço"  value={detailsStudent.address}/>
            <DetailItem icon={<Calendar size={12}/>}     label="Vigência"  value={`${detailsStudent.startDate||'---'} até ${detailsStudent.endDate||'---'}`}/>
            {(detailsStudent.fixedSchedules||[]).length>0&&(
              <div className="md:col-span-2">
                <DetailItem icon={<Clock size={12}/>} label="Horários Fixos" value={(detailsStudent.fixedSchedules||[]).map(f=>`${f.day} ${f.hour}`).join(' • ')}/>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Prontuário */}
      {prontuarioStu&&isAdmin&&(
        <Modal title={`Prontuário — ${prontuarioStu.name}`} onClose={()=>setProntuarioId(null)} size="lg">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-6">
            <p className="text-[9px] font-black uppercase text-emerald-600 mb-3">Nova Evolução</p>
            <textarea placeholder="Descreva a evolução clínica..." className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-900 outline-none h-28 resize-none focus:border-emerald-400 shadow-sm" value={newEvolution} onChange={e=>setNewEvolution(e.target.value)}/>
            <div className="flex justify-end mt-3">
              <button onClick={async()=>{if(!newEvolution.trim())return;await addDoc(C.evolutions(),{studentId:prontuarioStu.id,content:newEvolution,author:user.name,timestamp:ts()});await log(`Evolução para ${prontuarioStu.name}`);setNewEvolution('');}} className="bg-emerald-500 text-black px-6 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-400">Salvar</button>
            </div>
          </div>
          <div className="space-y-3">
            {evolutions.filter(e=>e.studentId===prontuarioStu.id).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).map(e=>(
              <div key={e.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex justify-between mb-2 text-[9px] font-black uppercase"><span className="text-emerald-600">{new Date(e.timestamp).toLocaleDateString()}</span><span className="text-gray-400">{e.author}</span></div>
                <p className="text-sm text-gray-700 italic">"{e.content}"</p>
              </div>
            ))}
            {evolutions.filter(e=>e.studentId===prontuarioStu.id).length===0&&<p className="text-center text-gray-400 text-[10px] font-black uppercase py-8">Nenhuma evolução</p>}
          </div>
        </Modal>
      )}

      {/* Anexos */}
      {anexosStu&&isAdmin&&<AnexosModal student={anexosStu} onClose={()=>setAnexosId(null)} userName={user.name} createLog={log}/>}

      {/* Modal agendamento */}
      {scheduleModal&&isAdmin&&(
        <Modal title={`Agendar — ${selectedDay} ${scheduleModal.hour}`} onClose={()=>{setScheduleModal(null);setScheduleForm({studentId:'',manualName:'',status:'pendente'});}} size="sm">
          <form onSubmit={async e=>{
            e.preventDefault();
            const name=scheduleForm.manualName||students.find(s=>s.id===scheduleForm.studentId)?.name;
            if(!name) return;
            await addDoc(C.schedules(),{
              name, studentId:scheduleForm.studentId||null,
              day:selectedDay, hour:scheduleModal.hour,
              status:scheduleForm.status,
              isFixed:false,                    // não é aula fixa — será limpa na virada da semana
              weekKey:getCurrentWeekKey(),       // chave da semana atual
              createdBy:user.name, createdAt:ts()
            });
            await log(`Agendou ${name} — ${selectedDay} ${scheduleModal.hour}`);
            setScheduleModal(null);setScheduleForm({studentId:'',manualName:'',status:'pendente'});
          }} className="space-y-4">
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500 ml-1">Aluno</label>
              <select className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-gray-900 text-xs shadow-sm" value={scheduleForm.studentId} onChange={e=>setScheduleForm({...scheduleForm,studentId:e.target.value,manualName:''})}>
                <option value="">-- Selecionar --</option>{students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500 ml-1">Ou Nome Manual</label>
              <input type="text" placeholder="Nome..." className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-gray-900 text-xs outline-none focus:border-emerald-400 shadow-sm" value={scheduleForm.manualName} onChange={e=>setScheduleForm({...scheduleForm,manualName:e.target.value,studentId:''})}/>
            </div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500 ml-1">Tipo</label>
              <select className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-gray-900 text-xs shadow-sm" value={scheduleForm.status} onChange={e=>setScheduleForm({...scheduleForm,status:e.target.value})}>
                <option value="pendente">Sessão Normal</option><option value="experimental">Experimental</option><option value="reposicao">Reposição</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-emerald-500 text-black font-black py-4 rounded-2xl uppercase text-[11px] tracking-widest">Confirmar</button>
          </form>
        </Modal>
      )}

      {/* Modal nova matrícula */}
      {addStudent&&(
        <Modal title="Nova Matrícula" onClose={()=>setAddStudent(false)}>
          <form onSubmit={handleAddStudent} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputGroup label="Nome *"          value={newStudent.name}      onChange={v=>setNewStudent({...newStudent,name:v})} required/>
              {/* CPF com validação em tempo real */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-500 ml-1">CPF * <span className="text-[8px] normal-case font-normal">(apenas números)</span></label>
                <div className="relative">
                  <input
                    type="text" maxLength={14}
                    placeholder="000.000.000-00"
                    className={`w-full bg-white border rounded-2xl p-4 text-sm text-gray-900 outline-none transition-all shadow-sm font-mono ${
                      newStudent.cpf.replace(/\D/g,'').length===11
                        ? validarCPF(newStudent.cpf.replace(/\D/g,''))
                          ? 'border-emerald-400 focus:border-emerald-500'
                          : 'border-rose-400 focus:border-rose-500'
                        : 'border-gray-200 focus:border-emerald-400'
                    }`}
                    value={newStudent.cpf}
                    onChange={e=>{
                      setCpfError('');
                      // Formata automaticamente: 000.000.000-00
                      const digits=e.target.value.replace(/\D/g,'').slice(0,11);
                      let fmt=digits;
                      if(digits.length>9)      fmt=`${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
                      else if(digits.length>6) fmt=`${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`;
                      else if(digits.length>3) fmt=`${digits.slice(0,3)}.${digits.slice(3)}`;
                      setNewStudent({...newStudent,cpf:fmt});
                    }}
                    required
                  />
                  {newStudent.cpf.replace(/\D/g,'').length===11&&(
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {validarCPF(newStudent.cpf.replace(/\D/g,''))
                        ? <CheckCircle2 size={18} className="text-emerald-500"/>
                        : <AlertCircle  size={18} className="text-rose-500"/>}
                    </div>
                  )}
                </div>
                {cpfError&&<p className="text-[10px] text-rose-600 font-bold ml-1 flex items-center gap-1"><AlertCircle size={10}/>{cpfError}</p>}
                {newStudent.cpf.replace(/\D/g,'').length===11&&!validarCPF(newStudent.cpf.replace(/\D/g,''))&&!cpfError&&(
                  <p className="text-[10px] text-rose-500 font-bold ml-1 flex items-center gap-1"><AlertCircle size={10}/>CPF inválido</p>
                )}
                {newStudent.cpf.replace(/\D/g,'').length===11&&validarCPF(newStudent.cpf.replace(/\D/g,''))&&(
                  <p className="text-[10px] text-emerald-600 font-bold ml-1 flex items-center gap-1"><CheckCircle2 size={10}/>CPF válido</p>
                )}
              </div>
              <InputGroup label="Nascimento" type="date" value={newStudent.birthDate} onChange={v=>setNewStudent({...newStudent,birthDate:v})}/>
              <InputGroup label="WhatsApp"        value={newStudent.phone}     onChange={v=>setNewStudent({...newStudent,phone:v})}/>
              <InputGroup label="E-mail" type="email" value={newStudent.email} onChange={v=>setNewStudent({...newStudent,email:v})}/>
              <InputGroup label="Endereço"        value={newStudent.address}   onChange={v=>setNewStudent({...newStudent,address:v})}/>
              <InputGroup label="Início" type="date" value={newStudent.startDate} onChange={v=>setNewStudent({...newStudent,startDate:v})}/>
              <InputGroup label="Fim"    type="date" value={newStudent.endDate}   onChange={v=>setNewStudent({...newStudent,endDate:v})}/>
              <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500 ml-1">Plano</label>
                <select className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-sm text-gray-900 shadow-sm" value={newStudent.plan} onChange={e=>setNewStudent({...newStudent,plan:e.target.value})}>
                  {PLANOS.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500 ml-1">Frequência</label>
                <select className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-sm text-gray-900 shadow-sm" value={newStudent.frequency} onChange={e=>{
                  const n=Number(e.target.value);
                  setNewStudent({...newStudent,frequency:n,fixedSchedules:Array.from({length:n},(_,i)=>newStudent.fixedSchedules[i]||{day:'Segunda',hour:'07:00'})});
                }}>{FREQS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}</select>
              </div>
            </div>
            <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-200">
              <p className="text-[10px] font-black uppercase text-emerald-600 mb-4">Horários Fixos</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {newStudent.fixedSchedules.map((s,i)=>(
                  <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
                    <select className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-900" value={s.day} onChange={e=>{const c=[...newStudent.fixedSchedules];c[i].day=e.target.value;setNewStudent({...newStudent,fixedSchedules:c});}}>
                      {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
                    </select>
                    <select className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-900" value={s.hour} onChange={e=>{const c=[...newStudent.fixedSchedules];c[i].hour=e.target.value;setNewStudent({...newStudent,fixedSchedules:c});}}>
                      {ALL_HOURS.map(h=><option key={h} value={h}>{h} — {isManha(h)?'Manhã':'Tarde'}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-500 text-black font-black py-5 rounded-2xl uppercase text-xs tracking-widest hover:scale-[1.01] transition-all disabled:opacity-50">{isSubmitting?'Salvando...':'Finalizar Matrícula'}</button>
          </form>
        </Modal>
      )}

      {/* Modal edição */}
      {editStudent&&(
        <Modal title="Editar Aluno" onClose={()=>setEditStudent(null)}>
          <form onSubmit={handleEditStudent} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputGroup label="Nome"      value={editStudent.name}      onChange={v=>setEditStudent({...editStudent,name:v})}/>
              <InputGroup label="CPF"       value={editStudent.cpf}       onChange={v=>setEditStudent({...editStudent,cpf:v})}/>
              <InputGroup label="Nascimento" type="date" value={editStudent.birthDate} onChange={v=>setEditStudent({...editStudent,birthDate:v})}/>
              <InputGroup label="Início"    type="date" value={editStudent.startDate}  onChange={v=>setEditStudent({...editStudent,startDate:v})}/>
              <InputGroup label="Fim"       type="date" value={editStudent.endDate}    onChange={v=>setEditStudent({...editStudent,endDate:v})}/>
              <InputGroup label="Fone"      value={editStudent.phone}     onChange={v=>setEditStudent({...editStudent,phone:v})}/>
              <InputGroup label="E-mail" type="email" value={editStudent.email} onChange={v=>setEditStudent({...editStudent,email:v})}/>
              <InputGroup label="Endereço"  value={editStudent.address}   onChange={v=>setEditStudent({...editStudent,address:v})}/>
            </div>
            <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-200">
              <p className="text-[10px] font-black uppercase text-emerald-600 mb-4">Alterar Horários Fixos</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(editStudent.fixedSchedules||[]).map((s,i)=>(
                  <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
                    <select className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-900" value={s.day} onChange={e=>{const c=[...editStudent.fixedSchedules];c[i].day=e.target.value;setEditStudent({...editStudent,fixedSchedules:c});}}>
                      {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
                    </select>
                    <select className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-900" value={s.hour} onChange={e=>{const c=[...editStudent.fixedSchedules];c[i].hour=e.target.value;setEditStudent({...editStudent,fixedSchedules:c});}}>
                      {ALL_HOURS.map(h=><option key={h} value={h}>{h} — {isManha(h)?'Manhã':'Tarde'}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <button type="submit" className="w-full bg-emerald-500 text-black font-black py-4 rounded-2xl uppercase text-xs flex items-center justify-center gap-2"><Save size={16}/>Salvar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}