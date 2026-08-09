import { useTheme } from "../context/ThemeContext";
import { IconSun, IconMoon } from "./SidebarIcons";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink-200 bg-surface text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
    >
      {isDark ? (
        <IconSun width={16} height={16} />
      ) : (
        <IconMoon width={16} height={16} />
      )}
    </button>
  );
}
