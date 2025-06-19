
"use client";

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Loader2 } from 'lucide-react';

interface DepthViewer3DProps {
  colorImageFile: File | null;
  depthMapFile: File | null;
}

const MAX_VIEW_ANGLE = 0.4; // Radians, limits up/down and left/right rotation
const DISPLACEMENT_SCALE = 50; // Adjust for more or less depth effect
const PLANE_SEGMENTS = 100; // More segments = smoother depth, but more performance cost

export function DepthViewer3D({ colorImageFile, depthMapFile }: DepthViewer3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!colorImageFile || !depthMapFile || !mountRef.current) {
      // Clear canvas if files are removed
      if (mountRef.current) {
        while (mountRef.current.firstChild) {
          mountRef.current.removeChild(mountRef.current.firstChild);
        }
      }
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    let animationFrameId: number;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false; // Usually, only rotation is desired for this effect
    controls.minPolarAngle = Math.PI / 2 - MAX_VIEW_ANGLE;
    controls.maxPolarAngle = Math.PI / 2 + MAX_VIEW_ANGLE;
    controls.minAzimuthAngle = -MAX_VIEW_ANGLE;
    controls.maxAzimuthAngle = MAX_VIEW_ANGLE;
    controls.minDistance = 200;
    controls.maxDistance = 600;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    
    camera.position.z = 300;

    let planeMesh: THREE.Mesh | null = null;

    const loadImagesAndCreateMesh = async () => {
      try {
        const colorTexture = await new THREE.TextureLoader().loadAsync(URL.createObjectURL(colorImageFile));
        colorTexture.colorSpace = THREE.SRGBColorSpace;
        
        // For blurred background
        const blurredBgCanvas = document.createElement('canvas');
        const blurredCtx = blurredBgCanvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          blurredBgCanvas.width = img.width / 4; // Smaller canvas for blur performance
          blurredBgCanvas.height = img.height / 4;
          if (blurredCtx) {
            blurredCtx.filter = 'blur(10px)';
            blurredCtx.drawImage(img, 0, 0, blurredBgCanvas.width, blurredBgCanvas.height);
            const blurredTexture = new THREE.CanvasTexture(blurredBgCanvas);
            blurredTexture.colorSpace = THREE.SRGBColorSpace;
            scene.background = blurredTexture;
          }
          URL.revokeObjectURL(img.src); 
        };
        img.src = URL.createObjectURL(colorImageFile);


        const depthImage = new Image();
        depthImage.src = URL.createObjectURL(depthMapFile);
        await new Promise((resolve, reject) => {
          depthImage.onload = resolve;
          depthImage.onerror = reject;
        });

        const depthCanvas = document.createElement('canvas');
        depthCanvas.width = depthImage.width;
        depthCanvas.height = depthImage.height;
        const depthCtx = depthCanvas.getContext('2d', { willReadFrequently: true });
        if (!depthCtx) throw new Error("Could not get 2D context for depth map");
        depthCtx.drawImage(depthImage, 0, 0);
        const depthData = depthCtx.getImageData(0, 0, depthImage.width, depthImage.height);
        
        URL.revokeObjectURL(depthImage.src);

        const planeWidth = colorTexture.image.width * 0.5; 
        const planeHeight = colorTexture.image.height * 0.5;
        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, PLANE_SEGMENTS, PLANE_SEGMENTS);
        const positions = geometry.attributes.position;

        for (let i = 0; i < positions.count; i++) {
          const u = (positions.getX(i) / planeWidth + 0.5);
          const v = 1 - (positions.getY(i) / planeHeight + 0.5); // THREE.js UVs are bottom-left, images top-left

          const x = Math.floor(u * depthImage.width);
          const y = Math.floor(v * depthImage.height);
          
          if (x >= 0 && x < depthImage.width && y >= 0 && y < depthImage.height) {
            const pixelIndex = (y * depthImage.width + x) * 4;
            const grayscaleValue = depthData.data[pixelIndex] / 255.0; // Assuming R channel for grayscale
            const displacement = (grayscaleValue - 0.5) * DISPLACEMENT_SCALE;
            positions.setZ(i, displacement);
          }
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals(); // Important for lighting if used

        const material = new THREE.MeshBasicMaterial({ map: colorTexture, side: THREE.DoubleSide });
        // const material = new THREE.MeshStandardMaterial({ map: colorTexture, side: THREE.DoubleSide, metalness: 0.1, roughness: 0.8 });
        // if using MeshStandardMaterial, add lights:
        // const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        // scene.add(ambientLight);
        // const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        // directionalLight.position.set(5, 5, 5);
        // scene.add(directionalLight);


        if (planeMesh) scene.remove(planeMesh);
        planeMesh = new THREE.Mesh(geometry, material);
        scene.add(planeMesh);
        
        setIsLoading(false);

      } catch (e) {
        console.error("Error loading images or creating mesh:", e);
        setError("Failed to process images. Please try again with valid image files.");
        setIsLoading(false);
      }
    };

    loadImagesAndCreateMesh();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update(); // Required if autoRotate is enabled or damping is used
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (mountRef.current) {
        camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      if (planeMesh) {
        planeMesh.geometry.dispose();
        if (Array.isArray(planeMesh.material)) {
            planeMesh.material.forEach(m => m.dispose());
        } else {
            planeMesh.material.dispose();
        }
        if ((planeMesh.material as THREE.MeshBasicMaterial).map) {
            ((planeMesh.material as THREE.MeshBasicMaterial).map as THREE.Texture).dispose();
        }
      }
      if (scene.background instanceof THREE.Texture) {
        scene.background.dispose();
      }
      // Clean up the DOM element
      if (mountRef.current) {
        while (mountRef.current.firstChild) {
          mountRef.current.removeChild(mountRef.current.firstChild);
        }
      }
    };
  }, [colorImageFile, depthMapFile]);

  return (
    <div className="relative w-full min-h-[300px] md:min-h-[400px] lg:min-h-[500px] rounded-lg overflow-hidden border bg-card shadow-sm aspect-video">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Generating 3D view...</p>
        </div>
      )}
      {error && !isLoading && (
         <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10 p-4">
          <p className="text-destructive text-center">{error}</p>
        </div>
      )}
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
