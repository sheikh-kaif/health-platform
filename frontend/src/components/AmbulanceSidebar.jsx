import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  IconUser,
  IconAmbulance,
  IconHistory,
  IconSettings,
  IconLogout,
  IconShield,
  IconHeadset,
  IconMenu,
  IconChevronDown,
} from "./SidebarIcons";

const NAV_ITEMS = [
  { key: "profile", label: "My Profile", icon: IconUser, to: "/profile" },
  {
    key: "requests",
    label: "Requests",
    icon: IconAmbulance,
    to: "/ambulance?tab=requests",
  },
  {
    key: "trips",
    label: "My Trips",
    icon: IconHistory,
    to: "/ambulance?tab=trips",
  },
  {
    key: "settings",
    label: "Settings",
    icon: IconSettings,
    to: "/profile?tab=password",
  },
];

export default function AmbulanceSidebar({ active }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const activeLabel =
    NAV_ITEMS.find((item) => item.key === active)?.label ?? "Menu";

  return (
    <aside className="relative flex w-full shrink-0 flex-col gap-6 md:w-64">
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        aria-expanded={mobileOpen}
        className="flex items-center justify-between rounded-xl border border-ink-200 bg-surface px-4 py-3 md:hidden"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-ink-800">
          <IconMenu className="shrink-0" />
          {activeLabel}
        </span>
        <IconChevronDown
          className={`shrink-0 transition-transform ${mobileOpen ? "rotate-180" : ""}`}
        />
      </button>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-ink-900/30 md:hidden"
        />
      )}

      <nav
        className={`${mobileOpen ? "flex" : "hidden"} absolute inset-x-0 top-14 z-40 max-h-[70vh] flex-col gap-1 overflow-y-auto rounded-xl border border-ink-200 bg-surface p-2 shadow-lg md:static md:z-auto md:flex md:max-h-none md:shadow-none`}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active;
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-700 hover:bg-ink-100"
              }`}
            >
              <Icon className="shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="hover-lift rounded-xl border border-ink-200 bg-gradient-to-br from-brand-50 to-teal-50 p-4">
        <p className="text-sm font-semibold text-ink-900">
          Every second <span className="text-brand-600">counts</span>
        </p>
        <p className="mt-2 flex items-center gap-2 text-xs text-ink-600">
          <IconShield className="shrink-0 text-brand-500" />
          New requests appear for every driver — accept the ones you can
          reach fastest.
        </p>
      </div>

      <Link
        to="/ambulance?tab=messages"
        className="hover-lift block rounded-xl border border-ink-200 bg-surface p-4 transition-colors hover:border-brand-300 hover:bg-brand-50"
      >
        <p className="flex items-center gap-2 text-sm font-medium text-ink-800">
          <IconHeadset className="shrink-0 text-ink-500" />
          Need help?
        </p>
        <p className="mt-1 text-xs text-ink-500">
          Send a message to the admin team
        </p>
      </Link>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 rounded-lg border border-ink-200 bg-surface px-3 py-2 text-sm font-medium text-coral-600 hover:bg-coral-100 md:hidden"
      >
        <IconLogout className="shrink-0" />
        Log out
      </button>
    </aside>
  );
}
