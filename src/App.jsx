import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  onSnapshot, 
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { 
  Users, 
  Calendar, 
  Plus, 
  Search, 
  Trash2, 
  CheckCircle, 
  Clock,
  Filter,
  MoreVertical,
  UserPlus,
  ChevronRight,
  LayoutDashboard,
  Settings
} from 'lucide-react';

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBs65ZgCmJpXPjAqK-tOqF6HE2FqTT65UM",
  authDomain: "fisiobalm-26532.firebaseapp.com",
  projectId: "fisiobalm-26532",
  storageBucket: "fisiobalm-26532.firebasestorage.app",
  messagingSenderId: "498080566980",
  appId: "1:498080566980:web:07c3ca7fe7869b4aab8391"
};

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Erro ao inicializar Firebase:", error);
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'fisiobalm-app';
const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const PLANOS = ['Mensal', 'Trimestral', 'Semestral'];

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [alunos, setAlunos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlano, setFilterPlano] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [newAluno, setNewAluno] = useState({ 
    nome: '', 
    plano: 'Mensal', 
    frequencia: 1, 
    dias: [],
    horario: '',
    observacoes: ''
  });

  useEffect(() => {
    if (!auth || firebaseConfig.apiKey === "SUA_API_KEY_AQUI") {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Erro na autenticação:", err);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'alunos');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAlunos(data);
    }, (err) => console.error("Erro no Firestore:", err));
    
    return () => unsubscribe();
  }, [user]);

  const handleAddAluno = async (e) => {
    e.preventDefault();
    if (!user || !db) return;
    
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'alunos'), {
        ...newAluno,
        status: 'ativo',
        dataCadastro: new Date().toISOString(),
        proximoPagamento: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
      });
      setShowModal(false);
      setNewAluno({ nome: '', plano: 'Mensal', frequencia: 1, dias: [], horario: '', observacoes: '' });
    } catch (err) {
      console.error("Erro ao adicionar aluno:", err);
    }
  };

  const handleDeleteAluno = async (id, nome) => {
    if (!user || !db) return;
    
    const confirmar = window.confirm(`Tem a certeza que deseja excluir o aluno ${nome}? Esta ação é permanente.`);
    if (confirmar) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'alunos', id);
        await deleteDoc(docRef);
      } catch (err) {
        console.error("Erro ao excluir aluno:", err);
      }
    }
  };

  const filteredAlunos = alunos.filter(a => {
    const matchesSearch = a.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlano = filterPlano === 'Todos' || a.plano === filterPlano;
    return matchesSearch && matchesPlano;
  });

  if (firebaseConfig.apiKey === "SUA_API_KEY_AQUI") {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6 text-center">
        <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md border border-red-100">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings className="text-red-500 animate-spin-slow" size={40} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 mb-4">Configuração Pendente</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            O sistema Fisiobalm está pronto, mas precisa da sua <strong>API Key</strong> do Firebase para ativar o banco de dados.
          </p>
          <div className="bg-slate-50 p-4 rounded-xl text-sm font-mono text-slate-500 break-all mb-6">
            App.jsx - Linha 24
          </div>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-blue-900 text-white">
      <div className="animate-bounce mb-4">
        <CheckCircle size={48} className="text-blue-400" />
      </div>
      <p className="text-lg font-medium tracking-widest animate-pulse">FISIOBALM A CARREGAR...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans text-slate-900">
      
      {/* Sidebar */}
      <nav className="w-full lg:w-72 bg-blue-950 text-white p-8 flex flex-col gap-2 relative z-20 shadow-2xl">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="p-2 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20">
            <CheckCircle className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-black tracking-tighter italic text-white">FISIOBALM</h1>
        </div>

        <p className="text-blue-400/50 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 px-2">Menu Principal</p>
        
        <button 
          onClick={() => setView('dashboard')}
          className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${view === 'dashboard' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'hover:bg-white/5 text-blue-200'}`}
        >
          <LayoutDashboard size={20} /> <span className="font-semibold">Dashboard</span>
        </button>

        <button 
          onClick={() => setView('alunos')}
          className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${view === 'alunos' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'hover:bg-white/5 text-blue-200'}`}
        >
          <Users size={20} /> <span className="font-semibold">Alunos</span>
        </button>
        
        <button 
          onClick={() => setView('agenda')}
          className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${view === 'agenda' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'hover:bg-white/5 text-blue-200'}`}
        >
          <Calendar size={20} /> <span className="font-semibold">Agenda</span>
        </button>

        <div className="mt-auto pt-8 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-4">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold text-white uppercase">
              {user?.uid.substring(0, 2)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">Gestor Ativo</p>
              <p className="text-[10px] text-blue-400 truncate tracking-tight">{user?.uid}</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto max-h-screen">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">{view}</h2>
            <p className="text-slate-500 font-medium">Bem-vinda de volta ao painel administrativo.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="group bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl flex items-center gap-3 shadow-2xl shadow-blue-600/30 transition-all duration-300 hover:-translate-y-1 active:translate-y-0"
          >
            <UserPlus size={22} className="group-hover:rotate-12 transition-transform" />
            <span className="font-bold tracking-wide uppercase text-sm">Novo Aluno</span>
          </button>
        </header>

        {view === 'dashboard' && (
          <div className="grid gap-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2">Total de Alunos</p>
                <h4 className="text-5xl font-black text-blue-600">{alunos.length}</h4>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2">Ativos Hoje</p>
                <h4 className="text-5xl font-black text-emerald-500">{alunos.filter(a => a.status === 'ativo').length}</h4>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2">Planos Mensais</p>
                <h4 className="text-5xl font-black text-amber-500">{alunos.filter(a => a.plano === 'Mensal').length}</h4>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Clock className="text-blue-600" /> Próximas Aulas
              </h3>
              <div className="space-y-4">
                {alunos.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-10 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-bold text-slate-800">{a.nome}</p>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-tighter">{a.horario || 'Horário não definido'}</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-slate-300" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'alunos' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row gap-4 bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Pesquisar por nome do aluno..." 
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-200 outline-none transition-all font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="text-slate-400" size={18} />
                <select 
                  className="bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold text-slate-600 outline-none focus:ring-4 focus:ring-blue-100 transition-all cursor-pointer"
                  value={filterPlano}
                  onChange={(e) => setFilterPlano(e.target.value)}
                >
                  <option value="Todos">Todos os Planos</option>
                  {PLANOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredAlunos.map(aluno => (
                <div key={aluno.id} className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between group relative transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
                  <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleDeleteAluno(aluno.id, aluno.nome)}
                      className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="mb-6">
                    <div className="mb-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${aluno.plano === 'Mensal' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {aluno.plano}
                      </span>
                    </div>
                    <h3 className="font-black text-slate-800 text-xl uppercase tracking-tighter leading-tight mb-2 truncate pr-12">
                      {aluno.nome}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <Clock size={12} className="text-blue-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{aluno.horario || '--:--'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <Users size={12} className="text-emerald-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{aluno.frequencia}x SEMANA</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-50">
                    <div className="flex flex-wrap gap-1.5">
                      {aluno.dias?.map(day => (
                        <span key={day} className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg uppercase">
                          {day.substring(0, 3)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'agenda' && (
          <div className="bg-white p-12 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <Calendar className="text-blue-600" size={48} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">Agenda Dinâmica</h3>
            <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">
              Estamos a preparar a visualização da agenda semanal para tornar a sua gestão ainda mais simples.
            </p>
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-[100] animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 border border-white">
            <div className="bg-blue-600 p-8 text-white relative">
              <h3 className="text-3xl font-black uppercase tracking-tighter">Novo Cadastro</h3>
              <p className="text-blue-100 font-medium opacity-80">Preencha os dados do aluno para iniciar.</p>
              <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-white/50 hover:text-white transition">X</button>
            </div>
            
            <form onSubmit={handleAddAluno} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nome Completo</label>
                <input required type="text" placeholder="Ex: Maria Fernandes" className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 font-bold text-slate-700 transition-all outline-none" value={newAluno.nome} onChange={(e) => setNewAluno({...newAluno, nome: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Plano de Subscrição</label>
                <select className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 font-bold text-slate-700 transition-all outline-none" value={newAluno.plano} onChange={(e) => setNewAluno({...newAluno, plano: e.target.value})}>
                  {PLANOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Frequência Semanal</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" onClick={() => setNewAluno({...newAluno, frequencia: n})} className={`flex-1 py-3 rounded-xl font-bold transition-all ${newAluno.frequencia === n ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{n}x</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Horário Previsto</label>
                <input type="time" className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 font-bold text-slate-700 transition-all outline-none" value={newAluno.horario} onChange={(e) => setNewAluno({...newAluno, horario: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Dias da Semana</label>
                <div className="flex flex-wrap justify-center gap-3">
                  {DAYS.map(day => (
                    <button key={day} type="button" onClick={() => {
                      const dias = newAluno.dias.includes(day) ? newAluno.dias.filter(d => d !== day) : [...newAluno.dias, day];
                      setNewAluno({...newAluno, dias});
                    }} className={`px-5 py-3 rounded-2xl text-xs font-black transition-all duration-300 uppercase tracking-widest ${newAluno.dias.includes(day) ? 'bg-blue-600 text-white shadow-xl ring-4 ring-blue-100' : 'bg-slate-50 text-slate-400'}`}>{day.substring(0, 3)}</button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2 flex gap-4 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 text-slate-400 font-bold uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition">Cancelar</button>
                <button type="submit" className="flex-[2] py-5 bg-blue-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-700 shadow-2xl shadow-blue-600/30 transition-all active:scale-95">Confirmar Registo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slow-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: slow-spin 8s linear infinite; }
      `}</style>
    </div>
  );
}