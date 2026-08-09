import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";
import GoogleSignInButton, {
  isGoogleSignInEnabled,
} from "../components/GoogleSignInButton";

export default function Login() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(form.email, form.password);
      console.log("Login successful");

      navigate("/welcome", { replace: true });
    } catch {}
  };

  return (
    <div className="mx-auto flex min-h-[calc(100svh-73px)] max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold text-ink-900">Log in</h1>
      <p className="mt-1 text-sm text-ink-600">
        Access your medical records, patient roster, or admin dashboard.
      </p>

      {isGoogleSignInEnabled && (
        <>
          <div className="mt-8">
            <GoogleSignInButton />
          </div>

          <div className="mt-6 flex items-center gap-3 text-xs text-ink-400">
            <div className="h-px flex-1 bg-ink-200" />
            or log in with email
            <div className="h-px flex-1 bg-ink-200" />
          </div>
        </>
      )}

      <form
        onSubmit={handleSubmit}
        className={`flex flex-col gap-4 ${isGoogleSignInEnabled ? "mt-6" : "mt-8"}`}
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-800">
            Email
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-ink-800">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            inputClassName="rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {error && (
          <p className="rounded-md bg-coral-100 px-3 py-2 text-sm text-coral-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-600">
        No account?{" "}
        <Link
          to="/register"
          className="font-medium text-brand-600 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
