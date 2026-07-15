import React, { useEffect, useRef, useState } from 'react';
import {
  api,
  DEFAULT_WALLPAPER_CSS,
  Icon,
  MAX_WALLPAPER_BYTES,
  WALLPAPER_PRESETS,
  WALLPAPER_STORAGE_KEY,
  classNames,
  isImageWallpaper,
  resolveWallpaper,
  useAceStore,
  type DeviceInfo,
  type IconName,
  type UserProfile,
  type WallpaperPreset,
} from '@ace/shared';

/**
 * A.C.E Settings — sectioned like macOS System Settings.
 *
 * Sidebar nav picks one of: Theme, Wallpaper, Profile, Network, Device, System.
 * The main panel renders the active section; each panel owns its own
 * state so toggling sections never resets inputs in another.
 */

type Section = 'theme' | 'wallpaper' | 'profile' | 'network' | 'device' | 'system';

const SECTION_META: Array<{ id: Section; label: string; icon: IconName }> = [
  { id: 'theme',     label: 'Theme',     icon: 'palette' },
  { id: 'wallpaper', label: 'Wallpaper', icon: 'image' },
  { id: 'profile',   label: 'Profile',   icon: 'user' },
  { id: 'network',   label: 'Network',   icon: 'wifi' },
  { id: 'device',    label: 'Device',    icon: 'battery' },
  { id: 'system',    label: 'System',    icon: 'power' },
];

const ACCENT_SWATCHES = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#22d3ee', '#f472b6', '#94a3b8'];

