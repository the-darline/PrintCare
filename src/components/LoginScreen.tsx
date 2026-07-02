import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Printer, Shield, Key, Mail, ArrowRight, CheckCircle2, Lock, Eye, EyeOff, User } from 'lucide-react';
import { LoggedInUser, Technician } from '../types';
import { hashPassword } from '../lib/crypto';

interface LoginScreenProps {
  onLogin: (user: LoggedInUser) => void;
  technicians: Technician[];
  onVerifyPassword: (email: string, pass: string) => Promise<boolean>;
  onCheckPasswordSetup: (email: string) => Promise<boolean>;
  onRegisterPassword: (email: string, hashedPass: string) => void;
  dbMode?: 'supabase' | 'local';
}

export default function LoginScreen({
  onLogin,
  technicians,
  onVerifyPassword,
  onCheckPasswordSetup,
  onRegisterPassword,
  dbMode = 'local',
}: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<'admin' | 'tech'>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [techCode, setTechCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isEmailSetup, setIsEmailSetup] = useState<boolean | null>(null);

  // Detect whether the email already has a configured password
  React.useEffect(() => {
    const trimmed = email.trim().toLowerCase();
    const isRecognized =
      trimmed === 'sullypatrick01@gmail.com' ||
      trimmed === 'pierrerobertoleblanc1@gmail.com' ||
      trimmed === 'pierrerobertoleblanc10@gmail.com' ||
      trimmed === 'darlinelegrand8@gmail.com';

    if (isRecognized) {
      onCheckPasswordSetup(trimmed).then(setup => {
        setIsEmailSetup(setup);
      });
    } else {
      setIsEmailSetup(null);
    }
  }, [email, onCheckPasswordSetup]);

  // Password Setup Simulation State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [modalEmail, setModalEmail] = useState('');
  const [setupStep, setSetupStep] = useState<'inbox' | 'form' | 'success'>('inbox');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Auto-detect setup activation link from real email
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const setup = params.get('setup');
    const emailParam = params.get('email');
    const passwordParam = params.get('password');
    if (setup === 'true' && emailParam) {
      const emailLower = emailParam.toLowerCase();
      setModalEmail(emailLower);
      if (passwordParam) {
        // Enregistre le mot de passe défini par l'utilisateur lors de la première connexion (sous forme de hash)
        hashPassword(passwordParam).then(hashed => {
          onRegisterPassword(emailLower, hashed);
          setNewPassword(passwordParam);
          setConfirmPassword(passwordParam);
          setSetupStep('success');
        });
      } else {
        setNewPassword('');
        setConfirmPassword('');
        setSetupStep('form');
      }
      setShowEmailModal(true);
      // Clean up URL query parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const formattedEmail = email.trim().toLowerCase();
    if (formattedEmail === '') {
      setError("Veuillez saisir votre adresse e-mail.");
      return;
    }

    const isRecognized =
      formattedEmail === 'sullypatrick01@gmail.com' ||
      formattedEmail === 'pierrerobertoleblanc1@gmail.com' ||
      formattedEmail === 'pierrerobertoleblanc10@gmail.com' ||
      formattedEmail === 'darlinelegrand8@gmail.com';

    if (!isRecognized) {
      setError("Cette adresse e-mail n'est pas autorisée comme administrateur.");
      return;
    }

    // Check password setup asynchronously
    const isSetup = await onCheckPasswordSetup(formattedEmail);
    
    // Si l'administrateur n'a pas encore de mot de passe configuré (première connexion)
    if (!isSetup) {
      if (newPassword === '') {
        setError("Veuillez définir un mot de passe pour votre première connexion.");
        return;
      }
      if (newPassword.length < 4) {
        setError("Le mot de passe doit faire au moins 4 caractères.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Les mots de passe ne correspondent pas.");
        return;
      }
      
      // On déclenche l'envoi de l'e-mail de confirmation avec le mot de passe choisi
      handleOpenSetupSimulation(formattedEmail, newPassword);
      return;
    }

    // Connexion classique pour un compte déjà initialisé
    if (password === '') {
      setError("Veuillez saisir votre mot de passe.");
      return;
    }

    const isValid = await onVerifyPassword(formattedEmail, password);
    if (!isValid) {
      setError("Mot de passe incorrect. Veuillez réessayer.");
      return;
    }

    const isSuperAdmin = formattedEmail === 'pierrerobertoleblanc10@gmail.com' || 
                         formattedEmail === 'pierrerobertoleblanc1@gmail.com' ||
                         formattedEmail === 'darlinelegrand8@gmail.com';
    onLogin({
      email: formattedEmail,
      role: isSuperAdmin ? 'super_admin' : 'admin',
    });
  };

  const handleTechSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedCode = techCode.trim().toUpperCase();
    if (trimmedCode === '') {
      setError("Veuillez saisir votre code technicien.");
      return;
    }

    const matchedTech = technicians.find((t) => t.code === trimmedCode);
    if (!matchedTech) {
      setError("Code technicien non reconnu. Demandez à votre administrateur de vous enregistrer.");
      return;
    }

    onLogin({
      email: `${trimmedCode.toLowerCase()}@printcare.fr`,
      role: 'technician',
      technicianName: matchedTech.name,
      technicianId: trimmedCode,
    });
  };

  const handleOpenSetupSimulation = (targetEmail: string, chosenPass?: string) => {
    const finalEmail = targetEmail.trim() !== '' ? targetEmail : 'nouvel.admin@printcare.fr';
    setModalEmail(finalEmail);
    
    if (chosenPass) {
      setNewPassword(chosenPass);
      setConfirmPassword(chosenPass);
    } else {
      setNewPassword('');
      setConfirmPassword('');
    }
    
    setSetupStep('inbox');
    setShowEmailModal(true);

    // Envoi d'un e-mail de confirmation réel via FormSubmit.co
    if (finalEmail.includes('@') && !finalEmail.endsWith('exemple.com')) {
      const activationUrl = chosenPass
        ? `${window.location.origin}/?setup=true&email=${encodeURIComponent(finalEmail.toLowerCase())}&password=${encodeURIComponent(chosenPass)}`
        : `${window.location.origin}/?setup=true&email=${encodeURIComponent(finalEmail.toLowerCase())}`;

      fetch(`https://formsubmit.co/ajax/${finalEmail.toLowerCase()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: "[PrintCare] Confirmez votre adresse e-mail d'administration",
          message: `Bonjour,\n\nVous avez configuré votre mot de passe pour l'adresse d'administration ${finalEmail}.\n\nPour confirmer votre e-mail et valider définitivement votre accès, veuillez cliquer sur le bouton ou lien ci-dessous :\n\n${activationUrl}\n\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.\n\nL'équipe PrintCare`,
          _honey: ""
        })
      })
      .then(res => res.json())
      .then(data => {
        console.log("E-mail réel envoyé via FormSubmit :", data);
      })
      .catch(err => {
        console.warn("Notice: Envoi de l'e-mail réel via FormSubmit non disponible (l'application utilise le simulateur local/fallback) :", err);
      });
    }
  };

  const handlePasswordSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 4) {
      setError("Le mot de passe doit faire au moins 4 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    const hashed = await hashPassword(newPassword);
    onRegisterPassword(modalEmail.toLowerCase(), hashed);
    setSetupStep('success');
  };

  const completeSetupAndLogin = () => {
    setShowEmailModal(false);
    const isSuperAdmin = modalEmail.toLowerCase() === 'pierrerobertoleblanc10@gmail.com' || 
                         modalEmail.toLowerCase() === 'pierrerobertoleblanc1@gmail.com' ||
                         modalEmail.toLowerCase() === 'darlinelegrand8@gmail.com';
    onLogin({
      email: modalEmail.toLowerCase(),
      role: isSuperAdmin ? 'super_admin' : 'admin',
    });
  };

  const handleDemoAdminSelect = (demoEmail: string) => {
    setEmail(demoEmail);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden" id="login-container">
      {/* Background Decorative Circles */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full filter blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-md shadow-indigo-600/15">
            <Printer className="h-8 w-8 text-white" />
          </div>
          <span className="text-3xl font-extrabold tracking-tight text-slate-900">
            PrintCare
          </span>
        </div>
        <h2 className="mt-4 text-center text-sm text-slate-500 font-medium">
          Système intelligent de gestion de flotte d'imprimantes
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200">
          {/* Role selector tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6 border border-slate-200">
            <button
              onClick={() => {
                setActiveTab('admin');
                setError('');
              }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              id="tab-admin"
            >
              <Shield className="h-4 w-4" />
              Administrateur
            </button>
            <button
              onClick={() => {
                setActiveTab('tech');
                setError('');
              }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                activeTab === 'tech'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              id="tab-technician"
            >
              <Key className="h-4 w-4" />
              Technicien
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2"
              id="login-error"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {activeTab === 'admin' ? (
            <form onSubmit={handleAdminSubmit} className="space-y-4" id="form-admin">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Adresse e-mail Admin
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre-email@exemple.com"
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200"
                    id="input-admin-email"
                  />
                </div>
              </div>

              {isEmailSetup === true && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-1"
                >
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Votre mot de passe"
                      className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200"
                      id="input-admin-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </motion.div>
              )}

              {email.trim().includes('@') && 
               (email.trim().toLowerCase() === 'sullypatrick01@gmail.com' ||
                email.trim().toLowerCase() === 'pierrerobertoleblanc1@gmail.com' ||
                email.trim().toLowerCase() === 'pierrerobertoleblanc10@gmail.com' ||
                email.trim().toLowerCase() === 'darlinelegrand8@gmail.com') && 
               isEmailSetup === false && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mt-2"
                >
                  <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Shield className="h-3 w-3 animate-pulse" /> Première connexion : Configurez votre mot de passe
                  </p>
                  
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Définir votre mot de passe
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 4 caractères"
                        className="block w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        id="input-setup-new-password-main"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Répétez le mot de passe"
                        className="block w-full pl-10 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        id="input-setup-confirm-password-main"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <button
                type="submit"
                className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer group transition-all duration-200 active:scale-[0.98]"
                id="btn-admin-submit"
              >
                {isEmailSetup === true 
                  ? 'Se connecter' 
                  : 'Initialiser mon accès & Envoyer l\'E-mail'}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleTechSubmit} className="space-y-4" id="form-technician">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Code d'Identification Unique
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Key className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={techCode}
                    onChange={(e) => setTechCode(e.target.value)}
                    placeholder="ex: TECH01"
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder-slate-400 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200"
                    id="input-tech-code"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer group transition-all duration-200 active:scale-[0.98]"
                id="btn-tech-submit"
              >
                Accéder au portail technique
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </form>
          )}


        </div>
      </div>

      {/* Footer / Pied de page */}
      <footer className="mt-8 text-center text-[11px] text-slate-400 font-semibold z-10 pb-6">
        Développé par PRL ,Licence d'exploitation : Ign. Patrick S.
      </footer>

      {/* INTERACTIVE EMAIL SIMULATION MODAL */}
      <AnimatePresence>
        {showEmailModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-800"
              id="email-simulation-modal"
            >
              {setupStep === 'inbox' && (
                <div>
                   <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 font-mono">
                      Service de Messagerie Intégré (PrintCare Fleet)
                    </span>
                    <button
                      onClick={() => setShowEmailModal(false)}
                      className="text-slate-500 hover:text-slate-800 text-xs font-semibold bg-slate-200 hover:bg-slate-300 px-2.5 py-1 rounded cursor-pointer"
                    >
                      Fermer
                    </button>
                  </div>

                  <div className="p-6 text-slate-700">
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-6">
                      <h4 className="text-sm font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        E-mail de confirmation réel envoyé !
                      </h4>
                      <p className="text-xs text-emerald-700 leading-relaxed">
                        Un e-mail de configuration réel contenant un lien de création de mot de passe a été envoyé à l'adresse <strong className="text-emerald-900">{modalEmail}</strong>. Veuillez vérifier votre boîte de réception (ainsi que les spams).
                      </p>
                      <p className="text-[10px] text-emerald-600/80 mt-1.5 italic">
                        Astuce : Pour gagner du temps, vous pouvez aussi cliquer directement sur le bouton d'accès rapide ci-dessous pour créer votre mot de passe immédiatement sans ouvrir votre boîte mail.
                      </p>
                    </div>

                    {/* Email Envelope View */}
                    <div className="bg-slate-100 border border-slate-200 rounded-xl p-5 space-y-4">
                      <div className="text-xs border-b border-slate-200 pb-3 space-y-1 text-slate-500">
                        <div>
                          <strong className="text-slate-700">De :</strong> security@printcare-fleet.net
                        </div>
                        <div>
                          <strong className="text-slate-700">Pour :</strong> {modalEmail}
                        </div>
                        <div>
                          <strong className="text-slate-700">Sujet :</strong> [PrintCare] Créez votre mot de passe d'administration
                        </div>
                      </div>

                      {/* Render Beautiful Email Body inside simulation */}
                      <div className="bg-white text-slate-800 p-6 rounded-lg text-center border border-slate-200 space-y-4 shadow-sm">
                        <div className="flex justify-center">
                          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-md shadow-indigo-600/10">
                            <Printer className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 font-sans">Bienvenue sur PrintCare !</h3>
                        <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                          Vous avez été désigné comme administrateur système. Cliquez sur le bouton ci-dessous pour configurer votre mot de passe et sécuriser votre accès.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (newPassword) {
                              onRegisterPassword(modalEmail.toLowerCase(), newPassword);
                              setSetupStep('success');
                            } else {
                              setSetupStep('form');
                            }
                          }}
                          className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow transition-all duration-200 cursor-pointer"
                          id="btn-simulate-email-click"
                        >
                          {newPassword ? "Confirmer et Activer l'accès" : "Définir mon mot de passe"}
                        </button>
                        <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3">
                          Ce lien expirera dans 24 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {setupStep === 'form' && (
                <form onSubmit={handlePasswordSetupSubmit} className="p-6 space-y-4 text-slate-800" id="form-password-setup">
                  <div className="text-center mb-4">
                    <Lock className="h-10 w-10 text-indigo-600 mx-auto mb-2" />
                    <h3 className="text-lg font-bold text-slate-900">Création du Mot de Passe</h3>
                    <p className="text-xs text-slate-500">
                      Configurez l'accès administrateur pour <strong className="text-slate-700">{modalEmail}</strong>
                    </p>
                  </div>

                  {error && (
                    <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Nouveau Mot de Passe
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 4 caractères"
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      required
                      id="input-setup-new-password"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Confirmer le Mot de Passe
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Répétez le mot de passe"
                      className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      required
                      id="input-setup-confirm-password"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl cursor-pointer transition-all duration-200 shadow-md shadow-indigo-600/10"
                    id="btn-setup-save"
                  >
                    Enregistrer et Se Connecter
                  </button>
                </form>
              )}

              {setupStep === 'success' && (
                <div className="p-8 text-center space-y-4 text-slate-800">
                  <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
                  <h3 className="text-xl font-bold text-slate-900">Mot de passe enregistré !</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                    Le compte administrateur pour <strong className="text-slate-700">{modalEmail}</strong> est maintenant configuré et sécurisé.
                  </p>
                  <button
                    onClick={completeSetupAndLogin}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl cursor-pointer shadow-lg shadow-indigo-600/10 transition-all duration-200"
                    id="btn-setup-complete-login"
                  >
                    Ouvrir ma session PrintCare
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
