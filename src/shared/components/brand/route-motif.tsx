import { cn } from "@/shared/lib/utils";

type Props = {
  className?: string;
};

/**
 * Decorative background motif — a few arcing dotted "flight paths" between
 * waypoints, evoking travel routes without fabricating stock photography
 * (the app has no real destination imagery to draw on, and a fabricated
 * "stock photo" look would read as generic anyway). Pure inline SVG, no
 * external assets or network fetch; colored via `currentColor` so callers
 * control intensity/theme entirely through text color + opacity utility
 * classes on the wrapping element.
 */
export function RouteMotif({ className }: Props) {
  return (
    <svg
      viewBox="0 0 1200 400"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-primary", className)}
      aria-hidden
    >
      <path
        d="M60 340C260 340 320 120 560 120C760 120 800 260 1020 80"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1 10"
      />
      <path
        d="M120 60C300 60 380 220 620 220C820 220 900 40 1140 220"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1 10"
      />
      {[
        [60, 340],
        [560, 120],
        [1020, 80],
        [120, 60],
        [620, 220],
        [1140, 220],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" fill="currentColor" />
      ))}
    </svg>
  );
}
