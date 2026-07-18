type Props = {
  /** Pixel size of the mark (square). Defaults to 28px — comparable to the nav's line-height. */
  size?: number;
  className?: string;
};

/**
 * The TravelOS brand mark — a rounded badge in `--primary` with a simple
 * route/waypoint glyph (an arcing path landing on a pin), replacing the
 * placeholder "colored square" that previously stood in for a logo in the
 * marketing nav, footer, dashboard header, and metadata images. One
 * component so every surface stays in sync with a single visual asset.
 */
export function Logo({ size = 28, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="28" height="28" rx="8" className="fill-primary" />
      <path
        d="M7 18.5C9.5 12.5 14 8 20.5 8"
        stroke="var(--primary-foreground)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="0.5 3.2"
      />
      <circle cx="20.5" cy="8" r="2" className="fill-primary-foreground" />
      <circle cx="7" cy="18.5" r="1.4" className="fill-primary-foreground" />
    </svg>
  );
}
