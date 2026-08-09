import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import UserMenu from "./UserMenu";
import NotificationBell from "./NotificationBell";
import AmbulanceNotificationBell from "./AmbulanceNotificationBell";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const { user } = useAuth();

  const dashboardPath = user
    ? { patient: "/patient", doctor: "/doctor", admin: "/admin", ambulance_driver: "/ambulance" }[
        user.role
      ]
    : "/";

  return (
    <header className="border-b border-ink-200 bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to={dashboardPath} className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            H
          </span>
          <span className="text-lg font-semibold text-ink-900">HealthRecord</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            {user.role === "doctor" && <NotificationBell />}
            {user.role === "ambulance_driver" && <AmbulanceNotificationBell />}
            <ThemeToggle />
            <UserMenu />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login" className="text-sm font-medium text-ink-800 hover:text-brand-600">
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