const SettingsApp: React.FC = () => {
  const [section, setSection] = useState<Section>('theme');
  return (
    <div className="h-full grid grid-cols-[200px_1fr] gap-0 overflow-hidden">
      <aside className="border-r border-white/10 bg-black/30 p-3 overflow-y-auto">
        <h1 className="sr-only">Settings</h1>
        <nav className="flex flex-col gap-1">
          {SECTION_META.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={classNames('ace-nav-row', section === s.id && 'is-active')}
            >
              <Icon name={s.icon} size={18} />
              <span>{s.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-6 mx-2 text-[11px] text-ace-muted leading-snug">
          Settings persist on the device and re-apply at the next boot.
        </div>
      </aside>

      <main className="overflow-y-auto p-5 sm:p-6 space-y-5">
        {section === 'theme' && <ThemeSection />}
        {section === 'wallpaper' && <WallpaperSection />}
        {section === 'profile' && <ProfileSection />}
        {section === 'network' && <NetworkSection />}
        {section === 'device' && <DeviceSection />}
        {section === 'system' && <SystemSection />}
      </main>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Theme                                                                       */
/* -------------------------------------------------------------------------- */

const ThemeSection: React.FC = () => {
  const prefs = useAceStore((s) => s.preferences);
  const setPrefs = useAceStore((s) => s.setPreferences);
  const setUser = useAceStore((s) => s.setUser);
  const avatar = useAceStore((s) => s.avatar);
  const toast = useAceStore((s) => s.toast);
  const [busy, setBusy] = useState(false);

  // Persist the current theme snapshot to the backend, mirroring the
  // local store. We snapshot once so the network round-trip can't race
  // with the user clicking another swatch mid-flight.
  const snapshot = {
    accentColor: prefs.accentColor,
    reduceMotion: prefs.reduceMotion,
    fontScale: prefs.fontScale,
    theme: prefs.theme,
    // `prefs.username` is the canonical source — fall back to the
    // store-level `username` only if it's been wiped. Avoids the
    // `state.username` and `preferences.username` drifting apart.
    username: prefs.username || 'Student',
  };

  async function save() {
    setBusy(true);
    try {
      await api.updateUser({ name: snapshot.username });
      await api.saveSettings({
        accentColor: snapshot.accentColor,
        reduceMotion: snapshot.reduceMotion,
        fontScale: snapshot.fontScale,
        theme: snapshot.theme,
      });
      setPrefs(snapshot);
      setUser(snapshot.username, avatar);
      toast({ title: 'Theme saved', body: 'New look applied.', variant: 'success' });
    } catch (e) {
      toast({ title: 'Save failed', body: String((e as Error).message), variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Theme"
      subtitle="Pick an accent colour, font scale and motion preference."
      actions={<button className="ace-btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <div className="space-y-2">
          <div className="text-xs uppercase text-ace-muted">Accent</div>
          <div className="flex flex-wrap gap-2">
            {ACCENT_SWATCHES.map((hex) => {
              const active = prefs.accentColor.toLowerCase() === hex.toLowerCase();
              return (
                <button
                  key={hex}
                  type="button"
                  aria-label={`Set accent to ${hex}`}
                  className={classNames(
                    'w-8 h-8 rounded-full border-2 transition',
                    active ? 'ring-2 ring-white scale-110' : 'border-transparent hover:scale-105',
                  )}
                  style={{ background: hex }}
                  onClick={() => setPrefs({ accentColor: hex })}
                />
              );
            })}
          </div>
          <label className="text-xs text-ace-muted flex items-center gap-2">
            Custom
            <input
              type="color"
              className="ace-input h-10 w-20 p-1"
              value={prefs.accentColor}
              onChange={(e) => setPrefs({ accentColor: e.target.value })}
            />
            <code className="text-[11px] px-1 py-0.5 rounded bg-black/30">
              {prefs.accentColor.toUpperCase()}
            </code>
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-xs uppercase text-ace-muted mb-1">Mode</div>
            <div className="flex gap-2">
              <button
                type="button"
                className={classNames('ace-pill cursor-pointer', prefs.theme === 'dark' && 'border-white/40 bg-white/10')}
                onClick={() => setPrefs({ theme: 'dark' })}
              >
                <Icon name="moon" size={12} /> Dark
              </button>
              <button
                type="button"
                className={classNames('ace-pill cursor-pointer', prefs.theme === 'light' && 'border-white/40 bg-white/10')}
                onClick={() => setPrefs({ theme: 'light' })}
                title="Light theme is on the roadmap — saved but renders as dark for now."
              >
                <Icon name="sun" size={12} /> Light
              </button>
            </div>
          </div>

          <label className="block">
            <div className="text-xs uppercase text-ace-muted mb-1">Font scale</div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={1.5}
                step={0.05}
                value={prefs.fontScale}
                onChange={(e) => setPrefs({ fontScale: Number(e.target.value) })}
                className="flex-1"
              />
              <code className="text-xs w-12 text-right">{prefs.fontScale.toFixed(2)}x</code>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.reduceMotion}
              onChange={(e) => setPrefs({ reduceMotion: e.target.checked })}
            />
            <span>Reduce motion</span>
            <span className="text-xs text-ace-muted">disables window drag animation</span>
          </label>
        </div>
      </div>
    </Panel>
  );
};

/* -------------------------------------------------------------------------- */
/* Wallpaper                                                                   */
/* -------------------------------------------------------------------------- */

const WallpaperSection: React.FC = () => {
  const wallpaper = useAceStore((s) => s.wallpaper);
  const setWallpaper = useAceStore((s) => s.setWallpaper);
  const prefs = useAceStore((s) => s.preferences);
  const bundled = useAceStore((s) => s.bundledBackgrounds);
  const toast = useAceStore((s) => s.toast);
  const [preview, setPreview] = useState<string>(wallpaper);
  const [busy, setBusy] = useState(false);
  const [erroredPresets, setErroredPresets] = useState<Set<string>>(() => new Set());
  const fileInput = useRef<HTMLInputElement | null>(null);

  /**
   * Merged picker list — dynamically-discovered PNGs from
   * `public/backgrounds/` come first (alphabetical), then the static
   * CSS gradients so the user always has at least one fallback option
   * even if the folder is empty.
   * `useMemo` keeps referential identity stable when nothing changes,
   * which prevents the PresetTileList from re-mounting on every render.
   */
  const pickerPresets = React.useMemo<readonly WallpaperPreset[]>(
    () => [...bundled, ...WALLPAPER_PRESETS],
    [bundled],
  );

  useEffect(() => { setPreview(wallpaper); }, [wallpaper]);

  /**
   * Once the user returns to the A.C.E tab, give bundled image presets a
   * fresh chance to load. Dropping /background1.png into `public/` then
   * alt-tabbing back will recover the tile automatically.
   */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setErroredPresets((m) => (m.size === 0 ? m : new Set()));
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  async function onPickFile(file: File) {
    if (file.size > MAX_WALLPAPER_BYTES) {
      toast({
        title: 'Image too large',
        body: `Pick something under ${(MAX_WALLPAPER_BYTES / 1024 / 1024).toFixed(0)} MB. A.C.E will resize it for you.`,
        variant: 'warning',
      });
      return;
    }
    try {
      const compressed = await compressImage(file, 1920, 0.85);
      setPreview(compressed);
    } catch (e) {
      toast({ title: 'Could not read image', body: String((e as Error).message), variant: 'error' });
    }
  }

  async function apply(current: string) {
    setBusy(true);
    try {
      setWallpaper(current);
      try { localStorage.setItem(WALLPAPER_STORAGE_KEY, current); } catch { /* */ }
      await api.saveSettings({ wallpaper: current, accentColor: prefs.accentColor });
      toast({ title: 'Wallpaper applied', body: 'Looks fresh.', variant: 'success' });
    } catch (e) {
      toast({ title: 'Save failed', body: String((e as Error).message), variant: 'error' });
    } finally { setBusy(false); }
  }

  function reset() {
    setPreview(DEFAULT_WALLPAPER_CSS);
    void apply(DEFAULT_WALLPAPER_CSS);
  }

  function upload() { fileInput.current?.click(); }

  return (
    <Panel
      title="Wallpaper"
      subtitle="Pick a preset or upload your own. Backgrounds render at 1024×600 to match the 7-inch display."
      actions={
        <div className="flex gap-2">
          <button type="button" className="ace-btn" onClick={reset}>
            <Icon name="reset" size={16} /> Reset
          </button>
          <button type="button" className="ace-btn-primary" disabled={busy} onClick={() => void apply(preview)}>
            <Icon name="check" size={16} /> {busy ? 'Applying…' : 'Apply'}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div>
          <div className="text-xs uppercase text-ace-muted mb-2">Preview</div>
          <div
            className="w-full aspect-[1024/600] rounded-2xl border border-white/10 overflow-hidden relative"
            style={{
              background: isImageWallpaper(preview)
                ? `center/cover no-repeat url(${preview})`
                : preview,
            }}
          >
            <div className="absolute inset-0 ace-wallpaper-stripes opacity-50" />
            <div className="absolute bottom-3 right-3 text-[10px] text-white/70 px-2 py-1 rounded-md bg-black/40">
              7" — 1024 × 600
            </div>
          </div>

          <div className="mt-4 flex gap-3 items-center">
            <button type="button" className="ace-btn" onClick={upload}>
              <Icon name="upload" size={16} />
              Upload image
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              data-testid="wallpaper-input"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onPickFile(f);
                e.target.value = '';
              }}
            />
            {isImageWallpaper(preview) && !preview.startsWith('blob:') && (
              <span className="text-xs text-ace-muted">
                Image uploaded — tap Apply to set as wallpaper.
              </span>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase text-ace-muted mb-2">Presets</div>
          <ul className="grid grid-cols-2 gap-3">
            <PresetTileList
              presets={pickerPresets}
              preview={preview}
              onPick={setPreview}
              onError={(id) => setErroredPresets((m) => {
                if (m.has(id)) return m;
                const next = new Set(m);
                next.add(id);
                return next;
              })}
              errored={erroredPresets}
            />
          </ul>
          <p className="mt-3 text-[11px] text-ace-muted leading-snug">
            Tip: drop any PNG/JPG/WebP into{' '}
            <code className="px-1 py-0.5 rounded bg-black/40">frontend/desktop-shell/public/backgrounds/</code>
            {' '}(referenced in code as{' '}
            <code className="px-1 py-0.5 rounded bg-black/40">@backgrounds/...</code>) and reload — it
            shows up here automatically. No code edits required.
          </p>
          {bundled.length === 0 && (
            <p className="mt-2 text-[11px] text-ace-muted leading-snug opacity-70">
              No bundled backgrounds found. Only the CSS gradients above are
              available until you drop an image into <code className="px-1 py-0.5 rounded bg-black/40">public/backgrounds/</code>.
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
};

/* -------------------------------------------------------------------------- */
/* PresetTileList — shared between the Wallpaper section's preset grid and   */
/* any future pickers. Tracks per-preset image-load error state so a missing  */
/* bundled file (e.g. background1.png before you drop it in) silently falls  */
/* back to its CSS gradient rather than showing a broken-image glyph.         */
/* -------------------------------------------------------------------------- */

const PresetTileList: React.FC<{
  presets: readonly WallpaperPreset[];
  preview: string;
  onPick: (value: string) => void;
  errored: Set<string>;
  onError: (id: string) => void;
}> = ({ presets, preview, onPick, errored, onError }) => {
  const visibleFallbackCss = DEFAULT_WALLPAPER_CSS;
  return (
    <>
      {presets.map((p) => {
        const value = resolveWallpaper(p);
        const active = preview === value;
        const hasImage = !!p.imageUrl && !errored.has(p.id);
        return (
          <li key={p.id}>
            <button
              type="button"
              aria-label={`Use ${p.name} wallpaper`}
              aria-pressed={active}
              onClick={() => onPick(value)}
              className={classNames(
                'w-full aspect-[16/10] rounded-xl border transition relative overflow-hidden',
                active ? 'border-white/80 ring-2 ring-white' : 'border-white/15 hover:border-white/40',
              )}
              // Use the desktop's DEFAULT fallback (Aurora) whenever an image
              // preset fails to load, so the picker tile matches what the
              // wallpaper component will actually paint on the desktop. This
              // avoids the "preview shows indigo, applied shows Aurora" trap.
              style={hasImage ? undefined : { background: visibleFallbackCss }}
              data-preset-id={p.id}
            >
              {hasImage && p.imageUrl && (
                <img
                  src={p.imageUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={() => onError(p.id)}
                />
              )}
              <span
                className="absolute inset-x-0 bottom-0 px-2 py-1 text-[11px] font-medium text-white"
                style={{ background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.55))' }}
              >
                {p.name}
              </span>
              {p.bundled && (
                <span
                  className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider rounded-md bg-black/55 text-white/85"
                  title="Bundled with the desktop-shell build"
                >
                  bundled
                </span>
              )}
            </button>
          </li>
        );
      })}
    </>
  );
};

async function compressImage(file: File, maxWidth = 1920, quality = 0.85): Promise<string> {
  const reader = new FileReader();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('decode failed'));
  });
  if (img.naturalWidth <= maxWidth) return dataUrl;
  const nw = maxWidth;
  const nh = Math.round((img.naturalHeight * maxWidth) / img.naturalWidth);
  const canvas = document.createElement('canvas');
  canvas.width = nw;
  canvas.height = nh;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, nw, nh);
  return canvas.toDataURL('image/jpeg', quality);
}

/* -------------------------------------------------------------------------- */
/* Profile                                                                     */
/* -------------------------------------------------------------------------- */

const ProfileSection: React.FC = () => {
  const [user, setUserState] = useState<UserProfile | null>(null);
  const username = useAceStore((s) => s.username);
  const avatar = useAceStore((s) => s.avatar);
  const setUserStore = useAceStore((s) => s.setUser);
  const toast = useAceStore((s) => s.toast);
  const [draft, setDraft] = useState({ name: username, avatar });
  const [busy, setBusy] = useState(false);

  useEffect(() => { setDraft({ name: username, avatar }); }, [username, avatar]);

  useEffect(() => { api.getUser().then((u) => setUserState(u)).catch(() => undefined); }, []);

  async function save() {
    setBusy(true);
    try {
      await api.updateUser({ name: draft.name, avatar: draft.avatar });
      setUserStore(draft.name, draft.avatar);
      // Refresh the canonical UserProfile so the "Joined" date and any
      // other server-derived fields reflect post-save state.
      api.getUser().then((u) => setUserState(u)).catch(() => undefined);
      toast({ title: 'Profile updated', body: draft.name, variant: 'success' });
    } catch (e) {
      toast({ title: 'Save failed', body: String((e as Error).message), variant: 'error' });
    } finally { setBusy(false); }
  }

  return (
    <Panel
      title="Profile"
      subtitle="Display name and avatar shown across A.C.E OS."
      actions={<button className="ace-btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-5 items-start">
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--ace-accent-soft)' }}
          >
            <Icon name="user" size={48} style={{ color: 'var(--ace-accent)' }} />
          </div>
          <div className="text-xs text-ace-muted">
            {user?.createdAt ? `Joined ${new Date(user.createdAt).toLocaleDateString()}` : ''}
          </div>
        </div>
        <div className="space-y-3">
          <label className="block text-xs text-ace-muted">Display name
            <input
              className="ace-input"
              value={draft.name}
              maxLength={64}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label className="block text-xs text-ace-muted">Avatar (emoji or initials)
            <input
              className="ace-input"
              value={draft.avatar}
              maxLength={6}
              onChange={(e) => setDraft({ ...draft, avatar: e.target.value })}
            />
          </label>
        </div>
      </div>
    </Panel>
  );
};

/* -------------------------------------------------------------------------- */
/* Network                                                                     */
/* -------------------------------------------------------------------------- */

const NetworkSection: React.FC = () => {
  const [wifi, setWifi] = useState('');
  const [kiosk, setKiosk] = useState(true);
  const [busy, setBusy] = useState(false);
  const toast = useAceStore((s) => s.toast);

  useEffect(() => {
    api.getSettings().then((s) => {
      const o = s as { app?: { wifi?: string; kiosk?: boolean } };
      setWifi(typeof o.app?.wifi === 'string' ? o.app.wifi : '');
      setKiosk(o.app?.kiosk !== false);
    }).catch(() => undefined);
  }, []);

  async function save() {
    setBusy(true);
    try {
      await api.saveSettings({ wifi, kiosk });
      toast({ title: 'Network saved', body: wifi || 'no SSID', variant: 'success' });
    } catch (e) {
      toast({ title: 'Save failed', body: String((e as Error).message), variant: 'error' });
    } finally { setBusy(false); }
  }

  return (
    <Panel
      title="Network"
      subtitle="Wi-Fi identity and kiosk lock."
      actions={<button className="ace-btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>}
    >
      <label className="block text-xs text-ace-muted">Wi-Fi SSID
        <input
          className="ace-input"
          placeholder="e.g. home-5g"
          value={wifi}
          onChange={(e) => setWifi(e.target.value)}
        />
      </label>
      <label className="flex items-center gap-3 cursor-pointer mt-3">
        <input
          type="checkbox"
          checked={kiosk}
          onChange={(e) => setKiosk(e.target.checked)}
        />
        <span>Lock to kiosk mode (exit only from this app)</span>
      </label>
    </Panel>
  );
};

/* -------------------------------------------------------------------------- */
/* Device                                                                      */
/* -------------------------------------------------------------------------- */

const DeviceSection: React.FC = () => {
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try { setDevice(await api.getDevice()); } finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, []);

  return (
    <Panel
      title="Device"
      subtitle="Raspberry Pi health and telemetry."
      actions={
        <button className="ace-btn" onClick={refresh} disabled={busy}>
          <Icon name="refresh" size={16} /> {busy ? 'Refreshing…' : 'Refresh'}
        </button>
      }
    >
      {device ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <Tile label="Hostname" value={device.hostname} />
          <Tile label="Model"    value={device.model.toUpperCase()} />
          <Tile label="CPU Temp" value={`${device.cpuTempC}°C`} />
          <Tile label="Memory"   value={`${device.memory.usedMb} / ${device.memory.totalMb} MB`} />
          <Tile label="Storage"  value={`${device.storage.usedGb} / ${device.storage.totalGb} GB`} />
          <Tile label="IP"       value={device.ip} />
          <Tile
            label="Uptime"
            value={`${Math.floor(device.uptimeSeconds / 3600)}h ${Math.floor((device.uptimeSeconds % 3600) / 60)}m`}
          />
          <Tile label="Ollama" value={device.kernel && device.kernel.includes('Ollama') ? 'connected' : 'fallback'} />
          <Tile label="Kernel" value={device.kernel || '—'} />
        </div>
      ) : (
        <p className="text-sm text-ace-muted">Loading…</p>
      )}
    </Panel>
  );
};

const Tile: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="ace-card">
    <div className="text-[10px] uppercase tracking-wide text-ace-muted">{label}</div>
    <div className="font-medium truncate">{value}</div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* System                                                                      */
/* -------------------------------------------------------------------------- */

const SystemSection: React.FC = () => {
  const toast = useAceStore((s) => s.toast);
  // Hold-to-confirm: pointerdown records a timestamp; pointerup checks
  // the elapsed time. A boolean flag would let the first click succeed
  // (React batches the pointerup's `setHold(0)` so the click handler
  // still reads the old `true`). Time-based gating makes the behaviour
  // independent of React's update timing.
  const holdStart = React.useRef<number | null>(null);
  const [holding, setHolding] = useState(false);
  const HOLD_MS = 600;

  async function blink() {
    try {
      await api.setLed(17, true);
      await new Promise((r) => setTimeout(r, 500));
      await api.setLed(17, false);
      toast({ title: 'LED blink', body: 'GPIO 17 toggled.', variant: 'success' });
    } catch (e) {
      toast({ title: 'LED error', body: String((e as Error).message), variant: 'error' });
    }
  }
  async function shutdown() {
    try {
      await api.triggerShutdown();
      toast({ title: 'Shutting down', body: 'See you soon.', variant: 'info' });
    } catch (e) {
      toast({ title: 'Failed', body: String((e as Error).message), variant: 'error' });
    }
  }

  async function restart() {
    if (holdStart.current == null || Date.now() - holdStart.current < HOLD_MS) {
      toast({ title: 'Hold to confirm', body: 'Press and hold the Restart button.', variant: 'warning' });
      return;
    }
    try {
      await api.triggerRestart();
      toast({ title: 'Restarting', body: 'A.C.E will be back shortly.', variant: 'info' });
    } catch (e) {
      toast({ title: 'Failed', body: String((e as Error).message), variant: 'error' });
    } finally {
      holdStart.current = null;
      setHolding(false);
    }
  }

  return (
    <Panel title="System" subtitle="Power actions and developer tools.">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="ace-btn" onClick={blink}>
          <Icon name="battery" size={16} /> Blink GPIO 17
        </button>
        <button type="button" className="ace-btn" onClick={shutdown}>
          <Icon name="power" size={16} /> Power off
        </button>
        <button
          type="button"
          className="ace-btn-danger select-none"
          onPointerDown={() => { holdStart.current = Date.now(); setHolding(true); }}
          onPointerUp={() => setHolding(false)}
          onPointerLeave={() => setHolding(false)}
          onPointerCancel={() => setHolding(false)}
          onClick={restart}
        >
          <Icon name="refresh" size={16} /> {holding ? 'Release to restart' : 'Hold to restart'}
        </button>
      </div>
      <p className="text-xs text-ace-muted mt-4">
        Power actions are <em>stubbed</em> in development. On a real Pi image, set{' '}
        <code className="px-1 py-0.5 rounded bg-black/30">ACE_ALLOW_POWER=true</code> in{' '}
        <code className="px-1 py-0.5 rounded bg-black/30">/opt/ace/ace.env</code> to enable them.
      </p>

      <details className="mt-4 text-xs text-ace-muted">
        <summary className="cursor-pointer">Build information</summary>
        <div className="mt-2 space-y-1">
          <div>API base: {typeof window !== 'undefined' ? window.location.origin : 'n/a'}</div>
          <div>Build: <code className="px-1 rounded bg-black/30">{new Date().toISOString().slice(0, 10)}</code></div>
        </div>
      </details>
    </Panel>
  );
};

/* -------------------------------------------------------------------------- */
/* Panel frame                                                                 */
/* -------------------------------------------------------------------------- */

const Panel: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, actions, children }) => (
  <section className="space-y-3">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-ace-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </header>
    <div className="ace-card space-y-4">{children}</div>
  </section>
);

export default SettingsApp;
