import React, { useState } from 'react';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InputField } from '../components/InputField';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Incorrect email or password. Please try again.');
      return;
    }
    // Demo validation
    if (password.length < 6) {
      setError('Incorrect email or password. Please try again.');
      return;
    }
    setError(null);
    alert('Logged in successfully!');
  };

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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-[2rem] font-bold text-text-main mb-2 tracking-tight">
            Welcome back
          </h1>
          <p className="text-secondary text-[15px]">
            New to PathWise?{' '}
            <Link to="/register" className="text-deep-blue font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Email Address */}
          <InputField
            label="Email address"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            placeholder="student@example.com"
            icon={<Mail size={18} />}
          />

          {/* Password */}
          <InputField
            label="Password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            placeholder="••••••••••••"
            icon={<Lock size={18} />}
            showPasswordToggle
            error={error}
          />

          {/* Remember me & Forgot password */}
          <div className="flex items-center justify-between mt-1 text-sm">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-deep-blue focus:ring-deep-blue/20"
              />
              <span className="text-secondary font-medium">Remember me</span>
            </label>
            <Link to="/forgot-password" className="text-deep-blue font-semibold hover:underline">
              Forgot password?
            </Link>
          </div>

          {/* Log In Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-deep-blue hover:bg-[#1d4ed8] text-white font-semibold rounded-xl shadow-md shadow-deep-blue/20 transition-all active:scale-[0.99] mt-2 text-[15px]"
          >
            Log in
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-7">
          <div className="border-t border-slate-200 w-full"></div>
          <span className="bg-bg-main px-3 text-xs text-slate-400 font-medium whitespace-nowrap">
            or continue with
          </span>
          <div className="border-t border-slate-200 w-full"></div>
        </div>

        {/* Google Login Button */}
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

        {/* Bottom Footer Link */}
        <div className="text-center mt-7">
          <p className="text-sm text-secondary">
            Don't have an account?{' '}
            <Link to="/register" className="text-deep-blue font-semibold hover:underline">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
