"use client";

import * as React from "react";

type Ripple = {
  id: number;
  x: number;
  y: number;
};

let nextRippleId = 0;

/**
 * Site-wide visual feedback for taps/clicks. Mounted once in AppProviders.
 * Mobile visitors reported no confirmation that a tap registered; this
 * renders a short-lived ripple at the pointer position on every pointerdown,
 * anywhere on the page, independent of whether the target element has its
 * own hover/active styles.
 */
export function TapRipple() {
  const [ripples, setRipples] = React.useState<Ripple[]>([]);

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== undefined && event.button > 0) return;
      const id = nextRippleId++;
      setRipples((current) => [
        ...current,
        { id, x: event.clientX, y: event.clientY },
      ]);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const removeRipple = (id: number) => {
    setRipples((current) => current.filter((ripple) => ripple.id !== id));
  };

  if (ripples.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="tap-ripple"
          style={{ left: ripple.x, top: ripple.y }}
          onAnimationEnd={() => removeRipple(ripple.id)}
        />
      ))}
    </div>
  );
}
