(() => {
  const storageKey = "eyewear-site-theme";
  const body = document.body;

  function applyTheme(theme, save = false) {
    const isDark = theme === "dark";
    body.classList.toggle("dark-theme", isDark);
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.innerHTML = isDark
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.5A8.5 8.5 0 0 1 8.5 3.8 8.5 8.5 0 1 0 20.2 15.5Z"></path></svg>';
      button.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
      button.setAttribute("aria-pressed", String(isDark));
      button.title = `Switch to ${isDark ? "light" : "dark"} mode`;
    });
    if (save) localStorage.setItem(storageKey, isDark ? "dark" : "light");
    document.dispatchEvent(new CustomEvent("site-theme-change", { detail: { isDark } }));
  }

  const storedTheme = localStorage.getItem(storageKey);
  applyTheme(storedTheme === "dark" ? "dark" : "light");

  document.addEventListener("click", (event) => {
    const button = event.target instanceof Element
      ? event.target.closest("[data-theme-toggle]")
      : null;
    if (!button) return;
    applyTheme(body.classList.contains("dark-theme") ? "light" : "dark", true);
  });

  window.addEventListener("storage", (event) => {
    if (event.key === storageKey) {
      applyTheme(event.newValue === "dark" ? "dark" : "light");
    }
  });
})();
