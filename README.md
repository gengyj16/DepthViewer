# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## 项目说明

本项目由 Google Firebase Studio 生成。核心逻辑来自 https://github.com/akbartus/DepthAnything-on-Browser ，通过在浏览器本地运行的 DepthAnythingV2 模型为2D照片生成深度信息，并进一步使用 three.js 渲染为可交互的3D场景。首次生成深度图时会从 https://cdn.glitch.me/0f5359e2-6022-421b-88f7-13e276d0fb33/depthanythingv2-vits-dynamic-quant.onnx 下载~25M的模型文件，后续生成过程在浏览器本地进行。
