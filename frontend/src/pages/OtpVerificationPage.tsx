import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowLeft, Loader2, RotateCcw } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function OtpVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOtp, resendOtp, isLoading } = useAuth();

  const emailFromState = (location.state as any)?.email || '';
  const [email, setEmail] = useState(emailFromState);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    if (!email) {
      setError('Email address is missing. Please return to sign up.');
      return;
    }

    try {
      setError(null);
      const authData = await verifyOtp(email, fullOtp, 'EMAIL_VERIFICATION');

      if (authData.user.role === 'ADMIN' || authData.user.email.toLowerCase() === '2003adshaya@gmail.com') {
        navigate('/admin/documents');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code.');
    }
  };

  const handleResend = async () => {
    if (!canResend || !email) return;
    try {
      setError(null);
      await resendOtp(email, 'EMAIL_VERIFICATION');
      setSuccessMsg('A new 6-digit code has been sent to your email.');
      setCountdown(60);
      setCanResend(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex flex-col justify-center items-center px-4 py-12 relative">
      <Link
        to="/login"
        className="absolute top-6 left-6 flex items-center gap-2 text-secondary hover:text-text-main text-sm font-medium transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Login
      </Link>

      <div className="w-full max-w-[460px] flex flex-col items-center">
        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-2xl bg-deep-blue/10 text-deep-blue flex items-center justify-center mb-6">
          <ShieldCheck size={32} />
        </div>

        <h1 className="text-3xl font-bold text-text-main mb-2 tracking-tight text-center">
          Verify your email
        </h1>
        <p className="text-secondary text-sm text-center mb-8 max-w-sm">
          We sent a 6-digit security code to <strong className="text-text-main font-semibold">{email || 'your email'}</strong>.
        </p>

        {error && (
          <div className="w-full p-3.5 mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="w-full p-3.5 mb-5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleVerify} className="w-full flex flex-col gap-6">
          {!emailFromState && (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-deep-blue/20"
            />
          )}

          {/* 6 Digit Inputs */}
          <div className="flex justify-between gap-2.5">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-input-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-14 text-center text-2xl font-bold text-text-main bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-deep-blue focus:border-deep-blue shadow-xs"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-deep-blue hover:bg-[#1d4ed8] disabled:opacity-70 text-white font-semibold rounded-xl shadow-md shadow-deep-blue/20 transition-all flex items-center justify-center gap-2 text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              'Verify & Continue'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-secondary">
          <span>Didn't receive the code? </span>
          {canResend ? (
            <button
              onClick={handleResend}
              className="text-deep-blue font-semibold hover:underline inline-flex items-center gap-1"
            >
              <RotateCcw size={14} /> Resend code
            </button>
          ) : (
            <span className="text-slate-500 font-normal">
              Resend in <strong className="text-text-main font-semibold">{countdown}s</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
