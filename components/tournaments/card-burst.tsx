"use client";

import { useMemo } from "react";
import { motion } from "motion/react";

const SUITS = ["♠", "♥", "♦", "♣"];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

// Small cards burst outward and fall, like they've spilled out of the
// dialog — plays once per playKey change (bump the key on every fresh
// success, not just the first).
export function CardBurst({ playKey }: { playKey: number }) {
  const cards = useMemo(
    () =>
      Array.from({ length: 10 }).map((_, i) => ({
        id: `${playKey}-${i}`,
        suit: SUITS[i % SUITS.length],
        dx: randomBetween(-150, 150),
        dyUp: randomBetween(-70, -30),
        dyDown: randomBetween(50, 110),
        rotate: randomBetween(-260, 260),
        delay: randomBetween(0, 0.1),
        duration: randomBetween(0.9, 1.3),
      })),
    [playKey],
  );

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible">
      {cards.map((c) => (
        <motion.span
          key={c.id}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            x: c.dx,
            y: [0, c.dyUp, c.dyDown],
            opacity: 0,
            rotate: c.rotate,
            scale: 0.8,
          }}
          transition={{ duration: c.duration, delay: c.delay, ease: "easeOut" }}
          className="absolute left-1/2 top-10 flex h-9 w-7 -translate-x-1/2 items-center justify-center rounded-md border border-[var(--accent)]/60 bg-[var(--surface)] text-sm font-bold text-[var(--accent)] shadow-lg"
        >
          {c.suit}
        </motion.span>
      ))}
    </div>
  );
}
