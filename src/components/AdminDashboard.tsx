import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Printer,
  Users,
  CheckSquare,
  History,
  AlertTriangle,
  Plus,
  Trash2,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  MapPin,
  Cpu,
  RefreshCw,
  LogOut,
  Sliders,
  TrendingDown,
  Lock,
  ChevronRight,
  ShieldAlert,
  Check,
  Menu,
  X,
  Pencil
} from 'lucide-react';
import {
  Printer as PrinterType,
  Technician,
  Note,
  ChangeRequest,
  InterventionLog,
  PrinterStatus,
  LoggedInUser
} from '../types';

interface AdminDashboardProps {
  user: LoggedInUser;
  printers: PrinterType[];
  technicians: Technician[];
  changeRequests: ChangeRequest[];
  interventionLogs: InterventionLog[];
  notes: Note[];
  onLogout: () => void;
  // State mutators (passed from parent App component)
  onAddPrinter: (p: Omit<PrinterType, 'qr_code_url'>) => void;
  onUpdatePrinter: (p: PrinterType) => void;
  onDeletePrinter: (id: string) => void;
  onAddTechnician: (t: Omit<Technician, 'id' | 'created_at'>) => void;
  onDeleteTechnician: (id: string) => void;
  onApproveRequest: (id: string) => void;
  onRejectRequest: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onDeleteLog: (id: string) => void;
  dbMode?: 'supabase' | 'local';
  syncError?: string | null;
}

