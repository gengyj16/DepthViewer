
"use client";

import React, { useState, useCallback, ChangeEvent, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, XCircle, Wand2, Loader2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { generateDepthMap } from '@/lib/depth-generator';

interface ImageUploaderProps {
  onImagesReady: (colorImageFile: File, depthMapFile: File) => void;
  onReset: () => void;
}

const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];

declare const ort: any; // Using script tag for onnxruntime

export function ImageUploader({ onImagesReady, onReset }: ImageUploaderProps) {
  const [colorImageFile, setColorImageFile] = useState<File | null>(null);
  const [depthMapFile, setDepthMapFile] = useState<File | null>(null);
  const [colorImagePreview, setColorImagePreview] = useState<string | null>(null);
  const [depthMapPreview, setDepthMapPreview] = useState<string | null>(null);
  const [generateMode, setGenerateMode] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { toast } = useToast();

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
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
        setColorImageFile(file);
        setColorImagePreview(previewUrl);

        if (generateMode) {
          handleGenerateDepthMap(file);
        }
      }
    },
    [toast, generateMode]
  );
  
  const handleDepthFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
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
        setDepthMapFile(file);
        setDepthMapPreview(previewUrl);
      }
    },
    [toast]
  );

  const handleGenerateDepthMap = async (file: File) => {
    if (!file) return;
    setIsGenerating(true);
    setDepthMapFile(null);
    setDepthMapPreview(null);
    try {
      const depthMapBlob = await generateDepthMap(URL.createObjectURL(file));
      const depthFile = new File([depthMapBlob], 'depth-map.png', { type: 'image/png' });
      setDepthMapFile(depthFile);
      setDepthMapPreview(URL.createObjectURL(depthFile));
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Depth Map Generation Failed",
        description: "Could not generate depth map. Please try another image or upload one manually.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const removeImage = (type: 'color' | 'depth') => {
    if (type === 'color') {
      if (colorImagePreview) URL.revokeObjectURL(colorImagePreview);
      setColorImageFile(null);
      setColorImagePreview(null);
      // If we remove the color image, we should also remove the generated depth map
      if (generateMode) {
        removeImage('depth');
      }
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

  const renderColorInput = () => (
    <div className="space-y-2">
      <Label htmlFor="color-image-upload" className="text-sm font-medium">Color Image</Label>
      {colorImagePreview && colorImageFile ? (
        <div className="relative group w-full h-48 rounded-md overflow-hidden border border-muted">
          <Image src={colorImagePreview} alt="Color Image preview" fill className="object-contain" data-ai-hint="texture pattern" />
        </div>
      ) : (
        <div className="flex items-center justify-center w-full">
          <Label
            htmlFor="color-image-upload"
            className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold">Click to upload</span>
              </p>
              <p className="text-xs text-muted-foreground">PNG, JPG, GIF</p>
            </div>
            <Input id="color-image-upload" type="file" className="hidden" onChange={handleFileChange} accept={acceptedImageTypes.join(',')} />
          </Label>
        </div>
      )}
    </div>
  );

  const renderDepthInput = () => (
    <div className="space-y-2">
       <Label htmlFor="depth-map-upload" className="text-sm font-medium">Depth Map (Grayscale)</Label>
      {depthMapPreview && depthMapFile ? (
        <div className="relative group w-full h-48 rounded-md overflow-hidden border border-muted">
          <Image src={depthMapPreview} alt="Depth map preview" fill className="object-contain" data-ai-hint="abstract monochrome" />
           {!generateMode && <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-background/70 hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => removeImage('depth')}
            aria-label="Remove Depth Map"
          >
            <XCircle className="h-5 w-5" />
          </Button>}
        </div>
      ) : (
         <div className="flex items-center justify-center w-full">
            <Label
              htmlFor={generateMode ? '' : 'depth-map-upload'}
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                {isGenerating ? (
                    <>
                        <Loader2 className="w-10 h-10 mb-3 text-muted-foreground animate-spin" />
                        <p className="text-sm text-muted-foreground">Generating depth map...</p>
                    </>
                ) : generateMode ? (
                  <>
                    <Wand2 className="w-10 h-10 mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Depth map will be generated here.</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span>
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, GIF</p>
                  </>
                )}
              </div>
              {!generateMode && <Input id="depth-map-upload" type="file" className="hidden" onChange={handleDepthFileChange} accept={acceptedImageTypes.join(',')} />}
            </Label>
        </div>
      )}
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Images</CardTitle>
        <CardDescription>
          { generateMode 
            ? "Upload a color image to automatically generate a depth map."
            : "Select a color image and its corresponding grayscale depth map."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Wand2 className="h-5 w-5 text-primary" />
              <Label htmlFor="generate-mode" className="font-medium">Generate Depth Map</Label>
            </div>
            <Switch
                id="generate-mode"
                checked={generateMode}
                onCheckedChange={(checked) => {
                    setGenerateMode(checked);
                    if (checked && colorImageFile) {
                        handleGenerateDepthMap(colorImageFile);
                    } else {
                        setDepthMapFile(null);
                        setDepthMapPreview(null);
                    }
                }}
            />
        </div>

        {renderColorInput()}
        {renderDepthInput()}
      </CardContent>
       <CardFooter className="flex justify-end">
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
      </CardFooter>
      <canvas id="depth" className="hidden"></canvas>
    </Card>
  );
}
