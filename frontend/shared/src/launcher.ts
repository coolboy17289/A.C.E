/**
 * Smart launcher ranking.
 *
 * Every time the user opens an app, we log a `LaunchEvent { appId, ts }`
 * into localStorage (capped at 500 entries to stay cheap). When the
 * launcher needs to order tiles, we score each candidate by:
 *
 *   score(app) =
 *     recencyScore(app)        // exponentially-decaying "how recent"
 *       + frequencyScore(app)  // "how often" (log-scaled)
 *       + timeOfDayScore(app)  // "is this the typical hour for this app"
 *       + contextBoost(app)    // small hand-tuned boosts (e.g. focus
 *                              //   gets a nudge when there are open
 *                              //   tasks; home always lands at index 0)
 *
 * The algorithm is fully deterministic given the same input + clock, so
 * the home tile order is stable across reloads and is easy to reason
 * about. No ML, no network, no dependency. localStorage IO is wrapped
 * so a quota error or a private-browsing tab degrades to "registry
 * order" rather than crashing the shell.
 */
import type { AppManifest, AppId } from './types.js';

const STORAGE_KEY = 'ace.launcher.events.v1';
const MAX_EVENTS = 500;
/** Half-life of a launch event in days. */
const RECENCY_HALF_LIFE_DAYS = 5;

export interface LaunchEvent {
  appId: string;
  /** epoch ms */
  ts: number;
}

function readEvents(): LaunchEvent[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidEvent) : [];
  } catch {
    return [];
  }
}

function writeEvents(events: LaunchEvent[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const tail = events.slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tail));
  } catch {
    // quota / private mode — drop the write, keep the in-memory copy.
  }
}

function isValidEvent(e: unknown): e is LaunchEvent {
  return !!e && typeof (e as any).appId === 'string' && typeof (e as any).ts === 'number';
}

/**
 * Record a launch. Safe to call from a click handler — never throws.
 * Returns the in-memory event list AFTER the write so callers can
 * re-rank immediately if they want.
 */
export function recordLaunch(appId: string, now: number = Date.now()): LaunchEvent[] {
  const events = readEvents();
  events.push({ appId, ts: now });
  writeEvents(events);
  return events;
}

/** Wipe history (used by Settings → "Reset launcher"). */
export function clearLaunchHistory(): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

function recencyScore(events: LaunchEvent[], appId: string, now: number): number {
  let best = 0;
  const halfLifeMs = RECENCY_HALF_LIFE_DAYS * 86_400_000;
  for (const e of events) {
    if (e.appId !== appId) continue;
    const dt = Math.max(0, now - e.ts);
    const v = Math.pow(0.5, dt / halfLifeMs); // 1.0 → 0.5 → 0.25 …
    if (v > best) best = v;
  }
  return best * 2.0; // 0..2 weight
}

function frequencyScore(events: LaunchEvent[], appId: string): number {
  let n = 0;
  for (const e of events) if (e.appId === appId) n++;
  // log(1 + n) keeps a daily app and an hourly app in the same ballpark.
  return Math.log1p(n) * 0.5; // ~0..2.5 weight for hundreds of events
}

function timeOfDayScore(events: LaunchEvent[], appId: string, now: number): number {
  // Build a 24-bucket histogram of launches, weighted toward recent.
  const buckets = new Array<number>(24).fill(0);
  const halfLifeMs = 14 * 86_400_000; // older than 2 weeks counts less
  for (const e of events) {
    if (e.appId !== appId) continue;
    const h = new Date(e.ts).getHours();
    const dt = Math.max(0, now - e.ts);
    buckets[h] += Math.pow(0.5, dt / halfLifeMs);
  }
  const currentHour = new Date(now).getHours();
  const total = buckets.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  // Normalise into 0..1.5
  return (buckets[currentHour] / total) * 1.5;
}

export interface ContextSignals {
  /** number of open (incomplete) tasks — boosts focus & tasks */
  openTaskCount: number;
  /** is there a calendar event starting in the next 60 min? */
  nextEventSoon: boolean;
  /** did the user open an app within the last 2 minutes? (stickiness) */
  recentlyOpened: boolean;
}

export const EMPTY_CONTEXT: ContextSignals = {
  openTaskCount: 0,
  nextEventSoon: false,
  recentlyOpened: false,
};

function contextBoost(appId: string, ctx: ContextSignals): number {
  let s = 0;
  if (appId === 'home') return 0.75; // pinned
  if (appId === 'focus' && ctx.openTaskCount > 0) s += 0.6;
  if (appId === 'tasks' && ctx.openTaskCount >= 3) s += 0.4;
  if (appId === 'planner' && ctx.nextEventSoon) s += 0.8;
  if (appId === 'statistics' && ctx.recentlyOpened) s += 0.2;
  return s;
}

export interface ScoredApp {
  app: AppManifest;
  score: number;
  breakdown: { recency: number; frequency: number; timeOfDay: number; context: number };
}

/**
 * Rank the supplied registry for display. The returned list preserves
 * `home` at index 0 regardless of score so the launcher is never empty
 * or disorienting. `now` and `context` are injected to keep the
 * function pure and trivially testable.
 */
export function rankApps(
  registry: readonly AppManifest[],
  now: number = Date.now(),
  context: ContextSignals = EMPTY_CONTEXT,
  events: LaunchEvent[] = readEvents(),
): ScoredApp[] {
  const scored: ScoredApp[] = registry.map((app) => {
    const r = recencyScore(events, app.id, now);
    const f = frequencyScore(events, app.id);
    const t = timeOfDayScore(events, app.id, now);
    const c = contextBoost(app.id, context);
    return { app, score: r + f + t + c, breakdown: { recency: r, frequency: f, timeOfDay: t, context: c } };
  });
  scored.sort((a, b) => b.score - a.score);

  // Pin home at index 0.
  const idx = scored.findIndex((s) => s.app.id === 'home');
  if (idx > 0) {
    const [home] = scored.splice(idx, 1);
    scored.unshift(home);
  }
  return scored;
}

/** Debug helper — produces a one-line summary per app. */
export function explainRanking(scored: ScoredApp[]): string {
  return scored
    .map((s) => `${s.app.id.padEnd(10)} ${s.score.toFixed(2)}  (r${s.breakdown.recency.toFixed(2)} f${s.breakdown.frequency.toFixed(2)} t${s.breakdown.timeOfDay.toFixed(2)} c${s.breakdown.context.toFixed(2)})`)
    .join('\n');
}

export type { AppId };
