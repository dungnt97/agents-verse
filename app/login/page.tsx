/* =========================================================================
   AGENTS VERSE — /login route
   No MarketingFrame — login branch renders LoginScreen standalone (no ChatWidget,
   no DemoRequestModal). Toasts work because ToastProvider is global.
   Sign-in is dual-mode (handled by AuthProvider.login): real Better Auth when the
   DB is enabled, demo cookie otherwise. Failures surface as a toast.
   ========================================================================= */
'use client';

import { useRouter } from 'next/navigation';
import { LoginScreen } from '@/components/auth/login-screen';
import { useAuth } from '@/lib/providers/auth-provider';
import { useToast } from '@/lib/providers/toast-provider';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const toast = useToast();

  return (
    <LoginScreen
      onLogin={async (email, password) => {
        try {
          await login(email, password);
          router.push('/overview');
        } catch (err) {
          toast(err instanceof Error ? err.message : 'Sign-in failed', 'danger');
        }
      }}
      onBack={() => router.push('/')}
    />
  );
}
