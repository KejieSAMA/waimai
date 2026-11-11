import { ref, readonly } from "vue";
type Theme = "light" | "dark";
const theme = ref<Theme>("light");
let initialized = false;
export function useTheme() {
  if (!initialized && typeof window !== "undefined") {
    initialized = true;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      theme.value =
        (localStorage.getItem("xz-theme") as Theme | null) ??
        (media.matches ? "dark" : "light");
      document.documentElement.dataset.theme = theme.value;
    };
    media.addEventListener("change", update);
    update();
  }
  function setTheme(value: Theme | "system") {
    if (value === "system") localStorage.removeItem("xz-theme");
    else localStorage.setItem("xz-theme", value);
    theme.value =
      value === "system"
        ? matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : value;
    document.documentElement.dataset.theme = theme.value;
  }
  return {
    theme: readonly(theme),
    setTheme,
    toggle: () => setTheme(theme.value === "light" ? "dark" : "light"),
  };
}
