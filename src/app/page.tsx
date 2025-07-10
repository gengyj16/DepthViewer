
"use client";

import React, { useState } from 'react';
import { ImageUploader } from '@/components/image-uploader';
import { DepthViewer3D } from '@/components/depth-viewer-3d';
import { DepthViewerLogo } from '@/components/icons/depth-viewer-logo';
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage() {
  const [colorImageFile, setColorImageFile] = useState<File | null>(null);
  const [depthMapFile, setDepthMapFile] = useState<File | null>(null);
  const [areImagesReady, setAreImagesReady] = useState(false);
  const [uploaderKey, setUploaderKey] = useState(0);

  const handleImagesReady = (colorFile: File, depthFile: File) => {
    setColorImageFile(colorFile);
    setDepthMapFile(depthFile);
    setAreImagesReady(true);
  };

  const handleReset = () => {
    setColorImageFile(null);
    setDepthMapFile(null);
    setAreImagesReady(false);
    setUploaderKey(prevKey => prevKey + 1); // Reset the uploader component
  };


  return (
    <div className="flex flex-col min-h-screen items-center p-4 md:p-8 bg-background transition-all duration-300 ease-in-out">
      <header className="w-full max-w-6xl mb-8 text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start space-x-3 mb-2">
          <DepthViewerLogo className="h-10 w-auto" />
          <h1 className="text-4xl font-headline font-bold text-primary">
            DepthViewer
          </h1>
        </div>
        <p className="text-lg text-muted-foreground font-body">
          Experience your 2D images in 3D. Upload an image and its depth map, or let us generate one for you.
        </p>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <ImageUploader key={uploaderKey} onImagesReady={handleImagesReady} onReset={handleReset}/>
        </div>
        <div className="md:col-span-2 flex items-center justify-center">
          {areImagesReady && colorImageFile && depthMapFile ? (
            <DepthViewer3D
              colorImageFile={colorImageFile}
              depthMapFile={depthMapFile}
            />
          ) : (
            <Card className="w-full min-h-[300px] md:min-h-[400px] lg:min-h-[500px] flex items-center justify-center border-dashed">
              <CardContent className="text-center p-6">
                <div className="mx-auto h-24 w-24 mb-4" data-ai-hint="3d cube perspective">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="hsl(var(--muted-foreground))" className="w-full h-full opacity-50">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                  </svg>
                </div>
                <p className="text-muted-foreground">Your 3D view will appear here once images are uploaded.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <footer className="w-full max-w-6xl mt-12 pt-8 border-t text-center">
        <p className="text-sm text-muted-foreground">
          Built with Next.js, THREE.js, and ShadCN UI.
        </p>
      </footer>
    </div>
  );
}
