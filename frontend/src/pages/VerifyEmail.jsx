import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function VerifyEmail() {
  const { verifyEmail } = useAuth();
  const { token } = useParams();
  const [status, setStatus] = useState("checking"); // checking | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await verifyEmail(token);
        if (!cancelled) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully.");
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            err.response?.data?.message ||
              "Verification link is invalid or has expired.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="mx-auto flex min-h-[calc(100svh-73px)] max-w-md flex-col justify-center px-6 py-12 text-center">
      <h1 className="text-2xl font-semibold text-ink-900">
        Email verification
      </h1>

      {status === "checking" && (
        <p className="mt-6 text-sm text-ink-600">Verifying your email…</p>
      )}

      {status === "success" && (
        <p className="mt-6 rounded-md bg-brand-50 px-4 py-3 text-sm text-brand-700">
          {message}
        </p>
      )}

      {status === "error" && (
        <p className="mt-6 rounded-md bg-coral-100 px-4 py-3 text-sm text-coral-600">
          {message}
        </p>
      )}

      <Link
        to="/login"
        className="mt-6 text-sm font-medium text-brand-600 hover:underline"
      >
        Go to log in
      </Link>
    </div>
  );
}
