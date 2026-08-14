"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";

const CDN = "https://cdn.codeandrun.it";

interface S3Image {
  key: string;
  url: string;
  size: number;
  lastModified: string;
}

function ExistingImagePicker({
  onClose,
  onInsert,
}: {
  onClose: () => void;
  onInsert: (paths: string[]) => void;
}) {
  const [images, setImages] = useState<S3Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/media");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setImages(data.images ?? []);
      } catch {
        toast.error("Errore nel caricamento delle immagini");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return images;
    return images.filter((img) => img.key.toLowerCase().includes(q));
  }, [images, query]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleInsert = () => {
    onInsert(Array.from(selected).map((key) => `/${key}`));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-lg border border-border shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Seleziona immagini esistenti</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
        </div>

        <div className="px-4 py-3 border-b border-border">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca per nome file..."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex-1 overflow-auto px-4 py-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Caricamento...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna immagine trovata.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {filtered.map((img) => {
                const isSelected = selected.has(img.key);
                return (
                  <button
                    key={img.key}
                    onClick={() => toggle(img.key)}
                    title={img.key}
                    className={`relative rounded overflow-hidden border-2 transition-colors ${isSelected ? "border-[#FC4C02]" : "border-transparent hover:border-muted-foreground"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="w-full aspect-square object-cover bg-muted/30" loading="lazy" />
                    {isSelected && (
                      <span className="absolute top-1 right-1 bg-[#FC4C02] text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground">{selected.size} selezionate</span>
          <button
            onClick={handleInsert}
            disabled={selected.size === 0}
            className="rounded-md bg-[#FC4C02] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#e04400] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Inserisci
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PhotoPicker({
  folder,
  featuredImage,
  onFeaturedChange,
  onInsert,
}: {
  folder: string;
  featuredImage: string;
  onFeaturedChange: (path: string) => void;
  onInsert: (paths: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    const paths: string[] = [];
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        form.append("folder", folder);
        const res = await fetch("/api/strava/activities/astro/upload-media", { method: "POST", body: form });
        const data = await res.json();
        if (data.path) paths.push(data.path);
      }
    } finally {
      setUploading(false);
    }
    e.target.value = "";
    if (!paths.length) return;
    setUploadedPaths((prev) => [...prev, ...paths]);
    onInsert(paths);
  };

  const handlePickExisting = (paths: string[]) => {
    setUploadedPaths((prev) => [...prev, ...paths]);
    onInsert(paths);
  };

  return (
    <div className="space-y-2">
      <div className={`flex flex-wrap items-center gap-2 ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
            {uploading ? "Caricamento..." : "📷 Aggiungi foto"}
          </span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
        </label>
        <button
          onClick={() => setPickerOpen(true)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
        >
          🖼️ Scegli esistente
        </button>
        <span className="text-xs text-muted-foreground">Clicca su una foto per impostarla come featured image</span>
      </div>

      {uploadedPaths.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uploadedPaths.map((p) => {
            const isFeatured = featuredImage === p;
            return (
              <button
                key={p}
                onClick={() => onFeaturedChange(p)}
                title={isFeatured ? "Featured image" : "Imposta come featured"}
                className={`relative rounded overflow-hidden border-2 transition-colors ${isFeatured ? "border-[#FC4C02]" : "border-transparent hover:border-muted-foreground"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${CDN}${p}`} alt="" className="h-16 w-16 object-cover" />
                {isFeatured && (
                  <span className="absolute bottom-0 left-0 right-0 bg-[#FC4C02] text-white text-[9px] font-bold text-center py-0.5">
                    FEATURED
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {pickerOpen && <ExistingImagePicker onClose={() => setPickerOpen(false)} onInsert={handlePickExisting} />}
    </div>
  );
}
