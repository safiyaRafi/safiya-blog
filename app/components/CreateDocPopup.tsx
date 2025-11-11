"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateDocPopup() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState(`---\ntitle: ""\n---\n\n# New Document\n`);
  const [status, setStatus] = useState<{ type: "idle"|"loading"|"error"|"success"; message?: string }>({ type: "idle" });
  const router = useRouter();

  const handleSave = async () => {
    setStatus({ type: "loading", message: "Saving..." });
    if (!title.trim()) {
      setStatus({ type: "error", message: "Title is required" });
      return;
    }

    try {
      const res = await fetch("/api/create-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, title, markdown }),
      });

      const json = await res.json();

      if (!res.ok) {
        setStatus({ type: "error", message: json?.error || "Server error" });
        return;
      }

      setStatus({ type: "success", message: json?.message || "Created" });

      setTimeout(() => {
        try { router.refresh(); } catch (e) { window.location.reload(); }
        setOpen(false);
      }, 600);
    } catch (err: any) {
      setStatus({ type: "error", message: err?.message || "Network error" });
    }
  };

  return (
    <>
      <button
        onClick={() => { setOpen(true); setStatus({ type: "idle" }); }}
        className="btn-primary"
        aria-haspopup="dialog"
      >
        + Create New Document
      </button>

      {open && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Create New Document</h3>

            <div className="field">
              <label className="label">Category</label>
              <input
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="category folder (e.g. react-fastapi-integration)"
              />
            </div>

            <div className="field">
              <label className="label">Title</label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
              />
            </div>

            <div className="field">
              <label className="label">Markdown</label>
              <textarea
                className="input"
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                rows={10}
              />
            </div>

            {status.type === "error" && <div className="status-error">{status.message}</div>}
            {status.type === "success" && <div className="status-success">{status.message}</div>}
            {status.type === "loading" && <div style={{color: 'var(--muted)'}}>{status.message}</div>}

            <div className="modal-actions">
              <button onClick={() => setOpen(false)} className="btn secondary">Cancel</button>
              <button
                onClick={handleSave}
                className="btn positive"
                disabled={status.type === "loading"}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
