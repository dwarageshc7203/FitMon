import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isLoading: true,
  initialized: false,
  error: '',
  setAuthState: ({ user, token }) =>
    set({
      user,
      token,
      isLoading: false,
      initialized: true,
      error: '',
    }),
  clearAuthState: () =>
    set({
      user: null,
      token: null,
      isLoading: false,
      initialized: true,
      error: '',
    }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false, initialized: true }),
}));

export default useAuthStore;
