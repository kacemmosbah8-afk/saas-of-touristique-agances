/**
 * Semantic color tones for status badges/pills across the app. Every
 * domain-specific status enum (booking, quote, resource, …) maps its own
 * values onto these five tones instead of hardcoding Tailwind color
 * classes, so a palette change happens in one place.
 */
export type StatusTone = "neutral" | "info" | "warning" | "success" | "danger" | "special";

export const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground ring-border",
  info: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-400",
  warning:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-400",
  success:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-400",
  danger: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-400",
  special:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-400",
};
