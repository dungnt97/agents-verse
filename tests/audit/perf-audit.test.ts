import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/audit/pagespeed-client', () => ({ runPageSpeedAudit: vi.fn().mockResolvedValue('PSI') }));
vi.mock('@/lib/audit/lighthouse-client', () => ({ runLighthouseAudit: vi.fn().mockResolvedValue('LH') }));

import { runPerformanceAudit } from '@/lib/audit/perf-audit';
import { runPageSpeedAudit } from '@/lib/audit/pagespeed-client';
import { runLighthouseAudit } from '@/lib/audit/lighthouse-client';

const psi = runPageSpeedAudit as unknown as ReturnType<typeof vi.fn>;
const lh = runLighthouseAudit as unknown as ReturnType<typeof vi.fn>;

const saved = { ...process.env };
beforeEach(() => {
  psi.mockClear();
  lh.mockClear();
  delete process.env.AUDIT_PROVIDER;
  delete process.env.GOOGLE_PAGESPEED_API_KEY;
  delete process.env.GOOGLE_MAPS_API_KEY;
});
afterEach(() => {
  process.env = { ...saved };
});

describe('runPerformanceAudit — provider dispatch', () => {
  it('AUDIT_PROVIDER=lighthouse forces the self-hosted path (even with a Google key present)', async () => {
    process.env.AUDIT_PROVIDER = 'lighthouse';
    process.env.GOOGLE_MAPS_API_KEY = 'AIza-dead';
    await runPerformanceAudit('https://x.test');
    expect(lh).toHaveBeenCalledTimes(1);
    expect(psi).not.toHaveBeenCalled();
  });

  it('AUDIT_PROVIDER=pagespeed forces the hosted path', async () => {
    process.env.AUDIT_PROVIDER = 'pagespeed';
    await runPerformanceAudit('https://x.test');
    expect(psi).toHaveBeenCalledTimes(1);
    expect(lh).not.toHaveBeenCalled();
  });

  it('unset + a Google key present → pagespeed (backward compatible)', async () => {
    process.env.GOOGLE_PAGESPEED_API_KEY = 'k';
    await runPerformanceAudit('https://x.test');
    expect(psi).toHaveBeenCalledTimes(1);
    expect(lh).not.toHaveBeenCalled();
  });

  it('unset + NO Google key → lighthouse (works with zero Google setup)', async () => {
    await runPerformanceAudit('https://x.test');
    expect(lh).toHaveBeenCalledTimes(1);
    expect(psi).not.toHaveBeenCalled();
  });
});
