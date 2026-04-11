"use client";

import { useEffect, useRef, useState } from "react";

export default function MapView({ points, routePath, result, onMarkerClick }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRefs = useRef([]);
  const polylineRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // ── Wait for Mappls SDK ───────────────────────────────────────────────────
  useEffect(() => {
    const check = setInterval(() => {
      if (window.mappls) { setIsLoaded(true); clearInterval(check); }
    }, 300);
    return () => clearInterval(check);
  }, []);

  // ── Initialize map ONCE ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstance.current) return;
    try {
      mapInstance.current = new window.mappls.Map("map-container", {
        center: [72.918, 19.113], // Swapped to [lng, lat]
        zoom: 10,
      });
    } catch (e) {
      console.error("Map init error:", e);
    }
  }, [isLoaded]);

  // ── EFFECT A: Markers + Auto-Fit ─────────────────────────────────────────
  // Depends ONLY on points/result. Does NOT run when routePath updates.
  // This prevents the map from re-zooming when the route line arrives.
  useEffect(() => {
    if (!mapInstance.current || !isLoaded) return;

    // Clear old markers
    markerRefs.current.forEach((m) => {
      if (!m) return;
      try { window.mappls.remove({ map: mapInstance.current, layer: m }); } catch (e) { }
      if (m.remove) m.remove();
    });
    markerRefs.current = [];

    const validPoints = (points || []).filter((p) => p.lat && p.lng);
    if (validPoints.length === 0) return;

    // Add markers
    validPoints.forEach((p, index) => {
      const isStart = p.isAgent;
      const isOfficePt = p.isOffice;
      let markerHtml = "";

      if (isStart) {
        const img = p.data?.image
          ? `<img src="${p.data.image}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${p.data?.name || 'A'}" />`
          : `<span style="font-weight:900;font-size:16px;">${p.data?.name?.[0] || 'A'}</span>`;
        markerHtml = `
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="width:46px;height:46px;background:#24aa4d;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 4px 16px rgba(36,170,77,0.6);cursor:pointer;overflow:hidden;z-index:2;">${img}</div>
            <div style="width:2px;height:12px;background:white;margin-top:-2px;box-shadow:2px 2px 4px rgba(0,0,0,0.3);z-index:1;"></div>
            <div style="width:6px;height:6px;background:#24aa4d;border-radius:50%;margin-top:-2px;border:1px solid white;"></div>
          </div>
        `;
      } else if (isOfficePt) {
        markerHtml = `
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="background:#f59e0b;border:3px solid white;border-radius:12px;padding:5px 10px;color:#000;font-weight:900;font-size:11px;white-space:nowrap;box-shadow:0 4px 14px rgba(245,158,11,0.5);display:flex;align-items:center;gap:5px;z-index:2;">🏢 Office</div>
            <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid white;margin-top:-1px;z-index:1;"></div>
          </div>
        `;
      } else {
        let stopNum = index;
        if (result?.length > 0) { const pos = result.indexOf(index); if (pos !== -1) stopNum = pos; }
        const name = p.data?.name || "Customer";
        markerHtml = `
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="background:#111827;border:2px solid #24aa4d;border-radius:20px;padding:5px 11px;color:white;font-weight:700;font-size:12px;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.5);cursor:pointer;display:flex;gap:7px;align-items:center;z-index:2;">
              <div style="background:#24aa4d;color:#000;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;flex-shrink:0;">${stopNum}</div>
              ${name}
            </div>
            <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #24aa4d;margin-top:-1px;z-index:1;"></div>
          </div>
        `;
      }

      const marker = new window.mappls.Marker({
        map: mapInstance.current,
        position: { lat: p.lat, lng: p.lng },
        html: markerHtml,
      });

      // Hover tooltip on agent markers showing customer list
      if (isStart && p.data?.customers?.length > 0) {
        const customers = p.data.customers;
        const rows = customers.map((c, i) =>
          `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.07);">
            <div style="background:#24aa4d;color:#000;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;">${i + 1}</div>
            <span style="font-size:12px;font-weight:600;color:#fff;">${c.name || "Customer"}</span>
          </div>`
        ).join("");
        const tooltipHtml = `<div style="background:#0f0f0f;border:1px solid rgba(36,170,77,0.35);border-radius:14px;padding:12px 14px;min-width:180px;box-shadow:0 8px 24px rgba(0,0,0,0.7);">
          <p style="font-size:10px;font-weight:900;color:#24aa4d;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">${p.data.name} — ${customers.length} customer${customers.length !== 1 ? "s" : ""}</p>${rows}</div>`;

        let popup = null;
        marker.addListener("mouseover", () => {
          try { popup = new window.mappls.Popup({ map: mapInstance.current, html: tooltipHtml, lngLat: { lng: p.lng, lat: p.lat }, offset: [0, -28], closeButton: false }); } catch (e) { }
        });
        marker.addListener("mouseout", () => {
          try { if (popup) { window.mappls.remove({ map: mapInstance.current, layer: popup }); popup = null; } } catch (e) { }
        });
      }

      marker.addListener("click", () => { if (onMarkerClick) onMarkerClick(p, index); });
      markerRefs.current.push(marker);
    });

    // Auto-fit bounds — Conservative padding and coordinate validation
    try {
      // Filter out invalid/zero coordinates to prevent "Antarctica" jumps
      const strictPoints = validPoints.filter(p =>
        p.lat !== 0 && p.lng !== 0 &&
        p.lat > -90 && p.lat < 90 &&
        p.lng > -180 && p.lng < 180
      );

      if (strictPoints.length === 0) return;

      const lats = strictPoints.map((p) => p.lat);
      const lngs = strictPoints.map((p) => p.lng);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

      // Verify min/max are finite numbers
      if (!isFinite(minLat) || !isFinite(maxLat)) return;

      if (strictPoints.length === 1) {
        mapInstance.current.setCenter([minLng, minLat]); // [lng, lat]
        mapInstance.current.setZoom(14);
      } else {
        // Mappls fitBounds expects [[lng, lat], [lng, lat]] or similar LngLatBounds
        mapInstance.current.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]], // Correct order [lng, lat]
          {
            padding: { top: 70, bottom: 70, left: 70, right: 380 }, // Added right padding for sidebar
            maxZoom: 15,
            animate: true
          }
        );
      }
    } catch (e) {
      console.warn("[MapView] fitBounds failed, falling back to center:", e);
      if (validPoints[0]) mapInstance.current.setCenter([validPoints[0].lng, validPoints[0].lat]);
    }


    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, result, isLoaded]);

  // ── EFFECT B: Polyline ONLY ───────────────────────────────────────────────
  // No bounds update — never re-zooms the map.
  useEffect(() => {
    if (!mapInstance.current || !isLoaded) return;

    // Clear old polylines (handle array if it exists)
    if (polylineRef.current) {
      const layers = Array.isArray(polylineRef.current) ? polylineRef.current : [polylineRef.current];
      layers.forEach(layer => {
        try { window.mappls.remove({ map: mapInstance.current, layer }); } catch (e) { }
        if (layer.remove) layer.remove();
      });
      polylineRef.current = null;
    }

    if (routePath?.length > 0) {
      try {
        console.log(`[MapView] Creating polyline with ${routePath.length} points.`);
        // IMPORTANT: Mappls V3 SDK (GL-based) often prefers [lng, lat] arrays 
        // to match the map center and GL layer standards.
        const formattedPath = routePath.map(p => [p.lng, p.lat]);

        const casing = new window.mappls.Polyline({
          map: mapInstance.current,
          path: formattedPath,
          strokeColor: "#ffffff",
          strokeWeight: 9,
          strokeOpacity: 0.25,
        });

        const mainLine = new window.mappls.Polyline({
          map: mapInstance.current,
          path: formattedPath,
          strokeColor: "#24aa4d",
          strokeWeight: 7,
          strokeOpacity: 1,
        });

        polylineRef.current = [casing, mainLine];
        console.log("[MapView] Polyline layers added to map.");
      } catch (e) { console.error("[MapView] Polyline error:", e); }
    }


  }, [routePath, isLoaded]);


  return (
    <div
      id="map-container"
      ref={mapRef}
      suppressHydrationWarning
      className="absolute inset-0 w-full h-full bg-[#111]"
    />
  );
}
