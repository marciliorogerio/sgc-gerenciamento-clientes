import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Edit2, Trash2, DollarSign, 
  Users, Calendar, Tv, LogOut, Lock, Mail,
  AlertCircle, AlertTriangle, CheckCircle, Clock, FileText, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, X, Bell, User, Archive, LayoutDashboard, Cloud, CloudOff, RotateCcw,
  Moon, Sun, Copy, Info, Monitor, Cpu, Server, Link
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
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

// Nova Função Auxiliar para Copiar Textos
const copyToClipboard = (text, onSuccess) => {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(onSuccess);
  } else {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      onSuccess();
    } catch (err) {}
    document.body.removeChild(textArea);
  }
};

// Formatação automática do MAC Address (XX:XX:XX:XX:XX:XX)
const formatMAC = (val) => {
  if (!val) return '';
  // Remove tudo o que não for letra ou número e converte para maiúsculas (máx 12 caracteres)
  const raw = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 12);
  // Divide a cada 2 caracteres
  const parts = raw.match(/.{1,2}/g);
  return parts ? parts.join(':') : '';
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  
  const [clients, setClients] = useState([]);
  const [servers, setServers] = useState([]); // NOVO: Lista de servidores
  
  const [globalUnitValue, setGlobalUnitValue] = useState(30.00);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); 
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try { return localStorage.getItem('themeMode') === 'dark'; } 
    catch (e) { return false; }
  });
  
  const [currentViewMonth, setCurrentViewMonth] = useState(getRealTodayString());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  const [viewingClient, setViewingClient] = useState(null);

  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [copiedMac, setCopiedMac] = useState(false); // Feedback visual para MAC
  const [copiedServerId, setCopiedServerId] = useState(null); // Feedback visual para Servidores

  const [editingClient, setEditingClient] = useState(null);
  const [payingClient, setPayingClient] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', username: '', appName: '', appMac: '', dueDate: '', paidMonths: 0, subscriptions: 1, nextPayment: getRealTodayString(), customValue: 30, paymentHistory: [], notes: '', active: true
  });

  const [paymentForm, setPaymentForm] = useState({ monthsToPay: 1, discount: 0 });

  // Estado do formulário de novo servidor
  const [newServerName, setNewServerName] = useState('');
  const [newServerUrl, setNewServerUrl] = useState('');

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);

  useEffect(() => {
    let metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.name = "theme-color";
      document.head.appendChild(metaThemeColor);
    }
    
    if (isDarkMode) {
      document.body.style.backgroundColor = '#0f172a';
      metaThemeColor.content = '#0f172a';
      try { localStorage.setItem('themeMode', 'dark'); } catch(e) {}
    } else {
      document.body.style.backgroundColor = '#f8fafc';
      metaThemeColor.content = '#f8fafc';
      try { localStorage.setItem('themeMode', 'light'); } catch(e) {}
    }
  }, [isDarkMode]);

  const t = (lightClass, darkClass) => isDarkMode ? darkClass : lightClass;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Clientes e Servidores
  useEffect(() => {
    if (!user) {
      setClients([]);
      setServers([]);
      return;
    }

    setIsDataLoading(true);
    
    // Listener Clientes
    const clientsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
    const unsubClients = onSnapshot(clientsRef, (snapshot) => {
      const items = [];
      snapshot.forEach((docSnap) => items.push({ ...docSnap.data(), id: docSnap.id }));
      setClients(items);
      setIsSynced(true);
      setIsDataLoading(false);
    }, (error) => {
      setIsSynced(false);
      setIsDataLoading(false);
    });

    // Listener Servidores
    const serversRef = collection(db, 'artifacts', appId, 'public', 'data', 'servers');
    const unsubServers = onSnapshot(serversRef, (snapshot) => {
      const items = [];
      snapshot.forEach((docSnap) => items.push({ ...docSnap.data(), id: docSnap.id }));
      setServers(items);
    });

    return () => { unsubClients(); unsubServers(); };
  }, [user]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthProcessing(true);
    try {
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
    } catch (error) {
      if (['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'].includes(error.code)) {
        setAuthError('E-mail ou senha incorretos.');
      } else if (error.code === 'auth/invalid-email') {
        setAuthError('Formato de e-mail inválido.');
      } else {
        setAuthError('Erro ao autenticar. Verifique os seus dados.');
      }
    } finally {
      setIsAuthProcessing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsConfigModalOpen(false);
      setAuthEmail('');
      setAuthPassword('');
    } catch (error) {}
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
      return { 
        status: 'ARCHIVED', label: 'Inativo', icon: Archive, urgency: 99, diffDays: 0,
        color: t('text-slate-500 bg-slate-100 border-slate-200', 'text-slate-400 bg-slate-800 border-slate-700')
      };
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
      return { 
        status: 'PAID', label: 'Em Dia', icon: CheckCircle, urgency: 4, diffDays: 0,
        color: t('text-emerald-700 bg-emerald-100 border-emerald-200', 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20')
      };
    }

    if (viewAbsMonth === nextAbsMonth) {
      if (viewAbsMonth === realAbsMonth) {
        const dueDateObj = new Date(viewYear, viewMonth - 1, dueDay);
        dueDateObj.setHours(0, 0, 0, 0);
        const diffTime = dueDateObj - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { 
          status: 'OVERDUE', label: `Vencido (${Math.abs(diffDays)}d)`, icon: AlertCircle, urgency: 1, diffDays,
          color: t('text-red-700 bg-red-100 border-red-200', 'text-red-400 bg-red-500/10 border-red-500/20') 
        };
        if (diffDays === 0) return { 
          status: 'TODAY', label: 'Vence Hoje!', icon: AlertTriangle, urgency: 2, diffDays,
          color: t('text-orange-700 bg-orange-100 border-orange-200 animate-pulse', 'text-orange-400 bg-orange-500/10 border-orange-500/20 animate-pulse') 
        };
        if (diffDays <= 7) return { 
          status: 'SOON', label: `Vence em ${diffDays}d`, icon: Clock, urgency: 3, diffDays,
          color: t('text-yellow-700 bg-yellow-100 border-yellow-200', 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20') 
        };
        return { 
          status: 'PENDING', label: 'A Vencer', icon: Calendar, urgency: 3.5, diffDays,
          color: t('text-blue-700 bg-blue-100 border-blue-200', 'text-blue-400 bg-blue-500/10 border-blue-500/20') 
        };
      } 
      else if (viewAbsMonth < realAbsMonth) {
         return { 
           status: 'OVERDUE', label: `Vencido`, icon: AlertCircle, urgency: 1, diffDays: -1,
           color: t('text-red-700 bg-red-100 border-red-200', 'text-red-400 bg-red-500/10 border-red-500/20') 
         };
      } else {
         return { 
           status: 'PENDING', label: 'A Vencer', icon: Calendar, urgency: 3.5, diffDays: 10,
           color: t('text-blue-700 bg-blue-100 border-blue-200', 'text-blue-400 bg-blue-500/10 border-blue-500/20') 
         };
      }
    }

    if (nextAbsMonth < viewAbsMonth) {
       if (isStrictlyOverdueRightNow) {
          return { 
            status: 'OVERDUE_MULTIPLE', label: 'Em Atraso', icon: AlertCircle, urgency: 0, diffDays: -30,
            color: t('text-red-700 bg-red-100 border-red-200 font-bold', 'text-red-400 bg-red-500/10 border-red-500/20 font-bold') 
          };
       } else {
          return { 
            status: 'PENDING', label: 'A Vencer', icon: Calendar, urgency: 3.5, diffDays: 10,
            color: t('text-blue-700 bg-blue-100 border-blue-200', 'text-blue-400 bg-blue-500/10 border-blue-500/20') 
          };
       }
    }

    return { 
      status: 'UNKNOWN', label: '?', icon: CheckCircle, urgency: 5, diffDays: 0,
      color: t('text-gray-700 bg-gray-100', 'text-gray-400 bg-gray-800') 
    };
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
      const term = searchTerm.toLowerCase();
      list = list.filter(c => 
        c.name.toLowerCase().includes(term) || 
        (c.username && c.username.toLowerCase().includes(term))
      );
    }

    list.sort((a, b) => {
      if (a.paymentStatus.urgency !== b.paymentStatus.urgency) {
        return a.paymentStatus.urgency - b.paymentStatus.urgency;
      }
      return a.paymentStatus.diffDays - b.paymentStatus.diffDays;
    });

    return list;
  }, [clients, searchTerm, filterType, currentViewMonth, isDarkMode]);

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
  }, [clients, globalUnitValue, currentViewMonth, isDarkMode]);

  const hasNotifications = isCurrentRealMonth && (stats.overdue > 0 || stats.today > 0);

  const handleOpenModal = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name, 
        username: client.username || '',
        appName: client.appName || '',
        appMac: client.appMac || '',
        dueDate: client.dueDate, 
        paidMonths: client.paidMonths,
        subscriptions: client.subscriptions, 
        nextPayment: client.nextPayment || getRealTodayString(),
        customValue: client.customValue !== undefined ? client.customValue : globalUnitValue,
        paymentHistory: client.paymentHistory || [],
        notes: client.notes || '',
        active: client.active !== false
      });
      setShowHistory(false);
    } else {
      setEditingClient(null);
      setFormData({ 
        name: '', username: '', appName: '', appMac: '', dueDate: '', paidMonths: 0, subscriptions: 1, nextPayment: currentViewMonth,
        customValue: globalUnitValue, paymentHistory: [], notes: '', active: true
      });
    }
    setIsModalOpen(true);
    setViewingClient(null); 
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    if (!user) return;

    const cleanUsername = formData.username ? formData.username.trim() : '';

    const clientData = {
      name: formData.name,
      username: cleanUsername,
      appName: formData.appName || '',
      appMac: formData.appMac || '',
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
    } catch (err) {}
    setClientToDelete(null); 
    setViewingClient(null);
  };

  const confirmHardDelete = async () => {
    if (!clientToDelete || !user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'clients', clientToDelete.id);
      await deleteDoc(docRef);
    } catch (err) {}
    setClientToDelete(null); 
    setViewingClient(null);
  };
  
  const handleReactivate = async (client) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'clients', client.id);
      await updateDoc(docRef, { active: true });
    } catch (err) {}
  };

  const handleOpenPaymentModal = (client) => {
    setPayingClient(client);
    setPaymentForm({ monthsToPay: 1, discount: 0 });
    setIsPaymentModalOpen(true);
    setViewingClient(null);
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
      
      const nextDateObj = new Date(year, month - 1);
      const nextMonthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(nextDateObj);
      
      handleClosePaymentModal();
      
      setPaymentReceipt({
        clientName: payingClient.name,
        months: monthsToAdd,
        dueDate: payingClient.dueDate,
        nextMonthName: nextMonthName
      });
      
    } catch (err) {}
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
      
      if (editingClient && editingClient.id === client.id) {
        setFormData(prev => ({ ...prev, nextPayment: revertedNextPaymentStr, paidMonths: newPaidMonths, paymentHistory: newHistory }));
      }
      if (viewingClient && viewingClient.id === client.id) {
          setViewingClient(prev => ({ ...prev, nextPayment: revertedNextPaymentStr, paidMonths: newPaidMonths, paymentHistory: newHistory }));
      }
    } catch (err) {}
  };

  // Funções para Servidores
  const handleAddServer = async (e) => {
    e.preventDefault();
    if (!newServerName || !newServerUrl || !user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'servers'), {
        name: newServerName,
        url: newServerUrl
      });
      setNewServerName('');
      setNewServerUrl('');
    } catch(err) { console.error("Erro ao salvar servidor", err) }
  };

  const handleDeleteServer = async (id) => {
    if (!window.confirm("Deseja apagar este servidor?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'servers', id));
    } catch(err) {}
  };

  const handleCopyServer = (url, id) => {
    copyToClipboard(url, () => {
      setCopiedServerId(id);
      setTimeout(() => setCopiedServerId(null), 2500);
    });
  };

  const handleCopyMac = () => {
    if(!viewingClient || !viewingClient.appMac) return;
    copyToClipboard(viewingClient.appMac, () => {
      setCopiedMac(true);
      setTimeout(() => setCopiedMac(false), 2500);
    });
  };

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (dateString) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));

  if (isAuthLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-300 ${t('bg-slate-50', 'bg-slate-900')}`}>
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-sm font-medium tracking-wide">A carregar...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-300 ${t('bg-slate-50', 'bg-slate-900')}`}>
        <div className={`w-full max-w-sm p-8 rounded-[2.5rem] flex flex-col items-center text-center border transition-colors duration-300 relative ${t('bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-slate-100', 'bg-slate-800 shadow-none border-slate-700')}`}>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`absolute top-6 right-6 p-2 rounded-full transition ${t('bg-slate-50 text-slate-400 hover:text-blue-500', 'bg-slate-700 text-slate-300 hover:text-blue-400')}`}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-6 border ${t('bg-blue-50 text-blue-600 border-blue-100/50', 'bg-blue-500/10 text-blue-400 border-blue-500/20')}`}>
            <Tv size={40} strokeWidth={2} />
          </div>
          <h1 className={`text-2xl font-extrabold leading-tight mb-2 tracking-tight ${t('text-slate-800', 'text-white')}`}>App Cloud</h1>
          <p className={`mb-6 text-sm px-4 ${t('text-slate-500', 'text-slate-400')}`}>Acesse a sua conta restrita para gerenciar os seus clientes.</p>

          {authError && (
            <div className={`w-full text-sm p-3 rounded-xl mb-4 border ${t('bg-red-50 text-red-600 border-red-100', 'bg-red-500/10 text-red-400 border-red-500/20')}`}>
              {authError}
            </div>
          )}
          
          <form onSubmit={handleEmailAuth} className="w-full space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-slate-400" /></div>
              <input type="email" required placeholder="Seu e-mail" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className={`w-full pl-12 pr-4 py-3.5 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${t('bg-slate-50 border-slate-200 text-slate-800', 'bg-slate-900 border-slate-600 text-white')}`} />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-slate-400" /></div>
              <input type="password" required placeholder="Sua senha" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className={`w-full pl-12 pr-4 py-3.5 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${t('bg-slate-50 border-slate-200 text-slate-800', 'bg-slate-900 border-slate-600 text-white')}`} />
            </div>
            <button type="submit" disabled={isAuthProcessing} className={`w-full bg-blue-600 text-white px-4 py-4 rounded-2xl font-bold hover:bg-blue-700 transition active:scale-95 flex justify-center items-center gap-2 mt-2 ${t('shadow-md shadow-blue-200', 'shadow-none')}`}>
              {isAuthProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // TELA PRINCIPAL (DASHBOARD)
  return (
    <div className={`min-h-screen pb-24 font-sans transition-colors duration-300 ${t('bg-slate-50 text-slate-800', 'bg-slate-900 text-slate-100')}`}>
      
      {/* CABEÇALHO */}
      <div className={`px-5 pt-10 pb-6 flex justify-between items-center transition-colors duration-300 ${t('bg-slate-50', 'bg-slate-900')}`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center text-white shrink-0 ${t('shadow-md shadow-blue-200', 'shadow-none')}`}>
            <Tv size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className={`text-[9px] font-bold uppercase tracking-widest ${t('text-blue-600', 'text-blue-400')}`}>App Cloud</p>
              {isSynced ? (
                <span className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${t('text-emerald-600 bg-emerald-50', 'text-emerald-400 bg-emerald-500/10')}`}><Cloud size={10} /> Nuvem Ativa</span>
              ) : (
                <span className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${t('text-amber-600 bg-amber-50', 'text-amber-400 bg-amber-500/10')}`}><CloudOff size={10} /> A ligar...</span>
              )}
            </div>
            <h1 className={`text-[1.05rem] font-extrabold leading-tight ${t('text-slate-800', 'text-white')}`}>
              Sistema de Gerenciamento<br/>de Clientes
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2.5 rounded-full border transition active:scale-95 ${t('bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm', 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 shadow-none')}`}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => setIsNotificationsOpen(true)} className={`p-2.5 rounded-full border relative transition active:scale-95 ${t('bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm', 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 shadow-none')}`}>
            {hasNotifications && <span className={`absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 ${t('border-white', 'border-slate-800')}`}></span>}
            <Bell size={20} />
          </button>
          <button onClick={() => setIsConfigModalOpen(true)} className={`w-10 h-10 rounded-full border overflow-hidden flex items-center justify-center transition active:scale-95 ${t('bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm', 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 shadow-none')}`}>
             <User size={20} />
          </button>
        </div>
      </div>

      {isDataLoading && clients.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mb-3"></div>
          <span className={`text-sm font-medium ${t('text-slate-400', 'text-slate-500')}`}>Carregando base de dados...</span>
        </div>
      ) : (
        <>
          {/* CARDS DE INFORMAÇÕES */}
          <div className="px-5 mb-6 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`p-4 rounded-[1.25rem] border flex items-center gap-4 transition-colors ${t('bg-white shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border-slate-100', 'bg-slate-800 shadow-none border-slate-700')}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${t('bg-blue-50 text-blue-600', 'bg-blue-500/10 text-blue-400')}`}><Users size={24} strokeWidth={2.5} /></div>
                <div>
                  <p className={`text-2xl font-extrabold leading-none mb-1 tracking-tight ${t('text-slate-800', 'text-white')}`}>{stats.activeSubs}</p>
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${t('text-slate-400', 'text-slate-500')}`}>Ativos (Pts)</p>
                </div>
              </div>
              <div className={`p-4 rounded-[1.25rem] border flex items-center gap-4 transition-colors ${t('bg-white shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border-slate-100', 'bg-slate-800 shadow-none border-slate-700')}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${t('bg-emerald-50 text-emerald-600', 'bg-emerald-500/10 text-emerald-400')}`}><DollarSign size={24} strokeWidth={2.5} /></div>
                <div>
                  <p className={`text-2xl font-extrabold leading-none mb-1 tracking-tight ${t('text-slate-800', 'text-white')}`}>{formatCurrency(stats.collectedRevenue)}</p>
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${t('text-slate-400', 'text-slate-500')}`}>Caixa de {formatMonthYear(currentViewMonth).split(' ')[0]}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <div className={`p-3 rounded-2xl border flex flex-col gap-1 justify-center relative overflow-hidden transition-colors ${t('bg-red-50 border-red-100', 'bg-red-500/10 border-red-500/20')}`}>
                <div className={`absolute top-0 right-0 p-2 ${t('opacity-10 text-red-500', 'opacity-20 text-red-500')}`}><AlertCircle size={32} /></div>
                <div className={`flex items-center gap-1.5 relative z-10 ${t('text-red-600', 'text-red-400')}`}><AlertCircle size={14} /><span className="text-[10px] font-bold uppercase tracking-wider">Atrasados</span></div>
                <span className={`text-2xl font-extrabold relative z-10 ${t('text-red-700', 'text-red-300')}`}>{stats.overdue}</span>
              </div>
              <div className={`p-3 rounded-2xl border flex flex-col gap-1 justify-center relative overflow-hidden transition-colors ${t('bg-orange-50 border-orange-100', 'bg-orange-500/10 border-orange-500/20')}`}>
                <div className={`absolute top-0 right-0 p-2 ${t('opacity-10 text-orange-500', 'opacity-20 text-orange-500')}`}><AlertTriangle size={32} /></div>
                <div className={`flex items-center gap-1.5 relative z-10 ${t('text-orange-600', 'text-orange-400')}`}><AlertTriangle size={14} /><span className="text-[10px] font-bold uppercase tracking-wider">Hoje</span></div>
                <span className={`text-2xl font-extrabold relative z-10 ${t('text-orange-700', 'text-orange-300')}`}>{stats.today}</span>
              </div>
              <div className={`p-3 rounded-2xl border flex flex-col gap-1 justify-center relative overflow-hidden transition-colors ${t('bg-yellow-50 border-yellow-100', 'bg-yellow-500/10 border-yellow-500/20')}`}>
                <div className={`absolute top-0 right-0 p-2 ${t('opacity-10 text-yellow-500', 'opacity-20 text-yellow-500')}`}><Clock size={32} /></div>
                <div className={`flex items-center gap-1.5 relative z-10 ${t('text-yellow-600', 'text-yellow-400')}`}><Clock size={14} /><span className="text-[10px] font-bold uppercase tracking-wider">Em 7 dias</span></div>
                <span className={`text-2xl font-extrabold relative z-10 ${t('text-yellow-700', 'text-yellow-300')}`}>{stats.soon}</span>
              </div>
              <div className={`p-3 rounded-2xl border flex flex-col gap-1 justify-center relative overflow-hidden transition-colors ${t('bg-blue-50 border-blue-100', 'bg-blue-500/10 border-blue-500/20')}`}>
                 <div className={`absolute top-0 right-0 p-2 ${t('opacity-10 text-blue-500', 'opacity-20 text-blue-500')}`}><Calendar size={32} /></div>
                <div className={`flex items-center gap-1.5 relative z-10 ${t('text-blue-600', 'text-blue-400')}`}><Calendar size={14} /><span className="text-[10px] font-bold uppercase tracking-wider">A Vencer</span></div>
                <span className={`text-2xl font-extrabold relative z-10 ${t('text-blue-700', 'text-blue-300')}`}>{stats.pending}</span>
              </div>
              <div className={`p-3 rounded-2xl border flex flex-col gap-1 justify-center relative overflow-hidden transition-colors ${t('bg-emerald-50 border-emerald-100', 'bg-emerald-500/10 border-emerald-500/20')}`}>
                 <div className={`absolute top-0 right-0 p-2 ${t('opacity-10 text-emerald-500', 'opacity-20 text-emerald-500')}`}><CheckCircle size={32} /></div>
                <div className={`flex items-center gap-1.5 relative z-10 ${t('text-emerald-600', 'text-emerald-400')}`}><CheckCircle size={14} /><span className="text-[10px] font-bold uppercase tracking-wider">Em Dia</span></div>
                <span className={`text-2xl font-extrabold relative z-10 ${t('text-emerald-700', 'text-emerald-300')}`}>{stats.paid}</span>
              </div>
            </div>
          </div>

          {/* CALENDÁRIO */}
          <div className="px-5 mb-8">
            <div className={`p-2 rounded-[1.5rem] border flex items-center justify-between transition-colors ${t('bg-white border-slate-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)]', 'bg-slate-800 border-slate-700 shadow-none')}`}>
              <button onClick={() => handleMonthChange(-1)} className={`p-3 rounded-xl transition ${t('text-slate-400 hover:bg-slate-50 hover:text-slate-800', 'text-slate-500 hover:bg-slate-700 hover:text-white')}`}><ChevronLeft size={22}/></button>
              <div className="text-center flex flex-col items-center">
                <span className={`text-[10px] uppercase font-bold tracking-widest mb-0.5 ${t('text-slate-400', 'text-slate-500')}`}>Competência</span>
                <div className="flex items-center gap-2">
                  <span className={`font-extrabold text-lg capitalize ${t('text-slate-800', 'text-white')}`}>{formatMonthYear(currentViewMonth)}</span>
                  {!isCurrentRealMonth && <span className="w-2 h-2 rounded-full bg-orange-400" title="Não é o mês atual"></span>}
                </div>
              </div>
              <button onClick={() => handleMonthChange(1)} className={`p-3 rounded-xl transition ${t('text-slate-400 hover:bg-slate-50 hover:text-slate-800', 'text-slate-500 hover:bg-slate-700 hover:text-white')}`}><ChevronRight size={22}/></button>
            </div>
          </div>

          {/* CONTEÚDO PRINCIPAL */}
          <div className="px-5 space-y-5">
            <div>
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className={`h-5 w-5 ${t('text-slate-400', 'text-slate-500')}`} /></div>
                <input type="text" className={`block w-full pl-12 pr-4 py-3.5 border rounded-2xl leading-5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base transition-colors ${t('bg-white border-slate-200 placeholder-slate-400 text-slate-800 shadow-sm', 'bg-slate-800 border-slate-700 placeholder-slate-500 text-white shadow-none')}`} placeholder="Pesquisar nome ou @usuario..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                {['ALL', 'OVERDUE', 'TODAY', 'UPCOMING', 'PAID', 'ARCHIVED'].map((type) => {
                  const labels = { ALL: 'Todos', OVERDUE: 'Em Atraso', TODAY: 'Hoje', UPCOMING: 'A Vencer', PAID: 'Em Dia', ARCHIVED: 'Inativos' };
                  if (!isCurrentRealMonth && ['TODAY'].includes(type)) return null;
                  return (
                    <button key={type} onClick={() => setFilterType(type)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${filterType === type ? t('bg-slate-800 text-white border border-transparent', 'bg-blue-600 text-white border border-transparent') : t('bg-white border border-slate-200 text-slate-600 hover:bg-slate-50', 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700')}`}>
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
                  <div key={client.id} onClick={() => setViewingClient(client)} className={`p-4 rounded-2xl border flex flex-col gap-3 relative overflow-hidden transition-colors cursor-pointer active:scale-[0.98] ${t('bg-white shadow-sm border-slate-100 hover:bg-slate-50/50', 'bg-slate-800 shadow-none border-slate-700 hover:bg-slate-700/50')}`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${isPaid ? 'bg-emerald-500' : isArchived ? t('bg-slate-400', 'bg-slate-600') : client.paymentStatus.status.includes('OVERDUE') ? 'bg-red-500' : client.paymentStatus.status === 'TODAY' ? 'bg-orange-500' : client.paymentStatus.status === 'SOON' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>

                    <div className="flex justify-between items-start pl-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className={`font-bold text-lg ${isArchived ? t('text-slate-400 line-through', 'text-slate-500 line-through') : t('text-slate-800', 'text-white')}`}>{client.name}</h3>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${client.paymentStatus.color}`}><StatusIcon size={12} />{client.paymentStatus.label}</span>
                        </div>
                        
                        {client.username && (
                          <div className={`text-sm font-medium mb-1.5 ${t('text-blue-600', 'text-blue-400')}`}>
                            {client.username.startsWith('@') ? client.username : `@${client.username}`}
                          </div>
                        )}
                        {!client.username && <div className="mb-1.5"></div>}

                        <div className={`flex items-center gap-4 text-sm ${t('text-slate-500', 'text-slate-400')}`}>
                          <span className="flex items-center gap-1"><Calendar size={14} className={t('text-slate-400', 'text-slate-500')}/> Dia {client.dueDate}</span>
                          <span className="flex items-center gap-1"><Users size={14} className={t('text-slate-400', 'text-slate-500')}/> {client.subscriptions} pt</span>
                          <span className="flex items-center gap-1 font-medium">{formatCurrency(clientVal * (Number(client.subscriptions) || 1))}</span>
                        </div>
                        
                        {client.appName && (
                          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${t('text-slate-400', 'text-slate-500')}`}><Monitor size={12} /> App: {client.appName}</div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {!isArchived && (
                          <button onClick={(e) => { e.stopPropagation(); requestDelete(e, client); }} className={`p-2.5 rounded-xl transition active:scale-90 ${t('text-red-500 bg-red-50 hover:bg-red-100', 'text-red-400 bg-red-500/10 hover:bg-red-500/20')}`} title="Excluir/Arquivar Cliente"><Trash2 size={16} /></button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); handleOpenModal(client); }} className={`p-2.5 rounded-xl transition active:scale-90 ${t('text-blue-500 bg-blue-50 hover:bg-blue-100', 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20')}`} title="Editar Cliente"><Edit2 size={16} /></button>
                      </div>
                    </div>

                    <div className={`flex items-center justify-between mt-1 pt-3 border-t pl-2 ${t('border-slate-50', 'border-slate-700/50')}`}>
                      <div className="flex items-center gap-2"><span className={`text-sm font-medium ${t('text-slate-500', 'text-slate-400')}`}>Total recebido: <strong className={t('text-slate-700', 'text-slate-300')}>{client.paidMonths || 0}x</strong></span></div>
                      {isArchived ? (
                        <button onClick={(e) => { e.stopPropagation(); handleReactivate(client); }} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-sm active:scale-95 ${t('bg-slate-800 text-white hover:bg-slate-900', 'bg-slate-700 text-white hover:bg-slate-600')}`}><RotateCcw size={16} /> Reativar</button>
                      ) : (
                        <>
                          {!isPaid && (
                            <button onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(client); }} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-sm border active:scale-95 z-10 relative ${t('bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100', 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20')}`}><DollarSign size={16} /> Receber</button>
                          )}
                          {isPaid && (
                            <span className={`text-sm font-bold flex items-center gap-1 ${t('text-emerald-600', 'text-emerald-400')}`}><CheckCircle size={16}/> Recebido</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {processedClients.length === 0 && (
                <div className={`text-center py-12 ${t('text-slate-500', 'text-slate-500')}`}><CheckCircle size={48} className={`mx-auto mb-3 opacity-50 ${t('text-slate-300', 'text-slate-600')}`} /><p>Nenhum cliente encontrado para esta seleção.</p></div>
              )}
            </div>
          </div>
        </>
      )}

      {user && !isDataLoading && (
        <button onClick={() => handleOpenModal()} className={`fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 active:scale-90 transition-transform z-10 ${t('shadow-blue-300', 'shadow-none')}`}><Plus size={28} /></button>
      )}

      {/* MODAL 1: VISUALIZAÇÃO DE CLIENTE */}
      {viewingClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-[2rem] shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh] transition-colors ${t('bg-white', 'bg-slate-800')}`}>
            
            <div className={`px-6 py-6 border-b flex flex-col gap-2 relative ${t('bg-slate-50 border-slate-100', 'bg-slate-800 border-slate-700')}`}>
              <button type="button" onClick={() => setViewingClient(null)} className={`absolute top-4 right-4 p-2 rounded-full transition ${t('text-slate-400 hover:text-slate-700 bg-white shadow-sm', 'text-slate-400 hover:text-slate-200 bg-slate-700')}`}><X size={18} /></button>
              
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-2 ${viewingClient.paymentStatus.color}`}>
                  {viewingClient.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 pr-6">
                   <h2 className={`text-xl font-bold leading-tight ${t('text-slate-800', 'text-white')}`}>{viewingClient.name}</h2>
                   {viewingClient.username && (
                      <p className={`text-sm font-medium ${t('text-blue-600', 'text-blue-400')}`}>
                        {viewingClient.username.startsWith('@') ? viewingClient.username : `@${viewingClient.username}`}
                      </p>
                   )}
                </div>
              </div>
              <div className="flex mt-2">
                <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 ${viewingClient.paymentStatus.color}`}>
                  <viewingClient.paymentStatus.icon size={14} />
                  {viewingClient.paymentStatus.label}
                </span>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              
              <div className="grid grid-cols-2 gap-3">
                 <div className={`p-3 rounded-2xl border ${t('bg-white border-slate-100', 'bg-slate-800/50 border-slate-700')}`}>
                    <p className={`text-[10px] uppercase font-bold tracking-widest mb-1 ${t('text-slate-400', 'text-slate-500')}`}>Vencimento</p>
                    <p className={`font-bold flex items-center gap-1.5 ${t('text-slate-800', 'text-white')}`}><Calendar size={14} className={t('text-blue-500','text-blue-400')}/> Dia {viewingClient.dueDate}</p>
                 </div>
                 <div className={`p-3 rounded-2xl border ${t('bg-white border-slate-100', 'bg-slate-800/50 border-slate-700')}`}>
                    <p className={`text-[10px] uppercase font-bold tracking-widest mb-1 ${t('text-slate-400', 'text-slate-500')}`}>Assinaturas</p>
                    <p className={`font-bold flex items-center gap-1.5 ${t('text-slate-800', 'text-white')}`}><Users size={14} className={t('text-blue-500','text-blue-400')}/> {viewingClient.subscriptions} pt</p>
                 </div>
              </div>

              <div className={`p-3 rounded-2xl border flex justify-between items-center ${t('bg-white border-slate-100', 'bg-slate-800/50 border-slate-700')}`}>
                 <span className={`text-sm font-semibold ${t('text-slate-600', 'text-slate-300')}`}>Valor Mensal Base</span>
                 <span className={`font-extrabold ${t('text-slate-800', 'text-white')}`}>{formatCurrency(Number(viewingClient.customValue) * (Number(viewingClient.subscriptions) || 1))}</span>
              </div>

              {(viewingClient.appName || viewingClient.appMac) && (
                <div className={`p-4 rounded-2xl border space-y-3 ${t('bg-slate-50 border-slate-200', 'bg-slate-900 border-slate-700')}`}>
                  {viewingClient.appName && (
                    <div>
                      <p className={`text-[10px] uppercase font-bold tracking-widest mb-1 ${t('text-slate-400', 'text-slate-500')}`}>Aplicativo</p>
                      <p className={`font-bold flex items-center gap-2 ${t('text-slate-800', 'text-white')}`}><Monitor size={16} className={t('text-slate-500','text-slate-400')}/> {viewingClient.appName}</p>
                    </div>
                  )}
                  {viewingClient.appMac && (
                    <div className="pt-2">
                      <p className={`text-[10px] uppercase font-bold tracking-widest mb-1 ${t('text-slate-400', 'text-slate-500')}`}>Endereço MAC</p>
                      <div className={`font-mono text-sm px-3 py-2 rounded-lg font-bold flex items-center justify-between ${t('bg-white border border-slate-200 text-slate-700', 'bg-slate-800 border border-slate-600 text-slate-200')}`}>
                        <span className="flex items-center gap-2"><Cpu size={16} className={t('text-slate-400','text-slate-500')}/> {viewingClient.appMac}</span>
                        
                        {/* Botão de Copiar MAC */}
                        <button onClick={handleCopyMac} className={`p-1.5 rounded-md transition active:scale-95 ${t('hover:bg-slate-100 text-blue-600', 'hover:bg-slate-700 text-blue-400')}`} title="Copiar MAC">
                          {copiedMac ? <CheckCircle size={16} className={t('text-emerald-600', 'text-emerald-400')} /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {viewingClient.notes && (
                <div>
                  <p className={`text-[10px] uppercase font-bold tracking-widest mb-1.5 ${t('text-slate-400', 'text-slate-500')}`}>Observações</p>
                  <p className={`text-sm p-3 rounded-xl border leading-relaxed ${t('text-slate-600 bg-yellow-50 border-yellow-100', 'text-slate-300 bg-yellow-500/10 border-yellow-500/20')}`}>
                    {viewingClient.notes}
                  </p>
                </div>
              )}

              <div>
                <p className={`text-[10px] uppercase font-bold tracking-widest mb-2 flex items-center gap-1 ${t('text-slate-400', 'text-slate-500')}`}><FileText size={12}/> Histórico de Pagamentos</p>
                <div className={`rounded-2xl border overflow-hidden ${t('border-slate-200 bg-white', 'border-slate-700 bg-slate-900')}`}>
                  {viewingClient.paymentHistory && viewingClient.paymentHistory.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto p-3 space-y-3">
                      {viewingClient.paymentHistory.map((record) => (
                        <div key={record.id} className={`text-sm border-b pb-3 last:border-0 last:pb-0 relative group ${t('border-slate-100', 'border-slate-700')}`}>
                          <div className={`flex justify-between font-bold pr-8 ${t('text-slate-800', 'text-slate-200')}`}>
                            <span>{formatCurrency(record.amount)}</span>
                            <span className={`text-xs font-normal ${t('text-slate-400', 'text-slate-500')}`}>{formatDate(record.date)}</span>
                          </div>
                          <div className={`text-xs mt-1 ${t('text-slate-500', 'text-slate-400')}`}>
                            Ref: <span className={`font-medium ${t('text-slate-700', 'text-slate-300')}`}>{record.refMonths || `${record.monthsPaid} mês(es)`}</span>
                          </div>
                          {record.discount > 0 && <div className={`text-xs mt-0.5 ${t('text-emerald-600', 'text-emerald-400')}`}>Desconto de {formatCurrency(record.discount)} aplicado.</div>}
                          
                          <button 
                            type="button" 
                            onClick={() => handleUndoPayment(viewingClient, record.id)}
                            className={`absolute top-0 right-0 p-2 rounded-lg transition active:scale-95 ${t('text-slate-300 hover:text-red-500 hover:bg-red-50', 'text-slate-600 hover:text-red-400 hover:bg-red-500/10')}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-sm text-center py-4 ${t('text-slate-400', 'text-slate-500')}`}>Nenhum pagamento registado via app.</p>
                  )}
                </div>
              </div>
            </div>

            <div className={`p-4 border-t flex gap-2 shrink-0 ${t('bg-slate-50 border-slate-100', 'bg-slate-800 border-slate-700')}`}>
               <button 
                  onClick={() => handleOpenModal(viewingClient)} 
                  className={`flex-1 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition active:scale-95 ${t('bg-blue-100 text-blue-700 hover:bg-blue-200', 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30')}`}
                >
                  <Edit2 size={18} /> Editar Dados
               </button>
               {viewingClient.paymentStatus.status !== 'PAID' && viewingClient.paymentStatus.status !== 'ARCHIVED' && (
                 <button 
                    onClick={() => { setViewingClient(null); handleOpenPaymentModal(viewingClient); }} 
                    className={`flex-1 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition active:scale-95 text-white ${t('bg-blue-600 hover:bg-blue-700', 'bg-blue-600 hover:bg-blue-500')}`}
                  >
                    <DollarSign size={18} /> Receber
                 </button>
               )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIÇÃO DE CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className={`w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 flex flex-col max-h-[90vh] transition-colors ${t('bg-white', 'bg-slate-800')}`}>
            <div className={`px-6 py-5 border-b flex justify-between items-center sticky top-0 z-10 shrink-0 ${t('bg-white border-slate-100', 'bg-slate-800 border-slate-700')}`}>
              <h2 className={`text-xl font-bold ${t('text-slate-800', 'text-white')}`}>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button type="button" onClick={handleCloseModal} className={`p-2 rounded-full transition ${t('text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100', 'text-slate-400 hover:text-slate-200 bg-slate-700 hover:bg-slate-600')}`}><X size={20} /></button>
            </div>
            
            <form id="client-form" onSubmit={handleSaveClient} className="p-6 overflow-y-auto flex-1">
              <div className="space-y-5">
                {editingClient && formData.active === false && (
                  <div className={`p-3 rounded-2xl flex items-center justify-between mb-4 border ${t('bg-slate-100 border-slate-200', 'bg-slate-700/50 border-slate-600')}`}>
                    <div className={`flex items-center gap-2 ${t('text-slate-600', 'text-slate-300')}`}><Archive size={16} /><span className="text-sm font-semibold">Cliente Desativado</span></div>
                    <button type="button" onClick={() => setFormData({...formData, active: true})} className={`text-sm font-bold px-3 py-1.5 rounded-lg border shadow-sm transition active:scale-95 ${t('text-blue-600 hover:text-blue-800 bg-white border-slate-200', 'text-blue-400 hover:text-blue-300 bg-slate-800 border-slate-600')}`}>Reativar</button>
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-semibold mb-1.5 ${t('text-slate-700', 'text-slate-300')}`}>Nome do Cliente</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className={`w-full px-4 py-3.5 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${t('border-slate-200 bg-slate-50 text-slate-800', 'border-slate-700 bg-slate-900 text-white')}`} />
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-1.5 ${t('text-slate-700', 'text-slate-300')}`}>Username / Utilizador (Opcional)</label>
                  <input type="text" placeholder="Ex: joao_silva" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className={`w-full px-4 py-3.5 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${t('border-slate-200 bg-slate-50 text-slate-800', 'border-slate-700 bg-slate-900 text-white')}`} />
                </div>
                
                <div className={`p-4 rounded-2xl border ${t('bg-slate-50 border-slate-100', 'bg-slate-900/50 border-slate-700')}`}>
                  <label className={`block text-sm font-semibold mb-1.5 flex items-center gap-1 ${t('text-slate-700', 'text-slate-300')}`}><Monitor size={14}/> Aplicativo Utilizado</label>
                  <input type="text" placeholder="Ex: DuplexPlay, IBO Player..." value={formData.appName} onChange={(e) => setFormData({...formData, appName: e.target.value})} className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors mb-3 ${t('bg-white border-slate-200 text-slate-800', 'bg-slate-800 border-slate-600 text-white')}`} />
                  
                  {formData.appName && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className={`block text-sm font-semibold mb-1.5 flex items-center gap-1 ${t('text-slate-700', 'text-slate-300')}`}><Cpu size={14}/> Endereço MAC</label>
                      <input 
                        type="text" 
                        placeholder="Ex: F8:01:B4..." 
                        value={formData.appMac} 
                        // Aplica a Máscara Automática aqui!
                        onChange={(e) => setFormData({...formData, appMac: formatMAC(e.target.value)})} 
                        className={`w-full font-mono font-bold px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors tracking-widest ${t('bg-white border-slate-200 text-slate-800', 'bg-slate-800 border-slate-600 text-slate-200')}`} 
                      />
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-semibold mb-1.5 ${t('text-slate-700', 'text-slate-300')}`}>Dia Vencimento</label>
                    <input type="number" min="1" max="31" required value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className={`w-full px-4 py-3.5 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${t('border-slate-200 bg-slate-50 text-slate-800', 'border-slate-700 bg-slate-900 text-white')}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold mb-1.5 ${t('text-slate-700', 'text-slate-300')}`}>Assinaturas (Pts)</label>
                    <input type="number" min="0" step="0.5" required value={formData.subscriptions} onChange={(e) => setFormData({...formData, subscriptions: e.target.value})} className={`w-full px-4 py-3.5 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${t('border-slate-200 bg-slate-50 text-slate-800', 'border-slate-700 bg-slate-900 text-white')}`} />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-1.5 ${t('text-slate-700', 'text-slate-300')}`}>Valor da Assinatura (R$)</label>
                  <input type="number" step="0.01" required value={formData.customValue} onChange={(e) => setFormData({...formData, customValue: e.target.value})} className={`w-full px-4 py-3.5 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${t('border-slate-200 bg-slate-50 text-slate-800', 'border-slate-700 bg-slate-900 text-white')}`} />
                </div>

                <div className={`p-4 rounded-2xl border ${t('bg-blue-50/50 border-blue-100', 'bg-blue-500/10 border-blue-500/20')}`}>
                  <label className={`block text-sm font-semibold mb-1.5 ${t('text-slate-700', 'text-slate-300')}`}>Mês da Próxima Cobrança</label>
                  <input type="month" required value={formData.nextPayment} onChange={(e) => setFormData({...formData, nextPayment: e.target.value})} className={`w-full px-4 py-3.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${t('bg-white border-blue-200 text-slate-800', 'bg-slate-800 border-blue-500/30 text-white')}`} />
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-1.5 ${t('text-slate-700', 'text-slate-300')}`}>Observações</label>
                  <textarea rows="2" placeholder="Adicione um detalhe..." value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className={`w-full px-4 py-3.5 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-colors ${t('border-slate-200 bg-slate-50 text-slate-800', 'border-slate-700 bg-slate-900 text-white')}`}></textarea>
                </div>
              </div>
            </form>
            
            <div className={`p-6 border-t shrink-0 transition-colors ${t('bg-white border-slate-100', 'bg-slate-800 border-slate-700')}`}>
              <button form="client-form" type="submit" className={`w-full text-white px-4 py-3.5 rounded-2xl font-bold transition active:scale-95 ${t('bg-slate-800 hover:bg-slate-900', 'bg-blue-600 hover:bg-blue-700')}`}>Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICAÇÕES, DESATIVAR E PAGAMENTO AQUI (MANTIDOS E OCULTOS PARA RESUMO DO ESPAÇO) */}
      
      {isNotificationsOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[80] flex items-end sm:items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 flex flex-col transition-colors ${t('bg-white', 'bg-slate-800')}`}>
            <div className={`px-6 py-5 border-b flex justify-between items-center shrink-0 ${t('bg-white border-slate-100', 'bg-slate-800 border-slate-700')}`}>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${t('text-slate-800', 'text-white')}`}><Bell size={20} className="text-slate-400"/> Notificações</h2>
              <button type="button" onClick={() => setIsNotificationsOpen(false)} className={`p-2 rounded-full transition ${t('text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100', 'text-slate-400 hover:text-slate-200 bg-slate-700 hover:bg-slate-600')}`}><X size={20} /></button>
            </div>
            
            <div className="p-6">
              {hasNotifications ? (
                <div className="flex flex-col gap-3">
                  {stats.today > 0 && (
                    <div onClick={() => { setFilterType('TODAY'); setIsNotificationsOpen(false); }} className={`cursor-pointer p-4 rounded-2xl flex items-center gap-3 active:scale-[0.98] transition border ${t('bg-orange-50 border-orange-100 text-orange-800 hover:bg-orange-100', 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20')}`}>
                      <AlertTriangle size={24} className="text-orange-500 shrink-0" />
                      <div><h4 className="font-bold">Atenção para Hoje</h4><p className="text-sm opacity-90">Você tem {stats.today} cliente(s) a vencer hoje.</p></div>
                    </div>
                  )}
                  {stats.overdue > 0 && (
                    <div onClick={() => { setFilterType('OVERDUE'); setIsNotificationsOpen(false); }} className={`cursor-pointer p-4 rounded-2xl flex items-center gap-3 active:scale-[0.98] transition border ${t('bg-red-50 border-red-100 text-red-800 hover:bg-red-100', 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20')}`}>
                      <AlertCircle size={24} className="text-red-500 shrink-0" />
                      <div><h4 className="font-bold">Pagamentos em Atraso</h4><p className="text-sm opacity-90">{stats.overdue} cliente(s) com mensalidade vencida.</p></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`text-center py-6 ${t('text-slate-500', 'text-slate-400')}`}>
                  <CheckCircle size={40} className="mx-auto mb-3 text-emerald-400 opacity-80" />
                  <p className={`font-medium ${t('text-slate-700', 'text-slate-300')}`}>Tudo limpo por aqui!</p>
                  <p className="text-sm mt-1">Nenhum aviso no momento.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isPaymentModalOpen && payingClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-[2rem] shadow-2xl animate-in zoom-in-95 overflow-hidden transition-colors ${t('bg-white', 'bg-slate-800')}`}>
            <div className="bg-blue-600 p-5 text-white flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold">Registar Recebimento</h2>
                <p className="text-blue-200 text-sm">{payingClient.name}</p>
              </div>
              <button onClick={handleClosePaymentModal} className="p-1.5 text-blue-200 hover:text-white bg-blue-500/50 rounded-full transition"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleConfirmPayment} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-semibold mb-1.5 ${t('text-slate-700', 'text-slate-300')}`}>Quantos meses está a pagar?</label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setPaymentForm(p => ({...p, monthsToPay: Math.max(1, p.monthsToPay - 1)}))} className={`w-10 h-10 rounded-xl font-bold ${t('bg-slate-100 text-slate-600', 'bg-slate-700 text-slate-300')}`}>-</button>
                    <input type="number" min="1" value={paymentForm.monthsToPay} onChange={(e) => setPaymentForm({...paymentForm, monthsToPay: Math.max(1, Number(e.target.value))})} className={`flex-1 text-center px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-lg outline-none transition-colors ${t('border-slate-200 bg-white text-slate-800', 'border-slate-700 bg-slate-900 text-white')}`} />
                    <button type="button" onClick={() => setPaymentForm(p => ({...p, monthsToPay: p.monthsToPay + 1}))} className={`w-10 h-10 rounded-xl font-bold ${t('bg-slate-100 text-slate-600', 'bg-slate-700 text-slate-300')}`}>+</button>
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-1.5 ${t('text-slate-700', 'text-slate-300')}`}>Desconto (R$)</label>
                  <input type="number" step="0.01" min="0" value={paymentForm.discount} onChange={(e) => setPaymentForm({...paymentForm, discount: e.target.value})} className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${t('border-slate-200 bg-slate-50 text-slate-800', 'border-slate-700 bg-slate-900 text-white')}`} />
                </div>

                <div className={`p-4 rounded-xl border space-y-2 mt-2 transition-colors ${t('bg-slate-50 border-slate-100', 'bg-slate-900 border-slate-700')}`}>
                  <div className={`flex justify-between text-sm border-b pb-2 mb-2 ${t('text-slate-500 border-slate-200', 'text-slate-400 border-slate-700')}`}>
                    <span>O valor entrará no caixa de:</span>
                    <span className={`font-bold capitalize ${t('text-blue-600', 'text-blue-400')}`}>{formatMonthYear(currentViewMonth).split(' ')[0]}</span>
                  </div>
                  <div className={`flex justify-between text-sm ${t('text-slate-500', 'text-slate-400')}`}>
                    <span>Subtotal ({paymentForm.monthsToPay}x)</span>
                    <span>{formatCurrency((Number(payingClient.customValue) || globalUnitValue) * (Number(payingClient.subscriptions) || 1) * paymentForm.monthsToPay)}</span>
                  </div>
                  {paymentForm.discount > 0 && (
                     <div className={`flex justify-between text-sm ${t('text-emerald-600', 'text-emerald-400')}`}>
                     <span>Desconto</span><span>- {formatCurrency(paymentForm.discount)}</span>
                   </div>
                  )}
                  <div className={`flex justify-between font-bold text-lg pt-2 border-t ${t('text-slate-800 border-slate-200', 'text-slate-200 border-slate-700')}`}>
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

      {paymentReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-[2rem] shadow-2xl animate-in zoom-in-95 overflow-hidden p-6 transition-colors text-center ${t('bg-white', 'bg-slate-800')}`}>
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${t('bg-emerald-100 text-emerald-500', 'bg-emerald-500/20 text-emerald-400')}`}><CheckCircle size={40} strokeWidth={2.5} /></div>
            <h2 className={`text-xl font-extrabold mb-1 ${t('text-slate-800', 'text-white')}`}>Pagamento Registado!</h2>
            <p className={`text-sm mb-6 ${t('text-slate-500', 'text-slate-400')}`}>A renovação de {paymentReceipt.clientName} foi concluída com sucesso.</p>

            <div className={`text-left p-4 rounded-2xl border mb-6 text-sm whitespace-pre-wrap leading-relaxed ${t('bg-slate-50 border-slate-200 text-slate-700', 'bg-slate-900 border-slate-700 text-slate-300')}`}>
              Olá <strong>{paymentReceipt.clientName}</strong>, tudo bem? 🚀<br/>
              O seu pagamento foi recebido e a renovação de <strong>{paymentReceipt.months} mês(es)</strong> foi concluída com sucesso! Muito obrigado!<br/><br/>
              📅 O seu próximo vencimento será no <strong>dia {paymentReceipt.dueDate} de {paymentReceipt.nextMonthName}</strong>.<br/><br/>
              Qualquer dúvida, estamos à disposição!
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={handleCopyReceipt} className={`w-full py-4 font-bold rounded-2xl transition active:scale-95 flex items-center justify-center gap-2 ${isCopied ? t('bg-emerald-500 text-white', 'bg-emerald-600 text-white') : t('bg-blue-600 text-white hover:bg-blue-700', 'bg-blue-600 text-white hover:bg-blue-700')}`}>
                {isCopied ? <CheckCircle size={18} /> : <Copy size={18} />} {isCopied ? 'Mensagem Copiada!' : 'Copiar para Enviar'}
              </button>
              <button onClick={() => setPaymentReceipt(null)} className={`w-full py-3.5 font-bold rounded-2xl transition active:scale-95 ${t('bg-slate-100 text-slate-600 hover:bg-slate-200', 'bg-slate-700 text-slate-300 hover:bg-slate-600')}`}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL DE PERFIL / CONFIGURAÇÕES E SERVIDORES */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-[2rem] shadow-2xl animate-in zoom-in-95 p-6 flex flex-col max-h-[90vh] transition-colors ${t('bg-white', 'bg-slate-800')}`}>
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className={`text-xl font-bold ${t('text-slate-800', 'text-white')}`}>Conta e Servidores</h2>
              <button onClick={() => setIsConfigModalOpen(false)} className={`p-2 rounded-full transition ${t('text-slate-400 hover:bg-slate-50', 'text-slate-400 hover:bg-slate-700')}`}><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6 pb-4 pr-1">
              <div className={`flex flex-col items-center p-4 rounded-2xl border transition-colors ${t('bg-slate-50 border-slate-100', 'bg-slate-900 border-slate-700')}`}>
                <div className={`w-16 h-16 rounded-full mb-3 flex items-center justify-center shadow-sm border ${t('bg-blue-100 text-blue-600 border-blue-200', 'bg-blue-900/50 text-blue-400 border-blue-800')}`}><User size={32} /></div>
                <p className={`font-bold ${t('text-slate-800', 'text-white')}`}>Conta Admin</p>
                <p className={`text-xs ${t('text-slate-500', 'text-slate-400')}`}>{user.email}</p>
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${t('text-slate-700', 'text-slate-300')}`}>Valor Base da Assinatura (R$)</label>
                <input type="number" step="0.01" value={globalUnitValue} onChange={(e) => setGlobalUnitValue(Number(e.target.value))} className={`w-full px-4 py-4 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-xl font-bold transition-colors ${t('border-slate-200 bg-slate-50 text-slate-800', 'border-slate-700 bg-slate-900 text-white')}`} />
              </div>

              {/* NOVA SEÇÃO: SERVIDORES */}
              <div className={`pt-6 border-t ${t('border-slate-100', 'border-slate-700')}`}>
                <h3 className={`font-bold mb-4 flex items-center gap-2 ${t('text-slate-800', 'text-white')}`}><Server size={18} /> Servidores / Links</h3>
                
                {/* Lista de Servidores */}
                <div className="space-y-3 mb-4">
                  {servers.length === 0 ? (
                    <p className={`text-sm text-center py-2 ${t('text-slate-400', 'text-slate-500')}`}>Nenhum servidor guardado.</p>
                  ) : (
                    servers.map(server => (
                      <div key={server.id} className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-colors ${t('bg-white border-slate-200', 'bg-slate-800 border-slate-700')}`}>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm truncate ${t('text-slate-800', 'text-white')}`}>{server.name}</p>
                          <p className={`text-xs truncate ${t('text-blue-500', 'text-blue-400')}`}>{server.url}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button 
                            onClick={() => handleCopyServer(server.url, server.id)} 
                            className={`p-2 rounded-lg transition active:scale-95 ${t('bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600', 'bg-slate-900 hover:bg-slate-700 text-slate-400 hover:text-blue-400')}`}
                          >
                            {copiedServerId === server.id ? <CheckCircle size={16} className={t('text-emerald-500', 'text-emerald-400')} /> : <Copy size={16} />}
                          </button>
                          <button 
                            onClick={() => handleDeleteServer(server.id)} 
                            className={`p-2 rounded-lg transition active:scale-95 ${t('bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-500', 'bg-slate-900 hover:bg-slate-700 text-slate-400 hover:text-red-400')}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Form Adicionar Servidor */}
                <form onSubmit={handleAddServer} className={`p-4 rounded-xl border space-y-3 ${t('bg-slate-50 border-slate-200', 'bg-slate-900 border-slate-700')}`}>
                  <p className={`text-xs font-bold uppercase tracking-widest ${t('text-slate-400', 'text-slate-500')}`}>Adicionar Novo Link</p>
                  <input type="text" placeholder="Nome (Ex: Servidor Principal)" value={newServerName} onChange={e => setNewServerName(e.target.value)} required className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${t('bg-white border-slate-200 text-slate-800', 'bg-slate-800 border-slate-600 text-white')}`} />
                  <div className="flex gap-2">
                    <input type="url" placeholder="https://..." value={newServerUrl} onChange={e => setNewServerUrl(e.target.value)} required className={`flex-1 px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${t('bg-white border-slate-200 text-slate-800', 'bg-slate-800 border-slate-600 text-white')}`} />
                    <button type="submit" className={`px-4 py-2.5 text-white text-sm font-bold rounded-lg transition active:scale-95 ${t('bg-slate-800 hover:bg-slate-900', 'bg-blue-600 hover:bg-blue-700')}`}>
                      <Plus size={18} />
                    </button>
                  </div>
                </form>
              </div>

              <div className={`pt-4 border-t ${t('border-slate-100', 'border-slate-700')}`}>
                <button onClick={handleLogout} className={`w-full py-4 font-bold rounded-2xl transition active:scale-95 flex items-center justify-center gap-2 ${t('bg-red-50 text-red-600 hover:bg-red-100', 'bg-red-500/10 text-red-400 hover:bg-red-500/20')}`}>
                  <LogOut size={18} /> Sair da Conta
                </button>
              </div>
            </div>
            
            <div className="pt-4 shrink-0">
              <button onClick={() => setIsConfigModalOpen(false)} className={`w-full text-white px-4 py-4 rounded-2xl font-bold transition active:scale-95 ${t('bg-slate-800 hover:bg-slate-900', 'bg-blue-600 hover:bg-blue-700')}`}>Concluído</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
