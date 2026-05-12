import { useEffect, useState } from 'react';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { AlertTriangle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth, googleProvider, hasFirebaseConfig } from '../firebase/config';
import useAuthStore from '../store/useAuthStore';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const storeError = useAuthStore((state) => state.error);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!user) return;
    navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
  }, [location.state, navigate, user]);

  async function handleGoogleSignIn() {
    if (!hasFirebaseConfig || !auth || !googleProvider) {
      setLocalError('Sign-in is not available right now. Please try again later.');
      return;
    }
    try {
      setLocalError('');
      setIsSubmitting(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const code = error?.code || '';

      if (code === 'auth/popup-closed-by-user') {
        setLocalError('Google sign-in was canceled before completion.');
        return;
      }

      if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch {
          setLocalError('Popup was blocked. Please allow popups and try again.');
          return;
        }
      }

      setLocalError(error?.message || 'Sign-in failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div className="card auth-card" style={{ padding: '40px' }}>
          <div className="auth-logo">
            Fit<span className="navbar-dot">·</span>Mon
          </div>

          <div style={{ textAlign: 'center' }}>
            <h2 className="section-title" style={{ fontSize: '1.4rem', marginBottom: '8px' }}>
              Welcome to FitMon
            </h2>
            <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
              Continue with Google to sign in or create your account.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="btn-primary button-block"
              style={{ padding: '14px 28px', fontSize: '0.95rem' }}
            >
              {isSubmitting ? 'Connecting...' : 'Continue with Google'}
            </button>

            {(localError || storeError) && (
              <div className="camera-error camera-error-inline" style={{ marginTop: '4px' }}>
                <AlertTriangle className="icon-md" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '0.85rem' }}>{localError || storeError}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}