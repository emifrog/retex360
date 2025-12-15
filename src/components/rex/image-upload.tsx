'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Upload, X, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  url: string;
}

interface ImageUploadProps {
  rexId?: string;
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

export function ImageUpload({
  rexId,
  files,
  onFilesChange,
  maxFiles = 10,
  maxSizeMB = 5,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = useCallback(async (fileList: FileList) => {
    if (files.length >= maxFiles) {
      toast.error(`Maximum ${maxFiles} fichiers autorisés`);
      return;
    }

    const filesToUpload = Array.from(fileList).slice(0, maxFiles - files.length);
    
    for (const file of filesToUpload) {
      // Validate type
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`Type non supporté: ${file.name}`);
        continue;
      }

      // Validate size
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`${file.name} dépasse ${maxSizeMB} Mo`);
        continue;
      }

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);
        if (rexId) {
          formData.append('rexId', rexId);
        }

        const response = await fetch('/api/rex/attachments', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Erreur lors de l\'upload');
        }

        const uploadedFile = await response.json();
        onFilesChange([...files, uploadedFile]);
        toast.success(`${file.name} uploadé`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'upload');
      }
    }

    setIsUploading(false);
  }, [files, maxFiles, maxSizeMB, onFilesChange, rexId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      handleUpload(e.dataTransfer.files);
    }
  }, [handleUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleRemove = async (fileToRemove: UploadedFile) => {
    try {
      const response = await fetch(`/api/rex/attachments/${fileToRemove.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      onFilesChange(files.filter((f) => f.id !== fileToRemove.id));
      toast.success('Fichier supprimé');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (type: string) => type.startsWith('image/');

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50',
          isUploading && 'opacity-50 pointer-events-none'
        )}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
          disabled={isUploading}
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          {isUploading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-muted-foreground" />
          )}
          <div>
            <span className="text-primary font-medium">Cliquez pour uploader</span>
            <span className="text-muted-foreground"> ou glissez-déposez</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Images (JPG, PNG, GIF, WebP) ou PDF • Max {maxSizeMB} Mo par fichier
          </p>
        </label>
      </div>

      {/* Uploaded Files */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {files.map((file) => (
            <Card
              key={file.id}
              className="relative group overflow-hidden bg-muted/50"
            >
              {isImage(file.file_type) ? (
                <div className="aspect-square relative">
                  <Image
                    src={file.url}
                    alt={file.file_name}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="aspect-square flex flex-col items-center justify-center gap-2 p-4">
                  <FileText className="w-10 h-10 text-muted-foreground" />
                  <span className="text-xs text-center text-muted-foreground truncate w-full">
                    {file.file_name}
                  </span>
                </div>
              )}
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                <p className="text-xs text-white text-center truncate w-full">
                  {file.file_name}
                </p>
                <p className="text-xs text-white/70">
                  {formatFileSize(file.file_size)}
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemove(file)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Supprimer
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Counter */}
      <p className="text-xs text-muted-foreground text-right">
        {files.length} / {maxFiles} fichiers
      </p>
    </div>
  );
}
