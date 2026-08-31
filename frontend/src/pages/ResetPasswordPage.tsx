import React, { useState, useEffect } from 'react';
import { Lock, ArrowLeft, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { InputField } from '../components/InputField';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface FieldErrors {
  email?: string;
  otp?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword, resendOtp, isLoading } = useAuth();
  const toast = useToast();

  const emailFromState = (location.state as any)?.email || '';
  const [email, setEmail] = useState(emailFromState);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResendOtp = async () => {
    if (!canResend || isResending) return;
    if (!email.trim()) {
      setFieldErrors({ email: 'Please provide your email to resend code' });
      return;
    }

    try {
      setIsResending(true);
      await resendOtp(email, 'PASSWORD_RESET');
      toast.success('A new 6-digit recovery code has been sent to your email!');
      setCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!otp.trim()) {
      errors.otp = '6-digit OTP recovery code is required';
    } else if (otp.trim().length !== 6) {
      errors.otp = 'OTP code must be exactly 6 digits';
    }

    if (!newPassword) {
      errors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters long';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm password is required';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setFieldErrors({});
      await resetPassword(email, otp, newPassword);
      setIsSuccess(true);
      toast.success('Password reset successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err: any) {
      const msg = err.message || 'Failed to reset password. Please check your OTP.';
      if (msg.toLowerCase().includes('otp') || msg.toLowerCase().includes('code')) {
        setFieldErrors({ otp: msg });
      } else {
        toast.error(msg);
      }
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-bg-main flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-[460px] bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-xs flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-2xl font-bold text-text-main mb-2">Password Reset Successful!</h2>
          <p className="text-sm text-secondary mb-6">
            Your password has been securely updated. Redirecting you to login...
          </p>
          <Link
            to="/login"
            className="w-full py-3 bg-deep-blue text-white rounded-xl font-semibold text-sm"
          >
            Go to Login now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main flex flex-col justify-center items-center px-4 py-12 relative">
      <Link
        to="/login"
        className="absolute top-6 left-6 flex items-center gap-2 text-secondary hover:text-text-main text-sm font-medium transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Login
      </Link>

      <div className="w-full max-w-[460px] flex flex-col">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-main mb-2 tracking-tight">
            Reset your password
          </h1>
          <p className="text-secondary text-[15px]">
            Enter the 6-digit recovery code sent to your email and your new password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          {!emailFromState && (
            <InputField
              label="Email address"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
              }}
              placeholder="you@example.com"
              error={fieldErrors.email}
            />
          )}

          {/* OTP Code */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-text-main">6-Digit Recovery Code</label>
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResending}
                  className="text-xs font-semibold text-deep-blue hover:underline inline-flex items-center gap-1 transition-colors"
                >
                  <RotateCcw size={12} className={isResending ? 'animate-spin' : ''} />
                  Resend code
                </button>
              ) : (
                <span className="text-xs text-slate-400 font-medium">
                  Resend in <strong className="text-slate-600 font-semibold">{countdown}s</strong>
                </span>
              )}
            </div>
            <input
              type="text"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, ''));
                if (fieldErrors.otp) setFieldErrors({ ...fieldErrors, otp: undefined });
              }}
              placeholder="123456"
              className={`w-full px-4 py-3 bg-white border rounded-xl text-lg font-mono font-bold tracking-widest text-center focus:outline-none transition-all ${
                fieldErrors.otp
                  ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                  : 'border-slate-200 focus:ring-2 focus:ring-deep-blue/20'
              }`}
            />
            {fieldErrors.otp && (
              <p className="text-xs text-red-600 font-medium">{fieldErrors.otp}</p>
            )}
          </div>

          {/* New Password */}
          <div className="flex flex-col">
            <InputField
              label="New password"
              required
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (fieldErrors.newPassword) setFieldErrors({ ...fieldErrors, newPassword: undefined });
              }}
              placeholder="••••••••••••"
              icon={<Lock size={18} />}
              showPasswordToggle
              error={fieldErrors.newPassword}
            />
            <PasswordStrengthIndicator password={newPassword} />
          </div>

          {/* Confirm Password */}
          <InputField
            label="Confirm new password"
            required
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
            }}
            placeholder="••••••••••••"
            icon={<Lock size={18} />}
            showPasswordToggle
            error={fieldErrors.confirmPassword}
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-deep-blue hover:bg-[#1d4ed8] disabled:opacity-70 text-white font-semibold rounded-xl shadow-md shadow-deep-blue/20 transition-all flex items-center justify-center gap-2 text-sm mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Resetting password...</span>
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-secondary">
          <span>Didn't receive the recovery code? </span>
          {canResend ? (
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isResending}
              className="text-deep-blue font-semibold hover:underline inline-flex items-center gap-1 ml-1"
            >
              <RotateCcw size={14} className={isResending ? 'animate-spin' : ''} /> Resend code
            </button>
          ) : (
            <span className="text-slate-500 font-medium ml-1">Resend in {countdown}s</span>
          )}
        </div>
      </div>
    </div>
  );
}
