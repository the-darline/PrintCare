import { Printer, Technician, Note, ChangeRequest, InterventionLog } from './types';

// Helper to generate a stable, permanent QR code URL for a printer ID
// Encodes with a base64 secure PrintCare prefix so ONLY PrintCare can read/interpret it
export const generateQRUrl = (printerId: string): string => {
  const secureData = btoa(`PRINTCARE:${printerId}`);
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(secureData)}`;
};

export const INITIAL_PRINTERS: Printer[] = [
  {
    id: 'PRN-101',
    name: 'HP LaserJet Enterprise Flow M528',
    department: 'Ressources Humaines',
    location: 'Bâtiment A, Salle 203 (Près de l\'ascenseur)',
    ip_address: '192.168.1.120',
    mac_address: '00:1A:2B:3C:4D:5E',
    brand_model: 'HP LaserJet M528dn',
    ink_cyan: 75,
    ink_magenta: 80,
    ink_yellow: 68,
    ink_black: 12, // Low ink alert!
    status: 'actif',
    last_service_date: '2026-05-12',
    qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=UFJJTlRDQVJFOlBSTi0xMDE=`,
  },
  {
    id: 'PRN-102',
    name: 'Canon imageRUNNER ADVANCE DX C3835i',
    department: 'Design & Marketing',
    location: 'Bâtiment B, Open Space central',
    ip_address: '192.168.2.45',
    mac_address: '3C:F7:A4:D2:11:8A',
    brand_model: 'Canon iR-ADV C3835i',
    ink_cyan: 45,
    ink_magenta: 5, // Extremely low ink alert!
    ink_yellow: 35,
    ink_black: 80,
    status: 'en_panne',
    last_service_date: '2026-06-10',
    qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=UFJJTlRDQVJFOlBSTi0xMDI=`,
  },
  {
    id: 'PRN-103',
    name: 'Epson WorkForce Pro WF-C879R',
    department: 'Direction Générale',
    location: 'Bâtiment A, 3ème étage (Secrétariat)',
    ip_address: '192.168.1.15',
    mac_address: '88:E9:FE:44:90:BC',
    brand_model: 'Epson WF-C879R',
    ink_cyan: 90,
    ink_magenta: 95,
    ink_yellow: 92,
    ink_black: 85,
    status: 'actif',
    last_service_date: '2026-04-20',
    qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=UFJJTlRDQVJFOlBSTi0xMDM=`,
  },
  {
    id: 'PRN-104',
    name: 'Xerox VersaLink C405',
    department: 'Finance & Comptabilité',
    location: 'Bâtiment A, Salle des archives',
    ip_address: '192.168.1.210',
    mac_address: '00:25:90:94:E1:FF',
    brand_model: 'Xerox C405v_DN',
    ink_cyan: 15, // Low ink alert!
    ink_magenta: 22,
    ink_yellow: 10, // Low ink alert!
    ink_black: 40,
    status: 'en_attente_maintenance',
    last_service_date: '2026-03-01',
    qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=UFJJTlRDQVJFOlBSTi0xMDQ=`,
  },
  {
    id: 'PRN-105',
    name: 'Brother HL-L8360CDW',
    department: 'Logistique & Expédition',
    location: 'Entrepôt Sud, Quai de chargement N°3',
    ip_address: '192.168.5.18',
    mac_address: 'E0:CB:4E:91:FA:32',
    brand_model: 'Brother HL-L8360CDW',
    ink_cyan: 0, // Out of ink!
    ink_magenta: 10,
    ink_yellow: 0, // Out of ink!
    ink_black: 5,
    status: 'inactif',
    last_service_date: '2026-01-15',
    qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=UFJJTlRDQVJFOlBSTi0xMDU=`,
  }
];

export const INITIAL_TECHNICIANS: Technician[] = [
  {
    id: 'TECH-001',
    name: 'Jean-Marc Fontaine',
    code: 'TECH01',
    email: 'j.fontaine@printcare.fr',
    created_at: '2026-01-10T08:30:00Z'
  },
  {
    id: 'TECH-002',
    name: 'Amandine Petit',
    code: 'TECH02',
    email: 'a.petit@printcare.fr',
    created_at: '2026-02-15T09:15:00Z'
  },
  {
    id: 'TECH-003',
    name: 'Lucas Bernard',
    code: 'TECH03',
    email: 'l.bernard@printcare.fr',
    created_at: '2026-04-01T14:00:00Z'
  }
];

