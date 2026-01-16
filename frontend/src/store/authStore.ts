import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const AUTH_STORAGE_KEY = 'calibre-app-password';

interface AuthState {
  // Whether the server requires authentication
  authRequired: boolean | null;
  // Whether the user is authenticated
  isAuthenticated: boolean;
  // Whether the server is misconfigured (no APP_PASSWORD set)
  isMisconfigured: boolean;
  // Loading state for initial auth check
  isCheckingAuth: boolean;
  // Error message
  error: string | null;

  // Actions
  checkAuth: () => Promise<void>;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  getPassword: () => string | null;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      authRequired: null,
      isAuthenticated: false,
      isMisconfigured: false,
      isCheckingAuth: true,
      error: null,

      checkAuth: async () => {
        set({ isCheckingAuth: true, error: null, isMisconfigured: false });

        try {
          const password = get().getPassword();
          const headers: HeadersInit = {};
          if (password) {
            headers['X-App-Password'] = password;
          }

          const response = await fetch('/api/auth-check', { headers });
          const data = await response.json();

          if (data.misconfigured) {
            set({
              isMisconfigured: true,
              isCheckingAuth: false,
              error: data.error || 'Server is misconfigured',
            });
            return;
          }

          set({
            authRequired: data.auth_required,
            isAuthenticated: data.authenticated,
            isCheckingAuth: false,
          });
        } catch (error) {
          console.error('Auth check failed:', error);
          set({
            isCheckingAuth: false,
            error: 'Failed to connect to server',
          });
        }
      },

      login: async (password: string) => {
        set({ error: null });

        try {
          const response = await fetch('/api/auth-check', {
            headers: {
              'X-App-Password': password,
            },
          });
          const data = await response.json();

          if (data.authenticated) {
            // Store password in localStorage
            localStorage.setItem(AUTH_STORAGE_KEY, password);
            set({ isAuthenticated: true });
            return true;
          } else {
            set({ error: 'Invalid password' });
            return false;
          }
        } catch (error) {
          console.error('Login failed:', error);
          set({ error: 'Failed to connect to server' });
          return false;
        }
      },

      logout: () => {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        set({ isAuthenticated: false });
      },

      getPassword: () => {
        return localStorage.getItem(AUTH_STORAGE_KEY);
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'calibre-auth-storage',
      partialize: () => ({}), // Don't persist anything via zustand - we use localStorage directly for password
    }
  )
);
