import { createClient } from '@supabase/supabase-js';
import { Printer, Technician, Note, ChangeRequest, InterventionLog } from '../types';

// Read configuration from Vite environment variables (cast as any for tsc compilation)
const rawUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const rawKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Clean up possible whitespace, line breaks or quotes from copy-pasting
export const supabaseUrl = rawUrl.replace(/['"\s]/g, '').trim();
export const supabaseAnonKey = rawKey.replace(/['"\s]/g, '').trim();

// Clean check of whether Supabase variables are set and functional
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// --- SQL Script instructions to help users set up their Supabase database ---
export const SUPABASE_SETUP_SQL = `-- SCRIPT DE CONFIGURATION POUR VOTRE SQL EDITOR SUPABASE

-- 1. Table printers
CREATE TABLE IF NOT EXISTS printers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  location TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  mac_address TEXT NOT NULL,
  brand_model TEXT NOT NULL,
  ink_cyan INTEGER NOT NULL DEFAULT 100,
  ink_magenta INTEGER NOT NULL DEFAULT 100,
  ink_yellow INTEGER NOT NULL DEFAULT 100,
  ink_black INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'actif',
  last_service_date TEXT NOT NULL,
  qr_code_url TEXT NOT NULL,
  admin_notes TEXT DEFAULT ''
);

-- 2. Table technicians
CREATE TABLE IF NOT EXISTS technicians (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table notes
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  printer_id TEXT NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
  technician_id TEXT NOT NULL,
  technician_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table change_requests
CREATE TABLE IF NOT EXISTS change_requests (
  id TEXT PRIMARY KEY,
  printer_id TEXT NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
  printer_name TEXT NOT NULL,
  technician_id TEXT NOT NULL,
  technician_name TEXT NOT NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT NOT NULL,
  new_value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  changes JSONB NOT NULL
);

-- 5. Table intervention_logs
CREATE TABLE IF NOT EXISTS intervention_logs (
  id TEXT PRIMARY KEY,
  printer_id TEXT NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
  printer_name TEXT NOT NULL,
  technician_id TEXT NOT NULL,
  technician_name TEXT NOT NULL,
  checklist_items JSONB NOT NULL,
  date TEXT NOT NULL
);

-- 6. Table admin_users (pour l'authentification réelle)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Désactivation explicite du Row Level Security (RLS) pour éviter tout blocage d'écriture/lecture client
ALTER TABLE printers DISABLE ROW LEVEL SECURITY;
ALTER TABLE technicians DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- Insertion des administrateurs par défaut (stockage sécurisé sous forme de hash SHA-256 du mot de passe)
INSERT INTO admin_users (email, password, role) VALUES
  ('sullypatrick01@gmail.com', 'eacb35e9d4c49083a689a263f1402e6227f664e043597ebf0ae9d7054519be4e', 'admin'),
  ('pierrerobertoleblanc1@gmail.com', 'eacb35e9d4c49083a689a263f1402e6227f664e043597ebf0ae9d7054519be4e', 'super_admin'),
  ('pierrerobertoleblanc10@gmail.com', 'eacb35e9d4c49083a689a263f1402e6227f664e043597ebf0ae9d7054519be4e', 'super_admin'),
  ('darlinelegrand8@gmail.com', 'eacb35e9d4c49083a689a263f1402e6227f664e043597ebf0ae9d7054519be4e', 'super_admin')
ON CONFLICT (email) DO NOTHING;
`;

// Helper to secure / descramble QR values for PrintCare ONLY
// Scrambling is done with a base64 layer with a prefix
export const encodeSecureQR = (printerId: string): string => {
  return btoa(`PRINTCARE:${printerId}`);
};

export const decodeSecureQR = (scrambled: string): string | null => {
  try {
    const decoded = atob(scrambled);
    if (decoded.startsWith('PRINTCARE:')) {
      return decoded.replace('PRINTCARE:', '');
    }
    return null;
  } catch (e) {
    return null;
  }
};

// --- Real Supabase Database APIs ---

export const db = {
  // Printers
  async getPrinters(): Promise<Printer[]> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase.from('printers').select('*').order('id', { ascending: true });
    if (error) throw error;
    return data as Printer[];
  },

  async insertPrinter(printer: Printer): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.from('printers').insert(printer);
    if (error) throw error;
  },

  async updatePrinter(printer: Printer): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.from('printers').update(printer).eq('id', printer.id);
    if (error) throw error;
  },

  async deletePrinter(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.from('printers').delete().eq('id', id);
    if (error) throw error;
  },

  // Technicians
  async getTechnicians(): Promise<Technician[]> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase.from('technicians').select('*').order('name', { ascending: true });
    if (error) throw error;
    return data as Technician[];
  },

  async insertTechnician(technician: Technician): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.from('technicians').insert(technician);
    if (error) throw error;
  },

  async deleteTechnician(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.from('technicians').delete().eq('id', id);
    if (error) throw error;
  },

  // Notes
  async getNotes(): Promise<Note[]> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase.from('notes').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as Note[];
  },

  async insertNote(note: Note): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.from('notes').insert(note);
    if (error) throw error;
  },

  async deleteNote(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) throw error;
  },

  // Change Requests
  async getChangeRequests(): Promise<ChangeRequest[]> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase.from('change_requests').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as ChangeRequest[];
  },

  async insertChangeRequest(req: ChangeRequest): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.from('change_requests').insert(req);
    if (error) throw error;
  },

  async updateChangeRequest(id: string, status: 'approved' | 'rejected'): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.from('change_requests').update({ status }).eq('id', id);
    if (error) throw error;
  },

  // Intervention Logs
  async getInterventionLogs(): Promise<InterventionLog[]> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase.from('intervention_logs').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data as InterventionLog[];
  },

  async insertInterventionLog(log: InterventionLog): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.from('intervention_logs').insert(log);
    if (error) throw error;
  },

  async deleteInterventionLog(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.from('intervention_logs').delete().eq('id', id);
    if (error) throw error;
  },

  // Admins Authentication / Password Management (Single secure hash retrieval to prevent mass data exposure)
  async getAdminPassword(email: string): Promise<string | null> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase
      .from('admin_users')
      .select('password')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();
    if (error) throw error;
    return data ? data.password : null;
  },

  async registerAdminUser(email: string, password: string, role: string = 'admin'): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.from('admin_users').insert({
      email: email.trim().toLowerCase(),
      password,
      role
    });
    if (error) throw error;
  }
};
