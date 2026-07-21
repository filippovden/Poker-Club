const THEME_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem("lp-theme");
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
    var sound = localStorage.getItem("lp-sound");
    document.documentElement.setAttribute("data-sound", sound === "on" ? "on" : "off");
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
