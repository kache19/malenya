import React, { useState } from 'react';
import {
  Shield,
  Lock,
  User,
  ArrowRight,
  AlertTriangle,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { Staff } from '../types';
import { api } from '../services/api';

interface LoginProps {
  onLogin: (user: Staff, token?: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<Staff | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validation
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      setIsLoading(false);
      return;
    }

    try {
      // Call API login with timeout
      const result = await Promise.race([
        api.login(username, password),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Login request timeout')), 15000)
        )
      ]) as { user: Staff; token: string };

      if (!result || !result.user) {
        throw new Error('Invalid login response format');
      }

      const user = result.user as Staff;
      setLoggedInUser(user);

      // Check if account is active
      if (user.status === 'INACTIVE') {
        setError('Your account has been disabled. Please contact your administrator.');
        setIsLoading(false);
        return;
      }

      // Success - show animation then callback
      setShowSuccess(true);
      setTimeout(() => {
        onLogin(user, result.token);
      }, 1200);
    } catch (err: any) {
      console.error('Login error:', err);
      setIsLoading(false); // ✅ CRITICAL: Always set loading to false on error

      // Better error messaging based on error type
      const errorMessage = err?.message || 'Unknown error occurred';

      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setError('Invalid credentials. Please check your username and password.');
      } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        setError('User account not found.');
      } else if (
        errorMessage.includes('Network') ||
        errorMessage.includes('Failed to fetch') ||
        !navigator.onLine
      ) {
        setError(
          'Network connection error. Please check your internet and try again.'
        );
      } else if (errorMessage.includes('timeout')) {
        setError('Login took too long. Please try again.');
      } else if (errorMessage.includes('ECONNREFUSED')) {
        setError(
          'Cannot reach server. Please ensure the backend API is running.'
        );
      } else {
        setError(errorMessage || 'Login failed. Please try again later.');
      }
    }
  };


  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-1/2 -left-1/4 w-[1000px] h-[1000px] bg-teal-900/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/4 w-[1000px] h-[1000px] bg-blue-900/20 rounded-full blur-3xl"></div>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[500px] flex overflow-hidden z-10">

        {/* Left Side - Hero / Branding */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-teal-800 to-slate-900 p-6 flex-col justify-between text-white relative">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="p-3 bg-teal-500/20 rounded-xl backdrop-blur-sm border border-teal-500/30">
                <Shield size={32} className="text-teal-400" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">PMS<span className="text-teal-400">.</span></h1>
            </div>
            <h2 className="text-3xl font-bold leading-tight mb-4">
              <span className="text-teal-400">Pharmacy</span> <br />
              Management System.
            </h2>
            <p className="text-slate-300 text-base leading-relaxed mb-4">
              Secure, scalable, and intelligent system for multi-branch operations.
            </p>
          </div>

          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-sm">
                KH
              </div>
              <div>
                <p className="font-bold text-sm">Developed by Kachehub</p>
                <p className="text-xs text-slate-400">Kachehubinfo@gmail.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                HO
              </div>
              <div>
                <p className="font-bold text-sm">Centralized Control</p>
                <p className="text-xs text-slate-400">Head Office Dashboard</p>
              </div>
            </div>
          </div>

          {/* Decorative Grid */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%22100%22%20height%3D%22100%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cfilter%20id%3D%22noise%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.9%22%20numOctaves%3D%224%22%20seed%3D%222%22/%3E%3C/filter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23noise)%22/%3E%3C/svg%3E')] opacity-5 mix-blend-soft-light"></div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-center bg-white">
          <div className="max-w-sm mx-auto w-full">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h2>
            <p className="text-slate-500 mb-6">Sign in to access your pharmacy dashboard.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Username</label>
                <div className="relative group">
                  <User className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={20} />
                  <input
                    type="text"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all font-medium placeholder-slate-400"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError('');
                    }}
                    disabled={isLoading || showSuccess}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={20} />
                  <input
                    type="password"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all font-medium placeholder-slate-400"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    disabled={isLoading || showSuccess}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertTriangle size={18} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || showSuccess}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all transform ${
                  isLoading ? 'opacity-80 cursor-not-allowed' : 'active:scale-95'
                } ${
                  showSuccess
                    ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                    : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20 disabled:opacity-50'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Signing In...
                  </>
                ) : showSuccess ? (
                  <>
                    <CheckCircle className="animate-bounce" size={20} />
                    {loggedInUser?.role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} Access Granted!
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;