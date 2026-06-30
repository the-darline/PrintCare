import React, { useState, useEffect } from 'react';
import { Shield, Key, Eye, Users, RefreshCw, Printer as PrinterIcon, LogOut, CheckSquare } from 'lucide-react';
import {
  Printer,
  Technician,
  Note,
  ChangeRequest,
  InterventionLog,
  LoggedInUser,
  PrinterStatus
} from './types';
import {
  INITIAL_PRINTERS,
  INITIAL_TECHNICIANS,
  INITIAL_NOTES,
  INITIAL_CHANGE_REQUESTS,
  INITIAL_INTERVENTION_LOGS,
  generateQRUrl
} from './data';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import TechnicianPortal from './components/TechnicianPortal';
import { isSupabaseConfigured, db, SUPABASE_SETUP_SQL } from './lib/supabase';

const STORAGE_KEYS = {
  PRINTERS: 'printcare_printers_v1',
  TECHNICIANS: 'printcare_technicians_v1',
  NOTES: 'printcare_notes_v1',
  REQUESTS: 'printcare_requests_v1',
  LOGS: 'printcare_logs_v1',
  PASSWORDS: 'printcare_passwords_v1',
  USER: 'printcare_active_user_v1'
};

const DEFAULT_PASSWORDS: Record<string, string> = {
  'sullypatrick01@gmail.com': 'admin',
  'pierrerobertoleblanc1@gmail.com': 'admin',
  'pierrerobertoleblanc10@gmail.com': 'admin',
  'darlinelegrand8@gmail.com': 'admin'
};

