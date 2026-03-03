"use client";

import { useCallback, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

interface UploadedFile {
  id: string;
  storagePath: string;
  url: string;
  fileName: string;
}

interface FileUploadProps {
  bucket: string;
  folder: string;
  accept?: string;
  maxFiles?: number;
  maxSizeMB?: number;
  onFilesChange: (files: UploadedFile[]) => void;
}

export function FileUpload({
  bucket,
  folder,
  accept = ".pdf,image/*",
  maxFiles = 5,
  maxSizeMB = 15,
  onFilesChange,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) return;

      if (files.length + fileList.length > maxFiles) {
        setError(`Maximo ${maxFiles} archivos permitidos`);
        return;
      }

      setUploading(true);
      setError(null);
      const supabase = createClient();
      const newFiles: UploadedFile[] = [];

      for (const file of Array.from(fileList)) {
        if (file.size > maxSizeMB * 1024 * 1024) {
          setError(`Tamano maximo de archivo: ${maxSizeMB}MB`);
          continue;
        }

        const fileExt = file.name.split(".").pop() ?? "pdf";
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, { upsert: false });

        if (uploadError) {
          setError(`Error al subir ${file.name}: ${uploadError.message}`);
          continue;
        }

        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);

        newFiles.push({
          id: crypto.randomUUID(),
          storagePath: fileName,
          url: urlData.publicUrl,
          fileName: file.name,
        });
      }

      const updated = [...files, ...newFiles];
      setFiles(updated);
      onFilesChange(updated);
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [files, maxFiles, maxSizeMB, bucket, folder, onFilesChange],
  );

  const handleRemove = useCallback(
    async (file: UploadedFile) => {
      const supabase = createClient();
      await supabase.storage.from(bucket).remove([file.storagePath]);

      const updated = files.filter((f) => f.id !== file.id);
      setFiles(updated);
      onFilesChange(updated);
    },
    [files, bucket, onFilesChange],
  );

  return (
    <div className="space-y-2">
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((file) => (
            <li key={file.id} className="flex items-center justify-between rounded border bg-gray-50 px-3 py-1.5 text-sm">
              <span className="truncate text-gray-700">{file.fileName}</span>
              <button
                type="button"
                onClick={() => handleRemove(file)}
                className="ml-2 shrink-0 text-xs text-red-500 hover:text-red-700"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}

      {files.length < maxFiles && (
        <label className={`flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed px-4 py-4 text-sm transition-colors ${
          uploading ? "border-gray-200 bg-gray-50" : "border-gray-300 bg-gray-50 hover:border-gray-400"
        }`}>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={(e) => handleUpload(e.target.files)}
            disabled={uploading}
            className="hidden"
          />
          <span className="text-gray-500">
            {uploading ? "Subiendo..." : "Seleccionar archivo"}
          </span>
        </label>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export type { UploadedFile };
