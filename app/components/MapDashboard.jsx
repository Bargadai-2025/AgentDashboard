"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import MapView from "./MapView";
import { getDistance } from "../utils/routeOptimization";
import { OFFICE } from "../components/staticData";

const VIEW = { OVERVIEW: "overview", AGENT: "agent", CUSTOMER: "customer" };

export default function MapDashboard({ allAgents }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [view, setView] = useState(VIEW.OVERVIEW);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  const [mapPoints, setMapPoints] = useState([]);
  const [routePath, setRoutePath] = useState(null);
  const [visitedPath, setVisitedPath] = useState([]);
  const [deviationPath, setDeviationPath] = useState([]);
  const [optimizedOrder, setOptimizedOrder] = useState([]);
  const [customerDistances, setCustomerDistances] = useState({});
  const [customerEtas, setCustomerEtas] = useState({});
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  // Simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationPath, setSimulationPath] = useState([]);
  const [simulationIndex, setSimulationIndex] = useState(0);
  const [simulationFullRoute, setSimulationFullRoute] = useState([]); // Hidden true path with deviations
  const [dynamicRoute, setDynamicRoute] = useState([]); // Lived path that replaces optimized route
  const [dashrathFinalRoute, setDashrathFinalRoute] = useState([]); // Dashrath-only forexnsive route
  const [activeRoute, setActiveRoute] = useState([]); // Currently active displayed route
  const [hasDeviated1, setHasDeviated1] = useState(false);
  const [hasDeviated2, setHasDeviated2] = useState(false);
  const [dev1EndIndex, setDev1EndIndex] = useState(null);
  const [deviationPaths, setDeviationPaths] = useState([]); // Array of completed segments
  const [currentDeviation, setCurrentDeviation] = useState([]); // Current recording segment
  const [simulationPaths, setSimulationPaths] = useState([]); // Completed yellow segments
  const [currentSimSegment, setCurrentSimSegment] = useState([]); // Active yellow segment
  const [agentPosition, setAgentPosition] = useState(null); // LIVE marker position



  // Auto-refresh logic for live tracking
  useEffect(() => {
    let interval;
    if (view === VIEW.AGENT && selectedAgent?._id) {
      interval = setInterval(async () => {
        if (isSimulating) return; // DON'T overwrite demo/sim data with empty backend data during demo
        try {
          const res = await fetch(`/api/agents/${selectedAgent._id}`);
          if (res.ok) {
            const result = await res.json();
            const updatedAgent = result.data;
            if (updatedAgent?.journeyTracking) {
              setVisitedPath(updatedAgent.journeyTracking.visitedPoints || []);
              setDeviationPath(updatedAgent.journeyTracking.deviationPoints || []);
              setDynamicRoute(updatedAgent.journeyTracking.livedRoute || []);
            }
          }
        } catch (err) {
          console.error("Live tracking refresh failed:", err);
        }
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [view, selectedAgent?._id, isSimulating]);





  // Simulation Animation Logic (Dynamic Trigger Engine)
  useEffect(() => {
    if (!isSimulating || !activeRoute?.length || simulationIndex >= activeRoute.length) return;

    const currentPt = activeRoute[simulationIndex];

    // DASHRATH DEVIATION DETECTION
    if (selectedAgent?.name === "Dashrath") {
      const dev1 = [
        { lat: 19.061918778343077, lng: 72.91440317701394 }, { lat: 19.058673560838752, lng: 72.91339460572851 }, { lat: 19.057167123816594, lng: 72.91238900109664 },
        { lat: 19.055410427068104, lng: 72.91125782850266 }, { lat: 19.053140847659535, lng: 72.91078517002362 }, { lat: 19.051706634112875, lng: 72.91063371255052 },
        { lat: 19.049697131213094, lng: 72.91034188370692 }, { lat: 19.045844298685015, lng: 72.90928150737354 }, { lat: 19.045671115187076, lng: 72.91423471212681 },
        { lat: 19.04510582630029, lng: 72.91695594822515 }, { lat: 19.043578582062956, lng: 72.92246511670236 }, { lat: 19.05145328297678, lng: 72.93713499349654 }
      ];

      const dev2 = [
        { lat: 19.1491447593489, lng: 73.03869577080081 }, { lat: 19.15053422677713, lng: 73.0366996049738 }, { lat: 19.151638348808103, lng: 73.03526814393348 },
        { lat: 19.154680608211873, lng: 73.03356275170634 }, { lat: 19.157670329535925, lng: 73.03161255028057 }, { lat: 19.157957264990934, lng: 73.03394027605084 },
        { lat: 19.157986610077653, lng: 73.03675076262995 }, { lat: 19.15813983621369, lng: 73.03915687509738 }, { lat: 19.158497363338657, lng: 73.04123856800962 },
        { lat: 19.158650589007134, lng: 73.04229293197623 }, { lat: 19.159467790130694, lng: 73.04377985541117 }, { lat: 19.160131763061734, lng: 73.04618596787859 }
      ];

      // Helper to find the closest point on the planned road to rejoin at
      const findNearestIndex = (target, route, startIndex) => {
        let minDist = Infinity;
        let index = startIndex;
        for (let i = startIndex; i < Math.min(startIndex + 300, route.length); i++) {
          const p = route[i];
          const d = Math.sqrt(Math.pow(p.lat - target.lat, 2) + Math.pow(p.lng - target.lng, 2));
          if (d < minDist) {
            minDist = d;
            index = i;
          }
        }
        return index;
      };

      // Trigger Deviation 1
      if (!hasDeviated1 && Math.abs(currentPt.lat - 19.0629) < 0.001) {
        const deviationStartIndex = simulationIndex;
        const dev1WithFlag = dev1.map(p => ({ ...p, isDeviated: true }));
        const lastDevPt = dev1WithFlag[dev1WithFlag.length - 1];

        // DYNAMIC JOIN: Find the exact spot on the road closest to our detour end
        const rejoinIndex = findNearestIndex(lastDevPt, activeRoute, deviationStartIndex);
        const remainingRoute = activeRoute.slice(rejoinIndex);

        const newRoute = [
          ...activeRoute.slice(0, deviationStartIndex),
          ...dev1WithFlag,
          ...remainingRoute
        ];

        setActiveRoute(newRoute);
        setSimulationFullRoute(newRoute);
        setDev1EndIndex(deviationStartIndex + dev1WithFlag.length);
        setSimulationIndex(deviationStartIndex);
        setHasDeviated1(true);
        return;
      }

      // Trigger Deviation 2
      if (
        hasDeviated1 &&
        simulationIndex > dev1EndIndex &&
        !hasDeviated2 &&
        Math.abs(currentPt.lat - 19.1474) < 0.001
      ) {
        const deviationStartIndex = simulationIndex;
        const dev2WithFlag = dev2.map(p => ({ ...p, isDeviated: true }));
        const lastDevPt = dev2WithFlag[dev2WithFlag.length - 1];

        // DYNAMIC JOIN: Find the exact spot on the road closest to our detour end
        const rejoinIndex = findNearestIndex(lastDevPt, activeRoute, deviationStartIndex);
        const remainingRoute = activeRoute.slice(rejoinIndex);

        const newRoute = [
          ...activeRoute.slice(0, deviationStartIndex),
          ...dev2WithFlag,
          ...remainingRoute
        ];
        setSimulationFullRoute(newRoute);
        setActiveRoute(newRoute);
        setSimulationIndex(deviationStartIndex);
        setHasDeviated2(true);
        return;
      }
    }

    const timer = setTimeout(() => {
      // Ensure we stay in bounds if the route was swapped
      if (simulationIndex >= activeRoute.length) {
        setIsSimulating(false);
        // Finalize active segments
        if (currentDeviation.length > 0) setDeviationPaths(prev => [...prev, currentDeviation]);
        if (currentSimSegment.length > 0) setSimulationPaths(prev => [...prev, currentSimSegment]);
        setCurrentDeviation([]);
        setCurrentSimSegment([]);
        return;
      }

      if (selectedAgent?.name === "Dashrath") {
        if (currentPt.isDeviated) {
          // If we were recording yellow, finalize it
          if (currentSimSegment.length > 0) {
            setSimulationPaths(prev => [...prev, currentSimSegment]);
            setCurrentSimSegment([]);
          }
          setCurrentDeviation(prev => [...prev, currentPt]);
        } else {
          // If we were recording red, finalize it
          if (currentDeviation.length > 0) {
            setDeviationPaths(prev => [...prev, currentDeviation]);
            setCurrentDeviation([]);
          }
          setCurrentSimSegment(prev => [...prev, currentPt]);
        }
      } else {
        setCurrentSimSegment(prev => [...prev, currentPt]);
      }

      setAgentPosition(currentPt);
      setSimulationIndex(prev => prev + 1);
    }, 120);

    return () => clearTimeout(timer);
  }, [simulationIndex, isSimulating, activeRoute, hasDeviated1, hasDeviated2, dev1EndIndex, selectedAgent, currentDeviation, currentSimSegment]);

  const startSimulation = () => {
    if (!routePath) return;

    setActiveRoute(routePath);
    setSimulationFullRoute(routePath);
    setSimulationIndex(0);
    setSimulationPath([]);
    setHasDeviated1(false);
    setHasDeviated2(false);
    setDev1EndIndex(null);
    setDeviationPaths([]);
    setCurrentDeviation([]);
    setSimulationPaths([]);
    setCurrentSimSegment([]);
    setAgentPosition(null);
    setIsSimulating(true);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
  };

  const computeDistances = useCallback((agent) => {
    if (!agent?.customers?.length) return {};
    return Object.fromEntries(
      agent.customers.map((c) => [
        c._id,
        c.location?.lat ? getDistance(OFFICE, c.location).toFixed(1) : null,
      ])
    );
  }, []);

  const handleAgentSelect = useCallback(async (agent) => {
    setSelectedAgent(agent);
    setSelectedCustomerId(null);
    setView(VIEW.AGENT);
    setCustomerDistances(computeDistances(agent));

    // Architecturally: Prioritize the Lived Route from the database
    const tracking = agent.journeyTracking || {};
    const recoveredLivedRoute = tracking.livedRoute || [];

    if (agent.name === "Dashrath") {
      if (recoveredLivedRoute.length) {
        setDashrathFinalRoute(recoveredLivedRoute);
      }
      setDeviationPaths(tracking.deviationPaths || []); // Load segmented paths
      setCurrentDeviation([]);
    } else {
      setDynamicRoute(recoveredLivedRoute);
      setDeviationPath(tracking.deviationPoints || []);
    }

    setVisitedPath(tracking.visitedPoints || []);

    setRoutePath(tracking.optimizedRoute || null); // Base plan
    setOptimizedOrder(tracking.optimizedOrder || []);
    setTotalDistance(tracking.totalDistance || 0);

    const custs = (agent.customers || [])
      .filter((c) => c.location?.lat && c.location?.lng)
      .map((c) => ({ lat: c.location.lat, lng: c.location.lng, data: c }));

    const pts = [
      { lat: OFFICE.lat, lng: OFFICE.lng, name: "OFFICE", isOffice: true },
      ...custs,
      { lat: OFFICE.lat, lng: OFFICE.lng, name: "OFFICE", isOffice: true },
    ];

    const markers = [
      ...pts,
      { lat: agent.location.lat, lng: agent.location.lng, data: agent, isAgent: true, name: "LIVE_AGENT" },
    ];

    setMapPoints(markers);

    if (custs.length > 0) {
      try {
        console.log("[MapDashboard] Fetching route for", custs.length, "customers...");

        // Strip extra data before sending to backend to avoid validation issues
        const pointsForBackend = pts.map(p => ({
          lat: p.lat,
          lng: p.lng,
          name: p.name || "",
          isOffice: !!p.isOffice
        }));

        const res = await fetch("/api/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ points: pointsForBackend }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("[MapDashboard] Route API Error:", res.status, errorText);
          return;
        }

        const data = await res.json();
        console.log("[MapDashboard] Route success:", data.distance, "km");

        if (data.path && data.path.length > 0) {
          const path = data.path.map((v) => ({ lat: v[0], lng: v[1] }));
          setRoutePath(path);

          // Persistence: Update the Optimized Route (The Plan)
          fetch(`/api/agents/update-route/${agent._id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ optimizedRoute: path })
          }).catch(console.error);

          // If no lived route exists yet, initialize it from the new path
          if (!recoveredLivedRoute.length) {
            setDynamicRoute(path);
          }
        }

        if (data && data.distance !== undefined) {
          setTotalDistance(data.distance?.toFixed(1));
        }
        if (data && (data.time !== undefined || data.duration !== undefined)) {
          setTotalDuration(Math.round((data.time || data.duration || 0) / 60)); // Handle both field names
        }

        if (data && data.legs && data.optimizedOrder) {
          const dists = {};
          const etas = {};
          data.optimizedOrder.forEach((originalIdx, visitIdx) => {
            if (visitIdx > 0 && visitIdx < data.optimizedOrder.length - 1) {
              const point = pts[originalIdx];
              if (point && point.data) {
                const id = point.data._id;
                dists[id] = data.legs[visitIdx - 1]?.distance?.toFixed(1) || "0";
                etas[id] = Math.round((data.legs[visitIdx - 1]?.duration || 0) / 60);
              }
            }
          });
          setCustomerDistances(prev => ({ ...prev, ...dists }));
          setCustomerEtas(prev => ({ ...prev, ...etas }));
          setOptimizedOrder(data.optimizedOrder);
        }
      } catch (err) {
        console.error("[MapDashboard] Critical error during route fetch:", err);
      }
    }


    // Removed hardcoded static deviations to support dynamic simulation tracking
  }, [computeDistances]);

  const handleReset = () => {
    setView(VIEW.OVERVIEW);
    setSelectedAgent(null);
    setSelectedCustomerId(null);
    setRoutePath(null);
    setVisitedPath([]); // Clear real journey points
    setDeviationPath([]); // Clear real deviation points
    setOptimizedOrder([]);
    setTotalDistance(0);
    setTotalDuration(0);
    setIsSimulating(false);
    setSimulationPath([]);
    setSimulationIndex(0);
    setDynamicRoute([]);
    setDashrathFinalRoute([]); // Dashrath Cleanup
    setActiveRoute([]);
    setHasDeviated1(false);
    setHasDeviated2(false);
    setDev1EndIndex(null);
    setDeviationPaths([]);
    setCurrentDeviation([]);
    setSimulationPaths([]);
    setCurrentSimSegment([]);
    setAgentPosition(null);
    setMapPoints(overviewPoints());
  };

  const overviewPoints = () =>
    (allAgents || [])
      .filter((a) => a && a.location)
      .map((a) => {
        let lat = 0, lng = 0;
        if (typeof a.location === 'object' && a.location !== null) {
          lat = a.location.lat || 0;
          lng = a.location.lng || 0;
        } else if (typeof a.location === 'string') {
          const parts = a.location.split(',');
          lat = parseFloat(parts[0]) || 0;
          lng = parseFloat(parts[1]) || 0;
        }
        return { lat, lng, data: a, isAgent: true };
      });

  useEffect(() => {
    if (view === VIEW.OVERVIEW) setMapPoints(overviewPoints());
  }, [allAgents, view]);

  const handleMarkerClick = async (pointData) => {
    if (view === VIEW.OVERVIEW && pointData.isAgent) { handleAgentSelect(pointData.data); return; }
    if (view !== VIEW.OVERVIEW && !pointData.isAgent && !pointData.isOffice) {
      setSelectedCustomerId(prev => prev === pointData.data._id ? null : pointData.data._id);
    }
  };

  const handleResetVerification = async (custId) => {
    if (!confirm("Are you sure you want to delete this verification?")) return;
    try {
      const res = await fetch(`/api/customers/${custId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verifiedAgentImage: "",
          verificationScore: 0,
          verificationStatus: "pending",
          collectedAt: null
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const updatedAgent = { ...selectedAgent };
        updatedAgent.customers = updatedAgent.customers.map(c => c._id === custId ? data.data : c);
        setSelectedAgent(updatedAgent);
      }
    } catch (err) { console.error("Failed to reset verification:", err); }
  };

  if (!mounted) return null;

  const FONT_CENTURY = "'Century Gothic', 'CenturyGothic', 'AppleGothic', sans-serif";

  return (
    <div className="w-full h-full flex bg-[#f5f5f5] overflow-hidden" style={{ fontFamily: FONT_CENTURY }}>
      <div className="flex-1 h-full relative overflow-hidden">
        <MapView
          points={mapPoints}
          routePath={routePath}
          visitedPath={visitedPath}
          activeDeviation={currentDeviation}
          deviationPaths={deviationPaths}
          activeSimulation={currentSimSegment}
          simulationPaths={simulationPaths}
          agentPosition={agentPosition}
          result={optimizedOrder}
          onMarkerClick={handleMarkerClick}
        />





        {totalDistance > 0 && (
          <div className="absolute top-6 left-6 flex gap-3 z-20">
            <div className="px-4 py-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-500">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Distance</p>
              <h4 className="text-[18px] font-bold text-gray-900 leading-none">
                {totalDistance} <span className="text-[12px] font-semibold text-gray-500">km</span>
              </h4>
            </div>
            <div className="px-4 py-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-500">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Est. Time</p>
              <h4 className="text-[18px] font-bold text-gray-900 leading-none">
                {totalDuration} <span className="text-[12px] font-semibold text-gray-500">min</span>
              </h4>
            </div>
          </div>
        )}
      </div>

      <aside className="w-[380px] flex-shrink-0 h-full bg-white border-l border-gray-200 flex flex-col overflow-hidden shadow-xl">
        <AnimatePresence mode="wait">

          {view === VIEW.OVERVIEW && (
            <motion.div key="overview" className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-[#f9fafb]">
                <h3 className="text-[24px] font-bold text-gray-900 leading-tight">Fleet Dashboard</h3>
                <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">Terminals: {allAgents?.length}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f3f4f6]">
                {(allAgents || []).map((a) => (
                  <button key={a._id} onClick={() => handleAgentSelect(a)} className="w-full flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-200 shadow-sm transition-all hover:bg-gray-50 group">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      {a.image ? <img src={a.image} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-lg">{a.name?.[0]}</div>}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">ID {(a._id || "").slice(-4)}</p>
                      <h4 className="font-bold text-base text-gray-900 truncate leading-tight">{a.name}</h4>
                    </div>
                    <div className="text-gray-300 group-hover:text-gray-900 pr-2">›</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {view !== VIEW.OVERVIEW && selectedAgent && (
            <motion.div key="agent-view" className="flex-1 flex flex-col overflow-hidden">

              <div className="flex-shrink-0 bg-gray-50 p-6 border-b border-gray-200 relative">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-xl border border-white shadow-md overflow-hidden flex-shrink-0">
                    {selectedAgent.image ? (<img src={selectedAgent.image} className="w-full h-full object-cover" />) : (<div className="w-full h-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-400">{selectedAgent.name?.[0]}</div>)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-[#24aa4d] uppercase mb-0.5 tracking-wider">ID {(selectedAgent._id || "0000").slice(-4)}</p>
                    <h2 className="text-[18px] font-[900] text-black leading-tight truncate">{selectedAgent.name}</h2>
                    <p className="text-gray-500 text-[10px] font-semibold uppercase opacity-70 mt-2">Fleet Terminal</p>
                  </div>
                  <button onClick={handleReset} className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition active:scale-95 shadow-sm">
                    ✕
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-[12px] font-bold text-gray-900 uppercase tracking-wider">CUSTOMERS</p>

                  {routePath && (
                    <button
                      onClick={isSimulating ? stopSimulation : startSimulation}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center gap-2 ${isSimulating
                        ? 'bg-red-50 border-red-200 text-red-600'
                        : 'bg-[#24aa4d] border-[#24aa4d] text-white'
                        }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-red-500 animate-pulse' : 'bg-white'}`} />
                      {isSimulating ? 'Stop Tracking' : 'Track Agent'}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#f3f4f6]">
                {(selectedAgent.customers || []).map((cust) => {
                  const isExpanded = selectedCustomerId === cust._id;
                  const isVerified = !!cust.verifiedAgentImage;

                  return (
                    <div key={cust._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 transition-all">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest">LOAN A/C No : {cust.loan || "452106"}</p>
                        <div className="flex flex-col items-end">
                          <p className="text-[10px] font-bold text-gray-500 leading-none">{customerDistances[cust._id] || "1.8"} km</p>
                          {customerEtas[cust._id] !== undefined && (
                            <p className="text-[8px] font-bold text-[#24aa4d] uppercase mt-1">ETA: {customerEtas[cust._id]} min</p>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 className="text-[18px] font-[900] text-black leading-tight truncate">{cust.name}</h3>
                          <span className={`text-[10px] font-bold ${isVerified ? 'text-[#24aa4d]' : 'text-amber-600'} uppercase`}>
                            {isVerified ? 'Done' : 'Progress'}
                          </span>
                        </div>
                        {!isExpanded && (
                          <button onClick={() => setSelectedCustomerId(cust._id)} className="w-8 h-8 rounded-lg bg-[#24aa4d] flex items-center justify-center text-white shadow-sm cursor-pointer ml-2 flex-shrink-0 transition active:scale-95">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] font-semibold text-gray-600 leading-tight mb-3 truncate">{cust.address.split(',')[0]}</p>

                      {isExpanded ? (
                        <div className="pt-2 border-t border-gray-50 mt-3">
                          <div className="flex justify-between items-center mb-4">
                            <p className="text-[11px] font-semibold text-gray-600">Collected <span className="font-bold text-gray-900">Rs {cust.cashCollected || "2500"}/-</span></p>
                            <button className="bg-[#24aa4d] text-white px-3 py-1 rounded-md text-[9px] font-bold uppercase shadow-sm">
                              RECEIPT
                            </button>
                          </div>

                          <div className="space-y-1 mb-5">
                            {[
                              { icon: "📅", label: cust.collectedAt ? new Date(cust.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "21 Mar, 09:30" },
                              { icon: "📍", label: cust.location ? `Lat ${cust.location.lat.toFixed(1)} / Lng ${cust.location.lng.toFixed(1)}` : "Lat 19.1 / Lng 72.9" },
                              { icon: "📱", label: cust.deviceModel || "Android Device" }
                            ].map((item, i) => (
                              <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                                <span className="text-sm grayscale opacity-50">{item.icon}</span>
                                <p className="flex-1 text-[10px] font-bold text-gray-600 uppercase truncate">{item.label}</p>
                                <div className="text-[#24aa4d] text-[10px] font-black">✓</div>
                              </div>
                            ))}
                          </div>

                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex gap-4">
                            {isVerified ? (
                              <div className="w-24 h-24 rounded-lg relative overflow-hidden flex-shrink-0 shadow-inner">
                                <img src={cust.verifiedAgentImage} className="w-full h-full object-cover" />
                                <button onClick={(e) => { e.stopPropagation(); handleResetVerification(cust._id); }} className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-md flex items-center justify-center text-white text-[10px] shadow-lg">
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="w-24 h-24 rounded-lg bg-gray-200 flex flex-col items-center justify-center text-center p-2">
                                <span className="text-xl opacity-20 mb-1">📷</span>
                                <p className="text-[8px] font-bold text-gray-500 uppercase leading-none">Awaiting</p>
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">SCORE</p>
                              {isVerified ? (
                                <>
                                  <h4 className="text-[22px] font-bold text-gray-900 leading-none mb-1">{cust.verificationScore} %</h4>
                                  <p className="text-[10px] font-semibold text-gray-500 uppercase">Agent Verify</p>
                                </>
                              ) : (
                                <div className="space-y-3 pt-1">
                                  <div className="w-16 h-1 bg-gray-300 rounded-full relative overflow-hidden">
                                    <motion.div initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="absolute inset-0 bg-[#24aa4d]" />
                                  </div>
                                  <p className="text-[9px] text-gray-400 font-bold italic uppercase">Polling...</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <button onClick={() => setSelectedCustomerId(null)} className="w-full mt-4 py-2 border-t border-gray-100 text-[10px] font-bold text-gray-400 uppercase hover:text-gray-600">Close</button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                          <div className="flex gap-2">
                            {[
                              <svg key="nav" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>,
                              <svg key="call" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path></svg>,
                              <svg key="info" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                            ].map((icon, i) => (
                              <div key={i} className="w-8 h-8 rounded-lg bg-[#24aa4d] flex items-center justify-center text-white transition-all shadow-sm cursor-pointer hover:bg-emerald-600 active:scale-95">{icon}</div>
                            ))}
                          </div>
                          <p className="text-[11px] font-bold text-gray-900 font-sans">
                            Rs {cust.cashCollected || "2500"}/-
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </aside>
    </div>
  );
}