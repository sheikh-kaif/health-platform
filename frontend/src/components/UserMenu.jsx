import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import UserIcon from "./UserIcon";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-ink-200 py-1 pl-1 pr-3 text-sm hover:bg-ink-100"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-brand-700">
            <UserIcon size={16} />
          </span>
        )}
        <span className="hidden text-ink-800 sm:inline">{user.name}</span>
        {!user.isEmailVerified && (
          <span className="h-2 w-2 rounded-full bg-amber-500" title="Email not verified" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-lg border border-ink-200 bg-surface py-1 shadow-lg"
        >
          <div className="border-b border-ink-100 px-4 py-2">
            <p className="truncate text-sm font-medium text-ink-900">{user.name}</p>
            <p className="truncate text-xs text-ink-400">{user.email}</p>
          </div>
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-ink-800 hover:bg-ink-100"
          >
            My profile
          </Link>
          <Link
            to="/profile?tab=password"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-ink-800 hover:bg-ink-100"
          >
            Change password
          </Link>
          <Link
            to="/profile?tab=verify"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between px-4 py-2 text-sm text-ink-800 hover:bg-ink-100"
          >
            Verify email
            {!user.isEmailVerified && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                pending
              </span>
            )}
          </Link>
          <button
            onClick={handleLogout}
            className="block w-full border-t border-ink-100 px-4 py-2 text-left text-sm text-coral-600 hover:bg-ink-100"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
