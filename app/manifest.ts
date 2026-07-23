import type { MetadataRoute } from "next";
import { SITE_CONTENT } from "@/lib/content";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_CONTENT.clubName,
    short_name: SITE_CONTENT.clubName,
    description: "Клуб турнирного покера. Живые турниры каждую неделю.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0908",
    theme_color: "#0a0908",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
