import React, { useEffect, useState } from 'react';
import { api, useAceStore } from '@ace/shared';

/**
 * Boot animation overlay. The backend's `/api/hardware/device` route is the
 * "hello-from-the-OS" signal: once it responds we know that the kernel,
 * the systemd services and the React app are all up, so we fade out.
 *
 * If the backend is unreachable we still proceed after a short grace period
 * so the user isn't stuck on a black screen when running offline.
 */
export const BootScreen: React.FC = () => {
  const bootDone = useAceStore((s) => s.bootDone);
  const [phase, setPhase] = useState<'logo' | 'pulse' | 'done'>('logo');

  useEffect(() => {
    let cancelled = false;
    // Single source of truth for the boot animation. Whichever path
    // (probe success, probe failure, or hard timeout) flips the phase
    // first cancels the others — otherwise the boot screen can pulse
    // a second time when the fallback timer fires *after* the probe
    // already finished.
    const finish = () => {
      if (cancelled) return;
      clearTimeout(probeTimer);
      clearTimeout(fallbackTimer);
      setPhase('pulse');
      setTimeout(() => {
        if (cancelled) return;
        setPhase('done');
        bootDone();
      }, 900);
    };

    const probe = async () => {
      try {
        await api.getUser();
      } catch {
        /* swallow - we still boot */
      }
      finish();
    };
    // Probe after a short delay so the React tree paints the logo first.
    const probeTimer = setTimeout(probe, 350);
    // Hard fallback in case the network is broken or the backend is slow.
    const fallbackTimer = setTimeout(finish, 4500);
    return () => {
      cancelled = true;
      clearTimeout(probeTimer);
      clearTimeout(fallbackTimer);
    };
  }, [bootDone]);

  return (
    <div
      className={`absolute inset-0 z-[999] flex items-center justify-center bg-black transition-opacity duration-700 ${
        phase === 'done' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-6 select-none">
        <div
          className="relative w-32 h-32 rounded-3xl flex items-center justify-center shadow-glow"
          style={{
            background:
              'conic-gradient(from 0deg, #60a5fa, #a78bfa, #34d399, #60a5fa)',
          }}
        >
          <div className="absolute inset-[6px] rounded-[20px] bg-[#0b1020] flex items-center justify-center text-4xl font-bold tracking-wider">
            A
          </div>
          {phase === 'pulse' && (
            <div className="absolute inset-0 rounded-3xl animate-pulse-soft ring-2 ring-white/20" />
          )}
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold tracking-wide">A.C.E OS</div>
          <div className="text-sm text-ace-muted mt-1">
            {phase === 'logo' ? 'Starting system…' : 'Welcome back'}
          </div>
        </div>
        <DotsRow />
      </div>
    </div>
  );
};

const DotsRow: React.FC = () => {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x + 1) % 4), 280);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/40"
          style={{ opacity: n === i ? 1 : 0.3 }}
        />
      ))}
    </div>
  );
};
