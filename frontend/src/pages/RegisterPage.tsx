import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, ArrowLeft, AlignLeft, CheckCircle2, Check, Loader2, Compass, ShieldCheck, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { InputField } from '../components/InputField';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { authApiService } from '../services/authApiService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { verifyOtp, resendOtp } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  
  // Step 1 State: Account Creation
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Step 2 State: 6-Digit OTP Verification
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Step 3 State: Education Stage
  const [educationStage, setEducationStage] = useState<'ol' | 'al' | 'exploring'>('ol');

  // Countdown timer for OTP resend in Step 2
  useEffect(() => {
    if (step === 2 && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [step, countdown]);

  // Validation function for Step 1 inline errors
  const validateStep1 = (): boolean => {
    const errors: FieldErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Full name check
    if (!fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    // Email check
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    // Password check
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    // Confirm password check
    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm password is required';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Step 1 Submission -> Register and move to Step 2
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) return;

    try {
      setIsLoading(true);
      setFieldErrors({});

      // Register with backend & dispatch 6-digit OTP email
      await authApiService.register(email, password);

      // Notification Strategy: Toast on OTP sent
      toast.info('Verification code sent to your email!');

      // Move to Step 2: OTP Verification
      setCountdown(60);
      setCanResend(false);
      setOtpError(null);
      setStep(2);
    } catch (err: any) {
      const msg = err.message || 'Registration failed. Please try again.';
      
      // Notification Strategy: "Email already registered" -> Inline error on Email field
      if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('already registered')) {
        setFieldErrors({ email: 'This email is already registered. Please log in or use another email.' });
      } else {
        // Notification Strategy: "Registration API/server failure" -> Snackbar
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: OTP Digit input change handler
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setOtpError(null);

    // Auto-focus next box
    if (value && index < 5) {
      const nextInput = document.getElementById(`step2-otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Step 2: Backspace keyboard handler
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`step2-otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  // Handle Step 2: Verify OTP
  const handleStep2Verify = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      // Notification Strategy: Wrong/incomplete OTP -> Inline error
      setOtpError('Please enter the complete 6-digit verification code.');
      return;
    }

    try {
      setIsLoading(true);
      setOtpError(null);

      // Verify OTP and establish authenticated session
      await verifyOtp(email, fullOtp, 'EMAIL_VERIFICATION');

      // Notification Strategy: Registration successful -> Snackbar
      toast.success('Email verified successfully!');

      // Move to Step 3: Education Stage
      setStep(3);
    } catch (err: any) {
      // Notification Strategy: Wrong/expired OTP -> Inline error + resend option
      setOtpError(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || !email) return;
    try {
      setOtpError(null);
      await resendOtp(email, 'EMAIL_VERIFICATION');
      toast.info('A fresh 6-digit code has been sent to your email.');
      setCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend verification code.');
    }
  };

  // Handle Step 3: Save Education Stage -> Move to Step 4
  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('pathwise_education_stage', educationStage);
    localStorage.setItem('pathwise_full_name', fullName);
    setStep(4);
  };

  // Handle Step 4: Finalize and Navigate to Dashboard
  const handleStep4Finish = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Welcome to PathWise!');
    const user = authApiService.getStoredUser();
    if (user?.role === 'ADMIN' || user?.email.toLowerCase() === '2003adshaya@gmail.com') {
      navigate('/admin/documents');
    } else {
      navigate('/');
    }
  };

  // Extract first name for personalized greeting
  const firstName = fullName.trim().split(' ')[0] || 'Student';

  return (
    <div className="min-h-screen bg-bg-main flex flex-col justify-center items-center px-4 py-12 relative">
      {/* Back to Home Button */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-secondary hover:text-text-main text-sm font-medium transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <div className="w-full max-w-[460px] flex flex-col">
        {/* Stepper Progress Header (4 Steps) */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-xs font-medium text-slate-500 mb-2 font-mono">
            <span>Step {step} of 4</span>
            <span>
              {step === 1
                ? 'Account'
                : step === 2
                ? 'Verification'
                : step === 3
                ? 'Education stage'
                : 'Done'}
            </span>
          </div>
          {/* 4-Segment Progress Bar */}
          <div className="grid grid-cols-4 gap-2">
            <div className={`h-1.5 rounded-full transition-colors ${step >= 1 ? 'bg-deep-blue' : 'bg-slate-200'}`} />
            <div className={`h-1.5 rounded-full transition-colors ${step >= 2 ? 'bg-deep-blue' : 'bg-slate-200'}`} />
            <div className={`h-1.5 rounded-full transition-colors ${step >= 3 ? 'bg-deep-blue' : 'bg-slate-200'}`} />
            <div className={`h-1.5 rounded-full transition-colors ${step === 4 ? 'bg-teal' : 'bg-slate-200'}`} />
          </div>
        </div>

        {/* STEP 1: ACCOUNT CREATION */}
        {step === 1 && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl md:text-[2rem] font-bold text-text-main mb-2 tracking-tight">
                Create your account
              </h1>
              <p className="text-secondary text-[15px]">
                Already using PathWise?{' '}
                <Link to="/login" className="text-deep-blue font-semibold hover:underline">
                  Log in
                </Link>
              </p>
            </div>

            <form onSubmit={handleStep1Submit} className="flex flex-col gap-4" noValidate>
              <InputField
                label="Full Name"
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName) setFieldErrors({ ...fieldErrors, fullName: undefined });
                }}
                icon={<User size={18} />}
                error={fieldErrors.fullName}
                required
              />

              <InputField
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                }}
                icon={<Mail size={18} />}
                error={fieldErrors.email}
                required
              />

              <div className="flex flex-col gap-1.5">
                <InputField
                  label="Password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                  }}
                  icon={<Lock size={18} />}
                  showPasswordToggle
                  error={fieldErrors.password}
                  required
                />
                <PasswordStrengthIndicator password={password} />
              </div>

              <InputField
                label="Confirm Password"
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
                }}
                icon={<Lock size={18} />}
                showPasswordToggle
                error={fieldErrors.confirmPassword}
                required
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-deep-blue hover:bg-[#1d4ed8] disabled:opacity-70 text-white font-semibold rounded-xl shadow-md shadow-deep-blue/20 transition-all active:scale-[0.99] mt-2 flex items-center justify-center gap-2 text-[15px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Continue</span>
                )}
              </button>
            </form>

            <div className="relative my-7">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-bg-main px-4 text-slate-500 font-medium tracking-wider">
                  OR
                </span>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-text-main font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-3 text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <p className="text-center text-xs text-secondary mt-6 leading-relaxed">
              By continuing, you agree to PathWise's{' '}
              <Link to="/terms" className="text-deep-blue font-medium hover:underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-deep-blue font-medium hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </>
        )}

        {/* STEP 2: 6-DIGIT OTP VERIFICATION */}
        {step === 2 && (
          <form onSubmit={handleStep2Verify} className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-deep-blue/10 text-deep-blue flex items-center justify-center mb-5">
              <ShieldCheck size={28} />
            </div>

            <h1 className="text-2xl md:text-[1.75rem] font-bold text-text-main mb-2 tracking-tight text-center">
              Verify your email
            </h1>
            <p className="text-secondary text-sm text-center mb-6 max-w-sm">
              We sent a 6-digit verification code to{' '}
              <strong className="text-text-main font-semibold">{email}</strong>.
            </p>

            {/* 6 Digit Input Boxes */}
            <div className="flex justify-between gap-2.5 w-full mb-3">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`step2-otp-input-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className={`w-12 h-14 text-center text-2xl font-bold text-text-main bg-white border rounded-xl focus:outline-none transition-all shadow-xs ${
                    otpError
                      ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                      : 'border-slate-200 focus:ring-2 focus:ring-deep-blue focus:border-deep-blue'
                  }`}
                />
              ))}
            </div>

            {/* Inline Error for Wrong/Expired OTP */}
            {otpError && (
              <div className="w-full mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2 animate-in fade-in">
                <span>{otpError}</span>
                {canResend && (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-red-800 font-bold hover:underline shrink-0 flex items-center gap-1 text-[11px]"
                  >
                    <RotateCcw size={12} />
                    Resend
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-deep-blue hover:bg-[#1d4ed8] disabled:opacity-70 text-white font-semibold rounded-xl shadow-md shadow-deep-blue/20 transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-[15px] mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <span>Verify & Continue</span>
              )}
            </button>

            {/* Resend Section */}
            <div className="mt-6 flex flex-col items-center gap-2 text-xs text-secondary">
              <p>Didn't receive the code?</p>
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-deep-blue font-semibold hover:underline flex items-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  Resend Code
                </button>
              ) : (
                <span className="text-slate-400 font-mono">
                  Resend code in <strong className="text-slate-600">{countdown}s</strong>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-6 text-sm font-semibold text-secondary hover:text-text-main transition-colors text-center py-1"
            >
              ← Back
            </button>
          </form>
        )}

        {/* STEP 3: EDUCATION STAGE */}
        {step === 3 && (
          <form onSubmit={handleStep3Submit} className="flex flex-col">
            <div className="mb-8">
              <h1 className="text-3xl md:text-[2rem] font-bold text-text-main mb-2 tracking-tight">
                Where are you in your education journey?
              </h1>
              <p className="text-secondary text-[15px] leading-relaxed">
                This helps PathWise show you the right tools right away — you can change it later.
              </p>
            </div>

            {/* 3 Options */}
            <div className="flex flex-col gap-3.5 mb-8">
              {/* Option 1: I just completed O/L */}
              <div
                onClick={() => setEducationStage('ol')}
                className={`p-4 md:p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  educationStage === 'ol'
                    ? 'border-deep-blue bg-blue-50/30 ring-1 ring-deep-blue shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-deep-blue flex items-center justify-center shrink-0">
                    <AlignLeft size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-main leading-tight mb-0.5">
                      I just completed O/L
                    </h3>
                    <p className="text-xs md:text-sm text-secondary leading-snug">
                      Explore A/L streams, subjects and combinations
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center justify-center">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      educationStage === 'ol'
                        ? 'border-deep-blue'
                        : 'border-slate-300'
                    }`}
                  >
                    {educationStage === 'ol' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-deep-blue" />
                    )}
                  </div>
                </div>
              </div>

              {/* Option 2: I completed A/L */}
              <div
                onClick={() => setEducationStage('al')}
                className={`p-4 md:p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  educationStage === 'al'
                    ? 'border-deep-blue bg-blue-50/30 ring-1 ring-deep-blue shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal/10 text-teal flex items-center justify-center shrink-0">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-main leading-tight mb-0.5">
                      I completed A/L
                    </h3>
                    <p className="text-xs md:text-sm text-secondary leading-snug">
                      Check university eligibility with your results
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center justify-center">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      educationStage === 'al'
                        ? 'border-deep-blue'
                        : 'border-slate-300'
                    }`}
                  >
                    {educationStage === 'al' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-deep-blue" />
                    )}
                  </div>
                </div>
              </div>

              {/* Option 3: I'm still exploring */}
              <div
                onClick={() => setEducationStage('exploring')}
                className={`p-4 md:p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  educationStage === 'exploring'
                    ? 'border-deep-blue bg-blue-50/30 ring-1 ring-deep-blue shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Compass size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-main leading-tight mb-0.5">
                      I'm still exploring
                    </h3>
                    <p className="text-xs md:text-sm text-secondary leading-snug">
                      Browse freely — we'll help you figure out what's next
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center justify-center">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      educationStage === 'exploring'
                        ? 'border-deep-blue'
                        : 'border-slate-300'
                    }`}
                  >
                    {educationStage === 'exploring' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-deep-blue" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-deep-blue hover:bg-[#1d4ed8] text-white font-semibold rounded-xl shadow-md shadow-deep-blue/20 transition-all active:scale-[0.99] text-[15px]"
            >
              Continue
            </button>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="mt-4 text-sm font-semibold text-secondary hover:text-text-main transition-colors text-center py-2"
            >
              ← Back
            </button>
          </form>
        )}

        {/* STEP 4: ALL SET / DONE */}
        {step === 4 && (
          <form onSubmit={handleStep4Finish} className="flex flex-col text-center items-center">
            {/* Success Teal Icon */}
            <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center text-teal mb-6">
              <Check size={28} className="stroke-[3]" />
            </div>

            <h1 className="text-3xl md:text-[2rem] font-bold text-text-main mb-2 tracking-tight">
              You're all set, {firstName}
            </h1>
            
            <p className="text-secondary text-[15px] leading-relaxed mb-8">
              Your dashboard is ready — built around{' '}
              <strong className="text-text-main font-semibold">
                {educationStage === 'ol'
                  ? 'O/L → A/L subject exploration'
                  : educationStage === 'al'
                  ? 'A/L university eligibility'
                  : 'career pathway exploration'}
              </strong>
              .
            </p>

            {/* Summary Card */}
            <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-5 mb-8 text-left shadow-xs">
              <div className="flex justify-between items-center text-sm">
                <span className="text-secondary font-medium">Account</span>
                <span className="text-text-main font-medium">{email || 'student@example.com'}</span>
              </div>
              
              <div className="border-b border-slate-100 my-3.5" />
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-secondary font-medium">Stage</span>
                <span className="text-deep-blue font-semibold">
                  {educationStage === 'ol' ? 'O/L Complete' : educationStage === 'al' ? 'A/L Complete' : 'Exploring Pathways'}
                </span>
              </div>
            </div>

            {/* Go to Dashboard Button */}
            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-teal hover:bg-[#0f766e] text-white font-semibold rounded-xl shadow-md shadow-teal/20 transition-all active:scale-[0.99] text-[15px]"
            >
              Go to my dashboard
            </button>

            <button
              type="button"
              onClick={() => setStep(3)}
              className="mt-4 text-sm font-semibold text-secondary hover:text-text-main transition-colors text-center py-2"
            >
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
