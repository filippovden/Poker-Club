"use client";

import { useEffect } from "react";

// app/error.tsx only catches errors thrown by segments below the root
// layout — an error thrown by the root layout itself (app/layout.tsx) needs
// this separate boundary, which has to render its own <html>/<body> since
// the layout that would normally provide them is what failed.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ru">
      <body style={{ background: "#0a0a0a", color: "#fff" }}>
        <div
          style={{
            display: "flex",
            minHeight: "100svh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 500 }}>Не удалось загрузить страницу</h1>
          <p style={{ color: "#999", maxWidth: "24rem" }}>
            Попробуйте обновить страницу — если ошибка повторится, напишите нам в Telegram.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              borderRadius: "9999px",
              background: "#c9a227",
              color: "#000",
              padding: "0.625rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Попробовать снова
          </button>
        </div>
      </body>
    </html>
  );
}
