'use client';

import * as React from 'react';
import {
  Box, Stack, Button, Typography, LinearProgress, Avatar, IconButton, Tooltip, Alert,
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
export default function ProductImageUploader({ productId, value, onChange, disabled, maxBytesHint }) {
  const [file, setFile] = React.useState(null);
  const [preview, setPreview] = React.useState(value?.url || '');
  const [progress, setProgress] = React.useState(0);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    setPreview(value?.url || '');
  }, [value?.url]);

  function resetAll() {
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
    setFile(f);
    const objURL = URL.createObjectURL(f);
    setPreview(objURL);
    try {
      const dims = await getImageDimensions(objURL);
      await uploadToS3(f, dims);
    } catch (err) {
      setError(err?.message || String(err));
      try { URL.revokeObjectURL(objURL); } catch {}
      setPreview('');
      setFile(null);
    }
  }

  async function uploadToS3(f, dims) {
    setUploading(true); setProgress(0); setError('');

    // Upload to our Next API; it will forward to S3 server-side
    const form = new FormData();
    form.append('file', f);
    if (productId) form.append('productId', productId);
    form.append('ext', mimeToExt(f.type));

    const result = await xhrFormUploadJSON({ url: '/api/uploads/s3/upload', form, onProgress: setProgress });
    if (!result?.ok) throw new Error(result?.error || 'Upload failed');

    const image = {
      url: result.publicUrl,
      key: result.key,
      width: dims.width,
      height: dims.height,
      contentType: f.type,
    };
    onChange && onChange(image);
    setUploading(false);
  }

  return (
    <Stack spacing={1.5}>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box sx={{ width: 84, height: 84, borderRadius: 2, overflow: 'hidden', bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="preview" style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }} />
          ) : (
            <Avatar variant="rounded" sx={{ width: 64, height: 64 }} />
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button component="label" variant="contained" startIcon={<CloudUploadIcon />} disabled={disabled || uploading}>
            {preview ? 'Replace Image' : 'Upload Image'}
            <input type="file" accept="image/*" hidden onChange={pickFile} />
          </Button>
          {preview && (
            <Tooltip title="Remove image">
              <span>
                <IconButton color="error" onClick={resetAll} disabled={disabled || uploading}>
                  <DeleteIcon />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Stack>
      {typeof maxBytesHint === 'number' && (
        <Typography variant="caption" color="text.secondary">Max size ~{Math.round(maxBytesHint/1024/1024)} MB</Typography>
      )}
      {uploading && (
        <Box>
          <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, progress))} />
          <Typography variant="caption" color="text.secondary">Uploading… {Math.round(progress)}%</Typography>
        </Box>
      )}
    </Stack>
  );
}

function mimeToExt(m) {
  if (!m) return 'jpg';
  const map = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  return map[m] || 'jpg';
}

function getImageDimensions(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || img.width || 0, height: img.naturalHeight || img.height || 0 });
    img.onerror = () => reject(new Error('Failed to read image dimensions'));
    img.src = src;
  });
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


