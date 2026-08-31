import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApiService, type UserDto, type AuthResponseDto } from '../services/authApiService';

interface AuthContextType {
  user: UserDto | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  sessionWarning: boolean;
  sessionExpired: boolean;
  warningSecondsLeft: number;
  extendSession: () => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<AuthResponseDto>;
  register: (email: string, password: string) => Promise<AuthResponseDto>;
  verifyOtp: (email: string, otp: string, type?: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET') => Promise<AuthResponseDto>;
  resendOtp: (email: string, type?: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET') => Promise<string>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<string>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 30 minutes total session inactivity timeout, warning at 28 minutes (2 min warning)
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_TIMEOUT_MS = 28 * 60 * 1000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(() => authApiService.getStoredUser());
  const [isLoading, setIsLoading] = useState(false);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [warningSecondsLeft, setWarningSecondsLeft] = useState(120);

  const isAuthenticated = !!user;
  const isAdmin = user ? (user.role === 'ADMIN' || user.email.toLowerCase() === '2003adshaya@gmail.com') : false;

  const logout = useCallback(async () => {
    setSessionWarning(false);
    setSessionExpired(false);
    await authApiService.logout();
    setUser(null);
  }, []);

  const extendSession = useCallback(() => {
    setSessionWarning(false);
    setSessionExpired(false);
    setWarningSecondsLeft(120);
    // Optionally trigger background refresh token to extend JWT
    authApiService.refreshToken().catch(() => {});
  }, []);

  // Inactivity detection & Warning countdown
  useEffect(() => {
    if (!isAuthenticated) {
      setSessionWarning(false);
      setSessionExpired(false);
      return;
    }

    let warningTimer: ReturnType<typeof setTimeout>;
    let expireTimer: ReturnType<typeof setTimeout>;
    let countdownInterval: ReturnType<typeof setInterval>;

    const resetTimers = () => {
      clearTimeout(warningTimer);
      clearTimeout(expireTimer);
      clearInterval(countdownInterval);

      if (!sessionWarning && !sessionExpired) {
        warningTimer = setTimeout(() => {
          setSessionWarning(true);
          setWarningSecondsLeft(120);

          countdownInterval = setInterval(() => {
            setWarningSecondsLeft((prev) => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }, WARNING_TIMEOUT_MS);

        expireTimer = setTimeout(() => {
          setSessionWarning(false);
          setSessionExpired(true);
          authApiService.clearAuth();
        }, INACTIVITY_TIMEOUT_MS);
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => {
      if (!sessionWarning && !sessionExpired) {
        resetTimers();
      }
    };

    events.forEach((evt) => window.addEventListener(evt, handleActivity));
    resetTimers();

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(expireTimer);
      clearInterval(countdownInterval);
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
    };
  }, [isAuthenticated, sessionWarning, sessionExpired]);

  const login = async (email: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    try {
      const data = await authApiService.login(email, password, rememberMe);
      setUser(data.user);
      setSessionWarning(false);
      setSessionExpired(false);
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authApiService.register(email, password);
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (email: string, otp: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' = 'EMAIL_VERIFICATION') => {
    setIsLoading(true);
    try {
      const data = await authApiService.verifyOtp(email, otp, type);
      setUser(data.user);
      setSessionWarning(false);
      setSessionExpired(false);
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (email: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' = 'EMAIL_VERIFICATION') => {
    return await authApiService.resendOtp(email, type);
  };

  const forgotPassword = async (email: string) => {
    return await authApiService.forgotPassword(email);
  };

  const resetPassword = async (email: string, otp: string, newPassword: string) => {
    return await authApiService.resetPassword(email, otp, newPassword);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        isLoading,
        sessionWarning,
        sessionExpired,
        warningSecondsLeft,
        extendSession,
        login,
        register,
        verifyOtp,
        resendOtp,
        forgotPassword,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
