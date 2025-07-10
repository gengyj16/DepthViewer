
"use client"

// This is a browser-only utility.
// Ensure onnxruntime-web is loaded via a <script> tag before this is called.
declare const ort: any;

const MODEL_INPUT_SIZE = 1036;
const MODEL_URL = "https://cdn.glitch.me/0f5359e2-6022-421b-88f7-13e276d0fb33/depthanythingv2-vits-dynamic-quant.onnx";

let session: any = null;

async function getSession() {
  if (typeof window === 'undefined') {
    throw new Error('Depth generation can only run in the browser.');
  }
  if (!ort) {
    throw new Error('ONNX Runtime is not available. Ensure it is loaded.');
  }
  if (session === null) {
      const options = {
        executionProviders: ['webgpu', 'wasm'],
        logSeverityLevel: 3
      };
      session = await ort.InferenceSession.create(MODEL_URL, options);
  }
  return session;
}

function preprocess(ctx: CanvasRenderingContext2D, width: number, height: number): Float32Array {
    const imageData = ctx.getImageData(0, 0, width, height);
    const { data } = imageData;
    const C = 3;
    const H = height;
    const W = width;
    const N = 1;
    const nchwData = new Float32Array(N * C * H * W);

    for (let h = 0; h < H; h++) {
        for (let w = 0; w < W; w++) {
            const i = (h * W + w) * 4;
            const r = data[i] / 255.0;
            const g = data[i + 1] / 255.0;
            const b = data[i + 2] / 255.0;

            nchwData[h * W + w] = r; // R channel
            nchwData[H * W + h * W + w] = g; // G channel
            nchwData[2 * H * W + h * W + w] = b; // B channel
        }
    }
    return nchwData;
}

function postprocess(output: any): ImageData {
    const { data: outputData, dims } = output;
    const [_, height, width] = dims;

    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < outputData.length; i++) {
        if (outputData[i] < min) min = outputData[i];
        if (outputData[i] > max) max = outputData[i];
    }
    const range = max - min;
    
    const imageData = new ImageData(width, height);
    const { data: pixelData } = imageData;

    for (let i = 0; i < outputData.length; i++) {
        const normalized = 255 * ((outputData[i] - min) / range);
        const j = i * 4;
        pixelData[j] = normalized;     // R
        pixelData[j + 1] = normalized; // G
        pixelData[j + 2] = normalized; // B
        pixelData[j + 3] = 255;        // Alpha
    }
    return imageData;
}


export async function generateDepthMap(imageSrc: string): Promise<Blob> {
    const myOrtSession = await getSession();

    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = imageSrc;
        
        image.onload = async function () {
            const originalWidth = image.naturalWidth;
            const originalHeight = image.naturalHeight;

            const canvas = document.createElement('canvas');
            canvas.width = MODEL_INPUT_SIZE;
            canvas.height = MODEL_INPUT_SIZE;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            
            if (!ctx) return reject(new Error("Could not get canvas context"));

            ctx.drawImage(image, 0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
            const preprocessedData = preprocess(ctx, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
            const inputTensor = new ort.Tensor(preprocessedData, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]);

            try {
                const result = await myOrtSession.run({ image: inputTensor });
                const outputTensor = result.depth;
                const postprocessedImageData = postprocess(outputTensor);
                
                // Draw to final canvas with original dimensions
                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = originalWidth;
                finalCanvas.height = originalHeight;
                const finalCtx = finalCanvas.getContext('2d');

                if (!finalCtx) return reject(new Error("Could not get final canvas context"));

                // Create a temporary canvas for the processed data to resize it
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = postprocessedImageData.width;
                tempCanvas.height = postprocessedImageData.height;
                const tempCtx = tempCanvas.getContext('2d');
                if (!tempCtx) return reject(new Error("Could not get temp canvas context"));

                tempCtx.putImageData(postprocessedImageData, 0, 0);

                // Draw from temp canvas to final canvas, resizing it back to original image dimensions
                finalCtx.drawImage(tempCanvas, 0, 0, originalWidth, originalHeight);

                finalCanvas.toBlob(blob => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Canvas to Blob conversion failed"));
                    }
                }, 'image/png');

            } catch (e) {
                console.error("ONNX model execution failed:", e);
                reject(e);
            }
        };

        image.onerror = function () {
            reject(new Error("Failed to load image for depth map generation."));
        };
    });
}
