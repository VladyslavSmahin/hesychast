"use client";

// Знімає перший кадр відео у браузері — обкладинка для картки, щоб сторінка
// не вантажила саме відео заради превʼю.

export async function videoPosterFile(file: File): Promise<File | null> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("video_load_failed"));
      // перший кадр (0 інколи ще порожній)
      video.currentTime = 0.1;
      setTimeout(() => reject(new Error("video_timeout")), 8000);
    });

    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 800 / Math.max(video.videoWidth, video.videoHeight || 1));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx || !canvas.width || !canvas.height) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.82));
    return blob ? new File([blob], "poster.webp", { type: "image/webp" }) : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
