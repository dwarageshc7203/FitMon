import { useEffect } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { auth, hasFirebaseConfig } from '../firebase/config';
import useAuthStore from '../store/useAuthStore';
import { authorizedRequest } from '../services/apiClient';

export default function useAuthBootstrap() {
  const setAuthState = useAuthStore((state) => state.setAuthState);
  const clearAuthState = useAuthStore((state) => state.clearAuthState);
  const setError = useAuthStore((state) => state.setError);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    if (!hasFirebaseConfig || !auth) {
      setError('Firebase client configuration is missing.');
      return undefined;
    }

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setLoading(true);

      if (!firebaseUser) {
        clearAuthState();
        return;
      }

      try {
        const token = await firebaseUser.getIdToken();
        const { user } = await authorizedRequest('/api/auth/session', token, {
          method: 'POST',
          body: JSON.stringify({}),
        });
        setAuthState({ user, token });
      } catch (error) {
        // Keep the app usable even if backend session initialization fails.
        // Firestore-backed features can still work with Firebase-authenticated identity.
        const fallbackUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'FitMon User'),
          photoURL: firebaseUser.photoURL || '',
          role: 'fitness_enthusiast',
        };
        setAuthState({
          user: fallbackUser,
          token: await firebaseUser.getIdToken(),
        });
        setError(error?.message || 'Signed in, but profile sync failed.');
      }
    });

    return unsubscribe;
  }, [clearAuthState, setAuthState, setError, setLoading]);
}
