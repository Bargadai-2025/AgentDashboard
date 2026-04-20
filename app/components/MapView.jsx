"use client";
import { useEffect, useRef, useState } from "react";

export default function MapView({ points, routePath, visitedPath, deviationPath, deviationPaths, activeDeviation, simulationPaths, activeSimulation, agentPosition, result, onMarkerClick }) {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const simMarkerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!window.mappls) return;

    const containerId = "map-dashboard-container";

    if (!mapInstance.current) {
      mapInstance.current = new window.mappls.Map(containerId, {
        center: [19.076, 72.8777],
        zoom: 12,
        zoomControl: true,
        hybrid: true,
      });

      mapInstance.current.on("load", () => {
        setMapLoaded(true);
      });
    } else {
      // If map already exists, check if it's already loaded
      if (mapInstance.current.isStyleLoaded()) {
        setMapLoaded(true);
      }
    }

    const map = mapInstance.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const FONT_SANS = "system-ui, -apple-system, sans-serif";
    const numberingMap = {};

    if (result?.length > 0) {
      let count = 1;
      result.forEach((idx) => {
        const point = points[idx];
        const id = point?.data?._id;
        // Only number customers, skip OFFICE and Agents
        if (id && point?.name !== "OFFICE" && !point?.isOffice && point?.name !== "LIVE_AGENT") {
          numberingMap[id] = count++;
        }
      });
    } 

    points.forEach((p) => {
      let markerHtml = "";
      if (p.isAgent) {
        const agentName = p.data?.name || "Agent";
        markerHtml = `
          <div style="display:flex;flex-direction:column;align-items:center;font-family:${FONT_SANS};">
             <div style="width:42px;height:42px;border-radius:50%;border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.3);overflow:hidden;background:#f3f4f6;position:relative;z-index:2;">
                ${p.data?.image ? `<img src="${p.data.image}" style="width:100%;height:100%;object-fit:cover;" />` : `<div style="width:100%;height:100%;background:#3b82f6;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:16px;">${agentName[0]}</div>`}
             </div>
             <div style="background:rgba(0,0,0,0.8);backdrop-filter:blur(4px);padding:3px 10px;border-radius:20px;color:white;font-weight:800;font-size:10px;margin-top:-10px;z-index:3;white-space:nowrap;box-shadow:0 2px 5px rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.2);">
               ${agentName}
             </div>
          </div>
        `;
      }
      else if (p.name === "OFFICE" || p.isOffice) {
        markerHtml = `
          <div style="display:flex;flex-direction:column;align-items:center;font-family:${FONT_SANS};">
            <div style="background:#ef4444;min-width:64px;height:24px;border-radius:4px;color:white;font-weight:700;font-size:11px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.2);padding:0 12px;white-space:nowrap;border:1px solid rgba(255,255,255,0.3);">
              OFFICE
            </div>
            <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #ef4444;margin-top:-1px;"></div>
          </div>
        `;
      } else {
        const stopNum = numberingMap[p?.data?._id];
        const name = p.data?.name || "Customer";
        markerHtml = `
          <div style="display:flex;flex-direction:column;align-items:center;font-family:${FONT_SANS};">
            <div style="background:#111827;border:1px solid #3b82f6;border-radius:4px;padding:4px 8px;color:white;font-weight:600;font-size:11px;white-space:nowrap;display:flex;gap:5px;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
              <div style="background:#3b82f6;color:#FFF;border-radius:2px;width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;">${stopNum || ""}</div>
              ${name}
            </div>
            <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #3b82f6;margin-top:-1px;"></div>
          </div>
        `;
      }

      const marker = new window.mappls.Marker({
        map,
        position: { lat: p.lat, lng: p.lng },
        html: markerHtml,
      });

      marker.addListener("click", () => {
        if (onMarkerClick) onMarkerClick(p);
      });

      markersRef.current.push(marker);
    });

    // Handle Simulation Marker (Uses circular image now)
    if (agentPosition) {
      const lastPoint = agentPosition;
      const agentImg = points?.find(p => p.isAgent)?.data?.image;
      
      if (simMarkerRef.current) {
        simMarkerRef.current.setPosition(lastPoint);
      } else {
        const simHtml = `
          <div style="width:45px;height:45px;background:#facc15;border:4px solid white;border-radius:50%;box-shadow:0 0 15px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;overflow:hidden;animation: pulseSim 1s infinite;">
            ${agentImg ? `<img src="${agentImg}" style="width:100%;height:100%;object-fit:cover;" />` : `<div style="color:black;font-weight:900;">A</div>`}
            <style>
              @keyframes pulseSim {
                0% { transform: scale(1); box-shadow: 0 0 10px rgba(250, 204, 21, 0.5); }
                50% { transform: scale(1.1); box-shadow: 0 0 20px rgba(250, 204, 21, 0.8); }
                100% { transform: scale(1); box-shadow: 0 0 10px rgba(250, 204, 21, 0.5); }
              }
            </style>
          </div>
        `;
        simMarkerRef.current = new window.mappls.Marker({
          map,
          position: lastPoint,
          html: simHtml
        });
      }
    } else if (simMarkerRef.current) {
      simMarkerRef.current.remove();
      simMarkerRef.current = null;
    }

    const addLayer = (id, pathData, color, width = 4) => {
      if (!map || !mapLoaded) return;
      
      // Handle either raw path array or GeoJSON object
      let geojson;
      if (pathData && pathData.type === 'FeatureCollection') {
        geojson = pathData;
      } else if (pathData && Array.isArray(pathData) && pathData.length > 1) {
        geojson = {
          type: "Feature",
          geometry: { type: "LineString", coordinates: pathData.map((p) => [p.lng, p.lat]) },
        };
      } else {
        try {
          if (map.getLayer(id)) map.removeLayer(id);
          if (map.getSource(id)) map.removeSource(id);
        } catch (e) { }
        return;
      }

      try {
        if (map.getSource(id)) {
          map.getSource(id).setData(geojson);
        } else {
          map.addSource(id, { type: "geojson", data: geojson });
          map.addLayer({
            id: id,
            type: "line",
            source: id,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": color, "line-width": width },
          });
        }
      } catch (e) { }
    };

    if (mapLoaded) {
      addLayer("route", routePath, "#3b82f6"); 
      addLayer("visited", visitedPath, "#22c55e", 5); 

      // DASHARATH SEGMENTED SIMULATION RENDERING (YELLOW)
      const simSegments = [...(simulationPaths || [])];
      if (activeSimulation?.length > 1) simSegments.push(activeSimulation);

      const simulationFC = {
        type: "FeatureCollection",
        features: simSegments.map(path => ({
          type: "Feature",
          geometry: { type: "LineString", coordinates: path.map(p => [p.lng, p.lat]) }
        }))
      };

      addLayer("simulation", simulationFC.features.length > 0 ? simulationFC : [], "#facc15", 5);

      // DASHARATH SEGMENTED DEVIATION RENDERING
      const segments = [...(deviationPaths || [])];
      if (activeDeviation?.length > 1) segments.push(activeDeviation);
      
      const deviationFC = {
        type: "FeatureCollection",
        features: segments.map(path => ({
          type: "Feature",
          geometry: { type: "LineString", coordinates: path.map(p => [p.lng, p.lat]) }
        }))
      };

      addLayer("deviation", deviationFC.features.length > 0 ? deviationFC : deviationPath, "#ef4444", 5);

      const lats = (routePath || []).map((p) => p.lat).filter(l => !isNaN(l));
      const lngs = (routePath || []).map((p) => p.lng).filter(l => !isNaN(l));
      
      if (lats.length > 0 && lngs.length > 0) {
        map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], {
          padding: { top: 70, bottom: 70, left: 70, right: 420 },
          animate: true
        });
      } else if (points.length > 0) {
        const latsP = points.map(p => p.lat);
        const lngsP = points.map(p => p.lng);
        setTimeout(() => {
          try {
            map.fitBounds([[Math.min(...lngsP), Math.min(...latsP)], [Math.max(...lngsP), Math.max(...latsP)]], { padding: 100 });
          } catch (e) { }
        }, 500);
      }
    }
  }, [points, routePath, visitedPath, deviationPath, deviationPaths, activeDeviation, simulationPaths, activeSimulation, agentPosition, result, onMarkerClick, mapLoaded]);

  return <div id="map-dashboard-container" ref={mapContainer} className="w-full h-full" />;
}