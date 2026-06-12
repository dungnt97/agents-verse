'use client';

import { useRouter } from 'next/navigation';
import { MarketingFrame, useRequestDemo } from '@/components/marketing/marketing-frame';
import { LandingPage } from '@/components/landing/landing';

export default function Home() {
  return (
    <MarketingFrame>
      <LandingContent />
    </MarketingFrame>
  );
}

function LandingContent() {
  const router = useRouter();
  const { open } = useRequestDemo();
  return (
    <LandingPage
      onEnter={() => router.push('/login')}
      onRequestDemo={open}
      onNav={(r) => router.push(r === 'landing' || r === 'home' ? '/' : `/${r}`)}
    />
  );
}
