import { ImageResponse } from "next/og";
import { SITE_CONTENT } from "@/lib/content";

export const runtime = "edge";
export const alt = `${SITE_CONTENT.clubName} — турнирный покер-клуб`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0908",
          color: "#fff",
        }}
      >
        <svg width="80" height="80" viewBox="0 0 28 28" fill="none" style={{ marginBottom: 28 }}>
          <path
            d="M14 2.5C14 2.5 4 12 4 16.8A5.6 5.6 0 0 0 14 20.2A5.6 5.6 0 0 0 24 16.8C24 12 14 2.5 14 2.5Z"
            fill="#ffffff"
          />
          <path
            d="M11 18.8C11 21.3 12.2 22.6 9.8 24.3H18.2C15.8 22.6 17 21.3 17 18.8C15.9 19.6 14 19.9 14 19.9C14 19.9 12.1 19.6 11 18.8Z"
            fill="#c9a227"
          />
        </svg>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 700, letterSpacing: -2 }}>
          {SITE_CONTENT.clubName}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#c9a227",
            marginTop: 18,
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          Турнирный покер-клуб
        </div>
      </div>
    ),
    { ...size },
  );
}
