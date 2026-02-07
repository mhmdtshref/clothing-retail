'use client';

import * as React from 'react';
import {
  Box,
  Stack,
  Button,
  Typography,
  LinearProgress,
  Avatar,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';

/**
 * ProductImageUploader
 * Props:
 *  - productId?: string
 *  - value?: { url, key, width, height, contentType } | null
 *  - onChange?: (imageOrNull) => void
 *  - disabled?: boolean
 *  - maxBytesHint?: number  // optional UI hint; server enforces real limit
 */
export default function ProductImageUploader({
  productId,
  value,
  onChange,
  disabled,
  maxBytesHint,
}) {
  const [file, setFile] = React.useState(null);
  const [preview, setPreview] = React.useState(value?.url || '');
  const [progress, setProgress] = React.useState(0);
  const [uploading, setUploading] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState('');

  const busy = processing || uploading;

  React.useEffect(() => {
    setPreview(value?.url || '');
  }, [value?.url]);

  function resetAll() {
    // best-effort cleanup for local previews
    try {
      if (typeof preview === 'string' && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    } catch {}
    setFile(null);
    setPreview('');
    setProgress(0);
    setUploading(false);
    setError('');
    onChange && onChange(null);
  }

  async function pickFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError('');
    if (!f.type?.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    let objURL = '';
    try {
      setProcessing(true);
      const minimized = await compressImageToMaxBytes(f, { maxBytes: 200 * 1024 });
      setFile(minimized);
      // cleanup previous local preview to avoid leaks when replacing an image
      try {
        if (typeof preview === 'string' && preview.startsWith('blob:'))
          URL.revokeObjectURL(preview);
      } catch {}

      objURL = URL.createObjectURL(minimized);
      setPreview(objURL);
      const dims = await getImageDimensions(objURL);
      await uploadToS3(minimized, dims);
    } catch (err) {
      setError(err?.message || String(err));
      // best-effort cleanup for this attempt
      try {
        if (objURL) URL.revokeObjectURL(objURL);
      } catch {}
      setPreview('');
      setFile(null);
    } finally {
      setProcessing(false);
      // allow selecting the same file again to re-trigger onChange
      try {
        e.target.value = '';
      } catch {}
    }
  }

  async function uploadToS3(f, dims) {
    setUploading(true);
    setProgress(0);
    setError('');
    try {
      // Upload to our Next API; it will forward to S3 server-side
      const form = new FormData();
      form.append('file', f);
      if (productId) form.append('productId', productId);
      form.append('ext', mimeToExt(f.type));

      const result = await xhrFormUploadJSON({
        url: '/api/uploads/s3/upload',
        form,
        onProgress: setProgress,
      });
      if (!result?.ok) throw new Error(result?.error || 'Upload failed');

      const image = {
        url: result.publicUrl,
        key: result.key,
        width: dims.width,
        height: dims.height,
        contentType: f.type,
      };
      onChange && onChange(image);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Stack spacing={1.5}>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box
          sx={{
            width: 84,
            height: 84,
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: 'background.default',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="preview"
              style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
            />
          ) : (
            <Avatar variant="rounded" sx={{ width: 64, height: 64 }} />
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <Button
              variant="contained"
              startIcon={
                busy ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />
              }
              disabled={disabled || busy}
            >
              {uploading
                ? `Uploading… ${Math.round(progress || 0)}%`
                : processing
                  ? 'Processing…'
                  : preview
                    ? 'Replace Image'
                    : 'Upload Image'}
            </Button>
            {/*
              Use an *actual user click* on the file input (overlay, opacity 0).
              This is more reliable than programmatic `input.click()` in some WebViews (Tauri/Capacitor/etc).
            */}
            <input
              type="file"
              accept="image/*"
              onChange={pickFile}
              disabled={disabled || busy}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: disabled || busy ? 'default' : 'pointer',
              }}
            />
          </Box>
          {preview && (
            <Tooltip title="Remove image">
              <span>
                <IconButton color="error" onClick={resetAll} disabled={disabled || busy}>
                  <DeleteIcon />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Stack>
      {typeof maxBytesHint === 'number' && (
        <Typography variant="caption" color="text.secondary">
          Max size ~
          {maxBytesHint < 1024 * 1024
            ? `${Math.round(maxBytesHint / 1024)} KB`
            : `${Math.round(maxBytesHint / 1024 / 1024)} MB`}
        </Typography>
      )}
      {uploading && (
        <Box>
          <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, progress))} />
          <Typography variant="caption" color="text.secondary">
            Uploading… {Math.round(progress)}%
          </Typography>
        </Box>
      )}
    </Stack>
  );
}

function mimeToExt(m) {
  if (!m) return 'jpg';
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[m] || 'jpg';
}

function getImageDimensions(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        width: img.naturalWidth || img.width || 0,
        height: img.naturalHeight || img.height || 0,
      });
    img.onerror = () => reject(new Error('Failed to read image dimensions'));
    img.src = src;
  });
}

