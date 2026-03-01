"use client";

import { useCallback, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

interface UploadedPhoto {
  id: string;
  storagePath: string;
  url: string;
  fileName: string;
  isDamagePhoto: boolean;
}

interface PhotoUploadProps {
  bucket: string;
  folder: string;
  minPhotos?: number;
  maxPhotos?: number;
  isDamageMode?: boolean;
  onPhotosChange: (photos: UploadedPhoto[]) => void;
}

export function PhotoUpload({
  bucket,
  folder,
  minPhotos = 1,
  maxPhotos = 10,
  isDamageMode = false,
  onPhotosChange,
}: PhotoUploadProps) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;

      if (photos.length + files.length > maxPhotos) {
        setError(`Máximo ${maxPhotos} fotos permitidas`);
        return;
      }

      setUploading(true);
      setError(null);
      const supabase = createClient();
      const newPhotos: UploadedPhoto[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          setError("Solo se permiten archivos de imagen");
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          setError("Tamaño máximo de archivo: 10MB");
          continue;
        }

        const fileExt = file.name.split(".").pop() ?? "jpg";
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, { upsert: false });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          setError(`Error al subir ${file.name}: ${uploadError.message}`);
          continue;
        }

        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);

        newPhotos.push({
          id: crypto.randomUUID(),
          storagePath: fileName,
          url: urlData.publicUrl,
          fileName: file.name,
          isDamagePhoto: isDamageMode,
        });
      }

      const updated = [...photos, ...newPhotos];
      setPhotos(updated);
      onPhotosChange(updated);
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [photos, maxPhotos, bucket, folder, isDamageMode, onPhotosChange],
  );

  const handleRemove = useCallback(
    async (photo: UploadedPhoto) => {
      const supabase = createClient();
      await supabase.storage.from(bucket).remove([photo.storagePath]);

      const updated = photos.filter((p) => p.id !== photo.id);
      setPhotos(updated);
      onPhotosChange(updated);
    },
    [photos, bucket, onPhotosChange],
  );

  const requiredLabel = isDamageMode
    ? `Mínimo ${minPhotos} fotos de daño requeridas`
    : `Mínimo ${minPhotos} foto(s) requerida(s)`;

  const isValid = photos.length >= minPhotos;

  return (
    <div className="space-y-3">
      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg border">
              <img
                src={photo.url}
                alt={photo.fileName}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(photo)}
                className="absolute top-1 right-1 hidden rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white group-hover:block"
              >
                ✕
              </button>
              {photo.isDamagePhoto && (
                <span className="absolute bottom-1 left-1 rounded bg-red-600 px-1 py-0.5 text-[10px] text-white">
                  Daño
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {photos.length < maxPhotos && (
        <label
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition-colors ${
            uploading ? "border-gray-200 bg-gray-50" : "border-gray-300 bg-gray-50 hover:border-gray-400"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={(e) => handleUpload(e.target.files)}
            disabled={uploading}
            className="hidden"
          />
          <div className="text-center text-sm text-gray-500">
            {uploading ? (
              <p>Subiendo...</p>
            ) : (
              <>
                <p className="font-medium">Toque para tomar foto o seleccionar</p>
                <p className="text-xs text-gray-400">JPG, PNG hasta 10MB</p>
              </>
            )}
          </div>
        </label>
      )}

      {/* Status */}
      <div className="flex items-center justify-between text-xs">
        <span className={isValid ? "text-green-600" : "text-gray-400"}>
          {photos.length} de {minPhotos}+ foto(s) • {requiredLabel}
        </span>
        {photos.length >= maxPhotos && (
          <span className="text-orange-500">Límite alcanzado</span>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

export type { UploadedPhoto };
