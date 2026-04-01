"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { FaCamera, FaKeyboard, FaSpinner } from "react-icons/fa";

interface Props {
  onScan: (token: string) => void;
  disabled?: boolean;
}

function extractToken(raw: string): string | null {
  try {
    const url = new URL(raw);
    const id = url.searchParams.get("id");
    return id ? decodeURIComponent(id) : null;
  } catch {
    if (raw.trim().length > 0) return raw.trim();
    return null;
  }
}

export function CameraScanner({ onScan, disabled }: Props) {
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [manualInput, setManualInput] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const foundRef = useRef(false);
  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; });

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
    foundRef.current = false;
  }, []);

  useEffect(() => {
    if (mode !== "camera" || disabled) return;
    foundRef.current = false;

    function tick() {
      if (foundRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) { rafRef.current = requestAnimationFrame(tick); return; }
      if (video.readyState < video.HAVE_ENOUGH_DATA) { rafRef.current = requestAnimationFrame(tick); return; }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      if (code?.data) {
        const token = extractToken(code.data);
        if (token) { foundRef.current = true; onScanRef.current(token); return; }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setTimeout(() => {
        setCameraError("Camera requires HTTPS. Use manual input instead.");
        setMode("manual");
      }, 0);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current!.play();
            setCameraReady(true);
            rafRef.current = requestAnimationFrame(tick);
          };
        }
      })
      .catch((err) => {
        console.error(err);
        setCameraError("Camera not available. Use manual input instead.");
        setMode("manual");
      });

    return () => stopCamera();
  }, [mode, disabled, stopCamera]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = extractToken(manualInput.trim());
    if (token) {
      onScan(token);
      setManualInput("");
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
      {/* Mode Toggle */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setMode("camera")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
            mode === "camera"
              ? "bg-[var(--maroon)] text-white"
              : "text-[var(--gray)] hover:bg-gray-50"
          }`}
        >
          <FaCamera />
          Camera Scan
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
            mode === "manual"
              ? "bg-[var(--maroon)] text-white"
              : "text-[var(--gray)] hover:bg-gray-50"
          }`}
        >
          <FaKeyboard />
          Manual Input
        </button>
      </div>

      <div className="p-5">
        {mode === "camera" && (
          <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-white gap-2 text-sm">
                <FaSpinner className="animate-spin" />
                Starting camera...
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm text-center px-6">
                {cameraError}
              </div>
            )}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
            {/* Scanner overlay */}
            {cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-52 h-52 border-2 border-white/70 rounded-2xl relative">
                  <span className="absolute -top-px -left-px w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl" />
                  <span className="absolute -top-px -right-px w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-2xl" />
                  <span className="absolute -bottom-px -left-px w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-2xl" />
                  <span className="absolute -bottom-px -right-px w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl" />
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {mode === "manual" && (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <p className="text-xs text-[var(--gray)]">
              Paste the attendee&apos;s QR link or token, or use a physical QR scanner.
            </p>
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Paste QR link or scan with physical scanner..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[var(--maroon)] transition-colors"
              autoFocus
              disabled={disabled}
            />
            <button
              type="submit"
              disabled={!manualInput.trim() || disabled}
              className="w-full bg-[var(--maroon)] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[var(--maroon-dark)] transition-colors disabled:opacity-40"
            >
              Verify Attendee
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