/**
 * Compress/resize an image to <= maxBytes before upload.
 * - Prefers WebP for best compression, but falls back to JPEG when WebP export isn't supported
 *   (notably iOS Safari: canvas.toBlob('image/webp') is unsupported and silently falls back).
 * - Strict: throws if it cannot reach the target size.
 * - Note: canvas-based encoding will flatten animated GIFs, so we reject GIF inputs.
 */
async function compressImageToMaxBytes(
  file,
  {
    maxBytes = 200 * 1024, // 200KB
    mimeType = 'image/webp',
    fallbackMimeType = 'image/jpeg',
    startQuality = 0.82,
    minQuality = 0.35,
    downscaleStep = 0.85,
    minWidth = 160,
    minHeight = 160,
    maxDownscaleAttempts = 25,
  } = {},
) {
  if (!file?.type?.startsWith('image/')) throw new Error('Please select an image file.');
  if (String(file.type).toLowerCase() === 'image/gif') {
    throw new Error('GIF compression is not supported. Please upload PNG/JPG/WebP.');
  }

  const bitmap = await createImageBitmap(file);
  try {
    let width = bitmap.width;
    let height = bitmap.height;

    const normMime = (v) =>
      String(v || '')
        .toLowerCase()
        .trim();

    const makeCanvas = (w, h) => {
      if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    };

    const canvasToBlob = (canvas, type, quality) => {
      if (typeof canvas.convertToBlob === 'function') {
        return canvas.convertToBlob({ type, quality });
      }
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to encode image'))),
          type,
          quality,
        );
      });
    };

    const makeFileName = (oldName, type) => {
      const t = normMime(type);
      const ext =
        t === 'image/webp'
          ? 'webp'
          : t === 'image/png'
            ? 'png'
            : t === 'image/jpeg' || t === 'image/jpg'
              ? 'jpg'
              : 'jpg';
      const base = String(oldName || 'image').replace(/\.[^.]+$/, '');
      return `${base}.${ext}`;
    };

    // iOS Safari cannot export WebP via canvas; detect and fall back early so we don't waste
    // iterations (WebP request silently becomes PNG, and the quality parameter becomes useless).
    let targetMimeType = mimeType;
    if (normMime(mimeType) === 'image/webp') {
      try {
        const testCanvas = makeCanvas(1, 1);
        const testCtx = testCanvas.getContext('2d');
        if (testCtx) {
          testCtx.fillStyle = '#000';
          testCtx.fillRect(0, 0, 1, 1);
          const testBlob = await canvasToBlob(testCanvas, 'image/webp', 0.8);
          if (normMime(testBlob?.type) !== 'image/webp') {
            targetMimeType = fallbackMimeType;
          }
        } else {
          targetMimeType = fallbackMimeType;
        }
      } catch {
        targetMimeType = fallbackMimeType;
      }
    }

    const targetIsJpeg =
      normMime(targetMimeType) === 'image/jpeg' || normMime(targetMimeType) === 'image/jpg';
    const formatMax = (bytes) => {
      const n = Number(bytes);
      if (!Number.isFinite(n) || n <= 0) return 'the target size';
      if (n < 1024) return `${Math.round(n)} B`;
      return `${Math.round(n / 1024)} KB`;
    };

    // Draw at current size; try lowering quality first, then downscale and retry.
    for (let downscaleAttempts = 0; downscaleAttempts < maxDownscaleAttempts; downscaleAttempts++) {
      const canvas = makeCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context is not available');
      // Higher quality resizing where supported
      try {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      } catch {}

      if (targetIsJpeg) {
        // JPEG has no alpha; paint a white background to avoid black/transparent artifacts.
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(bitmap, 0, 0, width, height);

      let quality = startQuality;
      for (let qAttempts = 0; qAttempts < 12; qAttempts++) {
        const blob = await canvasToBlob(canvas, targetMimeType, quality);
        if (blob.size <= maxBytes) {
          const outType = normMime(blob?.type) ? blob.type : targetMimeType;
          return new File([blob], makeFileName(file.name, outType), { type: outType });
        }
        const nextQuality = Math.max(minQuality, quality - 0.08);
        if (nextQuality === quality) break;
        quality = nextQuality;
      }

      const nextW = Math.floor(width * downscaleStep);
      const nextH = Math.floor(height * downscaleStep);
      if (nextW < minWidth || nextH < minHeight) break;
      width = nextW;
      height = nextH;
    }

    throw new Error(
      `Could not compress image to ${formatMax(maxBytes)}. Try a smaller/cropped image.`,
    );
  } finally {
    try {
      bitmap.close && bitmap.close();
    } catch {}
  }
}

async function xhrFormUpload({ url, fields, file, onProgress }) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    Object.entries(fields || {}).forEach(([k, v]) => form.append(k, v));
    form.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = (evt.loaded / evt.total) * 100;
      onProgress && onProgress(pct);
    };
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          const msg = xhr.responseText ? `: ${xhr.responseText}` : '';
          reject(new Error(`S3 upload failed (${xhr.status})${msg}`));
        }
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(form);
  });
}

async function xhrFormUploadJSON({ url, form, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = (evt.loaded / evt.total) * 100;
      onProgress && onProgress(pct);
    };
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        try {
          const data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error(data?.error || `Upload failed (${xhr.status})`));
        } catch (e) {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(form);
  });
}
