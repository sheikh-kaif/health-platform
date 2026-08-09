import { useState } from "react";
import client from "../api/client";

export default function ContactAdminForm({
  onSent,
  endpoint = "/patients/me/contact-admin",
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus("sending");
    setError(null);
    try {
      await client.post(endpoint, { subject, message });
      setStatus("sent");
      setSubject("");
      setMessage("");
      onSent?.();
    } catch (err) {
      setStatus("error");
      setError(
        err.response?.data?.message ||
          "Failed to send your message. Please try again.",
      );
    }
  };

  if (status === "sent") {
    return (
      <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm text-brand-700">
        Your message was sent to the admin team. They'll get back to you by
        email.
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="ml-2 font-medium underline"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-800">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="What's this about?"
          className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-800">
          Message
        </label>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell the admin team what you need help with…"
          className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-sm text-coral-600">{error}</p>}
      <button
        type="submit"
        disabled={status === "sending"}
        className="self-start rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Send to admin"}
      </button>
    </form>
  );
}