export const INITIAL_NOTES: Note[] = [
  {
    id: 'NOTE-001',
    printer_id: 'PRN-101',
    technician_id: 'TECH-001',
    technician_name: 'Jean-Marc Fontaine',
    content: 'Nettoyage des têtes de lecture et des rouleaux de chargement de papier. Le bourrage papier fréquent semble résolu.',
    created_at: '2026-05-12T10:30:00Z'
  },
  {
    id: 'NOTE-002',
    printer_id: 'PRN-102',
    technician_id: 'TECH-002',
    technician_name: 'Amandine Petit',
    content: 'Code erreur E003 affiché à l\'écran. Bloc fusion défectueux. Commande de pièce passée. Imprimante mise hors service en attendant.',
    created_at: '2026-06-10T15:45:00Z'
  },
  {
    id: 'NOTE-003',
    printer_id: 'PRN-104',
    technician_id: 'TECH-001',
    technician_name: 'Jean-Marc Fontaine',
    content: 'Remplacement de la cartouche de toner noir effectué. Les niveaux de couleur baissent rapidement, prévoir un rechargement complet bientôt.',
    created_at: '2026-05-30T11:20:00Z'
  }
];

export const INITIAL_CHANGE_REQUESTS: ChangeRequest[] = [
  {
    id: 'REQ-001',
    printer_id: 'PRN-101',
    printer_name: 'HP LaserJet Enterprise Flow M528',
    technician_id: 'TECH-001',
    technician_name: 'Jean-Marc Fontaine',
    field_changed: 'État & Encre Noire',
    old_value: 'État: en_attente_maintenance, Encre Noire: 12%',
    new_value: 'État: actif, Encre Noire: 100%',
    status: 'pending',
    created_at: '2026-06-29T16:20:00Z',
    changes: {
      status: 'actif',
      ink_black: 100
    }
  },
  {
    id: 'REQ-002',
    printer_id: 'PRN-104',
    printer_name: 'Xerox VersaLink C405',
    technician_id: 'TECH-002',
    technician_name: 'Amandine Petit',
    field_changed: 'Cartouches Couleur',
    old_value: 'Cyan: 15%, Jaune: 10%',
    new_value: 'Cyan: 100%, Jaune: 100%',
    status: 'pending',
    created_at: '2026-06-30T08:15:00Z',
    changes: {
      ink_cyan: 100,
      ink_yellow: 100
    }
  }
];

export const INITIAL_INTERVENTION_LOGS: InterventionLog[] = [
  {
    id: 'LOG-001',
    printer_id: 'PRN-101',
    printer_name: 'HP LaserJet Enterprise Flow M528',
    technician_id: 'TECH-001',
    technician_name: 'Jean-Marc Fontaine',
    checklist_items: [
      { task: 'Vérification du câble réseau & IP', checked: true },
      { task: 'Nettoyage intérieur du châssis', checked: true },
      { task: 'Dépoussiérage des capteurs papier', checked: true },
      { task: 'Test d\'impression d\'alignement', checked: true },
      { task: 'Remplacement de consommables', checked: false }
    ],
    date: '2026-05-12'
  },
  {
    id: 'LOG-002',
    printer_id: 'PRN-102',
    printer_name: 'Canon imageRUNNER ADVANCE DX C3835i',
    technician_id: 'TECH-002',
    technician_name: 'Amandine Petit',
    checklist_items: [
      { task: 'Vérification du câble réseau & IP', checked: true },
      { task: 'Nettoyage intérieur du châssis', checked: false },
      { task: 'Dépoussiérage des capteurs papier', checked: false },
      { task: 'Test d\'impression d\'alignement', checked: false },
      { task: 'Remplacement de consommables', checked: false }
    ],
    date: '2026-06-10'
  }
];

export const DEFAULT_CHECKLIST_ITEMS = [
  'Vérification de la connectivité réseau & ping',
  'Nettoyage intérieur du carrousel et des rouleaux',
  'Dépoussiérage des capteurs optiques de bourrage',
  'Test d\'alignement et d\'étalonnage des couleurs',
  'Mise à jour du firmware réseau si applicable',
  'Remplacement des cartouches d\'encre usées'
];
