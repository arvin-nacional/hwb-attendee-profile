"use client";

import { useState, useEffect, useCallback } from "react";
import { FaMonument, FaArrowLeft, FaLock, FaSpinner } from "react-icons/fa";
import Link from "next/link";
import { checkAdminSession, createAdminSession } from "@/lib/actions";
import { scanToken, getExpectedCounts } from "@/lib/attendanceActions";
import { type HWBEvent } from "@/lib/data";
import { EventSelector } from "@/components/scan/EventSelector";
import { CameraScanner } from "@/components/scan/CameraScanner";
import { ScanResult } from "@/components/scan/ScanResult";
import { AttendanceLog } from "@/components/scan/AttendanceLog";
import { NonAttendees } from "@/components/scan/NonAttendees";
import type { ScanResult as ScanResultType } from "@/lib/attendanceActions";

export default function ScanPage() {
  const [sessionChecking, setSessionChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<HWBEvent | null>(null);
  const [scanResult, setScanResult] = useState<ScanResultType | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [logRefresh, setLogRefresh] = useState(0);
  const [expectedCounts, setExpectedCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    checkAdminSession().then((valid) => {
      setAuthenticated(valid);
      setSessionChecking(false);
    });
    getExpectedCounts().then(setExpectedCounts);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginSubmitting(true);
    setLoginError("");
    const ok = await createAdminSession(password);
    if (ok) {
      setAuthenticated(true);
    } else {
      setLoginError("Incorrect password.");
    }
    setLoginSubmitting(false);
  };

  const handleScan = useCallback(async (token: string) => {
    if (!selectedEvent || scanning) return;
    setScanning(true);
    setScanError(null);
    const res = await scanToken(token, selectedEvent.id);
    setScanning(false);
    if (res.success && res.result) {
      setScanResult(res.result);
    } else {
      setScanError(res.error ?? "Unknown error.");
    }
  }, [selectedEvent, scanning]);

  const handleReset = () => {
    setScanResult(null);
    setScanError(null);
  };

  const handleCheckedIn = () => {
    setLogRefresh((n) => n + 1);
  };

  if (sessionChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f5f0]">
        <FaSpinner className="animate-spin text-[var(--maroon)] text-3xl" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#f8f5f0] flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <div className="flex items-center gap-3 mb-6">
            <FaLock className="text-[var(--maroon)] text-xl" />
            <h1 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--maroon)]">
              Staff Access
            </h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter staff password"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base outline-none focus:border-[var(--maroon)] transition-colors"
              autoFocus
            />
            {loginError && (
              <p className="text-sm text-red-600">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={loginSubmitting || !password}
              className="w-full bg-[var(--maroon)] text-white py-3 rounded-xl font-semibold hover:bg-[var(--maroon-dark)] transition-colors disabled:opacity-50"
            >
              {loginSubmitting ? "Verifying..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5f0]">
      {/* Nav */}
      <div className="bg-[var(--maroon)] px-6 py-4 flex items-center gap-4 text-white sticky top-0 z-50 shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
        <Link
          href="/admin"
          className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <FaArrowLeft className="text-sm" />
        </Link>
        <FaMonument className="text-xl text-[var(--gold)]" />
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-lg font-bold leading-tight">
            Event Check-In
          </h1>
          {selectedEvent && (
            <span className="text-xs opacity-80 font-light">{selectedEvent.name}</span>
          )}
        </div>
        {selectedEvent && (
          <button
            onClick={() => { setSelectedEvent(null); handleReset(); }}
            className="ml-auto text-xs bg-white/10 border border-white/20 px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors"
          >
            Change Event
          </button>
        )}
      </div>

      <div className="max-w-[900px] mx-auto px-4 py-8">
        {/* Step 1: Select Event */}
        {!selectedEvent && (
          <EventSelector onSelect={setSelectedEvent} />
        )}

        {/* Step 2: Scan + Results */}
        {selectedEvent && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Scanner */}
            <div className="space-y-4">
              <div>
                <h2 className="font-[family-name:var(--font-playfair)] text-xl text-[var(--maroon)] font-bold mb-1">
                  Scan QR Code
                </h2>
                <p className="text-sm text-[var(--gray)]">
                  Point the camera at the attendee&apos;s QR code on their phone.
                </p>
              </div>

              {scanResult ? (
                <ScanResult
                  result={scanResult}
                  eventId={selectedEvent.id}
                  eventName={selectedEvent.name}
                  onReset={handleReset}
                  onCheckedIn={handleCheckedIn}
                />
              ) : (
                <>
                  <CameraScanner onScan={handleScan} disabled={scanning} />
                  {scanning && (
                    <div className="flex items-center justify-center gap-2 text-sm text-[var(--gray)] py-2">
                      <FaSpinner className="animate-spin" />
                      Verifying attendee...
                    </div>
                  )}
                  {scanError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                      {scanError}
                    </div>
                  )}
                </>
              )}

              <NonAttendees
                eventId={selectedEvent.id}
                eventName={selectedEvent.name}
                refreshTrigger={logRefresh}
              />
            </div>

            {/* Right: Attendance Log */}
            <div>
              <AttendanceLog
                eventId={selectedEvent.id}
                eventName={selectedEvent.name}
                refreshTrigger={logRefresh}
                expectedCount={expectedCounts[selectedEvent.id]}
                event={selectedEvent}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
