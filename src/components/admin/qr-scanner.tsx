"use client";

import { useEffect, useRef, useState } from "react";
import { CameraOff, Loader2 } from "lucide-react";

interface Props {
  onScan: (token: string) => void;
  isProcessing: boolean;
}

export default function QrScannerComponent({ onScan, isProcessing }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animFrame: number;
    let BarcodeDetectorClass: typeof BarcodeDetector | null = null;

    async function start() {
      try {
        // Try native BarcodeDetector API first (Chrome/Edge)
        if ("BarcodeDetector" in window) {
          const supported = await (window.BarcodeDetector as typeof BarcodeDetector).getSupportedFormats();
          if (supported.includes("qr_code")) {
            BarcodeDetectorClass = window.BarcodeDetector as typeof BarcodeDetector;
          }
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsReady(true);
        }

        if (BarcodeDetectorClass) {
          const detector = new BarcodeDetectorClass({ formats: ["qr_code"] });
          const scan = async () => {
            if (videoRef.current && videoRef.current.readyState === 4 && !isProcessing) {
              try {
                const codes = await detector.detect(videoRef.current);
                if (codes.length > 0) onScan(codes[0].rawValue);
              } catch { /* frame error — skip */ }
            }
            animFrame = requestAnimationFrame(scan);
          };
          animFrame = requestAnimationFrame(scan);
        }
      } catch {
        setHasError(true);
      }
    }

    start();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-zinc-900 rounded-xl border border-zinc-800 text-center p-6">
        <CameraOff className="h-10 w-10 text-zinc-600 mb-3" />
        <p className="text-zinc-400 font-medium">Camera access denied</p>
        <p className="text-zinc-600 text-sm mt-1">Allow camera permissions or use manual entry.</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10">
          <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
        </div>
      )}
      <video ref={videoRef} muted playsInline className="w-full h-64 object-cover" />
      {/* Scan overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-48 h-48 border-2 border-emerald-400/70 rounded-lg relative">
          <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl" />
          <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr" />
          <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl" />
          <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br" />
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
            </div>
          )}
        </div>
      </div>
      <div className="absolute bottom-3 inset-x-0 text-center">
        <span className="text-xs text-zinc-400 bg-black/50 px-3 py-1 rounded-full">
          {isProcessing ? "Processing..." : "Point camera at QR code"}
        </span>
      </div>
    </div>
  );
}
