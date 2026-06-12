/* =========================================================================
   AGENTS VERSE — /login route
   No MarketingFrame — login branch in app.jsx renders LoginScreen standalone
   (no ChatWidget, no DemoRequestModal). Toasts still work because ToastProvider
   is global in app/providers.tsx.
   ========================================================================= */
'use client';

import { useRouter } from 'next/navigation';
import { LoginScreen } from '@/components/auth/login-screen';
import { useAuth } from '@/lib/providers/auth-provider';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  return (
    <LoginScreen
      onLogin={(email) => {
        login(email);
        // TODO: change post-login target to /overview once workspace routes are migrated
        router.push('/');
      }}
      onBack={() => router.push('/')}
    />
  );
}