export default function AdminDashboard({
  user,
  printers,
  technicians,
  changeRequests,
  interventionLogs,
  notes,
  onLogout,
  onAddPrinter,
  onUpdatePrinter,
  onDeletePrinter,
  onAddTechnician,
  onDeleteTechnician,
  onApproveRequest,
  onRejectRequest,
  onDeleteNote,
  onDeleteLog,
  dbMode = 'local',
  syncError = null,
}: AdminDashboardProps) {
  const isSuperAdmin = user.role === 'super_admin';

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'printers' | 'technicians' | 'requests' | 'history'>('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleTabSelect = (tab: 'overview' | 'printers' | 'technicians' | 'requests' | 'history') => {
    setActiveTab(tab);
    setIsMobileSidebarOpen(false);
  };

  // Search & Filter state for printers
  const [printerSearch, setPrinterSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // New Printer form state
  const [showAddPrinterModal, setShowAddPrinterModal] = useState(false);
  const [newPrinterName, setNewPrinterName] = useState('');
  const [newPrinterDept, setNewPrinterDept] = useState('');
  const [newPrinterLoc, setNewPrinterLoc] = useState('');
  const [newPrinterBrand, setNewPrinterBrand] = useState('');
  const [newPrinterIP, setNewPrinterIP] = useState('');
  const [newPrinterMAC, setNewPrinterMAC] = useState('');
  const [newPrinterCyan, setNewPrinterCyan] = useState(100);
  const [newPrinterMagenta, setNewPrinterMagenta] = useState(100);
  const [newPrinterYellow, setNewPrinterYellow] = useState(100);
  const [newPrinterBlack, setNewPrinterBlack] = useState(100);
  const [newPrinterStatus, setNewPrinterStatus] = useState<PrinterStatus>('actif');

  // New Technician form state
  const [showAddTechModal, setShowAddTechModal] = useState(false);
  const [newTechName, setNewTechName] = useState('');
  const [newTechCode, setNewTechCode] = useState('');
  const [newTechEmail, setNewTechEmail] = useState('');

  // Selected printer for QR expansion / detailed view
  const [selectedPrinterQR, setSelectedPrinterQR] = useState<PrinterType | null>(null);
  const [adminNotesText, setAdminNotesText] = useState('');
  const [saveNotesSuccess, setSaveNotesSuccess] = useState(false);

  // States & handlers for inline notes management
  const [editingNotesPrinterId, setEditingNotesPrinterId] = useState<string | null>(null);
  const [inlineNotesText, setInlineNotesText] = useState('');

  const handleStartEditNotes = (printer: PrinterType) => {
    setEditingNotesPrinterId(printer.id);
    setInlineNotesText(printer.admin_notes || '');
  };

  const handleSaveInlineNotes = (printer: PrinterType) => {
    const updated: PrinterType = {
      ...printer,
      admin_notes: inlineNotesText.trim()
    };
    onUpdatePrinter(updated);
    setEditingNotesPrinterId(null);
  };

  const handleDeleteNotes = (printer: PrinterType) => {
    const updated: PrinterType = {
      ...printer,
      admin_notes: ''
    };
    onUpdatePrinter(updated);
  };

  useEffect(() => {
    if (selectedPrinterQR) {
      setAdminNotesText(selectedPrinterQR.admin_notes || '');
      setSaveNotesSuccess(false);
    }
  }, [selectedPrinterQR]);

  const handleSaveAdminNotes = () => {
    if (!selectedPrinterQR) return;
    const updatedPrinter: PrinterType = {
      ...selectedPrinterQR,
      admin_notes: adminNotesText
    };
    onUpdatePrinter(updatedPrinter);
    setSelectedPrinterQR(updatedPrinter);
    setSaveNotesSuccess(true);
    setTimeout(() => {
      setSaveNotesSuccess(false);
    }, 2500);
  };

  // Custom delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'printer' | 'technician' | 'log' | 'note';
    id: string;
    title: string;
    message: string;
  } | null>(null);

  // Stats computation
  const totalPrinters = printers.length;
  const countActive = printers.filter(p => p.status === 'actif').length;
  const countEnPanne = printers.filter(p => p.status === 'en_panne').length;
  const countMaint = printers.filter(p => p.status === 'en_attente_maintenance').length;
  const countInactif = printers.filter(p => p.status === 'inactif').length;

  // Alerts: inks < 15%
  const lowInkPrinters = printers.filter(p =>
    p.ink_cyan < 15 || p.ink_magenta < 15 || p.ink_yellow < 15 || p.ink_black < 15
  );

  const pendingRequests = changeRequests.filter(r => r.status === 'pending');

  // Download QR Code helper
  const handleDownloadQR = async (printer: PrinterType) => {
    try {
      const response = await fetch(printer.qr_code_url, { referrerPolicy: 'no-referrer' });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR_Code_${printer.id}_${printer.name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // Fallback: open in new window if cors blocks direct blob downloading
      window.open(printer.qr_code_url, '_blank');
    }
  };

  const handleCreatePrinterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrinterName || !newPrinterDept || !newPrinterBrand) return;

    // Generate custom unique ID
    let maxNum = 100;
    printers.forEach(p => {
      const match = p.id.match(/^PRN-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const uniqueSuffix = Math.floor(10 + Math.random() * 90);
    const newId = `PRN-${maxNum + 1}-${uniqueSuffix}`;

    onAddPrinter({
      id: newId,
      name: newPrinterName,
      department: newPrinterDept,
      location: newPrinterLoc || 'Non spécifiée',
      brand_model: newPrinterBrand,
      ip_address: newPrinterIP || '192.168.1.' + Math.floor(Math.random() * 254 + 1),
      mac_address: newPrinterMAC || '00:1A:2B:3C:' + Math.floor(Math.random() * 90 + 10) + ':FF',
      ink_cyan: Number(newPrinterCyan),
      ink_magenta: Number(newPrinterMagenta),
      ink_yellow: Number(newPrinterYellow),
      ink_black: Number(newPrinterBlack),
      status: newPrinterStatus,
      last_service_date: new Date().toISOString().split('T')[0]
    });

    // Reset fields
    setNewPrinterName('');
    setNewPrinterDept('');
    setNewPrinterLoc('');
    setNewPrinterBrand('');
    setNewPrinterIP('');
    setNewPrinterMAC('');
    setNewPrinterCyan(100);
    setNewPrinterMagenta(100);
    setNewPrinterYellow(100);
    setNewPrinterBlack(100);
    setNewPrinterStatus('actif');
    setShowAddPrinterModal(false);
  };

  const handleCreateTechSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTechName || !newTechCode) return;

    onAddTechnician({
      name: newTechName,
      code: newTechCode.trim().toUpperCase(),
      email: newTechEmail || undefined
    });

    setNewTechName('');
    setNewTechCode('');
    setNewTechEmail('');
    setShowAddTechModal(false);
  };

  // Filtered printers list
  const filteredPrinters = printers.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(printerSearch.toLowerCase()) ||
      p.department.toLowerCase().includes(printerSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(printerSearch.toLowerCase()) ||
      p.brand_model.toLowerCase().includes(printerSearch.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row font-sans relative" id="admin-dashboard-container">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center justify-between z-30 sticky top-0" id="admin-mobile-header">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-md shadow-indigo-600/10">
            <Printer className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-sm font-extrabold text-white block leading-none">PrintCare</span>
            <span className="text-[8px] text-indigo-400 font-bold tracking-widest uppercase mt-0.5 block">Espace Admin</span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="text-slate-400 hover:text-white p-1.5 bg-slate-850 border border-slate-800 rounded-lg focus:outline-none cursor-pointer"
          id="btn-toggle-mobile-sidebar"
        >
          {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Sidebar Backdrop overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)} 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 md:hidden"
            id="mobile-sidebar-backdrop"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 transform md:transform-none md:static md:translate-x-0 transition-transform duration-200 ease-in-out
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `} id="admin-sidebar">
        <div className="p-5">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2.5 rounded-xl shadow-md shadow-indigo-600/10">
                <Printer className="h-5.5 w-5.5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-white leading-none">PrintCare</h1>
                <span className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase mt-0.5 block">Espace Admin</span>
              </div>
            </div>
            {/* Close button on sidebar inside drawer on mobile */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-white p-1 bg-slate-800 rounded-lg cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="bg-slate-850 rounded-xl p-3 mb-6 border border-slate-850">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${isSuperAdmin ? 'bg-purple-400 animate-pulse' : 'bg-indigo-400'}`} />
              <span className="text-xs font-semibold text-slate-100">
                {isSuperAdmin ? '👑 Pierre (Super Admin)' : '🛡️ Admin'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate" title={user.email}>
              {user.email}
            </p>
          </div>

          <nav className="space-y-1.5" id="admin-nav">
            <button
              onClick={() => handleTabSelect('overview')}
              className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all duration-150 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-slate-850 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Sliders className="h-4 w-4" />
              Vue d'ensemble
            </button>

            <button
              onClick={() => handleTabSelect('printers')}
              className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all duration-150 cursor-pointer ${
                activeTab === 'printers'
                  ? 'bg-slate-850 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Printer className="h-4 w-4" />
              Gestion Imprimantes
            </button>

            <button
              onClick={() => handleTabSelect('technicians')}
              className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all duration-150 cursor-pointer ${
                activeTab === 'technicians'
                  ? 'bg-slate-850 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Users className="h-4 w-4" />
              Gestion Techniciens
            </button>

            <button
              onClick={() => handleTabSelect('requests')}
              className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-slate-850 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <CheckSquare className="h-4 w-4" />
                Validations
              </span>
              {pendingRequests.length > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center">
                  {pendingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabSelect('history')}
              className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all duration-150 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-slate-850 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <History className="h-4 w-4" />
              Historique & Logs
            </button>
          </nav>
        </div>

        <div className="p-5 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full py-2 px-3 bg-slate-800 hover:bg-red-950/40 hover:text-red-300 border border-slate-700 hover:border-red-900/40 rounded-lg text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer"
            id="btn-admin-logout"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6" id="view-overview">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">Tableau de Bord</h2>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Vue globale de l'état de fonctionnement et des consommables du parc d'imprimantes.
                </p>
              </div>
              <div className="text-[10px] font-bold font-mono text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs self-start sm:self-center">
                Dernière maj: {new Date().toLocaleTimeString()}
              </div>
            </div>

            {/* Counters Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Imprimantes</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{totalPrinters}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Actives
                </span>
                <p className="text-2xl font-black text-emerald-600 mt-1">{countActive}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  En panne
                </span>
                <p className="text-2xl font-black text-red-600 mt-1">{countEnPanne}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Maintenance
                </span>
                <p className="text-2xl font-black text-amber-600 mt-1">{countMaint}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs col-span-2 lg:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  Inactives
                </span>
                <p className="text-2xl font-black text-slate-500 mt-1">{countInactif}</p>
              </div>
            </div>

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Columns: Alerts & Validation queues */}
              <div className="lg:col-span-2 space-y-6">
                {/* Low Ink Alerts Card */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50 px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Alertes Consommables (&lt; 15% restants)
                    </h3>
                    <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-0.5 rounded-full font-bold">
                      {lowInkPrinters.length} alertes
                    </span>
                  </div>

                  <div className="p-4 divide-y divide-slate-100">
                    {lowInkPrinters.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center font-medium">Aucune alerte de niveau d'encre bas. Tous les consommables sont optimaux.</p>
                    ) : (
                      lowInkPrinters.map((printer) => (
                        <div key={printer.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-bold">
                                {printer.id}
                              </span>
                              <h4 className="text-xs font-bold text-slate-800">{printer.name}</h4>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-semibold">
                              <MapPin className="h-3 w-3 text-indigo-500" /> {printer.department} • {printer.location}
                            </p>
                          </div>

                          {/* Ink Levels indicators */}
                          <div className="flex gap-2">
                            {/* Cyan */}
                            <div className="flex flex-col items-center bg-slate-50 px-2 py-1 rounded border border-slate-200 w-12 shadow-xs">
                              <span className="text-[8px] text-cyan-500 font-extrabold uppercase">Cyan</span>
                              <span className={`text-[11px] font-bold ${printer.ink_cyan < 15 ? 'text-red-500 animate-pulse font-extrabold' : 'text-slate-700'}`}>
                                {printer.ink_cyan}%
                              </span>
                            </div>
                            {/* Magenta */}
                            <div className="flex flex-col items-center bg-slate-50 px-2 py-1 rounded border border-slate-200 w-12 shadow-xs">
                              <span className="text-[8px] text-pink-500 font-extrabold uppercase">Mag</span>
                              <span className={`text-[11px] font-bold ${printer.ink_magenta < 15 ? 'text-red-500 animate-pulse font-extrabold' : 'text-slate-700'}`}>
                                {printer.ink_magenta}%
                              </span>
                            </div>
                            {/* Yellow */}
                            <div className="flex flex-col items-center bg-slate-50 px-2 py-1 rounded border border-slate-200 w-12 shadow-xs">
                              <span className="text-[8px] text-yellow-600 font-extrabold uppercase font-mono">Yel</span>
                              <span className={`text-[11px] font-bold ${printer.ink_yellow < 15 ? 'text-red-500 animate-pulse font-extrabold' : 'text-slate-700'}`}>
                                {printer.ink_yellow}%
                              </span>
                            </div>
                            {/* Black */}
                            <div className="flex flex-col items-center bg-slate-50 px-2 py-1 rounded border border-slate-200 w-12 shadow-xs">
                              <span className="text-[8px] text-slate-500 font-extrabold uppercase">Blk</span>
                              <span className={`text-[11px] font-bold ${printer.ink_black < 15 ? 'text-red-500 animate-pulse font-extrabold' : 'text-slate-700'}`}>
                                {printer.ink_black}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Short validations list */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50 px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-indigo-600" />
                      Demandes de Modifications Techniciens
                    </h3>
                    <button
                      onClick={() => setActiveTab('requests')}
                      className="text-xs text-indigo-600 hover:underline hover:text-indigo-700 font-bold cursor-pointer"
                    >
                      Voir tout ({pendingRequests.length})
                    </button>
                  </div>
                  <div className="p-4">
                    {pendingRequests.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center font-medium">Aucune modification en attente de validation.</p>
                    ) : (
                      <div className="space-y-3.5">
                        {pendingRequests.slice(0, 3).map((req) => (
                          <div key={req.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-mono bg-slate-200 text-slate-600 border border-slate-300 px-1.5 py-0.5 rounded">
                                  ID: {req.printer_id}
                                </span>
                                <h4 className="text-xs font-bold text-slate-800">{req.printer_name}</h4>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                Proposé par : <strong className="text-slate-700">{req.technician_name}</strong>
                              </p>
                              <div className="bg-white p-3 rounded-lg text-xs text-slate-700 border border-slate-150 space-y-1">
                                <span className="text-[9px] text-slate-400 uppercase font-extrabold block">Modif: {req.field_changed}</span>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  <div className="text-[11px] font-medium">
                                    <span className="text-red-600 font-bold">Ancien :</span> {req.old_value}
                                  </div>
                                  <div className="text-[11px] font-medium">
                                    <span className="text-emerald-600 font-bold">Nouveau :</span> {req.new_value}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 shrink-0 self-end sm:self-center">
                              <button
                                onClick={() => onRejectRequest(req.id)}
                                className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-200 cursor-pointer transition-all duration-150"
                              >
                                Rejeter
                              </button>
                              <button
                                onClick={() => onApproveRequest(req.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm transition-all duration-150"
                              >
                                Approuver
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right 1 Column: Quick view on technicians */}
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs p-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-600" />
                    Techniciens Référencés
                  </h3>
                  <div className="space-y-2">
                    {technicians.map((tech) => {
                      const techLogsCount = interventionLogs.filter(l => l.technician_id === tech.id).length;
                      return (
                        <div key={tech.id} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800">{tech.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">Code : {tech.code}</p>
                          </div>
                          <span className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                            {techLogsCount} intervs
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs p-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Printer className="h-4 w-4 text-indigo-600" />
                    Guide de Fonctionnement
                  </h3>
                  <div className="text-xs text-slate-500 space-y-2.5 leading-relaxed font-semibold">
                    <p>
                      1. Un technicien scanne le <strong className="text-indigo-600">QR Code fixe permanent</strong> d'une imprimante pour soumettre ses fiches d'intervention.
                    </p>
                    <p>
                      2. Ses propositions de modification d'encre ou d'état créent des <strong className="text-indigo-600">ChangeRequests</strong> en attente.
                    </p>
                    <p>
                      3. En tant qu'administrateur, vous validez pour appliquer les changements à la flotte, garantissant la traçabilité.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRINTERS CRUD TAB */}
        {activeTab === 'printers' && (
          <div className="space-y-6" id="view-printers">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">Gestion du Parc Imprimantes</h2>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Ajoutez, gérez, supervisez et téléchargez les QR codes uniques de vos machines physiques.
                </p>
              </div>

              <button
                onClick={() => setShowAddPrinterModal(true)}
                className="self-start sm:self-center py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10 transition-all duration-150"
                id="btn-open-add-printer-modal"
              >
                <Plus className="h-4 w-4" />
                Ajouter une Imprimante
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, ID, modèle, département..."
                  value={printerSearch}
                  onChange={(e) => setPrinterSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-semibold"
                  id="search-printers"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 shrink-0 font-bold flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5 text-indigo-500" />
                  État:
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                  id="filter-printers-status"
                >
                  <option value="all">Tous les états</option>
                  <option value="actif">Actif</option>
                  <option value="en_panne">En panne</option>
                  <option value="en_attente_maintenance">En attente de maintenance</option>
                  <option value="inactif">Inactif</option>
                </select>
              </div>
            </div>

            {/* Printers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPrinters.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed font-medium">
                  Aucune imprimante ne correspond à vos critères de recherche.
                </div>
              ) : (
                filteredPrinters.map((printer) => {
                  const statusColors = {
                    actif: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                    en_panne: 'bg-red-50 text-red-700 border-red-100 animate-pulse',
                    en_attente_maintenance: 'bg-amber-50 text-amber-700 border-amber-200/50',
                    inactif: 'bg-slate-100 text-slate-500 border-slate-200'
                  };

                  return (
                    <div key={printer.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between hover:border-indigo-500/40 transition-all duration-200">
                      <div className="p-5 space-y-4">
                        {/* Title & Status */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="max-w-[70%]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-mono font-bold bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                                {printer.id}
                              </span>
                              <h3 className="text-xs font-extrabold text-slate-800 truncate" title={printer.name}>
                                {printer.name}
                              </h3>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 font-bold font-mono">{printer.brand_model}</p>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize shrink-0 ${statusColors[printer.status]}`}>
                            {printer.status.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Location / network details */}
                        <div className="space-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold">
                            <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                            <span className="truncate">{printer.department} • {printer.location}</span>
                          </p>
                          <p className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-400">
                            <Cpu className="h-3.5 w-3.5 text-slate-400" />
                            <span>IP: {printer.ip_address}</span>
                          </p>
                        </div>

                        {/* Ink Levels Visualizer */}
                        <div className="space-y-2 border-t border-slate-100 pt-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Consommables d'Encre :</span>
                          <div className="grid grid-cols-4 gap-1.5">
                            {/* Cyan */}
                            <div className="bg-slate-50 p-1.5 rounded border border-slate-200 text-center shadow-xs">
                              <div className="text-[9px] text-cyan-500 font-extrabold mb-1">C</div>
                              <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-400" style={{ width: `${printer.ink_cyan}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-slate-700 mt-1 block">{printer.ink_cyan}%</span>
                            </div>
                            {/* Magenta */}
                            <div className="bg-slate-50 p-1.5 rounded border border-slate-200 text-center shadow-xs">
                              <div className="text-[9px] text-pink-500 font-extrabold mb-1">M</div>
                              <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-pink-500" style={{ width: `${printer.ink_magenta}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-slate-700 mt-1 block">{printer.ink_magenta}%</span>
                            </div>
                            {/* Yellow */}
                            <div className="bg-slate-50 p-1.5 rounded border border-slate-200 text-center shadow-xs">
                              <div className="text-[9px] text-yellow-600 font-extrabold mb-1">Y</div>
                              <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-400" style={{ width: `${printer.ink_yellow}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-slate-700 mt-1 block">{printer.ink_yellow}%</span>
                            </div>
                            {/* Black */}
                            <div className="bg-slate-50 p-1.5 rounded border border-slate-200 text-center shadow-xs">
                              <div className="text-[9px] text-slate-500 font-extrabold mb-1">K</div>
                              <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-slate-800" style={{ width: `${printer.ink_black}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-slate-700 mt-1 block">{printer.ink_black}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Admin Notes Editor/Preview */}
                        {editingNotesPrinterId === printer.id ? (
                          <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-left space-y-2 animate-fade-in">
                            <span className="text-[9px] uppercase font-bold text-amber-700 flex items-center gap-1 font-mono">
                              <FileText className="h-3 w-3" /> Éditer la Note pour Techniciens
                            </span>
                            <textarea
                              value={inlineNotesText}
                              onChange={(e) => setInlineNotesText(e.target.value)}
                              placeholder="Laisser des consignes claires pour les techniciens (ex: Code porte, pièce spécifique, dysfonctionnement particulier...)"
                              className="w-full h-16 bg-white border border-slate-200 rounded p-1.5 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium resize-none"
                              autoFocus
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setEditingNotesPrinterId(null)}
                                className="py-1 px-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[9px] uppercase rounded cursor-pointer transition-all"
                              >
                                Annuler
                              </button>
                              <button
                                onClick={() => handleSaveInlineNotes(printer)}
                                className="py-1 px-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[9px] uppercase rounded cursor-pointer transition-all"
                              >
                                Enregistrer
                              </button>
                            </div>
                          </div>
                        ) : printer.admin_notes ? (
                          <div className="bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-lg text-left space-y-1.5 relative group/note">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] uppercase font-bold text-indigo-700 flex items-center gap-1 font-mono">
                                <FileText className="h-3 w-3" /> Note Admin (Visible Techniciens)
                              </span>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleStartEditNotes(printer)}
                                  className="p-1 text-slate-450 hover:text-indigo-650 hover:bg-indigo-100 rounded transition-all cursor-pointer"
                                  title="Modifier la note"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm("Supprimer cette note pour les techniciens ?")) {
                                      handleDeleteNotes(printer);
                                    }
                                  }}
                                  className="p-1 text-slate-450 hover:text-red-650 hover:bg-red-50 rounded transition-all cursor-pointer"
                                  title="Supprimer la note"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <p className="text-[10.5px] text-slate-600 font-semibold leading-relaxed italic whitespace-pre-line">
                              "{printer.admin_notes}"
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEditNotes(printer)}
                            className="w-full py-2 border border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 text-slate-400 hover:text-indigo-600 text-[10.5px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all duration-150"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Ajouter une note de consigne pour technicien
                          </button>
                        )}
                      </div>

                      {/* Card Actions Footer */}
                      <div className="bg-slate-50 border-t border-slate-200 p-3 flex justify-between items-center gap-2">
                        {/* QR Code Action */}
                        <button
                          onClick={() => setSelectedPrinterQR(printer)}
                          className="py-1.5 px-3 bg-white border border-slate-200 hover:border-indigo-500/40 text-indigo-600 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all duration-150 shadow-xs"
                        >
                          <Sliders className="h-3.5 w-3.5" />
                          Gérer / QR Code
                        </button>

                        <div className="flex gap-1.5">
                          {/* Admin & Super Admin delete control */}
                          <button
                            onClick={() => {
                              setDeleteConfirmation({
                                type: 'printer',
                                id: printer.id,
                                title: "Supprimer l'imprimante",
                                message: `Êtes-vous sûr de vouloir supprimer définitivement l'imprimante "${printer.name}" (${printer.id}) ? Cette action est irréversible et supprimera également toutes ses notes et rapports associés.`
                              });
                            }}
                            className="p-2 bg-white border border-red-200 hover:bg-red-50 text-red-500 rounded-lg cursor-pointer transition-all duration-150 shadow-xs"
                            title="Supprimer définitivement l'imprimante"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TECHNICIANS CRUD TAB */}
        {activeTab === 'technicians' && (
          <div className="space-y-6" id="view-technicians">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">Gestion des Techniciens</h2>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Enregistrez des techniciens réseau de maintenance agréés et attribuez-leur un code d'accès de démo.
                </p>
              </div>

              <button
                onClick={() => setShowAddTechModal(true)}
                className="self-start sm:self-center py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10 transition-all duration-150"
                id="btn-open-add-tech-modal"
              >
                <Plus className="h-4 w-4" />
                Enregistrer un Technicien
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="bg-slate-50 px-4 py-3.5 border-b border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Habilitations Techniques Actives</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {technicians.length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-400 font-medium">Aucun technicien enregistré.</p>
                ) : (
                  technicians.map((tech) => (
                    <div key={tech.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-all duration-150">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-800">{tech.name}</h4>
                          <span className="text-[10px] font-mono font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                            ID: {tech.code}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">{tech.email || 'Pas d\'email renseigné'}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">Créé le : {new Date(tech.created_at).toLocaleDateString()}</span>
                        <button
                          onClick={() => {
                            setDeleteConfirmation({
                              type: 'technician',
                              id: tech.id,
                              title: "Révoquer l'accès du technicien",
                              message: `Êtes-vous sûr de vouloir révoquer l'accès du technicien "${tech.name}" ? Son code d'accès "${tech.code}" ne fonctionnera plus sur la plateforme.`
                            });
                          }}
                          className="p-2 bg-white hover:bg-red-50 text-red-500 border border-red-200 rounded-lg cursor-pointer transition-all duration-150 shadow-xs"
                          title="Révoquer le code"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* REQUESTS VALIDATION TAB */}
        {activeTab === 'requests' && (
          <div className="space-y-6" id="view-requests">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Validation des Modifications</h2>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Afin d'éviter toute erreur matérielle, toute modification proposée par un technicien (encre, statut) doit être auditée et acceptée ici par un admin.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="bg-slate-50 px-4 py-3.5 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-indigo-600" />
                  Changements en attente d'approbation
                </h3>
                <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full">
                  {pendingRequests.length} en attente
                </span>
              </div>

              <div className="p-4 divide-y divide-slate-100">
                {pendingRequests.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">Aucune modification en attente</p>
                    <p className="text-[11px] text-slate-400 mt-1">Toutes les imprimantes du réseau sont parfaitement synchronisées.</p>
                  </div>
                ) : (
                  pendingRequests.map((req) => (
                    <div key={req.id} className="py-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 first:pt-0 last:pb-0">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono bg-slate-100 border border-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded">
                            Machine: {req.printer_id}
                          </span>
                          <h4 className="text-xs font-bold text-slate-800">{req.printer_name}</h4>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>Soumis le : {new Date(req.created_at).toLocaleString()} par <strong className="text-slate-600">{req.technician_name}</strong> (Code: {req.technician_id})</span>
                        </div>

                        {/* Comparative grid layout */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 max-w-2xl space-y-2">
                          <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider block">Propriété impactée : {req.field_changed}</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-red-50/50 p-2.5 rounded-lg border border-red-100 text-red-800">
                              <span className="text-[8px] uppercase font-bold text-red-600 flex items-center gap-1 font-mono">
                                <TrendingDown className="h-3 w-3" /> État Initial
                              </span>
                              <p className="text-xs font-mono font-bold mt-1.5">{req.old_value}</p>
                            </div>
                            <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 text-emerald-800">
                              <span className="text-[8px] uppercase font-bold text-emerald-600 flex items-center gap-1 font-mono">
                                <CheckCircle2 className="h-3 w-3" /> Proposition Soumise
                              </span>
                              <p className="text-xs font-mono font-bold mt-1.5">{req.new_value}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2.5 self-end lg:self-center shrink-0">
                        <button
                          onClick={() => onRejectRequest(req.id)}
                          className="px-4 py-2 bg-white hover:bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-200 cursor-pointer transition-all duration-150"
                        >
                          Rejeter l'opération
                        </button>
                        <button
                          onClick={() => onApproveRequest(req.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm transition-all duration-150"
                        >
                          Approuver et Appliquer
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* AUDIT LOGS & HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-6" id="view-history">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Journal d'Intervention & Historique</h2>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Visualisez l'historique complet des fiches de maintenance validées et des rapports techniques textuels rédigés.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left col: Intervention Logs */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-slate-50 px-4 py-3.5 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-indigo-600" />
                    Interventions & Checklist Validées
                  </h3>
                  <span className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold font-mono">
                    {interventionLogs.length} logs
                  </span>
                </div>

                <div className="p-4 space-y-4 divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {interventionLogs.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center font-medium">Aucune intervention enregistrée.</p>
                  ) : (
                    interventionLogs.map((log) => (
                      <div key={log.id} className="pt-4 first:pt-0 space-y-1.5">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                                {log.printer_id}
                              </span>
                              <h4 className="text-xs font-bold text-slate-800">{log.printer_name}</h4>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 font-bold">
                              Fait le {new Date(log.date).toLocaleDateString()} par <strong className="text-slate-600">{log.technician_name}</strong>
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              setDeleteConfirmation({
                                type: 'log',
                                id: log.id,
                                title: "Supprimer le rapport d'intervention",
                                message: `Êtes-vous sûr de vouloir supprimer définitivement ce rapport d'intervention pour la machine "${log.printer_name}" par le technicien "${log.technician_name}" ?`
                              });
                            }}
                            className="p-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-500 rounded-md cursor-pointer transition-all duration-150 shadow-xs"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Checklist items list */}
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 mt-1 space-y-1">
                          <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider block">Tâches accomplies :</span>
                          {log.checklist_items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              {item.checked ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                              )}
                              <span className={item.checked ? 'text-slate-700 font-medium' : 'text-slate-400 line-through font-medium'}>
                                {item.task}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right col: Technical Notes */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-slate-50 px-4 py-3.5 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    Notes Techniques Récentes
                  </h3>
                  <span className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold font-mono">
                    {notes.length} notes
                  </span>
                </div>

                <div className="p-4 space-y-4 divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {notes.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center font-medium">Aucune note rédigée par les techniciens.</p>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className="pt-4 first:pt-0 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                                {note.printer_id}
                              </span>
                              <span className="text-[10px] font-extrabold text-indigo-600 uppercase">Note #{note.id.split('-')[1]}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 font-bold">
                              Par <strong className="text-slate-600">{note.technician_name}</strong> le {new Date(note.created_at).toLocaleString()}
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              setDeleteConfirmation({
                                type: 'note',
                                id: note.id,
                                title: "Supprimer la note technique",
                                message: `Êtes-vous sûr de vouloir supprimer définitivement cette note technique rédigée par "${note.technician_name}" ?`
                              });
                            }}
                            className="p-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-500 rounded-md cursor-pointer transition-all duration-150 shadow-xs"
                            title="Supprimer la note"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed italic font-medium">
                          "{note.content}"
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL ADD PRINTER */}
      <AnimatePresence>
        {showAddPrinterModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-800"
              id="add-printer-modal"
            >
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-md font-bold text-slate-900 flex items-center gap-2">
                  <Printer className="h-5 w-5 text-indigo-600" />
                  Référencer une nouvelle imprimante
                </h3>
                <button
                  onClick={() => setShowAddPrinterModal(false)}
                  className="text-slate-400 hover:text-slate-800 font-bold text-sm cursor-pointer"
                >
                  Fermer
                </button>
              </div>

              <form onSubmit={handleCreatePrinterSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nom personnalisé</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: HP LaserJet Direction"
                      value={newPrinterName}
                      onChange={(e) => setNewPrinterName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-semibold"
                      id="form-add-printer-name"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Marque & Modèle exact</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: HP LaserJet Flow M528"
                      value={newPrinterBrand}
                      onChange={(e) => setNewPrinterBrand(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-semibold"
                      id="form-add-printer-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Département d'affectation</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: Ressources Humaines"
                      value={newPrinterDept}
                      onChange={(e) => setNewPrinterDept(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-semibold"
                      id="form-add-printer-dept"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Localisation précise</label>
                    <input
                      type="text"
                      placeholder="ex: Bâtiment A, Bureau 204"
                      value={newPrinterLoc}
                      onChange={(e) => setNewPrinterLoc(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-semibold"
                      id="form-add-printer-loc"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Adresse IP (Facultatif)</label>
                    <input
                      type="text"
                      placeholder="Laissé vide = générée"
                      value={newPrinterIP}
                      onChange={(e) => setNewPrinterIP(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-semibold"
                      id="form-add-printer-ip"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Adresse MAC (Facultatif)</label>
                    <input
                      type="text"
                      placeholder="Laissé vide = générée"
                      value={newPrinterMAC}
                      onChange={(e) => setNewPrinterMAC(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-semibold"
                      id="form-add-printer-mac"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">État initial de l'imprimante</label>
                    <select
                      value={newPrinterStatus}
                      onChange={(e) => setNewPrinterStatus(e.target.value as PrinterStatus)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                      id="form-add-printer-status"
                    >
                      <option value="actif">Actif</option>
                      <option value="en_panne">En panne</option>
                      <option value="en_attente_maintenance">En attente de maintenance</option>
                      <option value="inactif">Inactif</option>
                    </select>
                  </div>
                </div>

                {/* Inks Levels slider row */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Niveaux d'encre initiaux :</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-cyan-600 font-bold block mb-1">CYAN ({newPrinterCyan}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={newPrinterCyan}
                        onChange={(e) => setNewPrinterCyan(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-pink-500 font-bold block mb-1">MAGENTA ({newPrinterMagenta}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={newPrinterMagenta}
                        onChange={(e) => setNewPrinterMagenta(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-yellow-600 font-bold block mb-1">JAUNE ({newPrinterYellow}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={newPrinterYellow}
                        onChange={(e) => setNewPrinterYellow(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-700 font-bold block mb-1">NOIR ({newPrinterBlack}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={newPrinterBlack}
                        onChange={(e) => setNewPrinterBlack(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowAddPrinterModal(false)}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-500 font-bold text-xs rounded-lg hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-md shadow-indigo-600/10"
                    id="btn-confirm-add-printer"
                  >
                    Enregistrer et générer le QR Code
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL ADD TECHNICIAN */}
      <AnimatePresence>
        {showAddTechModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-800"
              id="add-tech-modal"
            >
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-md font-bold text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  Enregistrer un technicien
                </h3>
                <button
                  onClick={() => setShowAddTechModal(false)}
                  className="text-slate-400 hover:text-slate-800 font-bold text-sm cursor-pointer"
                >
                  Fermer
                </button>
              </div>

              <form onSubmit={handleCreateTechSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nom complet</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Marc-Antoine Grondin"
                    value={newTechName}
                    onChange={(e) => setNewTechName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-semibold"
                    id="form-add-tech-name"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Code technicien unique (Démo)</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: TECH04"
                    value={newTechCode}
                    onChange={(e) => setNewTechCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-semibold"
                    id="form-add-tech-code"
                  />
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">Le code de démo sert d'identifiant d'accès au portail technique.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Adresse Email (Optionnel)</label>
                  <input
                    type="email"
                    placeholder="ex: tech.grondin@printcare.fr"
                    value={newTechEmail}
                    onChange={(e) => setNewTechEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-semibold"
                    id="form-add-tech-email"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowAddTechModal(false)}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-500 font-bold text-xs rounded-lg hover:text-slate-850 hover:bg-slate-50 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-md shadow-indigo-600/10"
                    id="btn-confirm-add-tech"
                  >
                    Valider le Technicien
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL QR EXPAND */}
      <AnimatePresence>
        {selectedPrinterQR && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 text-center space-y-4 text-slate-800 font-sans"
              id="qr-expand-modal"
            >
              <div>
                <h3 className="text-lg font-black text-slate-900">{selectedPrinterQR.name}</h3>
                <p className="text-xs text-slate-500 font-semibold font-mono mt-1">Identifiant permanent : <strong className="text-slate-800">{selectedPrinterQR.id}</strong></p>
              </div>

              {/* QR Image Frame */}
              <div className="bg-slate-100 p-4 rounded-2xl inline-block shadow-inner mx-auto border border-slate-200">
                <img
                  src={selectedPrinterQR.qr_code_url}
                  alt={`QR Code ${selectedPrinterQR.id}`}
                  className="h-64 w-64 block rounded"
                  referrerPolicy="no-referrer"
                  id={`img-qr-code-${selectedPrinterQR.id}`}
                />
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-left text-xs text-slate-500 space-y-1.5 font-medium">
                <div className="text-slate-800 font-bold mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Propriétés du QR Code :
                </div>
                <p>• QR Code <strong>permanent & inaltérable</strong> lié à l'ID.</p>
                <p>• Ne change pas même si l'imprimante est déplacée, renommée ou réaffectée.</p>
              </div>

              {/* Notes de l'administrateur */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-left space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  Notes de l'administrateur :
                </label>
                <textarea
                  value={adminNotesText}
                  onChange={(e) => setAdminNotesText(e.target.value)}
                  placeholder="Ajouter des remarques privées pour cette imprimante (ex: date d'expiration de garantie, historique d'achats...)"
                  className="w-full h-20 bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-semibold resize-none"
                  id={`textarea-admin-notes-${selectedPrinterQR.id}`}
                />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-bold">
                    {saveNotesSuccess ? (
                      <span className="text-emerald-600 flex items-center gap-1 font-extrabold animate-pulse">
                        <Check className="h-3.5 w-3.5" /> Enregistré !
                      </span>
                    ) : (
                      "Modifications privées admin"
                    )}
                  </span>
                  <button
                    onClick={handleSaveAdminNotes}
                    className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-md cursor-pointer shadow-xs transition-all duration-150"
                    id={`btn-save-admin-notes-${selectedPrinterQR.id}`}
                  >
                    Enregistrer la note
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setSelectedPrinterQR(null)}
                  className="flex-1 py-2 bg-white border border-slate-200 text-slate-500 font-bold text-xs rounded-lg hover:text-slate-850 hover:bg-slate-50 cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  onClick={() => handleDownloadQR(selectedPrinterQR)}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
                  id="btn-download-qr-code"
                >
                  <Download className="h-4 w-4" />
                  Télécharger PNG
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {deleteConfirmation && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-800"
              id="confirm-delete-modal"
            >
              <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex justify-between items-center">
                <h3 className="text-md font-bold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
                  {deleteConfirmation.title}
                </h3>
                <button
                  onClick={() => setDeleteConfirmation(null)}
                  className="text-red-400 hover:text-red-800 font-bold text-sm cursor-pointer animate-pulse"
                >
                  Fermer
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  {deleteConfirmation.message}
                </p>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setDeleteConfirmation(null)}
                    className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-all duration-150"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      const { type, id } = deleteConfirmation;
                      if (type === 'printer') onDeletePrinter(id);
                      if (type === 'technician') onDeleteTechnician(id);
                      if (type === 'log') onDeleteLog(id);
                      if (type === 'note') onDeleteNote(id);
                      setDeleteConfirmation(null);
                    }}
                    className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-all duration-150 shadow-md shadow-red-600/10"
                    id="btn-confirm-delete-action"
                  >
                    Confirmer la suppression
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
