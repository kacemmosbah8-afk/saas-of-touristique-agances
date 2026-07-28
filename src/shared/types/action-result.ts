/**
 * Standardized discriminated union for all Server Action responses.
 *
 * - `ActionResult`       — void success (sign-in, sign-out, delete, …)
 * - `ActionResult<T>`    — success carrying data T (create, update, …)
 *
 * Consumers narrow with `if (result.ok)` before accessing `result.data`.
 */
export type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };
