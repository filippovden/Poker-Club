"use client";

import { Volume2, VolumeX } from "lucide-react";
import { isSoundEnabled, setSoundEnabled, playClick } from "@/lib/sound";

function toggle() {
  const next = !isSoundEnabled();
  setSoundEnabled(next);
  document.documentElement.setAttribute("data-sound", next ? "on" : "off");
  if (next) playClick();
}

export function SoundToggle() {
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Включить/выключить звук интерфейса"
      title="Включить/выключить звук интерфейса"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10"
    >
      <Volume2 className="sound-icon-on h-4 w-4" />
      <VolumeX className="sound-icon-off h-4 w-4" />
    </button>
  );
}
