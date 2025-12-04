'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Image, 
  Video, 
  File, 
  Download, 
  Eye,
  Loader2,
  Paperclip
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  created_at: string;
}

interface AttachmentsListProps {
  attachments: Attachment[];
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return Image;
  if (fileType.startsWith('video/')) return Video;
  if (fileType.includes('pdf')) return FileText;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export function AttachmentsList({ attachments }: AttachmentsListProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (attachment: Attachment) => {
    setDownloading(attachment.id);
    try {
      const response = await fetch(attachment.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setDownloading(null);
    }
  };

  const handlePreview = (attachment: Attachment) => {
    window.open(attachment.file_url, '_blank');
  };

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Paperclip className="w-5 h-5 text-primary" />
          Pièces jointes ({attachments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.file_type);
            const isImage = attachment.file_type.startsWith('image/');
            const isPdf = attachment.file_type.includes('pdf');
            const canPreview = isImage || isPdf;

            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileIcon className="w-5 h-5 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{attachment.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.file_size)} • 
                    Ajouté {formatDistanceToNow(new Date(attachment.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {canPreview && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreview(attachment)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(attachment)}
                    disabled={downloading === attachment.id}
                  >
                    {downloading === attachment.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-1" />
                        Télécharger
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
