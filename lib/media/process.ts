import { videoThumbnailPlaceholder } from "@/lib/media/utils";

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(String(e.target?.result ?? ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const bstr = atob(parts[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
  return new Blob([u8arr], { type: mime });
}

export function compressImage(
  dataUrl: string,
  maxWidth = 1920,
  quality = 0.9,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function generateThumbnail(
  imageUrl: string,
  maxWidth = 1080,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxWidth / img.width);
      const width = img.width * scale;
      const height = img.height * scale;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(imageUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}

export function generateVideoCover(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas unsupported"));
      return;
    }

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const maxWidth = 1080;
      const scale = Math.min(1, maxWidth / video.videoWidth);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      URL.revokeObjectURL(video.src);
      resolve(dataUrl);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Video load failed"));
    };

    video.src = URL.createObjectURL(file);
  });
}

export async function buildVideoThumbnail(file: File): Promise<string> {
  try {
    return await generateVideoCover(file);
  } catch {
    return videoThumbnailPlaceholder();
  }
}
