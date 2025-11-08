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

      // Wait a little for filesystem write, then refresh server data (App Router)
      setTimeout(() => {
        // refresh server components / data fetches so sidebars that read lib/index.ts update
        try {
          router.refresh();
        } catch (e) {
          // fallback full reload only if router.refresh is not available (rare)
          window.location.reload();
        }
        setOpen(false);
      }, 600);
    } catch (err: any) {
      setStatus({ type: "error", message: err?.message || "Network error" });
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setStatus({ type: "idle" });
        }}
        className="px-3 py-2 rounded bg-sky-600 text-white"
      >
        + Create New Document
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl bg-white rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-3">Create New Document</h3>

            <label className="block mb-2">
              <div className="text-sm">Category</div>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="category folder (e.g. react-fastapi-integration)"
                className="w-full border rounded p-2 mt-1"
              />
            </label>

            <label className="block mb-2">
              <div className="text-sm">Title</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                className="w-full border rounded p-2 mt-1"
              />
            </label>

            <label className="block mb-4">
              <div className="text-sm">Markdown</div>
              <textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                rows={10}
                className="w-full border rounded p-2 mt-1 font-mono"
              />
            </label>

            {status.type === "error" && <div className="text-sm text-red-600 mb-2">{status.message}</div>}
            {status.type === "success" && <div className="text-sm text-green-600 mb-2">{status.message}</div>}
            {status.type === "loading" && <div className="text-sm text-gray-700 mb-2">{status.message}</div>}

            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-3 py-1 rounded border">
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 rounded bg-green-600 text-white"
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
