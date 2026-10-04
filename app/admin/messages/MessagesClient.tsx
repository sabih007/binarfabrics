"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiGet, apiSend } from "@/lib/client";

type Status = "NEW" | "READ" | "ARCHIVED";

interface Message {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  topic: string;
  orderNumber: string | null;
  message: string;
  status: Status;
  createdAt: string;
}

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function MessagesClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState<"" | Status>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ perPage: "60" });
      if (filter) query.set("status", filter);

      const data = await apiGet<{ messages: Message[]; unread: number }>(
        `/api/admin/messages?${query}`
      );
      setMessages(data.messages);
      setUnread(data.unread);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load messages.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(message: Message, status: Status) {
    setError(null);
    try {
      await apiSend(`/api/admin/messages/${message.id}`, "PATCH", { status });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update that message.");
    }
  }

  async function remove(message: Message) {
    if (!confirm(`Delete the message from ${message.name}?`)) return;
    setError(null);
    try {
      await apiSend(`/api/admin/messages/${message.id}`, "DELETE");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete that message.");
    }
  }

  async function exportSubscribers() {
    // A plain navigation lets the browser handle the CSV download and keeps
    // the session cookie attached.
    window.location.href = "/api/admin/subscribers?format=csv";
  }

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Messages</h1>
          <p>{unread} unread · from the contact form.</p>
        </div>
        <div className="adm-actions">
          <button className="adm-btn" onClick={exportSubscribers}>
            Export subscribers (CSV)
          </button>
        </div>
      </div>

      {error && <div className="adm-note adm-note--error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="adm-toolbar">
        <select value={filter} onChange={(e) => setFilter(e.target.value as "" | Status)}>
          <option value="">All messages</option>
          <option value="NEW">Unread</option>
          <option value="READ">Read</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <div className="adm-panel">
        {loading ? (
          <div className="adm-empty">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="adm-empty">Nothing here.</div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>From</th>
                  <th>Topic</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: m.status === "NEW" ? 700 : 500 }}>{m.name}</div>
                      <div className="adm-table__muted">
                        <a href={`tel:${m.phone}`}>{m.phone}</a>
                        {m.email && (
                          <>
                            <br />
                            <a href={`mailto:${m.email}`}>{m.email}</a>
                          </>
                        )}
                        <br />
                        {dateTime(m.createdAt)}
                      </div>
                    </td>
                    <td>
                      {m.topic}
                      {m.orderNumber && <div className="adm-table__muted">Order {m.orderNumber}</div>}
                    </td>
                    <td style={{ maxWidth: 380, whiteSpace: "pre-wrap" }}>{m.message}</td>
                    <td>
                      <span className={`adm-pill adm-pill--${m.status}`}>{m.status}</span>
                    </td>
                    <td>
                      <div className="adm-actions">
                        {m.status === "NEW" && (
                          <button className="adm-btn adm-btn--sm" onClick={() => setStatus(m, "READ")}>
                            Mark read
                          </button>
                        )}
                        {m.status !== "ARCHIVED" && (
                          <button className="adm-btn adm-btn--sm" onClick={() => setStatus(m, "ARCHIVED")}>
                            Archive
                          </button>
                        )}
                        <button className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => remove(m)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
