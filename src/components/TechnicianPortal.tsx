import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Printer,
  QrCode,
  CheckSquare,
  FileText,
  Clock,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Send,
  Sliders,
  MapPin,
  ChevronRight,
  Info,
  LogOut,
  Lock,
  Unlock,
  AlertTriangle
} from 'lucide-react';
import {
  Printer as PrinterType,
  ChangeRequest,
  InterventionLog,
  PrinterStatus,
  LoggedInUser,
  Note
} from '../types';
import { DEFAULT_CHECKLIST_ITEMS } from '../data';
import { decodeSecureQR } from '../lib/supabase';


interface TechnicianPortalProps {
  user: LoggedInUser;
  printers: PrinterType[];
  notes: Note[];
  onLogout: () => void;
  onSubmitChangeRequest: (req: Omit<ChangeRequest, 'id' | 'technician_id' | 'technician_name' | 'created_at' | 'status'>) => void;
  onSubmitInterventionLog: (log: Omit<InterventionLog, 'id' | 'technician_id' | 'technician_name' | 'date'>) => void;
  onSubmitNote: (printerId: string, content: string) => void;
}

export default function TechnicianPortal({
  user,
  printers,
  notes,
  onLogout,
  onSubmitChangeRequest,
  onSubmitInterventionLog,
  onSubmitNote,
}: TechnicianPortalProps) {
  // Navigation: 'scan' or 'printer-detail'
  const [activeScreen, setActiveScreen] = useState<'scan' | 'printer-detail'>('scan');
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterType | null>(null);

  // QR Scanning States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Intervention checklist and forms
  const [checklist, setChecklist] = useState<{ task: string; checked: boolean }[]>(
    DEFAULT_CHECKLIST_ITEMS.map(task => ({ task, checked: false }))
  );
  const [techNoteText, setTechNoteText] = useState('');

  // Proposing changes forms
  const [proposedStatus, setProposedStatus] = useState<PrinterStatus>('actif');
  const [proposedCyan, setProposedCyan] = useState(100);
  const [proposedMagenta, setProposedMagenta] = useState(100);
  const [proposedYellow, setProposedYellow] = useState(100);
  const [proposedBlack, setProposedBlack] = useState(100);
  const [, setHasChangedState] = useState(false);

  // Submission messages
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successToastMessage, setSuccessToastMessage] = useState('');

  // Secure QR Verification States
  const [manualQRInput, setManualQRInput] = useState('');
  const [qrValidationError, setQrValidationError] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodingMessage, setDecodingMessage] = useState('');

  const handleVerifySecureQR = (e: React.FormEvent) => {
    e.preventDefault();
    setQrValidationError('');
    const trimmedInput = manualQRInput.trim();
    if (!trimmedInput) {
      setQrValidationError("Veuillez saisir le contenu du QR Code.");
      return;
    }

    setIsDecoding(true);
    setDecodingMessage("Analyse cryptographique du jeton...");

    setTimeout(() => {
      const decodedId = decodeSecureQR(trimmedInput);
      if (!decodedId) {
        setIsDecoding(false);
        setQrValidationError("❌ ÉCHEC : QR Code non sécurisé ! Seule l'application PrintCare est autorisée à déchiffrer ce QR Code. Les scanners génériques externes sont rejetés.");
        return;
      }

      setDecodingMessage("Signature vérifiée. Recherche de la machine physique...");

      setTimeout(() => {
        const matchedPrinter = printers.find(p => p.id === decodedId);
        if (!matchedPrinter) {
          setIsDecoding(false);
          setQrValidationError(`❌ Code sécurisé déchiffré valide, mais l'imprimante "${decodedId}" n'existe pas dans le système.`);
          return;
        }

        setIsDecoding(false);
        setManualQRInput('');
        triggerPrinterDetail(matchedPrinter);
      }, 700);
    }, 700);
  };

  // Stop camera when component unmounts or active screen changes
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [activeScreen]);

  const startCamera = async () => {
    setIsCameraActive(true);
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn("Camera not accessible:", err);
      setCameraError(
        "L'accès caméra n'a pas pu être établi (permissions ou indisponibilité). Utilisez le simulateur de QR code ci-dessous pour tester !"
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const triggerPrinterDetail = (printer: PrinterType) => {
    stopCamera();
    setSelectedPrinter(printer);
    setProposedStatus(printer.status);
    setProposedCyan(printer.ink_cyan);
    setProposedMagenta(printer.ink_magenta);
    setProposedYellow(printer.ink_yellow);
    setProposedBlack(printer.ink_black);
    setChecklist(DEFAULT_CHECKLIST_ITEMS.map(task => ({ task, checked: false })));
    setTechNoteText('');
    setHasChangedState(false);
    setActiveScreen('printer-detail');
  };

  const handleChecklistToggle = (idx: number) => {
    const nextChecklist = [...checklist];
    nextChecklist[idx].checked = !nextChecklist[idx].checked;
    setChecklist(nextChecklist);
  };

  // Submit intervention checklist and note
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrinter) return;

    // 1. Submit Note if entered
    if (techNoteText.trim() !== '') {
      onSubmitNote(selectedPrinter.id, techNoteText.trim());
    }

    // 2. Submit Intervention Log
    onSubmitInterventionLog({
      printer_id: selectedPrinter.id,
      printer_name: selectedPrinter.name,
      checklist_items: checklist,
    });

    // 3. Submit ChangeRequest if the technician modified state values
    if (
      proposedStatus !== selectedPrinter.status ||
      proposedCyan !== selectedPrinter.ink_cyan ||
      proposedMagenta !== selectedPrinter.ink_magenta ||
      proposedYellow !== selectedPrinter.ink_yellow ||
      proposedBlack !== selectedPrinter.ink_black
    ) {
      // Build descriptive labels for what changed
      const changedFields: string[] = [];
      const oldVals: string[] = [];
      const newValStr: string[] = [];

      if (proposedStatus !== selectedPrinter.status) {
        changedFields.push("Statut");
        oldVals.push(`Statut: ${selectedPrinter.status}`);
        newValStr.push(`Statut: ${proposedStatus}`);
      }
      if (
        proposedCyan !== selectedPrinter.ink_cyan ||
        proposedMagenta !== selectedPrinter.ink_magenta ||
        proposedYellow !== selectedPrinter.ink_yellow ||
        proposedBlack !== selectedPrinter.ink_black
      ) {
        changedFields.push("Niveaux d'encre");
        oldVals.push(`C:${selectedPrinter.ink_cyan} M:${selectedPrinter.ink_magenta} Y:${selectedPrinter.ink_yellow} K:${selectedPrinter.ink_black}`);
        newValStr.push(`C:${proposedCyan} M:${proposedMagenta} Y:${proposedYellow} K:${proposedBlack}`);
      }

      onSubmitChangeRequest({
        printer_id: selectedPrinter.id,
        printer_name: selectedPrinter.name,
        field_changed: changedFields.join(" & "),
        old_value: oldVals.join(" • "),
        new_value: newValStr.join(" • "),
        changes: {
          status: proposedStatus !== selectedPrinter.status ? proposedStatus : undefined,
          ink_cyan: proposedCyan !== selectedPrinter.ink_cyan ? proposedCyan : undefined,
          ink_magenta: proposedMagenta !== selectedPrinter.ink_magenta ? proposedMagenta : undefined,
          ink_yellow: proposedYellow !== selectedPrinter.ink_yellow ? proposedYellow : undefined,
          ink_black: proposedBlack !== selectedPrinter.ink_black ? proposedBlack : undefined,
        }
      });

      setSuccessToastMessage("Intervention enregistrée ! La demande de modification a été envoyée à l'administrateur pour validation.");
    } else {
      setSuccessToastMessage("Fiche d'intervention validée avec succès !");
    }

    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 5000);

    // Go back to scanning screen
    setActiveScreen('scan');
    setSelectedPrinter(null);
  };

  // Filter notes corresponding to the active printer
  const currentPrinterNotes = selectedPrinter
    ? notes.filter(n => n.printer_id === selectedPrinter.id)
    : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="tech-portal-container">
      {/* Header bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-md shadow-indigo-600/10">
            <Printer className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-md font-extrabold text-white leading-none">PrintCare Portal</h1>
            <p className="text-[10px] text-indigo-400 font-bold tracking-wider uppercase mt-1">Technicien: {user.technicianName}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all duration-150"
          id="btn-tech-logout"
        >
          <LogOut className="h-3.5 w-3.5" />
          Quitter
        </button>
      </header>

      {/* Main Screen Container */}
      <main className="flex-1 p-5 md:p-8 overflow-y-auto max-w-3xl mx-auto w-full relative">
        {/* SECURE DECRYPTION OVERLAY */}
        <AnimatePresence>
          {isDecoding && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-6"
              id="decryption-overlay"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-5 border border-slate-150 shadow-2xl"
              >
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="h-6 w-6 text-indigo-600 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <QrCode className="h-4 w-4 text-indigo-600" />
                    Décryptage Sécurisé
                  </h4>
                  <p className="text-xs text-indigo-600 font-bold font-mono min-h-[32px] flex items-center justify-center bg-indigo-50/50 rounded-lg px-3 py-1.5 border border-indigo-100/50">
                    {decodingMessage}
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed font-sans">
                  La vérification cryptographique garantit la présence physique du technicien devant l'emplacement de l'équipement.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SUCCESS TOAST BAR */}
        <AnimatePresence>
          {showSuccessToast && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="absolute top-5 left-5 right-5 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl shadow-lg flex items-start gap-3 z-50 animate-fade-in"
              id="success-toast"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold">Action enregistrée !</p>
                <p className="text-[11px] text-emerald-700 mt-1 leading-relaxed font-medium">{successToastMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SCREEN 1: QR SCANNER VIEW */}
        {activeScreen === 'scan' && (
          <div className="space-y-6" id="tech-screen-scan">
            <div className="text-center max-w-md mx-auto space-y-2">
              <QrCode className="h-12 w-12 text-indigo-600 mx-auto" />
              <h2 className="text-xl font-bold text-slate-900">Scanner une Imprimante</h2>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Scannez le QR Code collé sur le châssis d'une imprimante pour inspecter son état, ses niveaux d'encre et consigner votre entretien.
              </p>
            </div>

            {/* Scanning Viewport Box */}
            <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Scanner Caméra Direct</span>
                {!isCameraActive ? (
                  <button
                    onClick={startCamera}
                    className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded cursor-pointer transition-all duration-150 flex items-center gap-1 shadow-sm shadow-indigo-600/10"
                    id="btn-start-camera"
                  >
                    <Camera className="h-3 w-3" />
                    Activer
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="py-1 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] rounded cursor-pointer transition-all duration-150"
                  >
                    Éteindre
                  </button>
                )}
              </div>

              {/* Cam Box / Alert */}
              <div className="relative aspect-video bg-slate-100 flex items-center justify-center p-4">
                {isCameraActive ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    {/* Laser Scanner animation effect */}
                    <div className="absolute left-0 right-0 h-0.5 bg-indigo-500 shadow-md shadow-indigo-500/50 animate-bounce top-[45%]" />
                    <div className="absolute inset-12 border-2 border-dashed border-indigo-400/50 rounded-lg pointer-events-none" />
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto border border-slate-200 shadow-xs">
                      <Camera className="h-6 w-6 text-slate-400" />
                    </div>
                    {cameraError ? (
                      <p className="text-[11px] text-amber-600 font-medium leading-relaxed max-w-xs mx-auto">
                        {cameraError}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500 font-medium">
                        La caméra n'est pas lancée. Activez la caméra ci-dessus pour scanner le QR Code physique de la machine.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* SECURE QR CODE SCANNER (MANUAL VALIDATION EXPLAINED) */}
            <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4" id="secure-qr-box">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Lecteur de QR Code Sécurisé</h3>
                </div>
                <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase">
                  Exclusif PrintCare
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Pour assurer la sécurité, seul le lecteur intégré à PrintCare peut déchiffrer nos codes QR. 
                Si vous scannez avec un appareil tiers, vous obtiendrez un code chiffré. Saisissez-le ici pour tester la sécurité :
              </p>

              <form onSubmit={handleVerifySecureQR} className="space-y-3">
                <div>
                  <input
                    type="text"
                    value={manualQRInput}
                    onChange={(e) => setManualQRInput(e.target.value)}
                    placeholder="Saisissez le code (ex: UFJJTlRDQVJFOlBSTi0xMDE=)"
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-mono"
                  />
                </div>
                
                {qrValidationError && (
                  <p className="text-[10px] text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-150 font-semibold leading-relaxed">
                    {qrValidationError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-all duration-150 flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/10"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  Vérifier & Décoder le QR Code
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SCREEN 2: PRINTER DETAILS & SUBMIT INTERVENTION */}
        {activeScreen === 'printer-detail' && selectedPrinter && (
          <div className="space-y-6" id="tech-screen-detail">
            {/* Back to scanner */}
            <button
              onClick={() => {
                setActiveScreen('scan');
                setSelectedPrinter(null);
              }}
              className="py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer transition-all duration-150 shadow-xs"
              id="btn-back-to-scan"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au Scanner
            </button>

            {/* Printer Profile Frame */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                      ID: {selectedPrinter.id}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">{selectedPrinter.name}</h2>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">{selectedPrinter.brand_model}</p>
                </div>

                {/* Print details badge */}
                <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-left font-mono text-[10px] text-slate-500 space-y-0.5 shrink-0">
                  <p>IP: {selectedPrinter.ip_address}</p>
                  <p>MAC: {selectedPrinter.mac_address}</p>
                </div>
              </div>

              {/* Status display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-500 font-medium">
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-indigo-600" />
                  <span>Département: <strong className="text-slate-800">{selectedPrinter.department}</strong></span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-600" />
                  <span>Dernier entretien: <strong className="text-slate-800">{selectedPrinter.last_service_date}</strong></span>
                </p>
              </div>

              {/* State / Ink levels indicator */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">État Actuel & Consommables</span>
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-white p-2 rounded text-center border border-slate-200">
                    <span className="text-[9px] text-cyan-500 font-bold block mb-1">C</span>
                    <span className="text-sm font-bold text-slate-800">{selectedPrinter.ink_cyan}%</span>
                  </div>
                  <div className="bg-white p-2 rounded text-center border border-slate-200">
                    <span className="text-[9px] text-pink-500 font-bold block mb-1">M</span>
                    <span className="text-sm font-bold text-slate-800">{selectedPrinter.ink_magenta}%</span>
                  </div>
                  <div className="bg-white p-2 rounded text-center border border-slate-200">
                    <span className="text-[9px] text-yellow-500 font-bold block mb-1">Y</span>
                    <span className="text-sm font-bold text-slate-800">{selectedPrinter.ink_yellow}%</span>
                  </div>
                  <div className="bg-white p-2 rounded text-center border border-slate-200">
                    <span className="text-[9px] text-slate-400 font-bold block mb-1">K</span>
                    <span className="text-sm font-bold text-slate-800">{selectedPrinter.ink_black}%</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 pt-1.5 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span className="font-semibold">
                    Statut machine : <strong className="text-slate-800 uppercase font-mono font-bold">{selectedPrinter.status.replace('_', ' ')}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Notes/Instructions for the technician */}
            {selectedPrinter.admin_notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs space-y-2 text-left animate-fade-in" id="admin-consignes-banner">
                <span className="text-xs font-black uppercase text-amber-800 tracking-wider flex items-center gap-1.5 font-sans">
                  <FileText className="h-4 w-4 text-amber-600" />
                  Consignes de l'Administration pour cette machine
                </span>
                <p className="text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-line italic">
                  "{selectedPrinter.admin_notes}"
                </p>
                <p className="text-[10px] text-amber-700 font-medium font-sans">
                  Veuillez lire et appliquer scrupuleusement ces directives lors de votre intervention.
                </p>
              </div>
            )}

            {/* INTERVENTION SUBMISSION FORM */}
            <form onSubmit={handleFormSubmit} className="space-y-6" id="form-submit-intervention">
              {/* Box 1: Checklist items */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <CheckSquare className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800">Checklist d'Intervention à effectuer</h3>
                </div>

                <div className="space-y-2.5">
                  {checklist.map((item, idx) => (
                    <label
                      key={idx}
                      className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100/60 p-3 rounded-xl border border-slate-200 cursor-pointer transition-all duration-150 select-none"
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => handleChecklistToggle(idx)}
                        className="w-4 h-4 rounded text-indigo-600 bg-white border-slate-300 focus:ring-indigo-500 focus:ring-opacity-50 cursor-pointer"
                        id={`check-task-${idx}`}
                      />
                      <span className={`text-xs font-semibold ${item.checked ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                        {item.task}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Box 2: Proposed modifications */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <Sliders className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800">Proposer un changement de statut ou d'encre</h3>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-indigo-800 leading-relaxed font-semibold">
                    Note de sécurité : Pour garantir la traçabilité, toute modification d'état ou d'encre ne sera pas appliquée immédiatement, mais sera envoyée pour validation sous forme de <strong>ChangeRequest</strong> à l'administrateur.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Proposer le nouveau statut</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['actif', 'en_panne', 'en_attente_maintenance', 'inactif'] as PrinterStatus[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => {
                            setProposedStatus(status);
                            setHasChangedState(true);
                          }}
                          className={`py-2 px-3 text-xs font-bold rounded-lg border capitalize transition-all duration-150 cursor-pointer ${
                            proposedStatus === status
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                          }`}
                          id={`propose-status-${status}`}
                        >
                          {status.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Refilling simulation sliders */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ajuster / Recharger les cartouches</span>
                      <button
                        type="button"
                        onClick={() => {
                          setProposedCyan(100);
                          setProposedMagenta(100);
                          setProposedYellow(100);
                          setProposedBlack(100);
                          setHasChangedState(true);
                        }}
                        className="text-[10px] text-indigo-700 hover:underline bg-indigo-50 hover:bg-indigo-100/50 border border-indigo-200 px-2 py-0.5 rounded font-bold transition-all cursor-pointer"
                      >
                        Recharge Complète (100% Partout)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] text-cyan-600 font-bold uppercase">Cyan ({proposedCyan}%)</label>
                          {proposedCyan !== selectedPrinter.ink_cyan && <span className="text-[9px] bg-indigo-50 px-1.5 rounded border border-indigo-200 text-indigo-600 font-bold">Modifié</span>}
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={proposedCyan}
                          onChange={(e) => {
                            setProposedCyan(Number(e.target.value));
                            setHasChangedState(true);
                          }}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] text-pink-600 font-bold uppercase font-mono">Magenta ({proposedMagenta}%)</label>
                          {proposedMagenta !== selectedPrinter.ink_magenta && <span className="text-[9px] bg-indigo-50 px-1.5 rounded border border-indigo-200 text-indigo-600 font-bold">Modifié</span>}
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={proposedMagenta}
                          onChange={(e) => {
                            setProposedMagenta(Number(e.target.value));
                            setHasChangedState(true);
                          }}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] text-yellow-600 font-bold uppercase font-mono">Jaune ({proposedYellow}%)</label>
                          {proposedYellow !== selectedPrinter.ink_yellow && <span className="text-[9px] bg-indigo-50 px-1.5 rounded border border-indigo-200 text-indigo-600 font-bold">Modifié</span>}
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={proposedYellow}
                          onChange={(e) => {
                            setProposedYellow(Number(e.target.value));
                            setHasChangedState(true);
                          }}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] text-slate-700 font-bold uppercase font-mono">Noir ({proposedBlack}%)</label>
                          {proposedBlack !== selectedPrinter.ink_black && <span className="text-[9px] bg-indigo-50 px-1.5 rounded border border-indigo-200 text-indigo-600 font-bold">Modifié</span>}
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={proposedBlack}
                          onChange={(e) => {
                            setProposedBlack(Number(e.target.value));
                            setHasChangedState(true);
                          }}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 3: Technical Note */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800">Ajouter un compte-rendu technique / Note</h3>
                </div>

                <div className="space-y-3">
                  <textarea
                    rows={3}
                    placeholder="Saisissez les détails de vos manipulations techniques (ex: remplacement de rouleau de chargement, nettoyage du four, calibration...)"
                    value={techNoteText}
                    onChange={(e) => setTechNoteText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 placeholder-slate-400 resize-none font-medium"
                    id="input-tech-note"
                  />

                  {/* Previous notes feed */}
                  <div className="space-y-2.5 border-t border-slate-200 pt-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Historique des notes matérielles</span>
                    {currentPrinterNotes.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic font-semibold">Aucune note technique antérieure sur cette imprimante.</p>
                    ) : (
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {currentPrinterNotes.map((note) => (
                          <div key={note.id} className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 space-y-1">
                            <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold">
                              <span>{note.technician_name}</span>
                              <span>{new Date(note.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-[11px] text-slate-700 italic font-medium">"{note.content}"</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Action submit */}
              <button
                type="submit"
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer transition-all duration-150"
                id="btn-submit-intervention-form"
              >
                <Send className="h-4 w-4" />
                Soumettre le rapport d'intervention
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
