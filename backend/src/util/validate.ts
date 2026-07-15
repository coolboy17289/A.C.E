/**
 * Hand-rolled input guards. We deliberately avoid zod/joi for v1 - the
 * payload shape is small and the cost of a 200kb validation dep is not
 * justified. If the surface grows we can swap these out for zod.
 *
 * Each guard returns either a cleaned-up value or a `ValidationError`.
 */

export class ValidationError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(message);
    this.field = field;
  }
}

/** Ensures a non-empty trimmed string within an optional length bound. */
export function str(value: unknown, field: string, opts: { maxLen?: number; minLen?: number } = {}): string {
  if (typeof value !== 'string') throw new ValidationError(field, `${field} must be a string`);
  const trimmed = value.trim();
  if (opts.minLen !== undefined && trimmed.length < opts.minLen) {
    throw new ValidationError(field, `${field} must be at least ${opts.minLen} characters`);
  }
  if (trimmed.length === 0) throw new ValidationError(field, `${field} must not be empty`);
  if (opts.maxLen !== undefined && trimmed.length > opts.maxLen) {
    throw new ValidationError(field, `${field} exceeds maximum length of ${opts.maxLen}`);
  }
  return trimmed;
}

/** Optional string; returns undefined if absent/empty. */
export function optStr(value: unknown, field: string, opts: { maxLen?: number } = {}): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new ValidationError(field, `${field} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (opts.maxLen !== undefined && trimmed.length > opts.maxLen) {
    throw new ValidationError(field, `${field} exceeds maximum length of ${opts.maxLen}`);
  }
  return trimmed;
}

/** Number within bounds. */
export function num(value: unknown, field: string, opts: { min?: number; max?: number; integer?: boolean } = {}): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) throw new ValidationError(field, `${field} must be a number`);
  if (opts.integer && !Number.isInteger(n)) throw new ValidationError(field, `${field} must be an integer`);
  if (opts.min !== undefined && n < opts.min) throw new ValidationError(field, `${field} must be >= ${opts.min}`);
  if (opts.max !== undefined && n > opts.max) throw new ValidationError(field, `${field} must be <= ${opts.max}`);
  return n;
}

export function optNum(value: unknown, field: string, opts: { min?: number; max?: number; integer?: boolean } = {}): number | undefined {
  if (value === undefined || value === null) return undefined;
  return num(value, field, opts);
}

/** Boolean. */
export function bool(value: unknown, field: string): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 0 || value === 1) return Boolean(value);
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new ValidationError(field, `${field} must be a boolean`);
}

export function optBool(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  return bool(value, field);
}

/**
 * Validates an ISO 8601 timestamp. We accept anything Date.parse accepts
 * with a 'T' to match the existing `start/end` shape used by the calendar
 * route, plus full ISO strings.
 */
export function isoTs(value: unknown, field: string): string {
  const s = str(value, field);
  if (Number.isNaN(Date.parse(s))) throw new ValidationError(field, `${field} must be an ISO timestamp`);
  return s;
}

export function optIsoTs(value: unknown, field: string): string | undefined {
  const cleaned = optStr(value, field);
  if (cleaned === undefined) return undefined;
  if (Number.isNaN(Date.parse(cleaned))) throw new ValidationError(field, `${field} must be an ISO timestamp`);
  return cleaned;
}

/** Confirms the value is one of the allowed string literals. */
export function oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  const s = str(value, field);
  if (!(allowed as readonly string[]).includes(s)) {
    throw new ValidationError(field, `${field} must be one of: ${allowed.join(', ')}`);
  }
  return s as T;
}

export function optOneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T | undefined {
  if (value === undefined || value === null) return undefined;
  return oneOf(value, field, allowed);
}

/** String array of tags. */
export function strArray(value: unknown, field: string, opts: { maxItems?: number; maxItemLen?: number } = {}): string[] {
  if (!Array.isArray(value)) throw new ValidationError(field, `${field} must be an array`);
  if (opts.maxItems !== undefined && value.length > opts.maxItems) {
    throw new ValidationError(field, `${field} must have at most ${opts.maxItems} items`);
  }
  return value.map((v, i) => str(v, `${field}[${i}]`, { maxLen: opts.maxItemLen }));
}

export function optStrArray(value: unknown, field: string, opts: { maxItems?: number; maxItemLen?: number } = {}): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  return strArray(value, field, opts);
}

/** Record (object) that we don't constrain further. */
export function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(field, `${field} must be an object`);
  }
  return value as Record<string, unknown>;
}
