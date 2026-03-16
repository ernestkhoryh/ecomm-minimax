import React from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function GoogleAuthCallbackPage() {
  const navigate = useNavigate();
  const { completeGoogleLogin } = useAuthStore();

  React.useEffect(() => {
    const run = async () => {
      const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
      const params = new URLSearchParams(hash);

      const error = params.get('error');
      const errorDescription = params.get('error_description');
      const idToken = params.get('id_token');
      const state = params.get('state');

      if (error) {
        toast.error(errorDescription || 'Google login was cancelled.');
        navigate('/login', { replace: true });
        return;
      }

      if (!idToken) {
        toast.error('Google login failed: missing ID token.');
        navigate('/login', { replace: true });
        return;
      }

      const result = await completeGoogleLogin(idToken, state);
      if (result.success) {
        toast.success('Signed in with Google');
        navigate('/', { replace: true });
      } else {
        toast.error(result.error || 'Google login failed');
        navigate('/login', { replace: true });
      }
    };

    run();
  }, [completeGoogleLogin, navigate]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-500 mx-auto mb-3" />
        <p className="text-gray-600">Completing Google sign in...</p>
      </div>
    </div>
  );
}

