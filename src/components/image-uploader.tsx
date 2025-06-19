"use client";

import React, { useState, useCallback, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  onImagesReady: (colorImageFile: File, depthMapFile: File) => void;
}

const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];

export function ImageUploader({ onImagesReady }: ImageUploaderProps) {
  const [colorImageFile, setColorImageFile] = useState<File | null>(null);
  const [depthMapFile, setDepthMapFile] = useState<File | null>(null);
  const [colorImagePreview, setColorImagePreview] = useState<string | null>(null);
  const [depthMapPreview, setDepthMapPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>, type: 'color' | 'depth') => {
      const file = event.target.files?.[0];
      if (file) {
        if (!acceptedImageTypes.includes(file.type)) {
          toast({
            variant: "destructive",
            title: "Invalid File Type",
            description: `Please upload a valid image file (${acceptedImageTypes.join(', ')}).`,
          });
          return;
        }
        const previewUrl = URL.createObjectURL(file);
        if (type === 'color') {
          setColorImageFile(file);
          setColorImagePreview(previewUrl);
        } else {
          setDepthMapFile(file);
          setDepthMapPreview(previewUrl);
        }
      }
    },
    [toast]
  );

  const removeImage = (type: 'color' | 'depth') => {
    if (type === 'color') {
      if (colorImagePreview) URL.revokeObjectURL(colorImagePreview);
      setColorImageFile(null);
      setColorImagePreview(null);
    } else {
      if (depthMapPreview) URL.revokeObjectURL(depthMapPreview);
      setDepthMapFile(null);
      setDepthMapPreview(null);
    }
  };

  useEffect(() => {
    if (colorImageFile && depthMapFile) {
      onImagesReady(colorImageFile, depthMapFile);
    }
  }, [colorImageFile, depthMapFile, onImagesReady]);
  
  // Cleanup object URLs on component unmount
  useEffect(() => {
    return () => {
      if (colorImagePreview) URL.revokeObjectURL(colorImagePreview);
      if (depthMapPreview) URL.revokeObjectURL(depthMapPreview);
    };
  }, [colorImagePreview, depthMapPreview]);

  const renderFileInput = (
    id: string,
    label: string,
    file: File | null,
    preview: string | null,
    onChangeType: 'color' | 'depth',
    hint: string
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      {preview && file ? (
        <div className="relative group w-full h-48 rounded-md overflow-hidden border border-muted">
          <Image src={preview} alt={`${label} preview`} layout="fill" objectFit="contain" data-ai-hint={hint} />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-background/70 hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => removeImage(onChangeType)}
            aria-label={`Remove ${label}`}
          >
            <XCircle className="h-5 w-5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-center w-full">
          <Label
            htmlFor={id}
            className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">PNG, JPG, GIF</p>
            </div>
            <Input id={id} type="file" className="hidden" onChange={(e) => handleFileChange(e, onChangeType)} accept={acceptedImageTypes.join(',')} />
          </Label>
        </div>
      )}
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Images</CardTitle>
        <CardDescription>Select a color image and its corresponding grayscale depth map.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderFileInput('color-image-upload', 'Color Image', colorImageFile, colorImagePreview, 'color', 'texture pattern')}
        {renderFileInput('depth-map-upload', 'Depth Map (Grayscale)', depthMapFile, depthMapPreview, 'depth', 'abstract monochrome')}
      </CardContent>
    </Card>
  );
}
