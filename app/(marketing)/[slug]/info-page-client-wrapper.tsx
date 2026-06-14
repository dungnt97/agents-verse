/* =========================================================================
   AGENTS VERSE — Client wrapper for the /[slug] info route
   Needs 'use client' because it uses useRouter and useRequestDemo (context).
   Wrapped in MarketingFrame so ChatWidget + DemoRequestModal are present —
   the info page renders both widgets alongside InfoPage.
   ========================================================================= */
'use client';

import { useRouter } from 'next/navigation';
import { MarketingFrame, useRequestDemo } from '@/components/marketing/marketing-frame';
import { InfoPage } from '@/components/info/info-page';

interface InfoInnerProps {
  slug: string;
}

/** Inner component sits inside MarketingFrame so useRequestDemo() resolves. */
function InfoInner({ slug }: InfoInnerProps) {
  const router = useRouter();
  const { open } = useRequestDemo();

  return (
    <InfoPage
      page={slug}
      onRequestDemo={open}
      onEnter={() => router.push('/login')}
      onNav={(route) => router.push(route === 'landing' || route === 'home' ? '/' : `/${route}`)}
    />
  );
}

interface InfoPageClientWrapperProps {
  slug: string;
}

export function InfoPageClientWrapper({ slug }: InfoPageClientWrapperProps) {
  return (
    <MarketingFrame>
      <InfoInner slug={slug} />
    </MarketingFrame>
  );
}
