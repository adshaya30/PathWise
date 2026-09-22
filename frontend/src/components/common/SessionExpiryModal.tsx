import { useAuth } from '../../context/AuthContext';
import { Clock, LogOut, RefreshCw, AlertCircle } from 'lucide-react';

export function SessionExpiryModal() {
  const { sessionWarning, sessionExpired, extendSession, logout, warningSecondsLeft } = useAuth();

  const handleLoginRedirect = async () => {
    await logout();
    window.location.href = '/login';
  };

  // Warning Modal: Session about to expire
  if (sessionWarning && !sessionExpired) {
    const mins = Math.floor(warningSecondsLeft / 60);
    const secs = warningSecondsLeft % 60;
    const formattedTime = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200 animate-in zoom-in-95">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock size={24} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-main leading-tight mb-1">
                Session About to Expire
              </h3>
              <p className="text-sm text-secondary leading-relaxed">
                You've been inactive for a while. For your security, your session will expire in{' '}
                <strong className="text-amber-600 font-mono font-bold">{formattedTime}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors flex items-center gap-1.5"
            >
              <LogOut size={15} />
              Log Out Now
            </button>

            <button
              type="button"
              onClick={extendSession}
              className="px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-deep-blue hover:bg-[#153860] shadow-md shadow-deep-blue/20 transition-all flex items-center gap-1.5"
            >
              <RefreshCw size={15} />
              Stay Signed In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Expired Modal: Session expired
  if (sessionExpired) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 text-center animate-in zoom-in-95">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} />
          </div>

          <h3 className="text-xl font-bold text-text-main mb-2">
            Session Expired
          </h3>
          <p className="text-sm text-secondary mb-6 leading-relaxed">
            Your session has ended due to inactivity. Please log in again to continue where you left off.
          </p>

          <button
            type="button"
            onClick={handleLoginRedirect}
            className="w-full py-3.5 bg-deep-blue hover:bg-[#153860] text-white font-semibold rounded-xl shadow-md shadow-deep-blue/20 transition-all text-sm"
          >
            Log In Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}
