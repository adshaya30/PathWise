import React, { useState } from 'react';
import { Mail, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { InputField } from '../components/InputField';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { forgotPassword, isLoading } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      setEmailError('Email address is required');
      return;
    }
    if (!emailRegex.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      return;
    }

    try {
      setEmailError(null);
      await forgotPassword(email);
      toast.info('Password recovery code sent to your email!');
      navigate('/reset-password', { state: { email } });
    } catch (err: any) {
      const msg = err.message || 'Unable to send password reset code.';
      if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no account')) {
        setEmailError('No account found with this email address.');
      } else {
        toast.error(msg);
      }
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

      <div className="w-full max-w-[460px] flex flex-col">
        <div className="w-14 h-14 rounded-2xl bg-deep-blue/10 text-deep-blue flex items-center justify-center mb-6">
          <KeyRound size={28} />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-main mb-2 tracking-tight">
            Forgot password?
          </h1>
          <p className="text-secondary text-[15px]">
            No worries, enter your account email and we'll send you a 6-digit recovery code.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <InputField
            label="Email address"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            placeholder="you@example.com"
            icon={<Mail size={18} />}
            error={emailError}
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-deep-blue hover:bg-[#1d4ed8] disabled:opacity-70 text-white font-semibold rounded-xl shadow-md shadow-deep-blue/20 transition-all flex items-center justify-center gap-2 text-sm mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Sending code...</span>
              </>
            ) : (
              'Send Recovery Code'
            )}
          </button>
        </form>

        <div className="text-center mt-7">
          <p className="text-sm text-secondary">
            Remembered your password?{' '}
            <Link to="/login" className="text-deep-blue font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
