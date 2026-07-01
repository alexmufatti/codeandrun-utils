"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Copy, Check, Upload, Search } from "lucide-react";
import { toast } from "sonner";

interface S3Image {
  key: string;
  url: string;
  size: number;
  lastModified: string;
}

const PAGE_SIZE = 24;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title="Copia link"
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiato" : "Copia link"}
    </button>
  );
}

export default function MediaPageClient() {
  const [images, setImages] = useState<S3Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
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
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return images;
    return images.filter((img) => img.key.toLowerCase().includes(q));
  }, [images, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageImages = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/media", { method: "POST", body: form });
        if (!res.ok) throw new Error();
      }
      toast.success(files.length > 1 ? "Immagini caricate" : "Immagine caricata");
      fetchImages();
    } catch {
      toast.error("Errore nel caricamento");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Immagini</h1>
        <label
          className={`flex items-center gap-2 rounded-md bg-[#FC4C02] px-4 py-2 text-sm font-medium text-white hover:bg-[#e04400] transition-colors cursor-pointer ${
            uploading ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <Upload className="h-4 w-4" />
          {uploading ? "Caricamento..." : "Carica immagine"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>

      {!loading && images.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca per nome file..."
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Caricamento...</p>
      ) : images.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna immagine caricata.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna immagine corrisponde alla ricerca.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {pageImages.map((img) => (
              <div key={img.key} className="rounded-lg border border-border overflow-hidden flex flex-col">
                <a href={img.url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.key}
                    className="w-full aspect-square object-cover bg-muted/30"
                    loading="lazy"
                  />
                </a>
                <div className="px-2 py-2 flex flex-col gap-1">
                  <p className="text-xs text-muted-foreground truncate" title={img.key}>
                    {img.key.split("/").pop()}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">{formatSize(img.size)}</p>
                  <CopyButton url={img.url} />
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Precedente
              </button>
              <span className="text-muted-foreground">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Successiva →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
