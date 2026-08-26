import React, { useState } from 'react';
import { User, Mail, Lock, ArrowLeft, AlignLeft, CheckCircle2, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { InputField } from '../components/InputField';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';

export function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // Step 1 State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 2 State
  const [educationStage, setEducationStage] = useState<'ol' | 'al'>('ol');

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStep1Error('Passwords do not match.');
      return;
    }
    setStep1Error(null);
    setStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Welcome to PathWise! Navigating to your dashboard...');
    navigate('/');
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
        {/* Step Indicator Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-xs font-medium text-slate-500 mb-2 font-mono">
            <span>Step {step} of 3</span>
            <span>{step === 1 ? 'Account' : step === 2 ? 'Education stage' : 'Done'}</span>
          </div>
          {/* Stepper Progress Bars */}
          <div className="grid grid-cols-3 gap-2">
            <div className={`h-1.5 rounded-full transition-colors ${step >= 2 ? 'bg-teal' : 'bg-deep-blue'}`}></div>
            <div className={`h-1.5 rounded-full transition-colors ${step === 2 ? 'bg-deep-blue' : step === 3 ? 'bg-teal' : 'bg-slate-200'}`}></div>
            <div className={`h-1.5 rounded-full transition-colors ${step === 3 ? 'bg-deep-blue' : 'bg-slate-200'}`}></div>
          </div>
        </div>

        {/* STEP 1: ACCOUNT CREATION */}
        {step === 1 && (
          <>
            {/* Title */}
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

            {/* Form */}
            <form onSubmit={handleStep1Submit} className="flex flex-col gap-5">
              {/* Full name */}
              <InputField
                label="Full name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nimal Perera"
                icon={<User size={18} />}
              />

              {/* Email address */}
              <InputField
                label="Email address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                icon={<Mail size={18} />}
              />

              {/* Password */}
              <div className="flex flex-col">
                <InputField
                  label="Password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (step1Error) setStep1Error(null);
                  }}
                  placeholder="••••••••••"
                  icon={<Lock size={18} />}
                  showPasswordToggle
                />

                {/* Password Strength Indicator Component */}
                <PasswordStrengthIndicator password={password} />
              </div>

              {/* Confirm Password */}
              <InputField
                label="Confirm password"
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (step1Error) setStep1Error(null);
                }}
                placeholder="••••••••••"
                icon={<Lock size={18} />}
                showPasswordToggle
                error={step1Error}
              />

              {/* Continue Button */}
              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-deep-blue hover:bg-[#1d4ed8] text-white font-semibold rounded-xl shadow-md shadow-deep-blue/20 transition-all active:scale-[0.99] mt-2 text-[15px]"
              >
                Continue
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-7">
              <div className="border-t border-slate-200 w-full"></div>
              <span className="bg-bg-main px-3 text-xs text-slate-400 font-medium whitespace-nowrap">
                or sign up with
              </span>
              <div className="border-t border-slate-200 w-full"></div>
            </div>

            {/* Google Sign-up Button */}
            <button
              type="button"
              onClick={() => alert('Google authentication coming soon!')}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-text-main font-semibold text-sm flex items-center justify-center gap-3 transition-colors shadow-xs"
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

            {/* Terms and Privacy Disclaimer */}
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

            {/* Bottom Footer Link */}
            <div className="text-center mt-7">
              <p className="text-sm text-secondary">
                Already have an account?{' '}
                <Link to="/login" className="text-deep-blue font-semibold hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          </>
        )}

        {/* STEP 2: EDUCATION STAGE */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="flex flex-col">
            {/* Title */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-[2rem] font-bold text-text-main mb-2 tracking-tight">
                Where are you in your education journey?
              </h1>
              <p className="text-secondary text-[15px] leading-relaxed">
                This helps PathWise show you the right tools right away — you can change it later.
              </p>
            </div>

            {/* Education Options */}
            <div className="flex flex-col gap-3.5 mb-8">
              {/* Option 1: I just completed O/L */}
              <div
                onClick={() => setEducationStage('ol')}
                className={`p-4 md:p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  educationStage === 'ol'
                    ? 'border-deep-blue bg-blue-50/30 ring-1 ring-deep-blue'
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
                    ? 'border-deep-blue bg-blue-50/30 ring-1 ring-deep-blue'
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
            </div>

            {/* Continue Button */}
            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-deep-blue hover:bg-[#1d4ed8] text-white font-semibold rounded-xl shadow-md shadow-deep-blue/20 transition-all active:scale-[0.99] text-[15px]"
            >
              Continue
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-4 text-sm font-semibold text-secondary hover:text-text-main transition-colors text-center py-2"
            >
              ← Back
            </button>

            {/* Bottom Footer Link */}
            <div className="text-center mt-7">
              <p className="text-sm text-secondary">
                Already have an account?{' '}
                <Link to="/login" className="text-deep-blue font-semibold hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          </form>
        )}

        {/* STEP 3: ALL SET / DONE */}
        {step === 3 && (
          <form onSubmit={handleStep3Submit} className="flex flex-col text-center items-center">
            {/* Success Icon */}
            <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center text-teal mb-6">
              <Check size={28} className="stroke-[3]" />
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-[2rem] font-bold text-text-main mb-2 tracking-tight">
              You're all set, {firstName}
            </h1>
            
            {/* Subtitle */}
            <p className="text-secondary text-[15px] leading-relaxed mb-8">
              Your dashboard is ready — built around{' '}
              <strong className="text-text-main font-semibold">
                {educationStage === 'ol' ? 'O/L → A/L subject exploration' : 'A/L university eligibility'}
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
                  {educationStage === 'ol' ? 'O/L Complete' : 'A/L Complete'}
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

            {/* Back Button */}
            <button
              type="button"
              onClick={() => setStep(2)}
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
