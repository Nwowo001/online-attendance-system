"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { IAttendance } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { savePendingCheckin, getPendingCheckins, markCheckinSynced } from "@/lib/idb";

const getOrCreateDeviceId = () => {
  if (typeof window === "undefined") return "unknown";
  let id = localStorage.getItem("student_device_id");
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem("student_device_id", id);
  }
  return id;
};

const getCoordinates = async (): Promise<{ lat: number; lng: number } | undefined> => {
  if (typeof window === "undefined" || !navigator.geolocation) return undefined;
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
      });
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return undefined;
  }
};

const tokenSchema = z.object({
  token: z.string().min(6, "Token must be at least 6 characters").max(12),
});
type TokenForm = z.infer<typeof tokenSchema>;

interface AttendanceStat {
  courseId: string;
  total: number;
  attended: number;
  percentage: number;
}

export default function StudentAttendancePage() {
  const [attendance, setAttendance] = useState<IAttendance[]>([]);
  const [stats, setStats] = useState<AttendanceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkinMode, setCheckinMode] = useState<"token" | "qr">("token");
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TokenForm>({ resolver: zodResolver(tokenSchema) });

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports");
      const json = await res.json();
      if (json.success) {
        setAttendance(json.data.attendance ?? []);
        setStats(json.data.stats ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkin = async (token: string) => {
    const deviceId = getOrCreateDeviceId();
    const geoLocation = await getCoordinates();

    try {
      const res = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, deviceId, geoLocation }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message ?? "Checked in successfully!");
        reset();
        stopScanner();
        fetchAttendance();
      } else {
        toast.error(json.error ?? "Check-in failed");
      }
    } catch {
      toast.error("Network error. Saving for later sync...");
      await savePendingCheckin(token, "offline");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncOfflineCheckins = async () => {
      if (!navigator.onLine) return;
      try {
        const pending = await getPendingCheckins();
        if (pending.length === 0) return;

        const deviceId = getOrCreateDeviceId();
        const geoLocation = await getCoordinates();

        for (const record of pending) {
          try {
            const res = await fetch("/api/attendance/checkin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: record.token, deviceId, geoLocation }),
            });
            const json = await res.json();
            if (json.success || json.error?.includes("Already checked in")) {
              await markCheckinSynced(record.id);
            }
          } catch (err) {
            console.error("Failed to sync record", record, err);
          }
        }
        fetchAttendance();
      } catch (err) {
        console.error("Offline sync error", err);
      }
    };

    window.addEventListener("online", syncOfflineCheckins);
    syncOfflineCheckins();

    return () => {
      window.removeEventListener("online", syncOfflineCheckins);
    };
  }, [fetchAttendance]);

  const onTokenSubmit = async (data: TokenForm) => {
    await checkin(data.token.toUpperCase().trim());
  };

  const stopScanner = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const startScanner = async () => {
    setCameraError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      // Poll canvas for QR data using jsQR
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        try {
          const jsQR = (await import("jsqr")).default;
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            try {
              const data = JSON.parse(code.data);
              if (data.token) {
                stopScanner();
                await checkin(data.token);
              }
            } catch {
              // Not valid JSON, ignore
            }
          }
        } catch {
          // jsQR not available
        }
      }, 500);
    } catch {
      setCameraError(true);
      toast.error("Camera access denied. Use token entry instead.");
      setCheckinMode("token");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Check-In</h1>
        <p className="text-sm text-gray-500 mt-1">
          Mark your attendance using a QR code or session token
        </p>
      </div>

      <Card>
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setCheckinMode("token"); stopScanner(); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              checkinMode === "token"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            }`}
          >
            Enter Token
          </button>
          <button
            onClick={() => { setCheckinMode("qr"); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              checkinMode === "qr"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            }`}
          >
            Scan QR Code
          </button>
        </div>

        {checkinMode === "token" ? (
          <form onSubmit={handleSubmit(onTokenSubmit)} className="space-y-4">
            <Input
              label="Session Token"
              placeholder="Enter token (e.g. ABC12345)"
              error={errors.token?.message}
              className="text-center text-lg font-mono tracking-widest uppercase"
              {...register("token")}
            />
            <Button type="submit" className="w-full" loading={isSubmitting}>
              Check In
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-square max-w-sm mx-auto">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                aria-label="QR code scanner camera"
              />
              <canvas ref={canvasRef} className="hidden" />
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-48 h-48">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-400 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-400 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-400 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-400 rounded-br-lg" />
                  </div>
                </div>
              )}
              {!scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                  <div className="text-center text-white">
                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm">{cameraError ? "Camera unavailable" : "Camera not active"}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 max-w-sm mx-auto">
              {!scanning ? (
                <Button className="flex-1" onClick={startScanner}>
                  Start Camera
                </Button>
              ) : (
                <Button className="flex-1" variant="danger" onClick={stopScanner}>
                  Stop Camera
                </Button>
              )}
            </div>
            <p className="text-center text-xs text-gray-400">
              Point your camera at the QR code displayed by your lecturer
            </p>
          </div>
        )}
      </Card>

      {stats.length > 0 && (
        <Card>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Attendance by Course</h3>
          <div className="space-y-4">
            {stats.map((s) => (
              <div key={String(s.courseId)} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {String(s.courseId)}
                  </span>
                  <span className="text-gray-500">
                    {s.attended}/{s.total} sessions ({s.percentage}%)
                  </span>
                </div>
                <ProgressBar value={s.percentage} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Attendance History</h3>
        {loading ? (
          <TableSkeleton rows={5} cols={3} />
        ) : attendance.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No attendance records yet</p>
        ) : (
          <div className="space-y-2">
            {attendance.map((a) => (
              <div
                key={a._id}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {(a.sessionId as { courseId?: { courseCode?: string } })?.courseId?.courseCode ?? "—"}
                    {" – "}
                    {(a.sessionId as { courseId?: { courseTitle?: string } })?.courseId?.courseTitle ?? ""}
                  </p>
                  <p className="text-xs text-gray-500">{formatDateTime(a.checkedInAt)}</p>
                </div>
                <Badge status={a.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
