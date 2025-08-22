// components/ImageUploader.js
// Mobile-first, robust camera+gallery uploader with client-side processing
// LIVE PREVIEW: editor modal draws to canvas and updates continuously.

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * USAGE
 * -----
 * <ImageUploader
 *    supabase={supabase}
 *    userId={currentUser.id}
 *    bucket="listing-images"
 *    maxFiles={10}
 *    maxFileMB={12}
 *    maxEdgePx={1600}
 *    jpegQuality={0.85}
 *    initialItems={[{ url, key }]} // for edit page (optional)
 *    onChange={(items) => setUploaded(items)}
 * />
 */

export default function ImageUploader({
  supabase,
  userId,
  bucket = "listing-images",
  maxFiles = 10,
  maxFileMB = 12,
  maxEdgePx = 1600,
  jpegQuality = 0.85,
  initialItems = [],
  onChange,
}) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [items, setItems] = useState(() =>
    initialItems.map((it, idx) => ({
      id: `init-${idx}`,
      name: it.key || `image-${idx}.jpg`,
      size: 0,
      status: "done",
      progress: 100,
      url: it.url,
      storageKey: it.key ?? null,
      canEdit: false,
      error: null,
      ctrl: null,
    }))
  );

  const [overall, setOverall] = useState({ pct: 0, txt: "" });
  const [liveMsg, setLiveMsg] = useState("");

  // ---- Editor modal state (now with live canvas preview) ----
  const [showEditor, setShowEditor] = useState(false);
  const [editorSrc, setEditorSrc] = useState(null); // objectURL of source (for revoke)
  const [editorIdx, setEditorIdx] = useState(-1);
  const [editorState, setEditorState] = useState({
    rotate: 0,
    zoom: 1,
    x: 0.5,
    y: 0.5,
  }); // normalized pan (0..1)
  const [editorBitmap, setEditorBitmap] = useState(null); // decoded for live preview
  const previewCanvasRef = useRef(null);

  // ---------- Inline Worker for final processing ----------
  const workerRef = useRef(null);
  useEffect(() => {
    const source = `self.onmessage = async (e) => {
      const { file, opts } = e.data;
      try {
        const arrBuf = await file.arrayBuffer();
        const bitmap = await createImageBitmap(new Blob([arrBuf]));
        let { width: w, height: h } = bitmap;

        const rotate = (opts.rotate || 0) % 360;
        const aspect = 4/3;

        let cropW = w, cropH = Math.round(w / aspect);
        if (cropH > h) { cropH = h; cropW = Math.round(h * aspect); }
        cropW = Math.max(1, Math.round(cropW / Math.max(1, opts.zoom || 1)));
        cropH = Math.max(1, Math.round(cropH / Math.max(1, opts.zoom || 1)));

        const cx = Math.floor((opts.x || 0.5) * w);
        const cy = Math.floor((opts.y || 0.5) * h);
        let sx = Math.max(0, Math.min(cx - Math.floor(cropW/2), w - cropW));
        let sy = Math.max(0, Math.min(cy - Math.floor(cropH/2), h - cropH));

        const curMax = Math.max(
          rotate % 180 !== 0 ? cropH : cropW,
          rotate % 180 !== 0 ? cropW : cropH
        );
        const maxEdge = opts.maxEdgePx || 1600;
        const scale = curMax > maxEdge ? maxEdge / curMax : 1;
        const tw = Math.max(1, Math.round((rotate % 180 !== 0 ? cropH : cropW) * scale));
        const th = Math.max(1, Math.round((rotate % 180 !== 0 ? cropW : cropH) * scale));

        const off1 = new OffscreenCanvas(cropW, cropH);
        const o1 = off1.getContext('2d', { alpha: false });
        o1.drawImage(bitmap, sx, sy, cropW, cropH, 0, 0, cropW, cropH);

        const off2 = new OffscreenCanvas(tw, th);
        const o2 = off2.getContext('2d', { alpha: false });
        o2.translate(tw/2, th/2);
        o2.rotate(rotate * Math.PI/180);
        // object-fit: cover into tw x th
        const srcW = off1.width, srcH = off1.height;
        const rotW = (rotate % 180 === 0) ? srcW : srcH;
        const rotH = (rotate % 180 === 0) ? srcH : srcW;
        const coverScale = Math.max(tw / rotW, th / rotH);
        const drawW = srcW * coverScale;
        const drawH = srcH * coverScale;
        o2.imageSmoothingQuality = 'high';
        o2.drawImage(off1, -drawW/2, -drawH/2, drawW, drawH);

        const blob = await off2.convertToBlob({ type: 'image/jpeg', quality: opts.jpegQuality || 0.85 });
        self.postMessage({ ok: true, blob }, []);
      } catch (err) {
        self.postMessage({ ok: false, error: err?.message || String(err) });
      }
    }`;
    const blob = new Blob([source], { type: "application/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  // Helpers
  const humanMB = (bytes) => (bytes / (1024 * 1024)).toFixed(1) + " MB";
  const announce = (s) => setLiveMsg(s);

  const sanitizeExt = (name) => {
    const base = (name || "image").replace(/\.[^.]+$/, "");
    return base + ".jpg";
  };

  const recomputeOverall = (arr) => {
    const list = arr || items;
    const n = list.length || 1;
    const sum = list.reduce(
      (acc, it) => acc + (it.progress || (it.status === "done" ? 100 : 0)),
      0
    );
    return { pct: Math.round(sum / n), txt: "" };
  };

  async function processInWorker(file, opts) {
    const worker = workerRef.current;
    if (!worker) return file;
    return new Promise((resolve, reject) => {
      const onMsg = (ev) => {
        const { ok, blob, error } = ev.data || {};
        worker.removeEventListener("message", onMsg);
        if (!ok) return reject(new Error(error || "Processing failed"));
        resolve(blob);
      };
      worker.addEventListener("message", onMsg);
      worker.postMessage({ file, opts });
    });
  }

  async function uploadWithRetries({
    supabase,
    bucket,
    userId,
    file,
    timeoutMs = 60_000,
    maxRetries = 2,
    onStatus,
  }) {
    const now = new Date();
    const key = `${userId}/${now.getFullYear()}/${String(
      now.getMonth() + 1
    ).padStart(2, "0")}/${String(now.getDate()).padStart(
      2,
      "0"
    )}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

    let attempt = 0;
    while (true) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        onStatus && onStatus(0.05, "Starting upload");
        const { error } = await supabase.storage
          .from(bucket)
          .upload(key, file, {
            upsert: false,
            cacheControl: "31536000, immutable",
            contentType: "image/jpeg",
            signal: ctrl.signal,
          });
        clearTimeout(timer);
        if (error) throw error;
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(key);
        return { url: pub?.publicUrl || null, key };
      } catch (err) {
        if (attempt >= maxRetries) throw err;
        const backoff = Math.min(2000 * Math.pow(2, attempt), 6000);
        await new Promise((r) => setTimeout(r, backoff));
        attempt++;
      }
    }
  }

  // ---------- Picking / processing / uploading ----------
  const handlePick = async (list) => {
    const picked = Array.from(list || []);
    if (!picked.length) return;

    const existing = items.filter((i) => i.status !== "removed");
    const room = Math.max(0, maxFiles - existing.length);
    if (room === 0) {
      announce(`You can upload up to ${maxFiles} photos.`);
      return;
    }
    const toUse = picked.slice(0, room);

    const newItems = toUse.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name || "photo.jpg",
      size: file.size || 0,
      status: "processing",
      progress: 5,
      url: null,
      storageKey: null,
      canEdit: true,
      error: null,
      rawFile: file,
      ctrl: null,
    }));

    setItems((prev) => [...prev, ...newItems]);
    announce(`${newItems.length} photo${newItems.length > 1 ? "s" : ""} added`);

    for (let idx = 0; idx < newItems.length; idx++) {
      const itemId = newItems[idx].id;
      try {
        // HEIC → JPEG (best-effort)
        let workFile = newItems[idx].rawFile;
        const isHeic =
          /heic|heif/i.test(workFile.type) ||
          /\.(heic|heif)$/i.test(workFile.name || "");
        if (isHeic) {
          setItems((cur) =>
            cur.map((i) =>
              i.id === itemId ? { ...i, status: "processing", progress: 10 } : i
            )
          );
          try {
            const heic2any = (await import("heic2any")).default;
            const out = await heic2any({
              blob: workFile,
              toType: "image/jpeg",
              quality: 0.92,
            });
            workFile = new File(
              [out],
              (workFile.name || "image").replace(/\.(heic|heif)$/i, "") +
                ".jpg",
              { type: "image/jpeg" }
            );
          } catch (err) {
            console.warn("HEIC conversion failed", err);
          }
        }

        // Crop/resize in Worker (default framing; user can adjust later)
        const processed = await processInWorker(workFile, {
          rotate: 0,
          zoom: 1,
          x: 0.5,
          y: 0.5,
          maxEdgePx,
          jpegQuality,
        });
        setItems((cur) =>
          cur.map((i) =>
            i.id === itemId ? { ...i, status: "uploading", progress: 60 } : i
          )
        );

        const { url, key } = await uploadWithRetries({
          supabase,
          bucket,
          userId,
          file: new File([processed], sanitizeExt(workFile.name)),
          timeoutMs: 60_000,
          maxRetries: 2,
          onStatus: (p) => {
            setItems((cur) =>
              cur.map((i) =>
                i.id === itemId
                  ? {
                      ...i,
                      progress: Math.max(
                        60,
                        Math.min(99, Math.round(60 + p * 40))
                      ),
                      status: "uploading",
                    }
                  : i
              )
            );
          },
        });

        setItems((cur) =>
          cur.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  status: "done",
                  progress: 100,
                  url,
                  storageKey: key,
                  canEdit: false,
                }
              : i
          )
        );
        announce("Photo uploaded");
      } catch (err) {
        setItems((cur) =>
          cur.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  status: "error",
                  error: err?.message || "Upload failed",
                  progress: 0,
                }
              : i
          )
        );
        announce("Upload failed");
      } finally {
        setOverall(recomputeOverall(items));
      }
    }
  };

  // ---------- Editor (open/close/apply) ----------
  const openEditor = async (idx) => {
    const it = items[idx];
    if (!it) return;
    let sourceFile;
    if (it.rawFile) {
      sourceFile = it.rawFile;
    } else if (it.url) {
      const b = await fetch(it.url).then((r) => r.blob());
      sourceFile = new File([b], it.name || "image.jpg", {
        type: b.type || "image/jpeg",
      });
    } else return;

    const url = URL.createObjectURL(sourceFile);
    setEditorIdx(idx);
    setEditorSrc(url);
    setEditorState({ rotate: 0, zoom: 1, x: 0.5, y: 0.5 });

    try {
      const bmp = await createImageBitmap(sourceFile);
      setEditorBitmap(bmp);
    } catch (e) {
      console.warn("createImageBitmap failed", e);
      setEditorBitmap(null);
    }
    setShowEditor(true);
  };

  const closeEditor = () => {
    if (editorSrc) URL.revokeObjectURL(editorSrc);
    setShowEditor(false);
    setEditorSrc(null);
    setEditorIdx(-1);
    setEditorBitmap(null);
  };

  const applyEditor = async () => {
    const idx = editorIdx;
    const it = items[idx];
    if (!it) return closeEditor();
    try {
      const sourceFile =
        it.rawFile ||
        (await fetch(it.url)
          .then((r) => r.blob())
          .then(
            (b) =>
              new File([b], it.name || "image.jpg", {
                type: b.type || "image/jpeg",
              })
          ));

      setItems((cur) =>
        cur.map((x, i) =>
          i === idx
            ? { ...x, status: "processing", progress: 10, error: null }
            : x
        )
      );
      const blob = await processInWorker(sourceFile, {
        ...editorState,
        maxEdgePx,
        jpegQuality,
      });
      setItems((cur) =>
        cur.map((x, i) =>
          i === idx ? { ...x, status: "uploading", progress: 60 } : x
        )
      );
      const { url, key } = await uploadWithRetries({
        supabase,
        bucket,
        userId,
        file: new File([blob], sanitizeExt(it.name)),
      });
      setItems((cur) =>
        cur.map((x, i) =>
          i === idx
            ? {
                ...x,
                status: "done",
                progress: 100,
                url,
                storageKey: key,
                canEdit: false,
              }
            : x
        )
      );
      announce("Photo updated");
    } catch (err) {
      setItems((cur) =>
        cur.map((x, i) =>
          i === idx
            ? { ...x, status: "error", error: err?.message || "Edit failed" }
            : x
        )
      );
    } finally {
      closeEditor();
    }
  };

  // ---------- Remove / Cancel ----------
  const removeItem = (id) => setItems((cur) => cur.filter((i) => i.id !== id));

  const cancelAll = () => {
    setItems((cur) => cur.filter((i) => i.status === "done"));
    announce("Canceled pending uploads");
  };

  // ---------- Report changes up ----------
  useEffect(() => {
    onChange && onChange(items);
    setOverall(recomputeOverall(items));
  }, [items]); // eslint-disable-line

  // ---------- Live preview renderer (canvas) ----------
  useEffect(() => {
    if (!showEditor || !editorBitmap || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: false });
    const bmp = editorBitmap;
    const { rotate, zoom, x, y } = editorState;

    const W = canvas.width; // 800
    const H = canvas.height; // 600 (4:3)
    const w = bmp.width,
      h = bmp.height;

    // 4:3 crop in source coordinates
    const aspect = 4 / 3;
    let cropW = w,
      cropH = Math.round(w / aspect);
    if (cropH > h) {
      cropH = h;
      cropW = Math.round(h * aspect);
    }
    cropW = Math.max(1, Math.round(cropW / Math.max(1, zoom)));
    cropH = Math.max(1, Math.round(cropH / Math.max(1, zoom)));

    const cx = Math.floor(x * w);
    const cy = Math.floor(y * h);
    const sx = Math.max(0, Math.min(cx - Math.floor(cropW / 2), w - cropW));
    const sy = Math.max(0, Math.min(cy - Math.floor(cropH / 2), h - cropH));

    // Draw crop into temp canvas
    const tmp = document.createElement("canvas");
    tmp.width = cropW;
    tmp.height = cropH;
    const tctx = tmp.getContext("2d", { alpha: false });
    tctx.drawImage(bmp, sx, sy, cropW, cropH, 0, 0, cropW, cropH);

    // Clear
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    // Compute rotated source bbox (right angles)
    const angle = ((rotate % 360) + 360) % 360;
    const srcW = tmp.width;
    const srcH = tmp.height;
    const rotW = angle % 180 === 0 ? srcW : srcH;
    const rotH = angle % 180 === 0 ? srcH : srcW;

    // Object-fit: cover (keep AR, fill canvas, crop overflow)
    const scale = Math.max(W / rotW, H / rotH);
    const drawW = srcW * scale;
    const drawH = srcH * scale;

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate((angle * Math.PI) / 180);
    // After rotation, the unrotated image is centered; draw so it covers frame
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(tmp, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [showEditor, editorBitmap, editorState]);

  // ---------- UI ----------
  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <div className="pp-uploader">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMsg}
      </div>

      <div className="pp-ctas">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Add photos from your device"
        >
          Add Photos
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          hidden
          onChange={(e) => {
            handlePick(e.target.files);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => cameraInputRef.current?.click()}
          aria-label="Open camera"
        >
          Use Camera
        </button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          capture="environment"
          multiple
          hidden
          onChange={(e) => {
            handlePick(e.target.files);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          className="btn btn-ghost"
          onClick={cancelAll}
          aria-label="Cancel all pending uploads"
        >
          Cancel All
        </button>
      </div>

      {items.length > 0 && (
        <div
          className="pp-overall"
          role="group"
          aria-label="Overall upload status"
        >
          <div className="bar" aria-hidden="true">
            <span style={{ width: `${overall.pct}%` }} />
          </div>
          <div className="legend">
            {overall.pct}% complete • {doneCount}/{items.length} ready
          </div>
        </div>
      )}

      <ul className="pp-grid" role="list">
        {items.map((it, idx) => (
          <li
            key={it.id}
            className="pp-item"
            aria-label={`${it.name}, ${it.status}`}
          >
            <div className={`thumb ${it.status}`}>
              {it.url ? (
                <img src={it.url} alt="Uploaded preview" />
              ) : it.rawFile ? (
                <FilePreview file={it.rawFile} />
              ) : null}
              <ProgressRing value={it.progress || 0} />
            </div>
            <div className="meta">
              <div className="name" title={it.name}>
                {it.name}
              </div>
              <div className="sub">{it.size ? humanMB(it.size) : ""}</div>
            </div>
            <div className="row">
              <button
                type="button"
                className="btn sm"
                onClick={() => openEditor(idx)}
                disabled={it.status !== "done" && it.status !== "processing"}
                aria-label={`Edit ${it.name}`}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn sm danger"
                onClick={() => removeItem(it.id)}
                aria-label={`Remove ${it.name}`}
              >
                Remove
              </button>
            </div>
            {it.error && (
              <div className="err" role="alert">
                {it.error}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Editor Modal with LIVE preview */}
      {showEditor && (
        <dialog open className="pp-modal" aria-label="Edit photo">
          <div className="pp-modal-inner">
            <div className="canvasWrap">
              <canvas
                ref={previewCanvasRef}
                width={800}
                height={600}
                aria-label="Live preview"
              />
            </div>
            <div className="controls">
              <label>
                Rotate 90°
                <button
                  type="button"
                  className="btn sm"
                  onClick={() =>
                    setEditorState((s) => ({
                      ...s,
                      rotate: (s.rotate + 90) % 360,
                    }))
                  }
                >
                  Rotate
                </button>
              </label>
              <label>
                Zoom
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={editorState.zoom}
                  onChange={(e) =>
                    setEditorState((s) => ({
                      ...s,
                      zoom: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Pan X
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={editorState.x}
                  onChange={(e) =>
                    setEditorState((s) => ({ ...s, x: Number(e.target.value) }))
                  }
                />
              </label>
              <label>
                Pan Y
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={editorState.y}
                  onChange={(e) =>
                    setEditorState((s) => ({ ...s, y: Number(e.target.value) }))
                  }
                />
              </label>
            </div>
            <div className="actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeEditor}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={applyEditor}
              >
                Apply
              </button>
            </div>
          </div>
        </dialog>
      )}

      <style jsx>{`
        .pp-ctas {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        .pp-overall {
          margin: 12px 0;
        }
        .pp-overall .bar {
          height: 8px;
          background: #e9e9e9;
          border-radius: 999px;
          overflow: hidden;
        }
        .pp-overall .bar > span {
          display: block;
          height: 100%;
          background: var(--teal, #279989);
        }
        .pp-overall .legend {
          font-size: 0.9rem;
          color: #555;
          margin-top: 6px;
        }
        .pp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
          margin-top: 10px;
        }
        .pp-item {
          background: #fff;
          border: 1px solid #e9e9e9;
          border-radius: 12px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .thumb {
          position: relative;
          border-radius: 10px;
          overflow: hidden;
          background: #f5f5f5;
          aspect-ratio: 4/3;
        }
        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .meta {
          display: flex;
          justify-content: space-between;
          gap: 6px;
          align-items: center;
        }
        .name {
          font-weight: 600;
          font-size: 0.9rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sub {
          font-size: 0.8rem;
          color: #666;
        }
        .row {
          display: flex;
          gap: 8px;
        }
        .btn {
          border: none;
          border-radius: 10px;
          padding: 10px 12px;
          font-weight: 700;
          cursor: pointer;
          font-size: 14px;
        }
        .btn.sm {
          padding: 6px 8px;
          font-size: 12px;
          border-radius: 8px;
        }
        .btn.danger {
          background: #fff5f4;
          color: #8c2f28;
          border: 1px solid #ffd9d5;
        }
        .btn-primary {
          background: var(--teal, #279989);
          color: #fff;
        }
        .btn-ghost {
          background: #fff;
          color: var(--storm, #141b4d);
          border: 2px solid var(--storm, #141b4d);
        }
        .btn-ghost:hover {
          background: var(--storm, #141b4d);
          color: #fff;
        }
        .err {
          color: #8c2f28;
          font-size: 0.85rem;
        }
        .sr-only {
          position: absolute;
          left: -9999px;
          top: auto;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }
        .ring {
          position: absolute;
          right: 6px;
          bottom: 6px;
        }
        .pp-modal {
          border: none;
          border-radius: 14px;
          padding: 0;
          max-width: min(92vw, 560px);
        }
        .pp-modal-inner {
          padding: 16px;
        }
        .canvasWrap {
          width: 100%;
          background: #000;
          aspect-ratio: 4/3;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .canvasWrap canvas {
          width: 100%;
          height: 100%;
          display: block;
        }
      `}</style>
    </div>
  );
}

function FilePreview({ file }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  if (!src) return null;
  return <img src={src} alt="Pending preview" />;
}

function ProgressRing({ value = 0, size = 44, stroke = 4 }) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;
  return (
    <svg
      className="ring"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`Progress ${value}%`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#E9E9E9"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#279989"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}
