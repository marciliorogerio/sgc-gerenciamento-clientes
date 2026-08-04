import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Edit2, Trash2, DollarSign, 
  Users, Calendar, Tv, LogOut,
  AlertCircle, AlertTriangle, CheckCircle, Clock, FileText, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, X, Bell, User, Archive, LayoutDashboard, Cloud, CloudOff, RotateCcw,
  Moon, Sun
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
// Trazendo de volta o signInWithPopup e mantendo o Redirect como fallback
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDfmahffoPM8p05PrJkGoL3GV87eo7NLhk",
  authDomain: "gestao-clientes-3d46b.firebaseapp.com",
  projectId: "gestao-clientes-3d46b",
  storageBucket: "gestao-clientes-3d46b.firebasestorage.app",
  messagingSenderId: "132793462008",
  appId: "1:132793462008:web:1fad58225b3ec30cbd9f0d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
// Forçar sempre a seleção da conta para evitar loops infinitos
googleProvider.setCustomParameters({ prompt: 'select_account' });
const appId = 'sgc-gerenciamento-clientes';

const getRealTodayString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthYear = (dateString) => {
  if (!dateString) return '';
  const [year, month] = dateString.split('-');
  const date = new Date(year, month - 1);
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [clients, setClients] = useState([]);
  const [globalUnitValue, setGlobalUnitValue] = useState(30.00);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); 
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [currentViewMonth, setCurrentViewMonth] = useState(getRealTodayString());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  const [editingClient, setEditingClient] = useState(null);
  const [payingClient, setPayingClient] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', dueDate: '', paidMonths: 0, subscriptions: 1, nextPayment: getRealTodayString(), customValue: 30, paymentHistory: [], notes: '', active: true
  });

  const [paymentForm, setPaymentForm] = useState({ monthsToPay: 1, discount: 0 });

  useEffect(() => {
    // Processar o resultado de um redirecionamento, se houver
    getRedirectResult(auth).catch((error) => {
      console.error("Erro no redirecionamento:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setClients([]);
      return;
    }

    setIsDataLoading(true);
    const clientsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');

    const unsubscribe = onSnapshot(clientsCollectionRef, (snapshot) => {
      const items = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...docSnap.data(), id: docSnap.id });
      });

      setClients(items);
      setIsSynced(true);
      setIsDataLoading(false);
    }, (error) => {
      console.error("Erro no listener:", error);
      setIsSynced(false);
      setIsDataLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // LOGIN ROBUSTO PARA SAFARI
  const handleLogin = async () => {
    try {
      // Tenta usar o pop-up primeiro (mais rápido, funciona em Android/PC/Canvas)
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      // Se falhar (ex: Safari bloqueou o popup), faz o redirect forçado
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.message.includes('popup')) {
        console.log("Popup bloqueado, tentando redirecionamento...");
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError) {
           console.error("Erro no redirecionamento:", redirectError);
           alert("Houve um erro. Certifique-se de que não está num modo de navegação privada/anónima.");
        }
      } else {
        console.error("Erro ao fazer login:", error);
        alert("Não foi possível iniciar sessão. Tente novamente.");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsConfigModalOpen(false);
    } catch (error) {
      console.error("Erro ao sair", error);
    }
  };

  const handleMonthChange = (direction) => {
    const [year, month] = currentViewMonth.split('-').map(Number);
    let newMonth = month + direction;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    else if (newMonth < 1) { newMonth = 12; newYear--; }
    setCurrentViewMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const isCurrentRealMonth = currentViewMonth === getRealTodayString();

  const getClientStatus = (client, viewMonthStr) => {
    if (client.active === false) {
      return { status: 'ARCHIVED', label: 'Inativo', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:border-slate-700', icon: Archive, urgency: 99, diffDays: 0 };
    }

    const [viewYear, viewMonth] = viewMonthStr.split('-').map(Number);
    const [nextYear, nextMonth] = (client.nextPayment || getRealTodayString()).split('-').map(Number);
    const [realYear, realMonth] = getRealTodayString().split('-').map(Number);
    
    const viewAbsMonth = viewYear * 12 + viewMonth;
    const nextAbsMonth = nextYear * 12 + nextMonth;
    const realAbsMonth = realYear * 12 + realMonth;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const realDay = today.getDate();

    let dueDay = client.dueDate;
    const daysInViewMonth = new Date(viewYear, viewMonth, 0).getDate();
    if (dueDay > daysInViewMonth) dueDay = daysInViewMonth;

    let isStrictlyOverdueRightNow = false;
    if (nextAbsMonth < realAbsMonth) {
      isStrictlyOverdueRightNow = true;
    } else if (nextAbsMonth === realAbsMonth) {
      let realDueDay = client.dueDate;
      const daysInRealMonth = new Date(realYear, realMonth, 0).getDate();
      if (realDueDay > daysInRealMonth) realDueDay = daysInRealMonth;
      if (realDueDay < realDay) {
        isStrictlyOverdueRightNow = true;
      }
    }

    if (nextAbsMonth > viewAbsMonth) {
      return { status: 'PAID', label: 'Em Dia', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20', icon: CheckCircle, urgency: 4, diffDays: 0 };
    }

    if (viewAbsMonth === nextAbsMonth) {
      if (viewAbsMonth === realAbsMonth) {
        const dueDateObj = new Date(viewYear, viewMonth - 1, dueDay);
        dueDateObj.setHours(0, 0, 0, 0);
        const diffTime = dueDateObj - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { status: 'OVERDUE', label: `Vencido (${Math.abs(diffDays)}d)`, color: 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-500/20', icon: AlertCircle, urgency: 1, diffDays };
        if (diffDays === 0) return { status: 'TODAY', label: 'Vence Hoje!', color: 'text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20 animate-pulse', icon: AlertTriangle, urgency: 2, diffDays };
        if (diffDays <= 7) return { status: 'SOON', label: `Vence em ${diffDays}d`, color: 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20', icon: Clock, urgency: 3, diffDays };
        return { status: 'PENDING', label: 'A Vencer', color: 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20', icon: Calendar, urgency: 3.5, diffDays };
      } 
      else if (viewAbsMonth < realAbsMonth) {
         return { status: 'OVERDUE', label: `Vencido`, color: 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-500/20', icon: AlertCircle, urgency: 1, diffDays: -1 };
      } else {
         return { status: 'PENDING', label: 'A Vencer', color: 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20', icon: Calendar, urgency: 3.5, diffDays: 10 };
      }
    }

    if (nextAbsMonth < viewAbsMonth) {
       if (isStrictlyOverdueRightNow) {
          return { status: 'OVERDUE_MULTIPLE', label: 'Em Atraso', color: 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 font-bold', icon: AlertCircle, urgency: 0, diffDays: -30 };
       } else {
          return { status: 'PENDING', label: 'A Vencer', color: 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20', icon: Calendar, urgency: 3.5, diffDays: 10 };
       }
    }

    return { status: 'UNKNOWN', label: '?', color: 'text-gray-700 bg-gray-100 dark:bg-gray-800', icon: CheckCircle, urgency: 5, diffDays: 0 };
  };

  const processedClients = useMemo(() => {
    let list = clients.map(c => ({
      ...c,
      paymentStatus: getClientStatus(c, currentViewMonth)
    }));

    if (filterType === 'ARCHIVED') {
      list = list.filter(c => c.paymentStatus.status === 'ARCHIVED');
    } else {
      list = list.filter(c => c.paymentStatus.status !== 'ARCHIVED');
      if (filterType === 'OVERDUE') list = list.filter(c => c.paymentStatus.status.includes('OVERDUE'));
      if (filterType === 'TODAY') list = list.filter(c => c.paymentStatus.status === 'TODAY');
      if (filterType === 'UPCOMING') list = list.filter(c => ['SOON', 'PENDING'].includes(c.paymentStatus.status));
      if (filterType === 'PAID') list = list.filter(c => c.paymentStatus.status === 'PAID');
    }

    if (searchTerm) {
      list = list.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    list.sort((a, b) => {
      if (a.paymentStatus.urgency !== b.paymentStatus.urgency) {
        return a.paymentStatus.urgency - b.paymentStatus.urgency;
      }
      return a.paymentStatus.diffDays - b.paymentStatus.diffDays;
    });

    return list;
  }, [clients, searchTerm, filterType, currentViewMonth]);

  const stats = useMemo(() => {
    let overdue = 0; let today = 0; let soon = 0; let pending = 0; let paid = 0; 
    let activeSubs = 0; let expectedRevenue = 0; let collectedRevenue = 0;
    
    clients.forEach(c => {
      const subs = Number(c.subscriptions) || 0;
      const val = Number(c.customValue) || globalUnitValue;
      const status = getClientStatus(c, currentViewMonth).status;
      
      if (status !== 'ARCHIVED') {
        activeSubs += subs;
        expectedRevenue += (subs * val);
        
        if (status.includes('OVERDUE')) overdue++;
        if (status === 'TODAY') today++;
        if (status === 'SOON') soon++;
        if (status === 'PENDING') pending++;
        if (status === 'PAID') paid++; 
      }

      if (c.paymentHistory && c.paymentHistory.length > 0) {
        c.paymentHistory.forEach(pay => {
          const receiptMonth = pay.monthOfReceipt || (pay.date ? pay.date.substring(0, 7) : '');
          if (receiptMonth === currentViewMonth) {
            collectedRevenue += Number(pay.amount) || 0;
          }
        });
      }
    });

    return { overdue, today, soon, pending, paid, activeSubs, expectedRevenue, collectedRevenue };
  }, [clients, globalUnitValue, currentViewMonth]);

  const hasNotifications = isCurrentRealMonth && (stats.overdue > 0 || stats.today > 0);

  const handleOpenModal = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name, dueDate: client.dueDate, paidMonths: client.paidMonths,
        subscriptions: client.subscriptions, nextPayment: client.nextPayment || getRealTodayString(),
        customValue: client.customValue !== undefined ? client.customValue : globalUnitValue,
        paymentHistory: client.paymentHistory || [],
        notes: client.notes || '',
        active: client.active !== false
      });
      setShowHistory(false);
    } else {
      setEditingClient(null);
      setFormData({ 
        name: '', dueDate: '', paidMonths: 0, subscriptions: 1, nextPayment: currentViewMonth,
        customValue: globalUnitValue, paymentHistory: [], notes: '', active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    if (!user) return;

    const clientData = {
      name: formData.name,
      dueDate: Number(formData.dueDate),
      paidMonths: Number(formData.paidMonths),
      subscriptions: Number(formData.subscriptions),
      customValue: Number(formData.customValue),
      nextPayment: formData.nextPayment,
      paymentHistory: formData.paymentHistory || [],
      notes: formData.notes || '',
      active: formData.active
    };

    try {
      const clientsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
      if (editingClient) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'clients', editingClient.id);
        await updateDoc(docRef, clientData);
      } else {
        await addDoc(clientsCollectionRef, clientData);
      }
      handleCloseModal();
    } catch (err) {
      console.error("Erro ao gravar:", err);
      alert("Erro ao gravar dados na nuvem.");
    }
  };
  
  const requestDelete = (e, client) => {
    e.stopPropagation();
    setClientToDelete(client);
  };

  const confirmArchive = async () => {
    if (!clientToDelete || !user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'clients', clientToDelete.id);
      await updateDoc(docRef, { active: false });
    } catch (err) {
      console.error("Erro ao arquivar:", err);
    }
    setClientToDelete(null); 
  };

  const confirmHardDelete = async () => {
    if (!clientToDelete || !user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'clients', clientToDelete.id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Erro ao excluir:", err);
    }
    setClientToDelete(null); 
  };
  
  const handleReactivate = async (client) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'clients', client.id);
      await updateDoc(docRef, { active: true });
    } catch (err) {
      console.error("Erro ao reativar:", err);
    }
  };

  const handleOpenPaymentModal = (client) => {
    setPayingClient(client);
    setPaymentForm({ monthsToPay: 1, discount: 0 });
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setPayingClient(null);
  };

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!payingClient || !user) return;

    const monthsToAdd = Number(paymentForm.monthsToPay);
    const discount = Number(paymentForm.discount);
    
    const subtotal = (Number(payingClient.customValue) || globalUnitValue) * (Number(payingClient.subscriptions) || 1) * monthsToAdd;
    const totalPaid = Math.max(0, subtotal - discount);

    let [currentNextYear, currentNextMonth] = (payingClient.nextPayment || getRealTodayString()).split('-').map(Number);
    let paidMonthsLabels = [];
    
    for (let i = 0; i < monthsToAdd; i++) {
        let m = currentNextMonth + i;
        let y = currentNextYear;
        while (m > 12) { m -= 12; y += 1; }
        const dateObj = new Date(y, m - 1);
        paidMonthsLabels.push(new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(dateObj));
    }

    const newPaymentRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      monthOfReceipt: currentViewMonth,
      monthsPaid: monthsToAdd,
      amount: totalPaid,
      discount: discount,
      refMonths: paidMonthsLabels.join(', ')
    };

    let [year, month] = (payingClient.nextPayment || getRealTodayString()).split('-').map(Number);
    month += monthsToAdd;
    while (month > 12) { month -= 12; year += 1; }
    const nextPaymentStr = `${year}-${String(month).padStart(2, '0')}`;
    const currentHistory = payingClient.paymentHistory || [];

    const updatedData = {
      nextPayment: nextPaymentStr,
      paidMonths: (Number(payingClient.paidMonths) || 0) + monthsToAdd,
      paymentHistory: [newPaymentRecord, ...currentHistory]
    };

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'clients', payingClient.id);
      await updateDoc(docRef, updatedData);
      handleClosePaymentModal();
    } catch (err) {
      console.error("Erro ao registar pagamento:", err);
    }
  };

  const handleUndoPayment = async (client, recordId) => {
    const recordToUndo = client.paymentHistory.find(r => r.id === recordId);
    if (!recordToUndo) return;

    const confirm = window.confirm(`Tem certeza que deseja desfazer este recebimento de ${formatCurrency(recordToUndo.amount)}?\n\nO cliente voltará a constar como devedor neste período e a receita sairá do caixa.`);
    if (!confirm) return;

    let [year, month] = (client.nextPayment || getRealTodayString()).split('-').map(Number);
    month -= recordToUndo.monthsPaid;
    while (month < 1) { month += 12; year -= 1; }
    const revertedNextPaymentStr = `${year}-${String(month).padStart(2, '0')}`;

    const newPaidMonths = Math.max(0, (Number(client.paidMonths) || 0) - recordToUndo.monthsPaid);
    const newHistory = client.paymentHistory.filter(r => r.id !== recordId);

    const updatedData = {
      nextPayment: revertedNextPaymentStr,
      paidMonths: newPaidMonths,
      paymentHistory: newHistory
    };

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'clients', client.id);
      await updateDoc(docRef, updatedData);
      
      setFormData(prev => ({
        ...prev,
        nextPayment: revertedNextPaymentStr,
        paidMonths: newPaidMonths,
        paymentHistory: newHistory
      }));
    } catch (err) {
      console.error("Erro ao desfazer:", err);
      alert("Erro ao desfazer pagamento.");
    }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (dateString) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center transition-colors duration-300">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-sm font-medium tracking-wide">Iniciando...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`${isDarkMode ? 'dark' : ''}`}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 transition-colors duration-300">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none w-full max-w-sm flex flex-col items-center text-center border border-slate-100 dark:border-slate-700 transition-colors duration-300 relative">
            
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className="absolute top-6 right-6 p-2 rounded-full bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-300 hover:text-blue-500 transition"
              title="Alternar Tema"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-[1.5rem] flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 border border-blue-100/50 dark:border-blue-500/20">
              <Tv size={40} strokeWidth={2} />
            </div>
            
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white leading-tight mb-2 tracking-tight">
              App Cloud
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm px-4">Faça login com a sua conta Google para aceder à gestão de clientes de forma segura.</p>
            
            <button 
              onClick={handleLogin}
              className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white px-4 py-4 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-600 transition active:scale-95 flex items-center justify-center gap-3 shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Entrar com o Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDarkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
        
        {/* CABEÇALHO */}
        <div className="px-5 pt-10 pb-6 flex justify-between items-center bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-blue-200 dark:shadow-none shrink-0">
              <Tv size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">App Cloud</p>
                {isSynced ? (
                  <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-medium">
                    <Cloud size={10} /> Nuvem Ativa
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-full font-medium">
                    <CloudOff size={10} /> A ligar...
                  </span>
                )}
              </div>
              <h1 className="text-[1.05rem] font-extrabold text-slate-800 dark:text-white leading-tight">
                Sistema de Gerenciamento<br/>de Clientes
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* BOTÃO MODO NOTURNO */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button 
              onClick={() => setIsNotificationsOpen(true)}
              className="p-2.5 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 relative transition active:scale-95"
            >
              {hasNotifications && (
                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
              )}
              <Bell size={20} />
            </button>
            
            <button onClick={() => setIsConfigModalOpen(true)} className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition active:scale-95 overflow-hidden flex items-center justify-center">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <User size={20} />
              )}
            </button>
          </div>
        </div>

        {isDataLoading && clients.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mb-3"></div>
            <span className="text-sm font-medium text-slate-400 dark:text-slate-500">Carregando base de dados...</span>
          </div>
        ) : (
          <>
            {/* CARDS DE INFORMAÇÕES */}
            <div className="px-5 mb-6 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-[1.25rem] shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 flex items-center gap-4 transition-colors">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <Users size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-slate-800 dark:text-white leading-none mb-1 tracking-tight">
                      {stats.activeSubs}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Ativos (Pts)</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-[1.25rem] shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 flex items-center gap-4 transition-colors">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <DollarSign size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-slate-800 dark:text-white leading-none mb-1 tracking-tight">
                      {formatCurrency(stats.collectedRevenue)}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Caixa de {formatMonthYear(currentViewMonth).split(' ')[0]}</p>
                  </div>
                </div>
              </div>

              {/* 5 CARDS DE STATUS MENORES */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <div className="bg-red-50 dark:bg-red-500/10 p-3 rounded-2xl border border-red-100 dark:border-red-500/20 flex flex-col gap-1 justify-center relative overflow-hidden transition-colors">
                  <div className="absolute top-0 right-0 p-2 opacity-10 dark:opacity-20 text-red-500"><AlertCircle size={32} /></div>
                  <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 relative z-10">
                      <AlertCircle size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Atrasados</span>
                  </div>
                  <span className="text-2xl font-extrabold text-red-700 dark:text-red-300 relative z-10">{stats.overdue}</span>
                </div>
                
                <div className="bg-orange-50 dark:bg-orange-500/10 p-3 rounded-2xl border border-orange-100 dark:border-orange-500/20 flex flex-col gap-1 justify-center relative overflow-hidden transition-colors">
                  <div className="absolute top-0 right-0 p-2 opacity-10 dark:opacity-20 text-orange-500"><AlertTriangle size={32} /></div>
                  <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 relative z-10">
                      <AlertTriangle size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Hoje</span>
                  </div>
                  <span className="text-2xl font-extrabold text-orange-700 dark:text-orange-300 relative z-10">{stats.today}</span>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-500/10 p-3 rounded-2xl border border-yellow-100 dark:border-yellow-500/20 flex flex-col gap-1 justify-center relative overflow-hidden transition-colors">
                  <div className="absolute top-0 right-0 p-2 opacity-10 dark:opacity-20 text-yellow-500"><Clock size={32} /></div>
                  <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400 relative z-10">
                      <Clock size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Em 7 dias</span>
                  </div>
                  <span className="text-2xl font-extrabold text-yellow-700 dark:text-yellow-300 relative z-10">{stats.soon}</span>
                </div>

                <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-2xl border border-blue-100 dark:border-blue-500/20 flex flex-col gap-1 justify-center relative overflow-hidden transition-colors">
                   <div className="absolute top-0 right-0 p-2 opacity-10 dark:opacity-20 text-blue-500"><Calendar size={32} /></div>
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 relative z-10">
                      <Calendar size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">A Vencer</span>
                  </div>
                  <span className="text-2xl font-extrabold text-blue-700 dark:text-blue-300 relative z-10">{stats.pending}</span>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 flex flex-col gap-1 justify-center relative overflow-hidden transition-colors">
                   <div className="absolute top-0 right-0 p-2 opacity-10 dark:opacity-20 text-emerald-500"><CheckCircle size={32} /></div>
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 relative z-10">
                      <CheckCircle size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Em Dia</span>
                  </div>
                  <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 relative z-10">{stats.paid}</span>
                </div>
              </div>
            </div>

            {/* CALENDÁRIO */}
            <div className="px-5 mb-8">
              <div className="bg-white dark:bg-slate-800 rounded-[1.5rem] p-2 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 flex items-center justify-between transition-colors">
                <button onClick={() => handleMonthChange(-1)} className="p-3 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white rounded-xl transition">
                  <ChevronLeft size={22}/>
                </button>
                <div className="text-center flex flex-col items-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Competência</span>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-800 dark:text-white text-lg capitalize">{formatMonthYear(currentViewMonth)}</span>
                    {!isCurrentRealMonth && <span className="w-2 h-2 rounded-full bg-orange-400" title="Não é o mês atual"></span>}
                  </div>
                </div>
                <button onClick={() => handleMonthChange(1)} className="p-3 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white rounded-xl transition">
                  <ChevronRight size={22}/>
                </button>
              </div>
            </div>

            {/* CONTEÚDO PRINCIPAL */}
            <div className="px-5 space-y-5">
              <div>
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 dark:border-slate-700 rounded-2xl leading-5 bg-white dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base shadow-sm dark:shadow-none transition-colors dark:text-white"
                    placeholder="Pesquisar cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                  {['ALL', 'OVERDUE', 'TODAY', 'UPCOMING', 'PAID', 'ARCHIVED'].map((type) => {
                    const labels = { ALL: 'Todos', OVERDUE: 'Em Atraso', TODAY: 'Hoje', UPCOMING: 'A Vencer', PAID: 'Em Dia', ARCHIVED: 'Inativos' };
                    if (!isCurrentRealMonth && ['TODAY'].includes(type)) return null;
                    
                    return (
                      <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                          filterType === type 
                          ? 'bg-slate-800 dark:bg-blue-600 text-white border border-transparent' 
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {labels[type]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                {processedClients.map((client) => {
                  const StatusIcon = client.paymentStatus.icon;
                  const clientVal = Number(client.customValue) || globalUnitValue;
                  const isPaid = client.paymentStatus.status === 'PAID';
                  const isArchived = client.paymentStatus.status === 'ARCHIVED';
                  
                  return (
                    <div key={client.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-700 flex flex-col gap-3 relative overflow-hidden transition-colors">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                        isPaid ? 'bg-emerald-500' : 
                        isArchived ? 'bg-slate-400 dark:bg-slate-600' :
                        client.paymentStatus.status.includes('OVERDUE') ? 'bg-red-500' : 
                        client.paymentStatus.status === 'TODAY' ? 'bg-orange-500' : 
                        client.paymentStatus.status === 'SOON' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}></div>

                      <div className="flex justify-between items-start pl-2">
                        <div className="flex-1 cursor-pointer" onClick={() => handleOpenModal(client)}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className={`font-bold text-lg ${isArchived ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-white'}`}>{client.name}</h3>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${client.paymentStatus.color}`}>
                              <StatusIcon size={12} />
                              {client.paymentStatus.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1"><Calendar size={14} className="text-slate-400 dark:text-slate-500"/> Dia {client.dueDate}</span>
                            <span className="flex items-center gap-1"><Users size={14} className="text-slate-400 dark:text-slate-500"/> {client.subscriptions} pt</span>
                            <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500 font-medium">{formatCurrency(clientVal * (Number(client.subscriptions) || 1))}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          {!isArchived && (
                            <button 
                              onClick={(e) => requestDelete(e, client)} 
                              className="p-2.5 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition active:scale-90 rounded-xl"
                              title="Excluir/Arquivar Cliente"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleOpenModal(client)} 
                            className="p-2.5 text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition active:scale-90 rounded-xl"
                            title="Editar Cliente"
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </div>

                      {client.notes && (
                        <div className="pl-2 mt-1">
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic flex gap-1 items-start bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                            <FileText size={12} className="mt-0.5 shrink-0 opacity-70"/>
                            {client.notes}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-50 dark:border-slate-700/50 pl-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            Total recebido: <strong className="text-slate-700 dark:text-slate-300">{client.paidMonths || 0}x</strong>
                          </span>
                        </div>
                        {isArchived ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleReactivate(client); }}
                            className="bg-slate-800 dark:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-900 dark:hover:bg-slate-600 active:scale-95 transition shadow-sm"
                          >
                            <RotateCcw size={16} /> Reativar
                          </button>
                        ) : (
                          <>
                            {!isPaid && (
                              <button 
                                onClick={() => handleOpenPaymentModal(client)}
                                className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-500/20 active:scale-95 transition shadow-sm border border-blue-100 dark:border-blue-500/20"
                              >
                                <DollarSign size={16} /> Receber
                              </button>
                            )}
                            {isPaid && (
                              <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center gap-1">
                                <CheckCircle size={16}/> Recebido
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {processedClients.length === 0 && (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-500">
                    <CheckCircle size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-600 opacity-50" />
                    <p>Nenhum cliente encontrado para esta seleção.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {user && !isDataLoading && (
          <button 
            onClick={() => handleOpenModal()}
            className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-300 dark:shadow-none hover:bg-blue-700 active:scale-90 transition-transform z-10"
          >
            <Plus size={28} />
          </button>
        )}

        {/* MODAIS */}
        {isNotificationsOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[80] flex items-end sm:items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 flex flex-col transition-colors">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 shrink-0">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Bell size={20} className="text-slate-400"/> Notificações</h2>
                <button type="button" onClick={() => setIsNotificationsOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-full transition"><X size={20} /></button>
              </div>
              
              <div className="p-6">
                {hasNotifications ? (
                  <div className="flex flex-col gap-3">
                    {stats.today > 0 && (
                      <div 
                        onClick={() => { setFilterType('TODAY'); setIsNotificationsOpen(false); }} 
                        className="cursor-pointer bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 p-4 rounded-2xl flex items-center gap-3 text-orange-800 dark:text-orange-400 active:scale-[0.98] transition hover:bg-orange-100 dark:hover:bg-orange-500/20"
                      >
                        <AlertTriangle size={24} className="text-orange-500 shrink-0" />
                        <div>
                          <h4 className="font-bold">Atenção para Hoje</h4>
                          <p className="text-sm opacity-90">Você tem {stats.today} cliente(s) a vencer hoje.</p>
                        </div>
                      </div>
                    )}
                    {stats.overdue > 0 && (
                      <div 
                        onClick={() => { setFilterType('OVERDUE'); setIsNotificationsOpen(false); }} 
                        className="cursor-pointer bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-800 dark:text-red-400 active:scale-[0.98] transition hover:bg-red-100 dark:hover:bg-red-500/20"
                      >
                        <AlertCircle size={24} className="text-red-500 shrink-0" />
                        <div>
                          <h4 className="font-bold">Pagamentos em Atraso</h4>
                          <p className="text-sm opacity-90">{stats.overdue} cliente(s) com mensalidade vencida.</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                    <CheckCircle size={40} className="mx-auto mb-3 text-emerald-400 opacity-80" />
                    <p className="font-medium text-slate-700 dark:text-slate-300">Tudo limpo por aqui!</p>
                    <p className="text-sm mt-1">Nenhum aviso no momento.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {clientToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2rem] shadow-2xl animate-in zoom-in-95 overflow-hidden p-6 transition-colors">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
                  <Archive size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Desativar Cliente?</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                  <strong>{clientToDelete.name}</strong> sairá da lista principal e deixará de ser cobrado(a), mas os <strong>pagamentos antigos continuarão salvos</strong>. Poderá reativá-lo mais tarde na aba de Inativos.
                </p>
                
                <div className="flex gap-3 w-full mb-3">
                  <button onClick={() => setClientToDelete(null)} className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition active:scale-95">Cancelar</button>
                  <button onClick={confirmArchive} className="flex-1 py-3.5 bg-red-500 dark:bg-red-600 text-white font-bold rounded-2xl hover:bg-red-600 dark:hover:bg-red-500 transition active:scale-95 flex items-center justify-center gap-2"><Archive size={18}/> Desativar</button>
                </div>
                
                <button onClick={confirmHardDelete} className="text-xs text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 underline py-2 mt-2 transition">
                   Excluir permanentemente (apaga o histórico)
                </button>
              </div>
            </div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
            <div className="bg-white dark:bg-slate-800 w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 flex flex-col max-h-[90vh] transition-colors">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 sticky top-0 z-10 shrink-0">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                <button type="button" onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-full transition"><X size={20} /></button>
              </div>
              
              <form id="client-form" onSubmit={handleSaveClient} className="p-6 overflow-y-auto flex-1">
                <div className="space-y-5">
                  
                  {editingClient && formData.active === false && (
                    <div className="bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-3 rounded-2xl flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                         <Archive size={16} />
                         <span className="text-sm font-semibold">Cliente Desativado</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, active: true})} 
                        className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm transition active:scale-95"
                      >
                        Reativar
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nome do Cliente</label>
                    <input type="text" required className="w-full px-4 py-3.5 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-900 outline-none dark:text-white transition-colors" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Dia Vencimento</label>
                      <input type="number" min="1" max="31" required className="w-full px-4 py-3.5 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-900 outline-none dark:text-white transition-colors" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Assinaturas (Pts)</label>
                      <input type="number" min="0" step="0.5" required className="w-full px-4 py-3.5 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-900 outline-none dark:text-white transition-colors" value={formData.subscriptions} onChange={(e) => setFormData({...formData, subscriptions: e.target.value})} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Valor da Assinatura (R$)</label>
                    <input type="number" step="0.01" required className="w-full px-4 py-3.5 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-900 outline-none dark:text-white transition-colors" value={formData.customValue} onChange={(e) => setFormData({...formData, customValue: e.target.value})} />
                  </div>

                  <div className="p-4 bg-blue-50/50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Mês da Próxima Cobrança</label>
                    <input type="month" required className="w-full px-4 py-3.5 border border-blue-200 dark:border-blue-500/30 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none dark:text-white transition-colors" value={formData.nextPayment} onChange={(e) => setFormData({...formData, nextPayment: e.target.value})} />
                    <p className="text-[11px] text-blue-600/70 dark:text-blue-400 mt-2 leading-tight">Define quando o status voltará a ser "A Vencer".</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Observações</label>
                    <textarea 
                      className="w-full px-4 py-3.5 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-900 outline-none resize-none dark:text-white transition-colors" 
                      rows="2" 
                      placeholder="Adicione um detalhe sobre o plano, descontos, etc..."
                      value={formData.notes} 
                      onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                    ></textarea>
                  </div>

                  {editingClient && (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                      <button type="button" onClick={() => setShowHistory(!showHistory)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 flex justify-between items-center text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors">
                        <span className="flex items-center gap-2"><FileText size={16} /> Histórico de Pagamentos</span>
                        {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      
                      {showHistory && (
                        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 max-h-56 overflow-y-auto">
                          {formData.paymentHistory && formData.paymentHistory.length > 0 ? (
                            <div className="space-y-4">
                              {formData.paymentHistory.map((record) => (
                                <div key={record.id} className="text-sm border-b border-slate-100 dark:border-slate-700 pb-3 last:border-0 last:pb-0 relative group">
                                  <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200 pr-8">
                                    <span>{formatCurrency(record.amount)}</span>
                                    <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">{formatDate(record.date)}</span>
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Ref: <span className="font-medium text-slate-700 dark:text-slate-300">{record.refMonths || `${record.monthsPaid} mês(es)`}</span>
                                  </div>
                                  {record.discount > 0 && <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Desconto de {formatCurrency(record.discount)} aplicado.</div>}
                                  
                                  <button 
                                    type="button" 
                                    onClick={() => handleUndoPayment(editingClient, record.id)}
                                    className="absolute top-0 right-0 p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition active:scale-95"
                                    title="Desfazer este pagamento"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-2">Nenhum pagamento registado via app.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </form>
              
              <div className="p-6 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 shrink-0 transition-colors">
                <button form="client-form" type="submit" className="w-full bg-slate-800 dark:bg-blue-600 text-white px-4 py-3.5 rounded-2xl font-bold hover:bg-slate-900 dark:hover:bg-blue-700 transition active:scale-95">Salvar Alterações</button>
              </div>
            </div>
          </div>
        )}

        {isPaymentModalOpen && payingClient && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2rem] shadow-2xl animate-in zoom-in-95 overflow-hidden transition-colors">
              <div className="bg-blue-600 dark:bg-blue-600 p-5 text-white flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold">Registar Recebimento</h2>
                  <p className="text-blue-200 text-sm">{payingClient.name}</p>
                </div>
                <button onClick={handleClosePaymentModal} className="p-1.5 text-blue-200 hover:text-white bg-blue-500/50 rounded-full transition"><X size={18} /></button>
              </div>
              
              <form onSubmit={handleConfirmPayment} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Quantos meses está a pagar?</label>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setPaymentForm(p => ({...p, monthsToPay: Math.max(1, p.monthsToPay - 1)}))} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-300">-</button>
                      <input type="number" min="1" className="flex-1 text-center px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-lg bg-white dark:bg-slate-900 dark:text-white transition-colors" value={paymentForm.monthsToPay} onChange={(e) => setPaymentForm({...paymentForm, monthsToPay: Math.max(1, Number(e.target.value))})} />
                      <button type="button" onClick={() => setPaymentForm(p => ({...p, monthsToPay: p.monthsToPay + 1}))} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-300">+</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Desconto (R$)</label>
                    <input type="number" step="0.01" min="0" className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-900 outline-none dark:text-white transition-colors" value={paymentForm.discount} onChange={(e) => setPaymentForm({...paymentForm, discount: e.target.value})} />
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2 mt-2 transition-colors">
                    <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2 mb-2">
                      <span>O valor entrará no caixa de:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 capitalize">{formatMonthYear(currentViewMonth).split(' ')[0]}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                      <span>Subtotal ({paymentForm.monthsToPay}x)</span>
                      <span>{formatCurrency((Number(payingClient.customValue) || globalUnitValue) * (Number(payingClient.subscriptions) || 1) * paymentForm.monthsToPay)}</span>
                    </div>
                    {paymentForm.discount > 0 && (
                       <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                       <span>Desconto</span><span>- {formatCurrency(paymentForm.discount)}</span>
                     </div>
                    )}
                    <div className="flex justify-between font-bold text-lg text-slate-800 dark:text-slate-200 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span>Total a Receber</span>
                      <span>{formatCurrency(Math.max(0, ((Number(payingClient.customValue) || globalUnitValue) * (Number(payingClient.subscriptions) || 1) * paymentForm.monthsToPay) - paymentForm.discount))}</span>
                    </div>
                  </div>
                </div>
                
                <button type="submit" className="w-full mt-6 bg-blue-600 text-white px-4 py-4 rounded-2xl font-bold hover:bg-blue-700 transition active:scale-95 flex items-center justify-center gap-2">
                  <CheckCircle size={20} /> Confirmar Pagamento
                </button>
              </form>
            </div>
          </div>
        )}

        {isConfigModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2rem] shadow-2xl animate-in zoom-in-95 p-6 flex flex-col max-h-[90vh] transition-colors">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Conta e Ajustes</h2>
                <button onClick={() => setIsConfigModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition"><X size={20} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-6">
                <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 transition-colors">
                  <img src={user.photoURL} alt="Foto de Perfil" className="w-16 h-16 rounded-full mb-3 shadow-md" />
                  <p className="font-bold text-slate-800 dark:text-white">{user.displayName || "Usuário"}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Valor Base da Assinatura (R$)</label>
                  <input type="number" step="0.01" className="w-full px-4 py-4 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-900 outline-none text-xl font-bold text-slate-800 dark:text-white transition-colors" value={globalUnitValue} onChange={(e) => setGlobalUnitValue(Number(e.target.value))} />
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                  <button 
                    onClick={handleLogout} 
                    className="w-full py-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold rounded-2xl hover:bg-red-100 dark:hover:bg-red-500/20 transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    <LogOut size={18} /> Sair da Conta
                  </button>
                </div>
              </div>
              
              <div className="pt-6 mt-2 shrink-0">
                <button onClick={() => setIsConfigModalOpen(false)} className="w-full bg-slate-800 dark:bg-blue-600 text-white px-4 py-4 rounded-2xl font-bold hover:bg-slate-900 dark:hover:bg-blue-700 transition active:scale-95">Concluído</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


