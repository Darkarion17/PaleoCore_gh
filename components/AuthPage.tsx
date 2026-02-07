

import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Loader2, Mail, KeyRound, AlertTriangle } from 'lucide-react';
import MfaChallengeModal from './MfaChallengeModal';
import Logo from './Logo';

const PasswordStrengthMeter = ({ score }: { score: number }) => {
    const strength = {
        0: { text: 'Weak', color: 'bg-danger-primary' },
        1: { text: 'Weak', color: 'bg-danger-primary' },
        2: { text: 'Fair', color: 'bg-danger-primary' },
        3: { text: 'Good', color: 'bg-success-primary' },
        4: { text: 'Strong', color: 'bg-success-primary' },
    };
    const { text, color } = strength[score as keyof typeof strength] || strength[0];
    const width = `${(score / 4) * 100}%`;

    return (
        <div>
            <div className="w-full bg-background-interactive rounded-full h-2 my-1">
                <div className={`h-2 rounded-full transition-all duration-300 ${color}`} style={{ width: width }}></div>
            </div>
            <p className="text-xs text-content-muted text-right">{text}</p>
        </div>
    );
};

const AuthPage: React.FC = () => {
    const [view, setView] = useState<'signIn' | 'signUp' | 'forgotPassword'>('signIn');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [passwordStrength, setPasswordStrength] = useState(0);

    const [showMfaModal, setShowMfaModal] = useState(false);

    const checkPasswordStrength = (pass: string) => {
        let score = 0;
        if (pass.length > 8) score++;
        if (pass.match(/[a-z]/)) score++;
        if (pass.match(/[A-Z]/)) score++;
        if (pass.match(/[0-9]/)) score++;
        // if (pass.match(/[^a-zA-Z0-9]/)) score++; // Uncomment for symbol requirement
        setPasswordStrength(score);
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPassword = e.target.value;
        setPassword(newPassword);
        if (view === 'signUp') {
            checkPasswordStrength(newPassword);
        }
    };
    
    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (view === 'signIn') {
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                if (signInError) {
                    if (signInError.code === 'mfa_required') {
                        setShowMfaModal(true);
                        setLoading(false);
                        return;
                    }
                    throw signInError;
                }
                // If successful, the onAuthStateChange in App.tsx will handle the session.
            } else if (view === 'signUp') {
                const { error } = await supabase.auth.signUp({ 
                    email, 
                    password,
                    options: {
                        emailRedirectTo: window.location.origin,
                    }
                });
                if (error) throw error;
                setMessage('Check your email for a confirmation link to complete your registration.');
            } else if (view === 'forgotPassword') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin,
                });
                if (error) throw error;
                setMessage('If an account exists for this email, a password reset link has been sent.');
            }
        } catch (err: any) {
            setError(err.error_description || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyMfa = async (code: string) => {
        setLoading(true);
        setError(null);
        
        try {
            const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
            if (factorsError) throw factorsError;

            const totpFactor = factorsData.totp[0];
            if (!totpFactor) throw new Error("No 2FA factor found. Please try logging in again.");

            const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
                factorId: totpFactor.id,
                code: code,
            });

            if (verifyError) throw verifyError;

            // onAuthStateChange in App.tsx will handle successful login
            setShowMfaModal(false);
        } catch (err: any) {
            setError(err.error_description || err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const renderForm = () => {
        if (view === 'forgotPassword') {
            return (
                <>
                    <h2 className="text-2xl font-bold text-content-primary">Reset Password</h2>
                    <p className="text-sm text-content-muted mb-6">Enter your email to receive a password reset link.</p>
                    <div className="relative mb-4">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" size={20} />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-background-interactive border border-border-secondary rounded-lg py-3 pl-10 pr-4 text-content-primary placeholder-content-muted focus:ring-2 focus:ring-accent-primary focus:outline-none transition"
                            required
                        />
                    </div>
                </>
            );
        }
        return (
            <>
                <h2 className="text-2xl font-bold text-content-primary">{view === 'signIn' ? 'Sign In' : 'Create Account'}</h2>
                <p className="text-sm text-content-muted mb-6">
                    {view === 'signIn' ? 'Welcome back to your paleoceanographic hub.' : 'Begin your journey into Earth\'s climate history.'}
                </p>
                <div className="relative mb-4">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" size={20} />
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-background-interactive border border-border-secondary rounded-lg py-3 pl-10 pr-4 text-content-primary placeholder-content-muted focus:ring-2 focus:ring-accent-primary focus:outline-none transition"
                        required
                    />
                </div>
                <div className="relative mb-2">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" size={20} />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={handlePasswordChange}
                        className="w-full bg-background-interactive border border-border-secondary rounded-lg py-3 pl-10 pr-4 text-content-primary placeholder-content-muted focus:ring-2 focus:ring-accent-primary focus:outline-none transition"
                        required
                    />
                </div>
                {view === 'signUp' && <PasswordStrengthMeter score={passwordStrength} />}
            </>
        )
    };
    
    const getButtonText = () => {
        if (loading && !showMfaModal) return <Loader2 className="animate-spin" size={20} />;
        if (view === 'signIn') return 'Sign In';
        if (view === 'signUp') return 'Sign Up';
        return 'Send Reset Link';
    }

    const handleViewChange = (newView: 'signIn' | 'signUp' | 'forgotPassword') => {
        setView(newView);
        setError(null);
        setMessage(null);
    };
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-background-secondary p-4">
            <div className="w-full max-w-md mx-auto">
                <div className="flex justify-center items-center gap-4 mb-8 text-accent-primary">
                    <Logo size={40} />
                    <h1 className="text-4xl font-bold tracking-tight text-content-primary">PaleoCore</h1>
                </div>

                <div className="bg-background-tertiary border border-border-primary rounded-xl shadow-2xl p-8">
                    <form onSubmit={handleAuthAction} className="space-y-4">
                        {renderForm()}
                        
                        {error && !showMfaModal && (
                            <div className="bg-danger-primary/20 text-danger-primary text-sm p-3 rounded-lg flex items-center gap-2">
                                <AlertTriangle size={18} />
                                {error}
                            </div>
                        )}
                        {message && (
                            <div className="bg-success-primary/20 text-success-primary text-sm p-3 rounded-lg">
                                {message}
                            </div>
                        )}
                        
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 p-3 mt-4 rounded-lg bg-accent-primary text-accent-primary-text font-bold hover:bg-accent-primary-hover transition-all duration-200 disabled:bg-background-interactive disabled:cursor-wait"
                        >
                            {getButtonText()}
                        </button>
                    </form>
                    <div className="text-center mt-6 text-sm">
                        {view === 'signIn' && (
                            <p className="text-content-muted">
                                Don't have an account?{' '}
                                <button onClick={() => handleViewChange('signUp')} className="font-semibold text-accent-primary hover:text-accent-primary-hover">Sign Up</button>
                            </p>
                        )}
                        {view === 'signUp' && (
                            <p className="text-content-muted">
                                Already have an account?{' '}
                                <button onClick={() => handleViewChange('signIn')} className="font-semibold text-accent-primary hover:text-accent-primary-hover">Sign In</button>
                            </p>
                        )}
                        {view !== 'forgotPassword' && (
                            <p className="text-content-muted mt-2">
                                <button onClick={() => handleViewChange('forgotPassword')} className="hover:text-accent-primary">Forgot your password?</button>
                            </p>
                        )}
                        {view === 'forgotPassword' && (
                            <p className="text-content-muted">
                                Return to{' '}
                                <button onClick={() => handleViewChange('signIn')} className="font-semibold text-accent-primary hover:text-accent-primary-hover">Sign In</button>
                            </p>
                        )}
                    </div>
                </div>
                <footer className="mt-8 text-xs text-content-muted text-center">
                    <p>&copy; {new Date().getFullYear()} Dario Bolance's Organism. All rights reserved.</p>
                </footer>
            </div>

            <MfaChallengeModal
                isOpen={showMfaModal}
                onClose={() => {
                    setShowMfaModal(false);
                    setError(null);
                }}
                onVerify={handleVerifyMfa}
                loading={loading}
                error={error}
            />
        </div>
    );
};

export default AuthPage;