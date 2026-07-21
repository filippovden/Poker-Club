import Script from "next/script";

const THEME_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem("lp-theme");
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
    var sound = localStorage.getItem("lp-sound");
    document.documentElement.setAttribute("data-sound", sound === "on" ? "on" : "off");
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
