'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchWindowPhotos,
  uploadWindowPhoto,
  deleteWindowPhoto,
  updateWindowPhotoCompanyCamId,
  type WindowPhoto,
} from '@/lib/supabase';
import { useAuthContext } from '@/components/AuthProvider';

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.8;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB — compress anything larger

function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    // Skip non-image or already-small files
    if (!file.type.startsWith('image/') || file.size <= MAX_FILE_SIZE) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down if either dimension exceeds max
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // fallback to original
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressed = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: file.lastModified,
          });
          resolve(compressed);
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = url;
  });
}

interface Props {
  windowId: string;
  jobId: string;
  companycamProjectId?: string | null;
}

export default function PhotoCapture({ windowId, jobId, companycamProjectId }: Props) {
  const { user } = useAuthContext();
  const [photos, setPhotos] = useState<WindowPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPhotos = useCallback(async () => {
    try {
      const data = await fetchWindowPhotos(windowId);
      setPhotos(data);
    } catch (err) {
      console.error('Failed to load photos:', err);
    } finally {
      setLoadingPhotos(false);
    }
  }, [windowId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const pushToCompanyCam = async (photo: WindowPhoto) => {
    if (!companycamProjectId) return;

    try {
      const res = await fetch(`/api/companycam/projects/${companycamProjectId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uri: photo.public_url,
          captured_at: Math.floor(new Date(photo.captured_at).getTime() / 1000),
          tags: ['window-measurement'],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data?.id) {
          await updateWindowPhotoCompanyCamId(photo.id, String(data.data.id));
        }
      } else {
        const errData = await res.json().catch(() => null);
        console.error('Failed to push photo to CompanyCam:', errData);
        setError('Photo saved but failed to sync to CompanyCam');
      }
    } catch (err) {
      console.error('CompanyCam push error:', err);
      setError('Photo saved but failed to sync to CompanyCam');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Reset the input so the same file can be selected again
    e.target.value = '';

    setUploading(true);
    setError(null);

    try {
      // Compress large images before upload to prevent "Load failed" on mobile
      const compressed = await compressImage(file);

      const photo = await uploadWindowPhoto(windowId, jobId, compressed, user.id);

      // Push to CompanyCam if linked
      if (companycamProjectId) {
        await pushToCompanyCam(photo);
      }

      await loadPhotos();
    } catch (err) {
      console.error('Upload error:', err);
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes('load failed') || message.toLowerCase().includes('failed to fetch')) {
        setError('Upload failed — photo may be too large. Please try again.');
      } else {
        setError(message || 'Failed to upload photo');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm('Delete this photo?')) return;

    try {
      await deleteWindowPhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete photo');
    }
  };

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-500">
          Photos {photos.length > 0 && `(${photos.length})`}
        </h3>
        {companycamProjectId && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            CompanyCam linked
          </span>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-2">{error}</p>
      )}

      {/* Photo thumbnails */}
      {photos.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
              <img
                src={photo.public_url}
                alt={photo.description || 'Window photo'}
                className="w-full h-full object-cover"
              />
              {photo.companycam_photo_id && (
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <button
                onClick={() => handleDelete(photo.id)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {loadingPhotos && photos.length === 0 && (
        <div className="text-xs text-gray-400 mb-2">Loading photos...</div>
      )}

      {/* Capture/upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50 w-full justify-center"
      >
        {uploading ? (
          <>
            <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Take Photo
          </>
        )}
      </button>
    </div>
  );
}
