import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Edit2, Trash2, DollarSign, 
  Users, Calendar,
  AlertCircle, AlertTriangle, CheckCircle, Clock, FileText, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, X, Bell, User, Archive, LayoutDashboard, Cloud, CloudOff
} from 'lucide-react';

// Importações do Firebase SDK v11
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

// Suas credenciais reais do Firebase
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

const initialData = [
  { id: '1', name: 'Alessandra', dueDate: 2, paidMonths: 0, subscriptions: 2, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '2', name: 'Aliatar - 10', dueDate: 10, paidMonths: 0, subscriptions: 3, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '3', name: 'André', dueDate: 5, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '4', name: 'Andrea', dueDate: 6, paidMonths: 0, subscriptions: 2, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '5', name: 'Basílio', dueDate: 14, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '6', name: 'Beto', dueDate: 12, paidMonths: 0, subscriptions: 2, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '7', name: 'Cris Eliel - 01', dueDate: 1, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '8', name: 'Danilo - 13', dueDate: 29, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '9', name: 'Darlan', dueDate: 12, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '10', name: 'David - 28', dueDate: 5, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '11', name: 'Dayana - 7', dueDate: 29, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '12', name: 'Demontie - 05', dueDate: 5, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '13', name: 'Edilson - 06', dueDate: 12, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '14', name: 'Eduardo', dueDate: 5, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '15', name: 'Eliel - 12', dueDate: 12, paidMonths: 0, subscriptions: 2, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '16', name: 'Eliene', dueDate: 26, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '17', name: 'Everaldo', dueDate: 2, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '18', name: 'Fabiana - 30', dueDate: 30, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '19', name: 'Fabiana pai', dueDate: 9, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '20', name: 'Fabrício - 11', dueDate: 11, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '21', name: 'Fernandes', dueDate: 14, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '22', name: 'Francilucia', dueDate: 1, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '23', name: 'Gaúcho - 30', dueDate: 25, paidMonths: 0, subscriptions: 3, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '24', name: 'Jefferson Andrade - 24', dueDate: 19, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '25', name: 'João Henrique - 06', dueDate: 6, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '26', name: 'Jp nobre', dueDate: 4, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '27', name: 'Jocinei - 25', dueDate: 22, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '28', name: 'José Filho - 04 e 10', dueDate: 27, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '29', name: 'Jonathan', dueDate: 1, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '30', name: 'Kleber', dueDate: 9, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '31', name: 'Levy - 08', dueDate: 17, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '32', name: 'Lilica - 05', dueDate: 5, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '33', name: 'Lucas - 18', dueDate: 21, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '34', name: 'Luiz Carlos - 15', dueDate: 15, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '35', name: 'Maju', dueDate: 6, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '36', name: 'Maju JP', dueDate: 6, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '37', name: 'Marcos - 05', dueDate: 5, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '38', name: 'Matheus - 23', dueDate: 23, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '39', name: 'Mauro - 02', dueDate: 2, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '40', name: 'Mayara - 15', dueDate: 17, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '41', name: 'Murilo - 12', dueDate: 23, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '42', name: 'Nagila - 04', dueDate: 10, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '43', name: 'Nilton Jr - 18', dueDate: 28, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '44', name: 'Nilton mãe - 7', dueDate: 24, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '45', name: 'Nonato', dueDate: 27, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '46', name: 'Paulo César - 09', dueDate: 19, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '47', name: 'Paulo LC - 08', dueDate: 1, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '48', name: 'Primo ok - 04', dueDate: 4, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '49', name: 'Priscila - 28', dueDate: 17, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '50', name: 'Rene', dueDate: 17, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '51', name: 'Rilder - 5', dueDate: 5, paidMonths: 0, subscriptions: 2, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '52', name: 'Robson - 18', dueDate: 29, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '53', name: 'Silvana - 18', dueDate: 23, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '54', name: 'Simone - 14', dueDate: 8, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '55', name: 'Steffanie - 26', dueDate: 26, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '56', name: 'Tico - 05', dueDate: 5, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '57', name: 'Tom', dueDate: 5, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '58', name: 'Valber - 13', dueDate: 25, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '59', name: 'Wagner - 28', dueDate: 15, paidMonths: 0, subscriptions: 3, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '60', name: 'Wellington W -29', dueDate: 29, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '61', name: 'Wendell Wvieira - 15', dueDate: 15, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '62', name: 'Wendell familia', dueDate: 5, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '63', name: 'Wenderson - 14', dueDate: 31, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true },
  { id: '64', name: 'Zaranza', dueDate: 1, paidMonths: 0, subscriptions: 1, customValue: 30, paymentHistory: [], notes: '', active: true }
];

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
  const [isSynced, setIsSynced] = useState(false);
  const [clients, setClients] = useState([]);
  const [globalUnitValue, setGlobalUnitValue] = useState(30.00);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); 
  
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
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Erro na autenticação:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const clientsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');

    const unsubscribe = onSnapshot(clientsCollectionRef, (snapshot) => {
      const items = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });

      if (items.length > 0) {
        setClients(items);
      } else {
        initialData.forEach(async (client) => {
          try {
            await addDoc(clientsCollectionRef, client);
          } catch (e) {
            console.error("Erro ao popular dados:", e);
          }
        });
        setClients(initialData);
      }
      setIsSynced(true);
    }, (error) => {
      console.error("Erro ao sincronizar com Firestore:", error);
      setIsSynced(false);
    });

    return () => unsubscribe();
  }, [user]);

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
    const [viewYear, viewMonth] = viewMonthStr.split('-').map(Number);
    const [nextYear, nextMonth] = (client.nextPayment || getRealTodayString()).split('-').map(Number);
    
    const viewAbsMonth = viewYear * 12 + viewMonth;
    const nextAbsMonth = nextYear * 12 + nextMonth;

    if (nextAbsMonth > viewAbsMonth) {
      return { status: 'PAID', label: 'Pago', color: 'text-emerald-700 bg-emerald-100 border-emerald-200', icon: CheckCircle, urgency: 4, diffDays: 0 };
    }

    if (client.active === false) {
      return { status: 'ARCHIVED', label: 'Inativo', color: 'text-slate-500 bg-slate-100', icon: Archive, urgency: 99, diffDays: 0 };
    }

    const [realYear, realMonth] = getRealTodayString().split('-').map(Number);
    const realAbsMonth = realYear * 12 + realMonth;

    let dueDay = client.dueDate;
    const daysInViewMonth = new Date(viewYear, viewMonth, 0).getDate();
    if (dueDay > daysInViewMonth) dueDay = daysInViewMonth;

    if (viewAbsMonth === nextAbsMonth) {
      if (viewAbsMonth === realAbsMonth) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDateObj = new Date(viewYear, viewMonth - 1, dueDay);
        dueDateObj.setHours(0, 0, 0, 0);
        const diffTime = dueDateObj - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { status: 'OVERDUE', label: `Vencido (${Math.abs(diffDays)}d)`, color: 'text-red-700 bg-red-100 border-red-200', icon: AlertCircle, urgency: 1, diffDays };
        if (diffDays === 0) return { status: 'TODAY', label: 'Vence Hoje!', color: 'text-orange-700 bg-orange-100 border-orange-200 animate-pulse', icon: AlertTriangle, urgency: 2, diffDays };
        if (diffDays <= 7) return { status: 'SOON', label: `Vence em ${diffDays}d`, color: 'text-yellow-700 bg-yellow-100 border-yellow-200', icon: Clock, urgency: 3, diffDays };
        return { status: 'PENDING', label: 'A Vencer', color: 'text-blue-700 bg-blue-100 border-blue-200', icon: Calendar, urgency: 3.5, diffDays };
      } 
      else if (viewAbsMonth < realAbsMonth) {
         return { status: 'OVERDUE', label: `Vencido`, color: 'text-red-700 bg-red-100 border-red-200', icon: AlertCircle, urgency: 1, diffDays: -1 };
      } else {
         return { status: 'PENDING', label: 'A Vencer', color: 'text-blue-700 bg-blue-100 border-blue-200', icon: Calendar, urgency: 3.5, diffDays: 10 };
      }
    }

    if (nextAbsMonth < viewAbsMonth) {
       return { status: 'OVERDUE_MULTIPLE', label: 'Em Atraso', color: 'text-red-700 bg-red-100 border-red-200 font-bold', icon: AlertCircle, urgency: 0, diffDays: -30 };
    }

    return { status: 'UNKNOWN', label: '?', color: 'text-gray-700 bg-gray-100', icon: CheckCircle, urgency: 5, diffDays: 0 };
  };

  const processedClients = useMemo(() => {
    let list = clients.map(c => ({
      ...c,
      paymentStatus: getClientStatus(c, currentViewMonth)
    })).filter(c => c.paymentStatus.status !== 'ARCHIVED');

    if (searchTerm) {
      list = list.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (filterType === 'OVERDUE') list = list.filter(c => c.paymentStatus.status.includes('OVERDUE'));
    if (filterType === 'TODAY') list = list.filter(c => c.paymentStatus.status === 'TODAY');
    if (filterType === 'UPCOMING') list = list.filter(c => ['SOON', 'PENDING'].includes(c.paymentStatus.status));
    if (filterType === 'PAID') list = list.filter(c => c.paymentStatus.status === 'PAID');

    list.sort((a, b) => {
      if (a.paymentStatus.urgency !== b.paymentStatus.urgency) {
        return a.paymentStatus.urgency - b.paymentStatus.urgency;
      }
      return a.paymentStatus.diffDays - b.paymentStatus.diffDays;
    });

    return list;
  }, [clients, searchTerm, filterType, currentViewMonth]);

  const stats = useMemo(() => {
    let overdue = 0; let today = 0; let soon = 0; let pending = 0; let activeSubs = 0; let expectedRevenue = 0; let collectedRevenue = 0;
    
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
        if (status === 'PAID') collectedRevenue += (subs * val);
      }
    });

    return { overdue, today, soon, pending, activeSubs, expectedRevenue, collectedRevenue };
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
      console.error("Erro ao gravar cliente no Firebase:", err);
      alert("Erro ao salvar dados na nuvem.");
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

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (dateString) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-800 font-sans">
      
      {/* CABEÇALHO */}
      <div className="px-5 pt-10 pb-6 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-200 shrink-0">
            <LayoutDashboard size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">App Cloud</p>
              {isSynced ? (
                <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-medium" title="Sincronizado com a Nuvem">
                  <Cloud size={10} /> Nuvem Ativa
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium">
                  <CloudOff size={10} /> A ligar...
                </span>
              )}
            </div>
            <h1 className="text-[1.05rem] font-extrabold text-slate-800 leading-tight">
              Sistema de Gerenciamento<br/>de Clientes
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => setIsNotificationsOpen(true)}
            className="p-2.5 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50 relative transition active:scale-95"
          >
            {hasNotifications && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
            <Bell size={20} />
          </button>
          <button onClick={() => setIsConfigModalOpen(true)} className="p-2.5 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition active:scale-95">
            <User size={20} />
          </button>
        </div>
      </div>

      {/* CARDS DE INFORMAÇÕES */}
      <div className="px-5 mb-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-[1.25rem] shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100/60 flex items-center justify-center text-indigo-600 shrink-0">
              <Users size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-800 leading-none mb-1 tracking-tight">
                {stats.activeSubs}
              </p>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Ativos (Pts)</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-[1.25rem] shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100/60 flex items-center justify-center text-emerald-600 shrink-0">
              <DollarSign size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-800 leading-none mb-1 tracking-tight">
                {formatCurrency(stats.collectedRevenue)}
              </p>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Arrecadado</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-red-50 p-3 rounded-2xl border border-red-100 flex flex-col gap-1 justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10 text-red-500"><AlertCircle size={32} /></div>
            <div className="flex items-center gap-1.5 text-red-600 relative z-10">
                <AlertCircle size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Atrasados</span>
            </div>
            <span className="text-2xl font-extrabold text-red-700 relative z-10">{stats.overdue}</span>
          </div>
          
          <div className="bg-orange-50 p-3 rounded-2xl border border-orange-100 flex flex-col gap-1 justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10 text-orange-500"><AlertTriangle size={32} /></div>
            <div className="flex items-center gap-1.5 text-orange-600 relative z-10">
                <AlertTriangle size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Hoje</span>
            </div>
            <span className="text-2xl font-extrabold text-orange-700 relative z-10">{stats.today}</span>
          </div>

          <div className="bg-yellow-50 p-3 rounded-2xl border border-yellow-100 flex flex-col gap-1 justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10 text-yellow-500"><Clock size={32} /></div>
            <div className="flex items-center gap-1.5 text-yellow-600 relative z-10">
                <Clock size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Em 7 dias</span>
            </div>
            <span className="text-2xl font-extrabold text-yellow-700 relative z-10">{stats.soon}</span>
          </div>

          <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 flex flex-col gap-1 justify-center relative overflow-hidden">
             <div className="absolute top-0 right-0 p-2 opacity-10 text-blue-500"><Calendar size={32} /></div>
            <div className="flex items-center gap-1.5 text-blue-600 relative z-10">
                <Calendar size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">A Vencer</span>
            </div>
            <span className="text-2xl font-extrabold text-blue-700 relative z-10">{stats.pending}</span>
          </div>
        </div>
      </div>

      {/* CALENDÁRIO */}
      <div className="px-5 mb-8">
        <div className="bg-white rounded-[1.5rem] p-2 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center justify-between">
          <button onClick={() => handleMonthChange(-1)} className="p-3 text-slate-400 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition">
            <ChevronLeft size={22}/>
          </button>
          <div className="text-center flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-0.5">Competência</span>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-800 text-lg capitalize">{formatMonthYear(currentViewMonth)}</span>
              {!isCurrentRealMonth && <span className="w-2 h-2 rounded-full bg-orange-400" title="Não é o mês atual"></span>}
            </div>
          </div>
          <button onClick={() => handleMonthChange(1)} className="p-3 text-slate-400 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition">
            <ChevronRight size={22}/>
          </button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="px-5 space-y-5">
        <div>
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base shadow-sm transition"
              placeholder="Pesquisar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {['ALL', 'OVERDUE', 'TODAY', 'UPCOMING', 'PAID'].map((type) => {
              const labels = { ALL: 'Todos', OVERDUE: 'Em Atraso', TODAY: 'Hoje', UPCOMING: 'A Vencer', PAID: 'Pagos' };
              if (!isCurrentRealMonth && ['TODAY'].includes(type)) return null;
              
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                    filterType === type 
                    ? 'bg-slate-800 text-white' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
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
            
            return (
              <div key={client.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3 relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  isPaid ? 'bg-emerald-500' : 
                  client.paymentStatus.status.includes('OVERDUE') ? 'bg-red-500' : 
                  client.paymentStatus.status === 'TODAY' ? 'bg-orange-500' : 
                  client.paymentStatus.status === 'SOON' ? 'bg-yellow-500' : 'bg-blue-500'
                }`}></div>

                <div className="flex justify-between items-start pl-2">
                  <div className="flex-1 cursor-pointer" onClick={() => handleOpenModal(client)}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-bold text-lg text-slate-800">{client.name}</h3>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${client.paymentStatus.color}`}>
                        <StatusIcon size={12} />
                        {client.paymentStatus.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><Calendar size={14} className="text-slate-400"/> Dia {client.dueDate}</span>
                      <span className="flex items-center gap-1"><Users size={14} className="text-slate-400"/> {client.subscriptions} pt</span>
                      <span className="flex items-center gap-1 text-slate-400 font-medium">{formatCurrency(clientVal * (Number(client.subscriptions) || 1))}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={(e) => requestDelete(e, client)} 
                      className="p-2.5 text-red-500 bg-red-50 hover:bg-red-100 transition active:scale-90 rounded-xl"
                      title="Excluir/Arquivar Cliente"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleOpenModal(client)} 
                      className="p-2.5 text-indigo-500 bg-indigo-50 hover:bg-indigo-100 transition active:scale-90 rounded-xl"
                      title="Editar Cliente"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>

                {client.notes && (
                  <div className="pl-2 mt-1">
                    <p className="text-xs text-slate-500 italic flex gap-1 items-start bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <FileText size={12} className="mt-0.5 shrink-0 opacity-70"/>
                      {client.notes}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-50 pl-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-500">
                      Total recebido: <strong className="text-slate-700">{client.paidMonths || 0}x</strong>
                    </span>
                  </div>
                  {!isPaid && (
                    <button 
                      onClick={() => handleOpenPaymentModal(client)}
                      className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-100 active:scale-95 transition shadow-sm border border-indigo-100"
                    >
                      <DollarSign size={16} /> Receber
                    </button>
                  )}
                  {isPaid && (
                    <span className="text-emerald-600 text-sm font-bold flex items-center gap-1">
                      <CheckCircle size={16}/> Recebido
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {processedClients.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <CheckCircle size={48} className="mx-auto mb-3 text-slate-300 opacity-50" />
              <p>Nenhum cliente encontrado para esta seleção.</p>
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={() => handleOpenModal()}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-300 hover:bg-indigo-700 active:scale-90 transition-transform z-10"
      >
        <Plus size={28} />
      </button>

      {/* MODAIS */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[80] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Bell size={20} className="text-slate-400"/> Notificações</h2>
              <button type="button" onClick={() => setIsNotificationsOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition"><X size={20} /></button>
            </div>
            
            <div className="p-6">
              {hasNotifications ? (
                <div className="flex flex-col gap-3">
                  {stats.today > 0 && (
                    <div 
                      onClick={() => { setFilterType('TODAY'); setIsNotificationsOpen(false); }} 
                      className="cursor-pointer bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-center gap-3 text-orange-800 active:scale-[0.98] transition hover:bg-orange-100"
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
                      className="cursor-pointer bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-800 active:scale-[0.98] transition hover:bg-red-100"
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
                <div className="text-center py-6 text-slate-500">
                  <CheckCircle size={40} className="mx-auto mb-3 text-emerald-400 opacity-80" />
                  <p className="font-medium text-slate-700">Tudo limpo por aqui!</p>
                  <p className="text-sm mt-1">Nenhum aviso no momento.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {clientToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl animate-in zoom-in-95 overflow-hidden p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                <Archive size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Desativar Cliente?</h2>
              <p className="text-slate-500 mb-6 text-sm">
                <strong>{clientToDelete.name}</strong> sairá da lista principal e deixará de ser cobrado(a), mas os <strong>pagamentos antigos continuarão salvos</strong>.
              </p>
              
              <div className="flex gap-3 w-full mb-3">
                <button onClick={() => setClientToDelete(null)} className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition active:scale-95">Cancelar</button>
                <button onClick={confirmArchive} className="flex-1 py-3.5 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition active:scale-95 flex items-center justify-center gap-2"><Archive size={18}/> Desativar</button>
              </div>
              
              <button onClick={confirmHardDelete} className="text-xs text-slate-400 hover:text-red-500 underline py-2 mt-2 transition">
                 Excluir permanentemente (apaga o histórico)
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
              <h2 className="text-xl font-bold text-slate-800">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button type="button" onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition"><X size={20} /></button>
            </div>
            
            <form id="client-form" onSubmit={handleSaveClient} className="p-6 overflow-y-auto flex-1">
              <div className="space-y-5">
                
                {editingClient && formData.active === false && (
                  <div className="bg-slate-100 border border-slate-200 p-3 rounded-2xl flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-slate-600">
                       <Archive size={16} />
                       <span className="text-sm font-semibold">Cliente Desativado</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, active: true})} 
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition active:scale-95"
                    >
                      Reativar
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome do Cliente</label>
                  <input type="text" required className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Dia Vencimento</label>
                    <input type="number" min="1" max="31" required className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assinaturas (Pts)</label>
                    <input type="number" min="0" step="0.5" required className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none" value={formData.subscriptions} onChange={(e) => setFormData({...formData, subscriptions: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Valor da Assinatura (R$)</label>
                  <input type="number" step="0.01" required className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none" value={formData.customValue} onChange={(e) => setFormData({...formData, customValue: e.target.value})} />
                </div>

                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mês da Próxima Cobrança</label>
                  <input type="month" required className="w-full px-4 py-3.5 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white outline-none" value={formData.nextPayment} onChange={(e) => setFormData({...formData, nextPayment: e.target.value})} />
                  <p className="text-[11px] text-indigo-600/70 mt-2 leading-tight">Define quando o status voltará a ser "A Vencer".</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Observações</label>
                  <textarea 
                    className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none resize-none" 
                    rows="2" 
                    placeholder="Adicione um detalhe sobre o plano, descontos, etc..."
                    value={formData.notes} 
                    onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                  ></textarea>
                </div>

                {editingClient && (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <button type="button" onClick={() => setShowHistory(!showHistory)} className="w-full px-4 py-3 bg-slate-50 flex justify-between items-center text-sm font-semibold text-slate-700">
                      <span className="flex items-center gap-2"><FileText size={16} /> Histórico de Pagamentos</span>
                      {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    
                    {showHistory && (
                      <div className="p-4 bg-white border-t border-slate-200 max-h-56 overflow-y-auto">
                        {formData.paymentHistory && formData.paymentHistory.length > 0 ? (
                          <div className="space-y-4">
                            {formData.paymentHistory.map((record) => (
                              <div key={record.id} className="text-sm border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                                <div className="flex justify-between font-bold text-slate-800">
                                  <span>{formatCurrency(record.amount)}</span>
                                  <span className="text-slate-400 text-xs font-normal">{formatDate(record.date)}</span>
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  Ref: <span className="font-medium text-slate-700">{record.refMonths || `${record.monthsPaid} mês(es)`}</span>
                                </div>
                                {record.discount > 0 && <div className="text-xs text-emerald-600 mt-0.5">Desconto de {formatCurrency(record.discount)} aplicado.</div>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 text-center py-2">Nenhum pagamento registado via app.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>
            
            <div className="p-6 bg-white border-t border-slate-100 shrink-0">
              <button form="client-form" type="submit" className="w-full bg-slate-800 text-white px-4 py-3.5 rounded-2xl font-bold hover:bg-slate-900 transition active:scale-95">Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}

      {isPaymentModalOpen && payingClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl animate-in zoom-in-95 overflow-hidden">
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold">Registar Recebimento</h2>
                <p className="text-indigo-200 text-sm">{payingClient.name}</p>
              </div>
              <button onClick={handleClosePaymentModal} className="p-1.5 text-indigo-200 hover:text-white bg-indigo-500/50 rounded-full transition"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleConfirmPayment} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Quantos meses está a pagar?</label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setPaymentForm(p => ({...p, monthsToPay: Math.max(1, p.monthsToPay - 1)}))} className="w-10 h-10 rounded-xl bg-slate-100 font-bold text-slate-600">-</button>
                    <input type="number" min="1" className="flex-1 text-center px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-lg" value={paymentForm.monthsToPay} onChange={(e) => setPaymentForm({...paymentForm, monthsToPay: Math.max(1, Number(e.target.value))})} />
                    <button type="button" onClick={() => setPaymentForm(p => ({...p, monthsToPay: p.monthsToPay + 1}))} className="w-10 h-10 rounded-xl bg-slate-100 font-bold text-slate-600">+</button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Desconto (R$)</label>
                  <input type="number" step="0.01" min="0" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none" value={paymentForm.discount} onChange={(e) => setPaymentForm({...paymentForm, discount: e.target.value})} />
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 mt-2">
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Subtotal ({paymentForm.monthsToPay}x)</span>
                    <span>{formatCurrency((Number(payingClient.customValue) || globalUnitValue) * (Number(payingClient.subscriptions) || 1) * paymentForm.monthsToPay)}</span>
                  </div>
                  {paymentForm.discount > 0 && (
                     <div className="flex justify-between text-sm text-emerald-600">
                     <span>Desconto</span><span>- {formatCurrency(paymentForm.discount)}</span>
                   </div>
                  )}
                  <div className="flex justify-between font-bold text-lg text-slate-800 pt-2 border-t border-slate-200">
                    <span>Total a Receber</span>
                    <span>{formatCurrency(Math.max(0, ((Number(payingClient.customValue) || globalUnitValue) * (Number(payingClient.subscriptions) || 1) * paymentForm.monthsToPay) - paymentForm.discount))}</span>
                  </div>
                </div>
              </div>
              
              <button type="submit" className="w-full mt-6 bg-indigo-600 text-white px-4 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition active:scale-95 flex items-center justify-center gap-2">
                <CheckCircle size={20} /> Confirmar Pagamento
              </button>
            </form>
          </div>
        </div>
      )}

      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl animate-in zoom-in-95 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Perfil e Configurações</h2>
              <button onClick={() => setIsConfigModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Valor Base da Assinatura (R$)</label>
                <input type="number" step="0.01" className="w-full px-4 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none text-xl font-bold text-slate-800" value={globalUnitValue} onChange={(e) => setGlobalUnitValue(Number(e.target.value))} />
              </div>
              <button onClick={() => setIsConfigModalOpen(false)} className="w-full mt-6 bg-slate-800 text-white px-4 py-4 rounded-2xl font-bold hover:bg-slate-900 transition active:scale-95">Salvar e Concluir</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

