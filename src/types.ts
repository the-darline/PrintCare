export type PrinterStatus = 'actif' | 'en_panne' | 'en_attente_maintenance' | 'inactif';

export interface Printer {
  id: string;
  name: string;
  department: string;
  location: string;
  ip_address: string;
  mac_address: string;
  brand_model: string;
  ink_cyan: number; // 0-100
  ink_magenta: number; // 0-100
  ink_yellow: number; // 0-100
  ink_black: number; // 0-100
  status: PrinterStatus;
  last_service_date: string;
  qr_code_url: string;
  admin_notes?: string;
}

export interface Technician {
  id: string;
  name: string;
  code: string; // unique code, e.g. TECH01
  email?: string;
  created_at: string;
}

export interface Note {
  id: string;
  printer_id: string;
  technician_id: string;
  technician_name: string;
  content: string;
  created_at: string;
}

export interface ChangeRequest {
  id: string;
  printer_id: string;
  printer_name: string;
  technician_id: string;
  technician_name: string;
  field_changed: string; // e.g. "status", "niveaux d'encre", etc.
  old_value: string;
  new_value: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  // Hold technical values to apply on approval
  changes: {
    status?: PrinterStatus;
    ink_cyan?: number;
    ink_magenta?: number;
    ink_yellow?: number;
    ink_black?: number;
  };
}

export interface InterventionLog {
  id: string;
  printer_id: string;
  printer_name: string;
  technician_id: string;
  technician_name: string;
  checklist_items: { task: string; checked: boolean }[];
  date: string;
}

export type UserRole = 'super_admin' | 'admin' | 'technician' | null;

export interface LoggedInUser {
  email?: string;
  role: UserRole;
  technicianId?: string;
  technicianName?: string;
  technicianCode?: string;
}
