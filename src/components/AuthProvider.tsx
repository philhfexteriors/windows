'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAuth, AuthState } from '@/lib/auth';
import LoginPage from './LoginPage';

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  profile: null,
  loading: true,
});

export function useAuthContext() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  // Show loading spinner while checking auth
  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
            H&F
          </div>
          <div className="animate-pulse text-gray-500 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!auth.session) {
    return <LoginPage />;
  }

  // Validate domain (defense in depth - Google OAuth hd param is the primary check)
  const email = auth.user?.email;
  if (email && !email.endsWith('@hfexteriors.com')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-gray-600 mb-6">
            This app is only available to @hfexteriors.com accounts. Please sign in with your HF Exteriors email.
          </p>
          <button
            onClick={() => {
              import('@/lib/auth').then(({ signOut }) => signOut());
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}
