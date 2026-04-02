import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Shield, Loader2, AlertTriangle, CheckCircle, QrCode, X } from 'lucide-react';

interface MfaEnrollmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEnrolled: () => void;
    onSwitchToChallenge?: () => void;
    onBypass?: () => void;
}

const MfaEnrollmentModal: React.FC<MfaEnrollmentModalProps> = ({ isOpen, onClose, onEnrolled, onSwitchToChallenge, onBypass }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [factorId, setFactorId] = useState<string | null>(null);

    const handleEnroll = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            // Clean up any existing unverified factors to avoid "already exists" error
            const { data: factorsData } = await supabase.auth.mfa.listFactors();
            if (factorsData?.all) {
                const unverifiedFactors = factorsData.all.filter(f => f.status === 'unverified');
                for (const factor of unverifiedFactors) {
                    try {
                        await supabase.auth.mfa.unenroll({ factorId: factor.id });
                    } catch (e) {
                        console.warn('Failed to unenroll factor:', factor.id, e);
                    }
                }
            }

            const { data, error: enrollError } = await supabase.auth.mfa.enroll({ 
                factorType: 'totp',
                friendlyName: 'Authenticator App'
            });
            
            if (enrollError) {
                if (enrollError.message.includes('AAL2 required')) {
                    setError("BLOQUEO DE SEGURIDAD: Ya tienes un dispositivo verificado vinculado. Si lo has perdido, debes eliminarlo desde el panel de Supabase (Authentication > Users > Tu usuario > Factores MFA) para poder generar un nuevo QR.");
                } else {
                    throw enrollError;
                }
                return;
            }

            setQrCode(data.totp.qr_code);
            setFactorId(data.id);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleForceUnenroll = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data: factorsData } = await supabase.auth.mfa.listFactors();
            if (factorsData?.all && factorsData.all.length > 0) {
                for (const factor of factorsData.all) {
                    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
                    if (unenrollError) throw unenrollError;
                }
                setError("Dispositivos eliminados. Reintentando registro...");
                setTimeout(handleEnroll, 1000);
            } else {
                setError("No se encontraron dispositivos para eliminar.");
            }
        } catch (err: any) {
            setError(`Error al eliminar: ${err.message}. Por seguridad, Supabase requiere que estés logueado con 2FA para borrar un dispositivo verificado. Si lo has perdido, debes borrarlo manualmente desde la consola de Supabase.`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && !qrCode) {
            handleEnroll();
        }
    }, [isOpen]);

    const handleVerify = async () => {
        if (!factorId) return;
        setIsLoading(true);
        setError(null);

        try {
            const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
                factorId: factorId,
                code: verificationCode,
            });

            if (verifyError) throw verifyError;

            onEnrolled();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100]">
            <div className="bg-background-tertiary rounded-xl shadow-2xl p-8 w-full max-w-md border border-border-primary m-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-content-primary flex items-center gap-2">
                        <Shield className="text-accent-primary" /> 
                        Enable 2FA
                    </h2>
                </div>

                <p className="text-content-muted text-sm mb-6">
                    To enhance the security of your account, two-factor authentication is now <strong>mandatory</strong>. 
                    Please scan the QR code below with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.) to link your account for the first time.
                </p>

                {error && (
                    <div className="p-3 mb-4 rounded-lg flex flex-col gap-2 text-sm bg-danger-primary/20 text-danger-primary">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={18} />
                            {error}
                        </div>
                        <button 
                            onClick={handleEnroll}
                            className="text-xs underline hover:text-danger-secondary transition-colors text-left"
                        >
                            Try generating a new QR code
                        </button>
                        {error.includes('BLOQUEO DE SEGURIDAD') && (
                            <div className="flex flex-col gap-2 mt-4">
                                <p className="text-[11px] font-bold text-white bg-danger-primary p-3 rounded border border-danger-secondary shadow-lg">
                                    ⚠️ ATENCIÓN: El botón "Force Remove" no funcionará si has perdido el acceso a tu App. 
                                    Supabase bloquea el borrado por seguridad. 
                                    DEBES entrar en la consola de Supabase para borrarlo.
                                </p>
                                
                                {onBypass && (
                                    <button 
                                        onClick={onBypass}
                                        className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        <Shield className="animate-pulse" size={20} />
                                        ENTRAR A LA APP (BYPASS DE EMERGENCIA)
                                    </button>
                                )}

                                <button 
                                    onClick={handleForceUnenroll}
                                    className="text-[10px] text-white/40 hover:text-white transition-colors"
                                >
                                    Try Force Remove anyway (usually fails)
                                </button>
                            </div>
                        )}
                        {error.includes('AAL2 required') && onSwitchToChallenge && (
                            <button 
                                onClick={onSwitchToChallenge}
                                className="mt-2 text-xs font-bold bg-danger-primary text-white p-2 rounded hover:bg-danger-secondary transition-colors"
                            >
                                Already have a device? Go to Verification
                            </button>
                        )}
                    </div>
                )}

                {qrCode ? (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <div className="bg-white p-4 rounded-lg border-4 border-white shadow-inner relative group">
                                <img 
                                    src={qrCode} 
                                    alt="2FA QR Code" 
                                    className="w-48 h-48" 
                                    onError={() => setError("Error loading QR code. Please try refreshing.")}
                                />
                                <button 
                                    onClick={handleEnroll}
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold"
                                >
                                    Refresh QR
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-content-secondary">
                                Enter 6-digit verification code
                            </label>
                            <input
                                type="text"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                maxLength={6}
                                className="w-full bg-background-interactive border border-border-secondary rounded-lg py-3 text-center text-2xl tracking-[0.5em] text-content-primary focus:ring-2 focus:ring-accent-primary focus:outline-none transition"
                            />
                        </div>

                        <button
                            onClick={handleVerify}
                            disabled={isLoading || verificationCode.length !== 6}
                            className="w-full py-3 rounded-lg bg-accent-primary text-accent-primary-text font-bold hover:bg-accent-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
                            Verify & Enable
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="animate-spin text-accent-primary mb-4" size={48} />
                        <p className="text-content-muted">Generating your secure key...</p>
                    </div>
                )}
                
                <div className="mt-6 pt-6 border-t border-border-secondary text-center">
                    <button 
                        onClick={() => supabase.auth.signOut()}
                        className="text-content-muted hover:text-danger-primary transition-colors text-sm"
                    >
                        Sign out instead
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MfaEnrollmentModal;
