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
import { isSha256, hashPassword } from './lib/crypto';

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
  'sullypatrick01@gmail.com': 'eacb35e9d4c49083a689a263f1402e6227f664e043597ebf0ae9d7054519be4e',
  'pierrerobertoleblanc1@gmail.com': 'eacb35e9d4c49083a689a263f1402e6227f664e043597ebf0ae9d7054519be4e',
  'pierrerobertoleblanc10@gmail.com': 'eacb35e9d4c49083a689a263f1402e6227f664e043597ebf0ae9d7054519be4e',
  'darlinelegrand8@gmail.com': 'eacb35e9d4c49083a689a263f1402e6227f664e043597ebf0ae9d7054519be4e'
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
  const [copiedAlterSql, setCopiedAlterSql] = useState(false);

  // --- Initial State Loading (with Supabase sync & localStorage fallback) ---
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setSyncError(null);

      let loadedTechs: Technician[] = [];

      if (isSupabaseConfigured) {
        try {
          // Attempt to fetch production data from real Supabase
          const pPrinters = await db.getPrinters();
          const pTechs = await db.getTechnicians();
          const pNotes = await db.getNotes();
          const pReqs = await db.getChangeRequests();
          const pLogs = await db.getInterventionLogs();

          setPrinters(pPrinters);
          setTechnicians(pTechs);
          setNotes(pNotes);
          setChangeRequests(pReqs);
          setInterventionLogs(pLogs);
          loadedTechs = pTechs;

          // Warm local storage cache with production data
          localStorage.setItem(STORAGE_KEYS.PRINTERS, JSON.stringify(pPrinters));
          localStorage.setItem(STORAGE_KEYS.TECHNICIANS, JSON.stringify(pTechs));
          localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(pNotes));
          localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(pReqs));
          localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(pLogs));
          
          // Securely load only the local fallback passwords to keep offline functionality
          await loadLocalData(true);
          setDbMode('supabase');
        } catch (err: any) {
          console.warn("Failed to load data from Supabase tables (falling back to offline LocalStorage mode):", err);
          // Set the error message (usually because tables aren't created yet)
          setSyncError(err.message || String(err));
          setDbMode('local');
          loadedTechs = await loadLocalData(false);
        }
      } else {
        setDbMode('local');
        loadedTechs = await loadLocalData(false);
      }

      // Recover active user session and perform dynamic authorization check
      const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser) as LoggedInUser;
          if (user.role === 'admin' || user.role === 'super_admin') {
            const isRecognized =
              user.email === 'sullypatrick01@gmail.com' ||
              user.email === 'pierrerobertoleblanc1@gmail.com' ||
              user.email === 'pierrerobertoleblanc10@gmail.com' ||
              user.email === 'darlinelegrand8@gmail.com';
            if (isRecognized) {
              setActiveUser(user);
            } else {
              localStorage.removeItem(STORAGE_KEYS.USER);
            }
          } else if (user.role === 'technician') {
            const exists = loadedTechs.some(t => t.code === user.technicianId || t.id === user.technicianId);
            if (exists) {
              setActiveUser(user);
            } else {
              localStorage.removeItem(STORAGE_KEYS.USER);
            }
          } else {
            localStorage.removeItem(STORAGE_KEYS.USER);
          }
        } catch (e) {
          localStorage.removeItem(STORAGE_KEYS.USER);
        }
      }

      setIsLoading(false);
    }

    async function loadLocalData(onlyPasswords = false): Promise<Technician[]> {
      // 1. Printers
      if (!onlyPasswords) {
        const savedPrinters = localStorage.getItem(STORAGE_KEYS.PRINTERS);
        if (savedPrinters) {
          setPrinters(JSON.parse(savedPrinters));
        } else {
          setPrinters(INITIAL_PRINTERS);
          localStorage.setItem(STORAGE_KEYS.PRINTERS, JSON.stringify(INITIAL_PRINTERS));
        }
      }

      // 2. Technicians
      const savedTechs = localStorage.getItem(STORAGE_KEYS.TECHNICIANS);
      const techsList = savedTechs ? JSON.parse(savedTechs) : INITIAL_TECHNICIANS;
      if (!onlyPasswords) {
        setTechnicians(techsList);
      }
      if (!savedTechs) {
        localStorage.setItem(STORAGE_KEYS.TECHNICIANS, JSON.stringify(INITIAL_TECHNICIANS));
      }

      // 3. Notes
      if (!onlyPasswords) {
        const savedNotes = localStorage.getItem(STORAGE_KEYS.NOTES);
        if (savedNotes) {
          setNotes(JSON.parse(savedNotes));
        } else {
          setNotes(INITIAL_NOTES);
          localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(INITIAL_NOTES));
        }
      }

      // 4. Change Requests
      if (!onlyPasswords) {
        const savedRequests = localStorage.getItem(STORAGE_KEYS.REQUESTS);
        if (savedRequests) {
          setChangeRequests(JSON.parse(savedRequests));
        } else {
          setChangeRequests(INITIAL_CHANGE_REQUESTS);
          localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(INITIAL_CHANGE_REQUESTS));
        }
      }

      // 5. Intervention Logs
      if (!onlyPasswords) {
        const savedLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
        if (savedLogs) {
          setInterventionLogs(JSON.parse(savedLogs));
        } else {
          setInterventionLogs(INITIAL_INTERVENTION_LOGS);
          localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_INTERVENTION_LOGS));
        }
      }

      // 6. Passwords - Transparent Cryptographic Upgrade to SHA-256
      const savedPasswords = localStorage.getItem(STORAGE_KEYS.PASSWORDS);
      let parsedPasswords: Record<string, string> = {};
      if (savedPasswords) {
        try {
          parsedPasswords = JSON.parse(savedPasswords);
        } catch (e) {
          parsedPasswords = {};
        }
      }

      const merged = { ...DEFAULT_PASSWORDS, ...parsedPasswords };
      const migrated: Record<string, string> = {};
      let hasMigrationChanged = false;

      for (const [email, pass] of Object.entries(merged)) {
        if (isSha256(pass)) {
          migrated[email] = pass;
        } else {
          migrated[email] = await hashPassword(pass);
          hasMigrationChanged = true;
        }
      }

      setRegisteredPasswords(migrated);
      if (hasMigrationChanged || !savedPasswords) {
        localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(migrated));
      }

      return techsList;
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

  // Check if password setup has already been completed for this email
  const handleCheckPasswordSetup = async (email: string): Promise<boolean> => {
    const cleanedEmail = email.trim().toLowerCase();
    
    // For recognized admins, they have a predefined password, so they are always setup!
    const isRecognized =
      cleanedEmail === 'sullypatrick01@gmail.com' ||
      cleanedEmail === 'pierrerobertoleblanc1@gmail.com' ||
      cleanedEmail === 'pierrerobertoleblanc10@gmail.com' ||
      cleanedEmail === 'darlinelegrand8@gmail.com';
      
    if (isRecognized) {
      return true;
    }

    // In Supabase mode, check the database first
    if (dbMode === 'supabase') {
      try {
        const remoteHash = await db.getAdminPassword(cleanedEmail);
        if (remoteHash !== null) {
          // If the user password is in the database, it is already set up
          return true;
        }
      } catch (err) {
        console.warn("Error checking password setup in Supabase, checking local:", err);
      }
    }
    
    // Fallback/Local mode: check if we have a password in state or LocalStorage
    return registeredPasswords[cleanedEmail] !== undefined;
  };

  // Securely verify admin credentials without ever pulling the passwords list
  const handleVerifyPassword = async (email: string, pass: string): Promise<boolean> => {
    const cleanedEmail = email.trim().toLowerCase();
    const enteredHash = await hashPassword(pass);
    
    const isRecognized =
      cleanedEmail === 'sullypatrick01@gmail.com' ||
      cleanedEmail === 'pierrerobertoleblanc1@gmail.com' ||
      cleanedEmail === 'pierrerobertoleblanc10@gmail.com' ||
      cleanedEmail === 'darlinelegrand8@gmail.com';

    const isPredefinedPassword = enteredHash === 'eacb35e9d4c49083a689a263f1402e6227f664e043597ebf0ae9d7054519be4e';

    if (isRecognized && isPredefinedPassword) {
      // Always allow the correct predefined password for recognized admins.
      // Auto-repair local storage if it's outdated or missing
      if (registeredPasswords[cleanedEmail] !== enteredHash) {
        const updated = { ...registeredPasswords, [cleanedEmail]: enteredHash };
        setRegisteredPasswords(updated);
        localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(updated));
      }
      
      // Auto-repair/register in Supabase
      if (dbMode === 'supabase') {
        try {
          const remoteHash = await db.getAdminPassword(cleanedEmail);
          const isSuper = cleanedEmail === 'pierrerobertoleblanc10@gmail.com' || 
                          cleanedEmail === 'pierrerobertoleblanc1@gmail.com' ||
                          cleanedEmail === 'darlinelegrand8@gmail.com';
          
          if (remoteHash === null) {
            await db.registerAdminUser(cleanedEmail, enteredHash, isSuper ? 'super_admin' : 'admin');
          } else if (remoteHash !== enteredHash) {
            // Overwrite existing incorrect/outdated database password with correct hash
            await (db as any).updateAdminPassword(cleanedEmail, enteredHash);
          }
        } catch (err) {
          console.warn("Error auto-repairing admin password in Supabase:", err);
        }
      }
      return true;
    }

    // In Supabase mode, verify with DB
    if (dbMode === 'supabase') {
      try {
        const remoteHash = await db.getAdminPassword(cleanedEmail);
        if (remoteHash !== null) {
          return enteredHash === remoteHash;
        }
      } catch (err) {
        console.warn("Error verifying password with Supabase, verifying with local state:", err);
      }
    }
    
    // Fallback/Local mode verification
    const localHash = registeredPasswords[cleanedEmail];
    return localHash !== undefined && enteredHash === localHash;
  };

  const handleRegisterPassword = async (email: string, hashedPass: string) => {
    const updated = { ...registeredPasswords, [email.trim().toLowerCase()]: hashedPass };
    setRegisteredPasswords(updated);
    localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(updated));

    if (dbMode === 'supabase') {
      try {
        const isSuper = email.trim().toLowerCase() === 'pierrerobertoleblanc10@gmail.com' || 
                        email.trim().toLowerCase() === 'pierrerobertoleblanc1@gmail.com' ||
                        email.trim().toLowerCase() === 'darlinelegrand8@gmail.com';
        await db.registerAdminUser(email, hashedPass, isSuper ? 'super_admin' : 'admin');
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
    let maxNum = 100;
    technicians.forEach(t => {
      const match = t.id.match(/^TECH-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const uniqueSuffix = Math.floor(10 + Math.random() * 90);
    const newId = `TECH-${maxNum + 1}-${uniqueSuffix}`;

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
    let maxNum = 100;
    notes.forEach(n => {
      const match = n.id.match(/^NOTE-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const uniqueSuffix = Math.floor(10 + Math.random() * 90);
    const newId = `NOTE-${maxNum + 1}-${uniqueSuffix}`;

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
    let maxNum = 100;
    changeRequests.forEach(r => {
      const match = r.id.match(/^REQ-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const uniqueSuffix = Math.floor(10 + Math.random() * 90);
    const newId = `REQ-${maxNum + 1}-${uniqueSuffix}`;

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
    let maxNum = 100;
    interventionLogs.forEach(l => {
      const match = l.id.match(/^LOG-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const uniqueSuffix = Math.floor(10 + Math.random() * 90);
    const newId = `LOG-${maxNum + 1}-${uniqueSuffix}`;

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
    saveAndSetPrinters(INITIAL_PRINTERS);
    saveAndSetTechnicians(INITIAL_TECHNICIANS);
    saveAndSetNotes(INITIAL_NOTES);
    saveAndSetRequests(INITIAL_CHANGE_REQUESTS);
    saveAndSetLogs(INITIAL_INTERVENTION_LOGS);
    const defaultPass = {};
    setRegisteredPasswords(defaultPass);
    localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(defaultPass));
    handleLogout();
  };

  // Copy SQL script to clipboard helper
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleCopyAlterSql = () => {
    navigator.clipboard.writeText("ALTER TABLE printers ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT '';");
    setCopiedAlterSql(true);
    setTimeout(() => setCopiedAlterSql(false), 3000);
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
      {syncError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-3 flex flex-col md:flex-row md:items-center justify-between text-xs font-medium text-rose-900" id="sync-error-banner">
          <div className="flex items-start md:items-center gap-2.5">
            <span className="w-2 h-2 rounded-full mt-1.5 md:mt-0 shrink-0 bg-rose-500 animate-pulse" />
            <div>
              <span className="font-extrabold text-rose-900 block">⚠️ Mode local (hors-ligne) actif : Échec de connexion à Supabase</span>
              <p className="text-[10.5px] text-rose-700 font-semibold mt-0.5 leading-normal max-w-4xl">
                Erreur signalée : <code className="bg-rose-100/80 px-1 py-0.5 rounded font-mono text-[9.5px] text-rose-950 font-bold">{syncError}</code>.
              </p>
              <p className="text-[10px] text-rose-650 font-medium mt-1 leading-normal max-w-4xl">
                💡 **Pourquoi cela se produit sur Vercel ?**
                <br />
                1. Vos variables d'environnement <code className="bg-rose-100/50 px-1 font-mono text-[9px]">VITE_SUPABASE_URL</code> ou <code className="bg-rose-100/50 px-1 font-mono text-[9px]">VITE_SUPABASE_ANON_KEY</code> ne sont pas encore configurées dans votre tableau de bord Vercel (ou n'ont pas été déployées).
                <br />
                2. Vos variables contiennent des espaces ou un retour à la ligne invisible. Ré-enregistrez-les proprement.
                <br />
                3. Votre projet Supabase est peut-être **suspendu/en pause** par inactivité. Allez sur votre tableau de bord Supabase pour le réactiver.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setSyncError(null)} 
            className="font-bold px-2.5 py-1.5 rounded text-rose-700 hover:text-rose-900 hover:bg-rose-100/50 cursor-pointer self-end md:self-auto shrink-0 transition-all text-[11px] uppercase tracking-wider"
          >
            Masquer
          </button>
        </div>
      )}

      {syncWarning && (
        <div className={`backdrop-blur-sm border-b px-4 py-3 flex flex-col md:flex-row md:items-center justify-between text-xs font-medium gap-3 ${
          syncWarning.toLowerCase().includes('row-level security') || syncWarning.toLowerCase().includes('rls') || syncWarning.toLowerCase().includes('policy') || syncWarning.toLowerCase().includes('admin_notes')
            ? 'bg-amber-50/95 border-amber-200 text-amber-900'
            : 'bg-indigo-50/90 border-indigo-100 text-indigo-800'
        }`} id="sync-warning-banner">
          <div className="flex items-start md:items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full mt-1.5 md:mt-0 shrink-0 ${
              syncWarning.toLowerCase().includes('row-level security') || syncWarning.toLowerCase().includes('rls') || syncWarning.toLowerCase().includes('policy') || syncWarning.toLowerCase().includes('admin_notes')
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
              {syncWarning.toLowerCase().includes('admin_notes') && (
                <p className="text-[10px] text-amber-700 font-semibold mt-1 leading-normal max-w-2xl">
                  👉 **Solution immédiate :** Votre table en ligne <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[9px] text-amber-900">printers</code> ne possède pas encore la colonne <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[9px] text-amber-900">admin_notes</code>. Cliquez sur le bouton à droite pour copier l'instruction SQL de mise à jour, puis collez-la et exécutez-la ("Run") dans le **SQL Editor** de votre dashboard Supabase pour ajouter cette colonne instantanément sans perdre vos données !
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
            {syncWarning.toLowerCase().includes('admin_notes') && (
              <button
                onClick={handleCopyAlterSql}
                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                {copiedAlterSql ? 'Copié ! Exécutez-le dans Supabase' : 'Copier le script SQL de mise à jour'}
              </button>
            )}
            <button 
              onClick={() => setSyncWarning(null)} 
              className={`font-bold px-2.5 py-1.5 rounded transition-all cursor-pointer ${
                syncWarning.toLowerCase().includes('row-level security') || syncWarning.toLowerCase().includes('rls') || syncWarning.toLowerCase().includes('policy') || syncWarning.toLowerCase().includes('admin_notes')
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
            onVerifyPassword={handleVerifyPassword}
            onCheckPasswordSetup={handleCheckPasswordSetup}
            onRegisterPassword={handleRegisterPassword}
            dbMode={dbMode}
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
            onUpdatePrinter={async (updated) => {
              const next = printers.map(p => p.id === updated.id ? updated : p);
              saveAndSetPrinters(next);
              if (dbMode === 'supabase') {
                try {
                  await db.updatePrinter(updated);
                } catch (err: any) {
                  console.warn("Supabase background sync notice (update printer): using local storage fallback", err);
                  setSyncWarning("Échec de synchronisation (Mise à jour Imprimante) : " + (err.message || String(err)));
                }
              }
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
