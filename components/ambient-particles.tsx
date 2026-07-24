// Negative delays start each particle already mid-cycle, so the layer
// looks "already drifting" on first paint instead of every particle
// fading in from zero in a visible synchronized wave.
const PARTICLES = [
  { left: "3%", bottom: "10%", size: 2, duration: 22, delay: -4, opacity: 0.3 },
  { left: "9%", bottom: "70%", size: 3, duration: 18, delay: -11, opacity: 0.4 },
  { left: "16%", bottom: "35%", size: 2, duration: 26, delay: -2, opacity: 0.25 },
  { left: "24%", bottom: "88%", size: 2, duration: 20, delay: -15, opacity: 0.35 },
  { left: "33%", bottom: "5%", size: 3, duration: 24, delay: -8, opacity: 0.3 },
  { left: "41%", bottom: "55%", size: 2, duration: 19, delay: -1, opacity: 0.4 },
  { left: "49%", bottom: "20%", size: 4, duration: 27, delay: -18, opacity: 0.25 },
  { left: "57%", bottom: "78%", size: 2, duration: 21, delay: -6, opacity: 0.35 },
  { left: "64%", bottom: "40%", size: 3, duration: 17, delay: -13, opacity: 0.3 },
  { left: "72%", bottom: "8%", size: 2, duration: 25, delay: -3, opacity: 0.4 },
  { left: "79%", bottom: "62%", size: 2, duration: 23, delay: -9, opacity: 0.25 },
  { left: "86%", bottom: "30%", size: 3, duration: 18, delay: -16, opacity: 0.35 },
  { left: "92%", bottom: "82%", size: 2, duration: 20, delay: -5, opacity: 0.3 },
  { left: "12%", bottom: "48%", size: 2, duration: 29, delay: -20, opacity: 0.2 },
  { left: "68%", bottom: "92%", size: 2, duration: 22, delay: -10, opacity: 0.3 },
];

export function AmbientParticles() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="ambient-particle"
          style={{
            left: p.left,
            bottom: p.bottom,
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            ["--particle-opacity" as string]: p.opacity,
          }}
        />
      ))}
    </div>
  );
}
