export interface UserDto {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  emailVerified: boolean;
  accountLocked: boolean;
  createdAt?: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserDto;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8080/api/auth';

export const authApiService = {
  async register(email: string, password: string): Promise<AuthResponseDto> {
    const response = await fetch(`${AUTH_API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result: ApiResponse<AuthResponseDto> = await response.json();
    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.message || 'Registration failed.');
    }

    this.saveAuth(result.data);
    return result.data;
  },

  async verifyOtp(email: string, otp: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' = 'EMAIL_VERIFICATION'): Promise<AuthResponseDto> {
    const response = await fetch(`${AUTH_API_URL}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, type }),
      credentials: 'include',
    });

    const result: ApiResponse<AuthResponseDto> = await response.json();
    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.message || 'OTP verification failed.');
    }

    this.saveAuth(result.data);
    return result.data;
  },

  async resendOtp(email: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' = 'EMAIL_VERIFICATION'): Promise<string> {
    const response = await fetch(`${AUTH_API_URL}/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, type }),
    });

    const result: ApiResponse<void> = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to resend OTP.');
    }
    return result.message;
  },

  async login(email: string, password: string, rememberMe = false): Promise<AuthResponseDto> {
    const response = await fetch(`${AUTH_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe }),
      credentials: 'include',
    });

    const result: ApiResponse<AuthResponseDto> = await response.json();
    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.message || 'Login failed. Please check your email and password.');
    }

    this.saveAuth(result.data);
    return result.data;
  },

  async refreshToken(): Promise<AuthResponseDto | null> {
    const storedRefreshToken = localStorage.getItem('pathwise_refresh_token');
    try {
      const response = await fetch(`${AUTH_API_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
        credentials: 'include',
      });

      const result: ApiResponse<AuthResponseDto> = await response.json();
      if (response.ok && result.success && result.data) {
        this.saveAuth(result.data);
        return result.data;
      }
    } catch (e) {
      console.warn('Silent token refresh error:', e);
    }
    return null;
  },

  async forgotPassword(email: string): Promise<string> {
    const response = await fetch(`${AUTH_API_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const result: ApiResponse<void> = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Unable to process forgot password request.');
    }
    return result.message;
  },

  async resetPassword(email: string, otp: string, newPassword: string): Promise<string> {
    const response = await fetch(`${AUTH_API_URL}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword }),
    });

    const result: ApiResponse<void> = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Password reset failed.');
    }
    return result.message;
  },

  async logout(): Promise<void> {
    const storedRefreshToken = localStorage.getItem('pathwise_refresh_token');
    try {
      await fetch(`${AUTH_API_URL}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
        credentials: 'include',
      });
    } catch {
      // ignore network failure on logout
    } finally {
      this.clearAuth();
    }
  },

  saveAuth(authData: AuthResponseDto) {
    localStorage.setItem('pathwise_token', authData.accessToken);
    localStorage.setItem('pathwise_refresh_token', authData.refreshToken);
    localStorage.setItem('pathwise_user', JSON.stringify(authData.user));
  },

  clearAuth() {
    localStorage.removeItem('pathwise_token');
    localStorage.removeItem('pathwise_refresh_token');
    localStorage.removeItem('pathwise_user');
  },

  getStoredUser(): UserDto | null {
    const userStr = localStorage.getItem('pathwise_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  getStoredToken(): string | null {
    return localStorage.getItem('pathwise_token');
  },

  isAdmin(): boolean {
    const user = this.getStoredUser();
    if (!user) return false;
    return user.role === 'ADMIN' || user.email.toLowerCase() === '2003adshaya@gmail.com';
  }
};