export default function App() {
  // --- Core Application States ---
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [interventionLogs, setInterventionLogs] = useState<InterventionLog[]>([]);

  // Registered admin passwords (stored securely in state/localStorage)
  const [registeredPasswords, setRegisteredPasswords] = useState<Record<string, string>>(DEFAULT_PASSWORDS);

  // Current session state
  const [activeUser, setActiveUser] = useState<LoggedInUser | null>(null);

  // Supabase operational states
  const [dbMode, setDbMode] = useState<'supabase' | 'local'>('local');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSqlSetup, setShowSqlSetup] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // --- Initial State Loading (with Supabase sync & localStorage fallback) ---
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setSyncError(null);

      if (isSupabaseConfigured) {
        try {
          // Attempt to fetch production data from real Supabase
          const pPrinters = await db.getPrinters();
          const pTechs = await db.getTechnicians();
          const pNotes = await db.getNotes();
          const pReqs = await db.getChangeRequests();
          const pLogs = await db.getInterventionLogs();
          const pPasswords = await db.getAdminPasswords();

          setPrinters(pPrinters);
          setTechnicians(pTechs);
          setNotes(pNotes);
          setChangeRequests(pReqs);
          setInterventionLogs(pLogs);
          setRegisteredPasswords(prev => ({ ...prev, ...pPasswords }));
          setDbMode('supabase');
        } catch (err: any) {
          console.warn("Failed to load data from Supabase tables (falling back to offline LocalStorage mode):", err);
          // Set the error message (usually because tables aren't created yet)
          setSyncError(err.message || String(err));
          setDbMode('local');
          loadLocalData();
        }
      } else {
        setDbMode('local');
        loadLocalData();
      }
      setIsLoading(false);
    }

    function loadLocalData() {
      // 1. Printers
      const savedPrinters = localStorage.getItem(STORAGE_KEYS.PRINTERS);
      if (savedPrinters) {
        setPrinters(JSON.parse(savedPrinters));
      } else {
        setPrinters(INITIAL_PRINTERS);
        localStorage.setItem(STORAGE_KEYS.PRINTERS, JSON.stringify(INITIAL_PRINTERS));
      }

      // 2. Technicians
      const savedTechs = localStorage.getItem(STORAGE_KEYS.TECHNICIANS);
      if (savedTechs) {
        setTechnicians(JSON.parse(savedTechs));
      } else {
        setTechnicians(INITIAL_TECHNICIANS);
        localStorage.setItem(STORAGE_KEYS.TECHNICIANS, JSON.stringify(INITIAL_TECHNICIANS));
      }

      // 3. Notes
      const savedNotes = localStorage.getItem(STORAGE_KEYS.NOTES);
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
      } else {
        setNotes(INITIAL_NOTES);
        localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(INITIAL_NOTES));
      }

      // 4. Change Requests
      const savedRequests = localStorage.getItem(STORAGE_KEYS.REQUESTS);
      if (savedRequests) {
        setChangeRequests(JSON.parse(savedRequests));
      } else {
        setChangeRequests(INITIAL_CHANGE_REQUESTS);
        localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(INITIAL_CHANGE_REQUESTS));
      }

      // 5. Intervention Logs
      const savedLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (savedLogs) {
        setInterventionLogs(JSON.parse(savedLogs));
      } else {
        setInterventionLogs(INITIAL_INTERVENTION_LOGS);
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_INTERVENTION_LOGS));
      }

      // 6. Passwords
      const savedPasswords = localStorage.getItem(STORAGE_KEYS.PASSWORDS);
      if (savedPasswords) {
        setRegisteredPasswords({ ...DEFAULT_PASSWORDS, ...JSON.parse(savedPasswords) });
      } else {
        setRegisteredPasswords(DEFAULT_PASSWORDS);
        localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(DEFAULT_PASSWORDS));
      }
    }

    // Recover active user session
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (savedUser) {
      setActiveUser(JSON.parse(savedUser));
    }

    loadData();
  }, []);

  // --- Synchronization with LocalStorage on State Alterations (Local fallback cache) ---
  const saveAndSetPrinters = (newPrinters: Printer[]) => {
    setPrinters(newPrinters);
    localStorage.setItem(STORAGE_KEYS.PRINTERS, JSON.stringify(newPrinters));
  };

  const saveAndSetTechnicians = (newTechs: Technician[]) => {
    setTechnicians(newTechs);
    localStorage.setItem(STORAGE_KEYS.TECHNICIANS, JSON.stringify(newTechs));
  };

  const saveAndSetNotes = (newNotes: Note[]) => {
    setNotes(newNotes);
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(newNotes));
  };

  const saveAndSetRequests = (newReqs: ChangeRequest[]) => {
    setChangeRequests(newReqs);
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(newReqs));
  };

  const saveAndSetLogs = (newLogs: InterventionLog[]) => {
    setInterventionLogs(newLogs);
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(newLogs));
  };

  // --- Authentication Helpers ---
  const handleLogin = (user: LoggedInUser) => {
    setActiveUser(user);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  };

  const handleLogout = () => {
    setActiveUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
  };

  const handleRegisterPassword = async (email: string, pass: string) => {
    const updated = { ...registeredPasswords, [email.trim().toLowerCase()]: pass };
    setRegisteredPasswords(updated);
    localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(updated));

    if (dbMode === 'supabase') {
      try {
        const isSuper = email.trim().toLowerCase() === 'pierrerobertoleblanc10@gmail.com' || 
                        email.trim().toLowerCase() === 'pierrerobertoleblanc1@gmail.com' ||
                        email.trim().toLowerCase() === 'darlinelegrand8@gmail.com';
        await db.registerAdminUser(email, pass, isSuper ? 'super_admin' : 'admin');
      } catch (err: any) {
        console.warn("Supabase background sync notice (register admin): using local storage fallback", err);
        setSyncWarning("Échec d'enregistrement en ligne : " + (err.message || String(err)) + ". Vos accès ont bien été configurés localement sur cet appareil.");
      }
    }
  };

  // --- Business logic: State Mutator Handlers with Online/Offline resilience ---

  // Add Printer (Admin)
  const handleAddPrinter = async (newPrinterData: Omit<Printer, 'qr_code_url'>) => {
    const qrUrl = generateQRUrl(newPrinterData.id);
    const newPrinter: Printer = {
      ...newPrinterData,
      qr_code_url: qrUrl
    };
    const updated = [...printers, newPrinter];
    saveAndSetPrinters(updated);

    if (dbMode === 'supabase') {
      try {
        await db.insertPrinter(newPrinter);
      } catch (err: any) {
        console.warn("Supabase background sync notice (add printer): using local storage fallback", err);
        setSyncWarning("Échec de synchronisation (Imprimante) : " + (err.message || String(err)));
      }
    }
  };

  // Delete Printer (Admin & Super Admin)
  const handleDeletePrinter = async (id: string) => {
    const updated = printers.filter(p => p.id !== id);
    saveAndSetPrinters(updated);

    if (dbMode === 'supabase') {
      try {
        await db.deletePrinter(id);
      } catch (err: any) {
        console.warn("Supabase background sync notice (delete printer): using local storage fallback", err);
        setSyncWarning("Échec de synchronisation (Suppression Imprimante) : " + (err.message || String(err)));
      }
    }
  };

  // Add Technician (Admin)
  const handleAddTechnician = async (techData: Omit<Technician, 'id' | 'created_at'>) => {
    const newId = `TECH-${100 + technicians.length + 1}`;
    const newTech: Technician = {
      ...techData,
      id: newId,
      created_at: new Date().toISOString()
    };
    const updated = [...technicians, newTech];
    saveAndSetTechnicians(updated);

    if (dbMode === 'supabase') {
      try {
        await db.insertTechnician(newTech);
      } catch (err: any) {
        console.warn("Supabase background sync notice (add tech): using local storage fallback", err);
        setSyncWarning("Échec de synchronisation (Technicien) : " + (err.message || String(err)));
      }
    }
  };

  // Delete Technician (Admin & Super Admin)
  const handleDeleteTechnician = async (id: string) => {
    const updated = technicians.filter(t => t.id !== id);
    saveAndSetTechnicians(updated);

    if (dbMode === 'supabase') {
      try {
        await db.deleteTechnician(id);
      } catch (err: any) {
        console.warn("Supabase background sync notice (delete tech): using local storage fallback", err);
        setSyncWarning("Échec de synchronisation (Suppression Technicien) : " + (err.message || String(err)));
      }
    }
  };

  // Submit Technical Note (Technician)
  const handleSubmitNote = async (printerId: string, content: string) => {
    if (!activeUser) return;
    const newId = `NOTE-${100 + notes.length + 1}`;
    const newNote: Note = {
      id: newId,
      printer_id: printerId,
      technician_id: activeUser.technicianId || 'DEMO',
      technician_name: activeUser.technicianName || 'Technicien Démo',
      content,
      created_at: new Date().toISOString()
    };
    const updated = [newNote, ...notes];
    saveAndSetNotes(updated);

    if (dbMode === 'supabase') {
      try {
        await db.insertNote(newNote);
      } catch (err: any) {
        console.warn("Supabase background sync notice (add note): using local storage fallback", err);
        setSyncWarning("Échec de synchronisation (Note) : " + (err.message || String(err)));
      }
    }
  };

  // Submit ChangeRequest (Technician)
  const handleSubmitChangeRequest = async (reqData: Omit<ChangeRequest, 'id' | 'technician_id' | 'technician_name' | 'created_at' | 'status'>) => {
    if (!activeUser) return;
    const newId = `REQ-${100 + changeRequests.length + 1}`;
    const newReq: ChangeRequest = {
      ...reqData,
      id: newId,
      technician_id: activeUser.technicianId || 'DEMO',
      technician_name: activeUser.technicianName || 'Technicien Démo',
      status: 'pending',
      created_at: new Date().toISOString()
    };
    const updated = [newReq, ...changeRequests];
    saveAndSetRequests(updated);

    if (dbMode === 'supabase') {
      try {
        await db.insertChangeRequest(newReq);
      } catch (err: any) {
        console.warn("Supabase background sync notice (add request): using local storage fallback", err);
        setSyncWarning("Échec de synchronisation (Demande modification) : " + (err.message || String(err)));
      }
    }
  };

  // Submit Intervention Checklist Log (Technician)
  const handleSubmitInterventionLog = async (logData: Omit<InterventionLog, 'id' | 'technician_id' | 'technician_name' | 'date'>) => {
    if (!activeUser) return;
    const newId = `LOG-${100 + interventionLogs.length + 1}`;
    const newLog: InterventionLog = {
      ...logData,
      id: newId,
      technician_id: activeUser.technicianId || 'DEMO',
      technician_name: activeUser.technicianName || 'Technicien Démo',
      date: new Date().toISOString().split('T')[0]
    };
    const updated = [newLog, ...interventionLogs];
    saveAndSetLogs(updated);

    if (dbMode === 'supabase') {
      try {
        await db.insertInterventionLog(newLog);
      } catch (err: any) {
        console.warn("Supabase background sync notice (add log): using local storage fallback", err);
        setSyncWarning("Échec de synchronisation (Rapport) : " + (err.message || String(err)));
      }
    }
  };

  // Approve Change Request (Admin)
  const handleApproveRequest = async (id: string) => {
    const req = changeRequests.find(r => r.id === id);
    if (!req) return;

    // Apply printer mutations
    const updatedPrinters = printers.map(p => {
      if (p.id === req.printer_id) {
        const nextPrinter = {
          ...p,
          status: req.changes.status !== undefined ? req.changes.status : p.status,
          ink_cyan: req.changes.ink_cyan !== undefined ? req.changes.ink_cyan : p.ink_cyan,
          ink_magenta: req.changes.ink_magenta !== undefined ? req.changes.ink_magenta : p.ink_magenta,
          ink_yellow: req.changes.ink_yellow !== undefined ? req.changes.ink_yellow : p.ink_yellow,
          ink_black: req.changes.ink_black !== undefined ? req.changes.ink_black : p.ink_black,
          last_service_date: new Date().toISOString().split('T')[0]
        };

        if (dbMode === 'supabase') {
          db.updatePrinter(nextPrinter).catch(err => {
            console.warn("Supabase background sync notice (update printer status): using local storage fallback", err);
          });
        }

        return nextPrinter;
      }
      return p;
    });

    saveAndSetPrinters(updatedPrinters);

    // Update ChangeRequest status
    const updatedRequests = changeRequests.map(r => {
      if (r.id === id) {
        return { ...r, status: 'approved' as const };
      }
      return r;
    });

    saveAndSetRequests(updatedRequests);

    if (dbMode === 'supabase') {
      try {
        await db.updateChangeRequest(id, 'approved');
      } catch (err: any) {
        console.warn("Supabase background sync notice (approve request): using local storage fallback", err);
        setSyncWarning("Échec de synchronisation (Approbation) : " + (err.message || String(err)));
      }
    }
  };

  // Reject Change Request (Admin)
  const handleRejectRequest = async (id: string) => {
    const updatedRequests = changeRequests.map(r => {
      if (r.id === id) {
        return { ...r, status: 'rejected' as const };
      }
      return r;
    });
    saveAndSetRequests(updatedRequests);

    if (dbMode === 'supabase') {
      try {
        await db.updateChangeRequest(id, 'rejected');
      } catch (err: any) {
        console.warn("Supabase background sync notice (reject request): using local storage fallback", err);
        setSyncWarning("Échec de synchronisation (Rejet) : " + (err.message || String(err)));
      }
    }
  };

  // Delete Audit Records (Admin & Super Admin)
  const handleDeleteNote = async (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    saveAndSetNotes(updated);

    if (dbMode === 'supabase') {
      try {
        await db.deleteNote(id);
      } catch (err: any) {
        console.warn("Supabase background sync notice (delete note): using local storage fallback", err);
        setSyncWarning("Échec de synchronisation (Suppression Note) : " + (err.message || String(err)));
      }
    }
  };

  const handleDeleteLog = async (id: string) => {
    const updated = interventionLogs.filter(l => l.id !== id);
    saveAndSetLogs(updated);

    if (dbMode === 'supabase') {
      try {
        await db.deleteInterventionLog(id);
      } catch (err: any) {
        console.warn("Supabase background sync notice (delete log): using local storage fallback", err);
        setSyncWarning("Échec de synchronisation (Suppression Rapport) : " + (err.message || String(err)));
      }
    }
  };

  // Reset demo storage to default seed values
  const handleResetDemoData = () => {
    if (confirm("Réinitialiser toutes les données de l'application aux valeurs de démo initiales ?")) {
      saveAndSetPrinters(INITIAL_PRINTERS);
      saveAndSetTechnicians(INITIAL_TECHNICIANS);
      saveAndSetNotes(INITIAL_NOTES);
      saveAndSetRequests(INITIAL_CHANGE_REQUESTS);
      saveAndSetLogs(INITIAL_INTERVENTION_LOGS);
      const defaultPass = {};
      setRegisteredPasswords(defaultPass);
      localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(defaultPass));
      handleLogout();
    }
  };

  // Copy SQL script to clipboard helper
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Quick Switch Roles helper panel in Sandbox
  const handleSandboxRoleSwitch = (roleType: 'super' | 'admin' | 'tech') => {
    if (roleType === 'super') {
      handleLogin({
        email: 'pierrerobertoleblanc1@gmail.com',
        role: 'super_admin'
      });
    } else if (roleType === 'admin') {
      handleLogin({
        email: 'sullypatrick01@gmail.com',
        role: 'admin'
      });
    } else {
      // Login as first technician
      const defaultTech = technicians[0] || INITIAL_TECHNICIANS[0];
      handleLogin({
        role: 'technician',
        technicianId: defaultTech.id,
        technicianName: defaultTech.name,
        technicianCode: defaultTech.code
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800" id="app-root">
      {/* --- Main Navigation Routing Frame --- */}
      {syncWarning && (
        <div className={`backdrop-blur-sm border-b px-4 py-3 flex flex-col md:flex-row md:items-center justify-between text-xs font-medium gap-3 ${
          syncWarning.toLowerCase().includes('row-level security') || syncWarning.toLowerCase().includes('rls') || syncWarning.toLowerCase().includes('policy')
            ? 'bg-amber-50/95 border-amber-200 text-amber-900'
            : 'bg-indigo-50/90 border-indigo-100 text-indigo-800'
        }`} id="sync-warning-banner">
          <div className="flex items-start md:items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full mt-1.5 md:mt-0 shrink-0 ${
              syncWarning.toLowerCase().includes('row-level security') || syncWarning.toLowerCase().includes('rls') || syncWarning.toLowerCase().includes('policy')
                ? 'bg-amber-500 animate-pulse'
                : 'bg-indigo-500 animate-pulse'
            }`} />
            <div>
              <span className="font-bold">{syncWarning}</span>
              {(syncWarning.toLowerCase().includes('row-level security') || syncWarning.toLowerCase().includes('rls') || syncWarning.toLowerCase().includes('policy')) && (
                <p className="text-[10px] text-amber-700 font-semibold mt-1 leading-normal max-w-2xl">
                  👉 **Solution immédiate :** Supabase bloque l'insertion en raison du "Row Level Security" (RLS) activé par défaut. Cliquez sur le bouton à droite pour copier le script correcteur, puis collez-le et exécutez-le ("Run") dans l'onglet **SQL Editor** de votre dashboard Supabase pour désactiver le RLS sur toutes vos tables.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            {(syncWarning.toLowerCase().includes('row-level security') || syncWarning.toLowerCase().includes('rls') || syncWarning.toLowerCase().includes('policy')) && (
              <button
                onClick={handleCopySql}
                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                {copiedSql ? 'Copié avec succès !' : 'Copier le script SQL'}
              </button>
            )}
            <button 
              onClick={() => setSyncWarning(null)} 
              className={`font-bold px-2.5 py-1.5 rounded transition-all cursor-pointer ${
                syncWarning.toLowerCase().includes('row-level security') || syncWarning.toLowerCase().includes('rls') || syncWarning.toLowerCase().includes('policy')
                  ? 'text-amber-700 hover:text-amber-900 hover:bg-amber-100/50'
                  : 'text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100/50'
              }`}
            >
              Masquer
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col">
        {!activeUser ? (
          <LoginScreen
            onLogin={handleLogin}
            technicians={technicians.length > 0 ? technicians : INITIAL_TECHNICIANS}
            registeredPasswords={registeredPasswords}
            onRegisterPassword={handleRegisterPassword}
          />
        ) : activeUser.role === 'admin' || activeUser.role === 'super_admin' ? (
          <AdminDashboard
            user={activeUser}
            printers={printers}
            technicians={technicians}
            changeRequests={changeRequests}
            interventionLogs={interventionLogs}
            notes={notes}
            onLogout={handleLogout}
            onAddPrinter={handleAddPrinter}
            onUpdatePrinter={(updated) => {
              const next = printers.map(p => p.id === updated.id ? updated : p);
              saveAndSetPrinters(next);
            }}
            onDeletePrinter={handleDeletePrinter}
            onAddTechnician={handleAddTechnician}
            onDeleteTechnician={handleDeleteTechnician}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
            onDeleteNote={handleDeleteNote}
            onDeleteLog={handleDeleteLog}
            dbMode={dbMode}
            syncError={syncError}
          />
        ) : (
          <TechnicianPortal
            user={activeUser}
            printers={printers}
            notes={notes}
            onLogout={handleLogout}
            onSubmitChangeRequest={handleSubmitChangeRequest}
            onSubmitInterventionLog={handleSubmitInterventionLog}
            onSubmitNote={handleSubmitNote}
          />
        )}
      </div>
    </div>
  );
}
