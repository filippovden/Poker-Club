"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, motion, useReducedMotion } from "motion/react";

const INTERACTIVE_SELECTOR = "a, button, [role='button'], input, textarea, select, [data-cursor-hover]";

export function CustomCursor() {
  const prefersReducedMotion = useReducedMotion();
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const springX = useSpring(x, { stiffness: 500, damping: 40, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 500, damping: 40, mass: 0.4 });
  const scale = useMotionValue(1);
  const springScale = useSpring(scale, { stiffness: 400, damping: 30 });
  const enabledRef = useRef(false);

  useEffect(() => {
    const isFinePointer = window.matchMedia?.("(pointer: fine)").matches;
    if (!isFinePointer || prefersReducedMotion) return;
    enabledRef.current = true;
    document.documentElement.classList.add("has-custom-cursor");

    function onMove(e: MouseEvent) {
      x.set(e.clientX);
      y.set(e.clientY);
      const target = e.target as Element;
      scale.set(target.closest(INTERACTIVE_SELECTOR) ? 1.8 : 1);
    }

    // Hybrid devices (e.g. touchscreen laptops) can report pointer: fine
    // even though the current interaction is a finger, not a mouse — bail
    // out permanently the moment a real touch happens.
    function onTouchStart() {
      enabledRef.current = false;
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchstart", onTouchStart);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchstart", onTouchStart);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, [prefersReducedMotion, x, y, scale]);

  if (prefersReducedMotion) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="custom-cursor pointer-events-none fixed left-0 top-0 z-[200] hidden h-3 w-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--accent)] mix-blend-difference"
      style={{ x: springX, y: springY, scale: springScale }}
    >
      <span className="h-[3px] w-[3px] rounded-full bg-[var(--accent)]" />
    </motion.div>
  );
}
