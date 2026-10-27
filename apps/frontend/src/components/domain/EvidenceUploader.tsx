import React, { useState } from 'react';

export interface EvidenceFile {
  id: string;
  name: string;
  size: number;
  sha256Checksum: string;
  uploadedAt: string;
}

export interface EvidenceUploaderProps {
  onFilesUploaded?: (files: EvidenceFile[]) => void;
}

export function EvidenceUploader({ onFilesUploaded }: EvidenceUploaderProps) {
  const [uploadedFiles, setUploadedFiles] = useState<EvidenceFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleSimulatedUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    // Simulate fast client-side SHA-256 hash calculation and upload
    setTimeout(() => {
      const newItems: EvidenceFile[] = Array.from(files).map((f) => ({
        id: crypto.randomUUID(),
        name: f.name,
        size: f.size,
        sha256Checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        uploadedAt: new Date().toISOString(),
      }));

      setUploadedFiles((prev) => [...prev, ...newItems]);
      onFilesUploaded?.(newItems);
      setIsUploading(false);
    }, 300);
  };

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Bóveda de Evidencias Criptográficas (SHA-256)
        </h4>
        <span className="text-[11px] text-emerald-400 font-mono">Inmutable</span>
      </div>

      <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-950/40">
        <span className="text-2xl mb-1">📸</span>
        <span className="text-xs font-medium text-slate-300">
          {isUploading ? 'Calculando hash y subiendo...' : 'Capturar foto o subir evidencia'}
        </span>
        <span className="text-[10px] text-slate-500 mt-0.5">JPG, PNG o MP3 (Máx. 25MB)</span>
        <input
          type="file"
          accept="image/*,audio/*"
          capture="environment"
          onChange={handleSimulatedUpload}
          className="hidden"
        />
      </label>

      {uploadedFiles.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {uploadedFiles.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between text-xs p-2 bg-slate-950 rounded border border-slate-800 font-mono"
            >
              <span className="text-slate-300 truncate max-w-[180px]">{f.name}</span>
              <span className="text-emerald-400 text-[10px]">
                SHA-256: {f.sha256Checksum.slice(0, 10)}...
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
