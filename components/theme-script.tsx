import Script from "next/script";

const THEME_SCRIPT = `
(function () {
  try {
    var ageConfirmed = localStorage.getItem("lp-age-confirmed") === "yes";
    document.documentElement.setAttribute("data-age-gate", ageConfirmed ? "confirmed" : "pending");
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return (
    <Script id="theme-script" strategy="beforeInteractive">
      {THEME_SCRIPT}
    </Script>
  );
}
