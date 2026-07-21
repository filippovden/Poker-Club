"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MagneticWrapper } from "@/components/magnetic";
import { playClick } from "@/lib/sound";

const EASE = [0.16, 1, 0.3, 1] as const;
const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4";

const HEADLINE_LINE_1 = ["Честная", "игра."];
const HEADLINE_LINE_2 = ["Только", "для", "своих."];

const PARTICLES = [
  { left: "8%", size: 3, duration: 14, delay: 0, opacity: 0.5 },
  { left: "18%", size: 2, duration: 18, delay: 3, opacity: 0.35 },
  { left: "29%", size: 4, duration: 16, delay: 6, opacity: 0.4 },
  { left: "41%", size: 2, duration: 20, delay: 1, opacity: 0.3 },
  { left: "54%", size: 3, duration: 15, delay: 8, opacity: 0.45 },
  { left: "63%", size: 2, duration: 19, delay: 4, opacity: 0.3 },
  { left: "74%", size: 4, duration: 17, delay: 10, opacity: 0.4 },
  { left: "85%", size: 3, duration: 13, delay: 2, opacity: 0.5 },
  { left: "92%", size: 2, duration: 21, delay: 7, opacity: 0.3 },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.7 },
  },
};

const word = {
  hidden: { y: "110%", opacity: 0 },
  show: {
    y: "0%",
    opacity: 1,
    transition: { duration: 0.9, ease: EASE },
  },
};

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const videoY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ["0%", "0%"] : ["0%", "22%"],
  );
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative flex h-[100svh] min-h-[560px] w-full flex-col overflow-hidden bg-black"
    >
      <motion.div
        style={{ y: videoY }}
        className="absolute inset-0 scale-[1.15]"
        initial={{ opacity: 0, scale: 1.25 }}
        animate={{ opacity: 1, scale: 1.15 }}
        transition={{ duration: 2, ease: EASE }}
      >
        <video
          className="h-full w-full object-cover opacity-70"
          src={VIDEO_URL}
          poster="/hero-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </motion.div>

      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 78%, rgba(201,162,39,0.22) 0%, rgba(201,162,39,0.08) 35%, transparent 65%)",
        }}
        animate={
          prefersReducedMotion
            ? undefined
            : { opacity: [0.6, 1, 0.6] }
        }
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 100%, transparent 30%, rgba(0,0,0,0.55) 70%, #000 100%), linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.35) 70%, #000 100%)",
        }}
      />
      <div className="grain absolute inset-0" />

      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="hero-particle"
            style={{
              left: p.left,
              bottom: "-10%",
              width: p.size,
              height: p.size,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              ["--particle-opacity" as string]: p.opacity,
            }}
          />
        ))}
      </div>

      <motion.div
        style={{ opacity: contentOpacity }}
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-6 pb-16 sm:pb-24"
      >
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: EASE }}
          className="mb-6"
        >
          <Badge variant="accent">Закрытый клуб</Badge>
        </motion.div>

        <h1 className="font-display max-w-3xl text-[clamp(2.5rem,8vw,5.5rem)] font-medium leading-[0.95] tracking-tight text-white">
          <span className="block overflow-hidden">
            <motion.span
              variants={container}
              initial="hidden"
              animate="show"
              className="inline-flex flex-wrap gap-x-4"
            >
              {HEADLINE_LINE_1.map((w, i) => (
                <span key={i} className="overflow-hidden py-1">
                  <motion.span variants={word} className="inline-block">
                    {w}
                  </motion.span>
                </span>
              ))}
            </motion.span>
          </span>
          <span className="block overflow-hidden text-[var(--accent)]">
            <motion.span
              variants={container}
              initial="hidden"
              animate="show"
              className="inline-flex flex-wrap gap-x-4"
            >
              {HEADLINE_LINE_2.map((w, i) => (
                <span key={i} className="overflow-hidden py-1">
                  <motion.span variants={word} className="inline-block">
                    {w}
                  </motion.span>
                </span>
              ))}
            </motion.span>
          </span>
        </h1>

        <motion.p
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.3, ease: EASE }}
          className="mt-6 max-w-md text-balance text-base text-white/70 sm:text-lg"
        >
          Живые турниры по No-Limit Hold&apos;em и Pot-Limit Omaha каждую
          неделю. Честная игра, профессиональные дилеры, атмосфера
          закрытого зала.
        </motion.p>

        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.5, ease: EASE }}
          className="mt-9 flex flex-wrap gap-3"
        >
          <MagneticWrapper>
            <Button asChild size="lg" onClick={() => playClick()}>
              <Link href="/tournaments">Смотреть турниры</Link>
            </Button>
          </MagneticWrapper>
          <MagneticWrapper>
            <Button
              asChild
              size="lg"
              variant="outline"
              onClick={() => playClick()}
              className="border-white/25 text-white hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Link href="/about">О клубе</Link>
            </Button>
          </MagneticWrapper>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2 }}
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-[11px] uppercase tracking-[0.2em] text-white/40"
      >
        Прокрутите вниз
      </motion.div>
    </section>
  );
}
