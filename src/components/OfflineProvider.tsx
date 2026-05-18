"use client";

import { useEffect, useState } from "react";

export default function OfflineProvider() {
  const [offline, setOffline] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setOffline(!navigator.onLine);
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const secure = window.location.protocol === "https:" || window.location.hostname === "localhost";
    if ("serviceWorker" in navigator && secure) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Detect updates
          reg.addEventListener("updatefound", () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener("statechange", () => {
              if (nw.state === "installed" && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          });
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  function applyUpdate() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistration().then((reg) => {
      reg?.waiting?.postMessage("SKIP_WAITING");
      setTimeout(() => window.location.reload(), 100);
    });
  }

  return (
    <>
      {offline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-600/95 text-white text-center text-xs py-1.5 backdrop-blur">
          Sin conexión — viendo datos guardados
        </div>
      )}
      {updateAvailable && (
        <button
          onClick={applyUpdate}
          className="fixed bottom-24 right-4 z-50 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-full px-4 py-2 shadow-lg"
        >
          ↻ Nueva versión — actualizar
        </button>
      )}
    </>
  );
}
