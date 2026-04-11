// "use client";
// import { useState, useRef, useEffect } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { useSearchParams } from "next/navigation";

// // All liveness + camera logic is unchanged.
// // CHANGE: handleSearch now fetches from MongoDB API.
// // CHANGE: captureFinalImageAndSave now PATCHes the DB record.

// export default function VerifyPage() {
//   const searchParams = useSearchParams();
//   const [loanSearch, setLoanSearch] = useState("");
//   const [error, setError] = useState("");
//   const [foundAccount, setFoundAccount] = useState(null);
//   const [cameraActive, setCameraActive] = useState(false);
//   const [capturedImage, setCapturedImage] = useState(null);
//   const [isVerifying, setIsVerifying] = useState(false);
//   const [verificationResult, setVerificationResult] = useState(null);
//   const videoRef = useRef(null);

//   // Pre-fill loan from URL: /verify?loan=LN123&customerId=abc
//   useEffect(() => {
//     const loanParam = searchParams?.get("loan");
//     if (loanParam) setLoanSearch(loanParam);
//   }, [searchParams]);

//   // Liveness Tracker State
//   const [currentLivenessStep, setCurrentLivenessStep] = useState(0);
//   const [livenessPassed, setLivenessPassed] = useState(false);
//   const [liveDescriptor, setLiveDescriptor] = useState(null);
//   const ctrackerRef = useRef(null);

//   const LIVENESS_TASKS = [
//     {
//       label: "Turn Head Left",
//       check: (landmarks) => {
//         const nose = landmarks.getNose()[3];
//         const leftJaw = landmarks.getJawOutline()[0];
//         const rightJaw = landmarks.getJawOutline()[16];
//         const leftDist = nose.x - leftJaw.x;
//         const rightDist = rightJaw.x - nose.x;
//         // Nose should be much closer to the left edge
//         return leftDist / rightDist < 0.5;
//       }
//     },
//     {
//       label: "Turn Head Right",
//       check: (landmarks) => {
//         const nose = landmarks.getNose()[3];
//         const leftJaw = landmarks.getJawOutline()[0];
//         const rightJaw = landmarks.getJawOutline()[16];
//         const leftDist = nose.x - leftJaw.x;
//         const rightDist = rightJaw.x - nose.x;
//         // Nose should be much closer to the right edge
//         return rightDist / leftDist < 0.5;
//       }
//     },
//     {
//       label: "Smile",
//       check: (landmarks) => {
//         const mouth = landmarks.getMouth();
//         const jaw = landmarks.getJawOutline();
//         const mouthWidth = mouth[6].x - mouth[0].x;
//         const faceWidth = jaw[16].x - jaw[0].x;
//         // Mouth stretches wider relative to face when smiling
//         return (mouthWidth / faceWidth) > 0.45;
//       }
//     },
//     {
//       label: "Open Mouth",
//       check: (landmarks) => {
//         const mouth = landmarks.getMouth();
//         const jaw = landmarks.getJawOutline();
//         const leftEye = landmarks.getLeftEye();

//         // Inner lip distance
//         const gap = mouth[18].y - mouth[14].y;
//         const faceHeight = jaw[8].y - leftEye[0].y;

//         // Significant gap relative to face height
//         return (gap / faceHeight) > 0.08;
//       }
//     }
//   ];

//   useEffect(() => {
//     // Inject lightweight face tracking library
//     const script = document.createElement("script");
//     script.src = "https://cdn.jsdelivr.net/npm/clmtrackr@1.1.2/build/clmtrackr.min.js";
//     script.async = true;
//     document.body.appendChild(script);
//     return () => { document.body.removeChild(script); };
//   }, []);

//   const handleSearch = async (e) => {
//     e.preventDefault();
//     setError("");
//     setFoundAccount(null);
//     setVerificationResult(null);

//     try {
//       // Fetch live agents from MongoDB (same endpoint used by the map page)
//       const res = await fetch("/api/agents/with-customers");
//       if (!res.ok) throw new Error(`Server error: ${res.status}`);

//       const json = await res.json();
//       const liveAgents = json.data || [];

//       // Search by loan number across all agents and their customers
//       let match = null;
//       for (const agent of liveAgents) {
//         const cust = (agent.customers || []).find(
//           (c) => c.loan === loanSearch || c._id === loanSearch
//         );
//         if (cust) {
//           match = { customer: cust, agent };
//           break;
//         }
//       }

//       if (match) {
//         setFoundAccount(match);
//       } else {
//         setError("No matching Loan Account Number found in the database.");
//       }
//     } catch (err) {
//       console.error("[Verify] Search failed:", err);
//       setError("Could not reach the server. Please try again.");
//     }
//   };

//   const startCamera = async () => {
//     setCameraActive(true);
//     setCapturedImage(null);
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
//       if (videoRef.current) {
//         videoRef.current.srcObject = stream;
//         videoRef.current.play();
//       }
//     } catch (err) {
//       setError("Camera access denied or unavailable.");
//       setCameraActive(false);
//     }
//   };

//   const beginRealLivenessCheck = async () => {
//     setIsVerifying(true);
//     setCurrentLivenessStep(0);
//     setLivenessPassed(false);

//     let step = 0;

//     const interval = setInterval(async () => {
//       // Clean exit if already passed
//       if (!videoRef.current || livenessPassed) return;

//       if (!window.faceapi) return;

//       const detection = await window.faceapi
//         .detectSingleFace(
//           videoRef.current,
//           new window.faceapi.TinyFaceDetectorOptions()
//         )
//         .withFaceLandmarks()
//         .withFaceDescriptor();

//       if (!detection) return;

//       const landmarks = detection.landmarks;

//       const task = LIVENESS_TASKS[step];

//       if (task && task.check(landmarks)) {
//         step++;
//         setCurrentLivenessStep(step);

//         if (step >= LIVENESS_TASKS.length) {
//           clearInterval(interval);
//           setLiveDescriptor(detection.descriptor);
//           setLivenessPassed(true);
//         }
//       }

//     }, 500);
//   };

//   const captureFinalImageAndSave = async (descriptorToSave) => {
//     if (!videoRef.current) return;

//     const canvas = document.createElement("canvas");
//     canvas.width = videoRef.current.videoWidth;
//     canvas.height = videoRef.current.videoHeight;
//     const ctx = canvas.getContext("2d");
//     ctx.drawImage(videoRef.current, 0, 0);
//     const imgData = canvas.toDataURL("image/jpeg");

//     // Compare live capture against the agent's saved profile image
//     const agentImage = foundAccount.agent.image;
//     let confidence = foundAccount.agent.faceConfidence || 87;

//     if (agentImage && window.faceapi) {
//       try {
//         const imageToFetch = agentImage.startsWith("/")
//           ? window.location.origin + agentImage
//           : agentImage;
//         const agentImg = await window.faceapi.fetchImage(imageToFetch);
//         const agentDetection = await window.faceapi
//           .detectSingleFace(agentImg, new window.faceapi.TinyFaceDetectorOptions())
//           .withFaceLandmarks()
//           .withFaceDescriptor();
//         if (agentDetection && descriptorToSave) {
//           const distance = window.faceapi.euclideanDistance(descriptorToSave, agentDetection.descriptor);
//           confidence = Math.max(0, Math.round((1 - distance) * 100));
//         }
//       } catch (e) {
//         console.warn("Face comparison failed:", e);
//       }
//     }

//     setCapturedImage(imgData);
//     const stream = videoRef.current.srcObject;
//     if (stream) stream.getTracks().forEach((t) => t.stop());
//     setCameraActive(false);

//     const verificationPayload = {
//       image: imgData,
//       agentImage: agentImage || null,
//       agentName: foundAccount.agent.name,
//       confidence,
//       timestamp: new Date().toLocaleTimeString(),
//     };

//     // 1. Save to localStorage (legacy — used by CustomerDetails for instant display)
//     const loanKey = foundAccount.customer.loan || foundAccount.customer._id;
//     localStorage.setItem("verified_customer_" + loanKey, JSON.stringify(verificationPayload));

//     // 2. Save to MongoDB via PATCH (persistent — survives page refresh)
//     const customerId = foundAccount.customer._id ||
//       new URLSearchParams(window.location.search).get("customerId");
//     if (customerId) {
//       try {
//         await fetch(`/api/customer/${customerId}`, {
//           method: "PATCH",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ verifiedAgentImage: imgData }),
//         });
//         console.log("[Verify] Image saved to DB ✓");
//       } catch (err) {
//         console.warn("[Verify] DB save failed (localStorage used as fallback):", err);
//       }
//     }

//     // Set result state — shows the side-by-side comparison UI
//     setVerificationResult({
//       capturedImage: imgData,
//       agentImage,
//       agentName: foundAccount.agent.name,
//       confidence,
//       loanKey,
//     });

//     toast.success(`Verification Complete — ${confidence}% Match`);
//   };

//   const simulateFallbackLiveness = () => {
//     let stepIdx = 0;
//     const interval = setInterval(() => {
//       stepIdx++;
//       setCurrentLivenessStep(stepIdx);
//       if (stepIdx >= LIVENESS_TASKS.length) {
//         clearInterval(interval);
//         captureFinalImageAndSave();
//       }
//     }, 1500);
//   };

//   useEffect(() => {
//     // Inject face-api.js from CDN
//     const script = document.createElement("script");
//     script.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
//     script.async = true;
//     script.onload = async () => {
//       const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";
//       try {
//         await window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
//         await window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
//         await window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
//         console.log("FaceAPI models loaded successfully from CDN!");
//       } catch (e) {
//         console.error("Failed to load FaceAPI models", e);
//       }
//     };
//     document.body.appendChild(script);

//     // Cleanup if needed
//     return () => { document.body.removeChild(script); };
//   }, []);

//   return (
//     <div className="h-screen bg-black text-white p-8 font-sans overflow-y-auto">
//       <div className="max-w-3xl mx-auto space-y-8">
//         <h1 className="text-4xl font-black text-[#24aa4d] tracking-wide text-center uppercase">
//           Identity Verification
//         </h1>

//         {/* Step 1: Search */}
//         {!foundAccount && (
//           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/5 border border-white/10 p-8 rounded-2xl shadow-xl">
//             <h2 className="text-xl font-bold mb-4">Enter Loan Details</h2>
//             <form onSubmit={handleSearch} className="flex gap-4">
//               <input
//                 type="text"
//                 placeholder="Enter Loan Account Number (e.g. LN123)"
//                 className="flex-1 bg-black/50 border border-white/20 rounded-lg px-4 py-3 outline-none focus:border-[#24aa4d] text-white transition-colors"
//                 value={loanSearch}
//                 onChange={(e) => setLoanSearch(e.target.value)}
//                 required
//                 suppressHydrationWarning
//               />
//               <button type="submit" className="bg-[#24aa4d] text-white font-bold py-3 px-8 rounded-lg hover:bg-[#24aa4d]/90 shadow-lg">
//                 Search
//               </button>
//             </form>
//             {error && <p className="text-red-500 mt-4 text-sm font-semibold">{error}</p>}
//           </motion.div>
//         )}

//         {/* Step 2: Found Info & Camera UI */}
//         {foundAccount && (
//           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/5 border border-white/10 p-8 rounded-2xl shadow-xl space-y-6">
//             <div className="p-4 bg-[#24aa4d]/10 border border-[#24aa4d]/30 rounded-xl">
//               <h3 className="text-[#24aa4d] font-bold text-lg mb-2">Loan Assigned to: {foundAccount.agent.name}</h3>
//               <p className="text-gray-300">Customer Name: <span className="font-bold text-white">{foundAccount.customer.name}</span></p>
//               <p className="text-gray-300">Loan Number: <span className="font-bold text-white">{foundAccount.customer.loan}</span></p>
//             </div>

//             <div className="text-center">
//               {!cameraActive && !capturedImage && !isVerifying && (
//                 <button onClick={startCamera} className="bg-[#24aa4d] text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-[#24aa4d]/90">
//                   Start Camera for Liveness Verification
//                 </button>
//               )}

//               {cameraActive && (
//                 <div className="flex flex-col items-center space-y-4">
//                   <div className="relative w-full max-w-md rounded-2xl overflow-hidden border-4 border-[#24aa4d]/50 bg-black">
//                     <video ref={videoRef} autoPlay muted playsInline className="w-full h-auto object-cover transform -scale-x-100"></video>
//                     <div className="absolute flex flex-col items-center justify-center inset-0 border-2 border-dashed border-[#24aa4d]/70 rounded-full m-8 opacity-60 pointer-events-none">
//                       <span className="text-white text-xs opacity-70 mt-auto mb-4">Align Face</span>
//                     </div>
//                   </div>

//                   {!isVerifying ? (
//                     <button onClick={beginRealLivenessCheck} className="bg-blue-600 text-white hover:bg-blue-500 transition-colors font-bold py-3 px-8 rounded-lg shadow-lg">
//                       Begin Real Liveness Checks
//                     </button>
//                   ) : (
//                     <div className="py-6 flex flex-col items-center justify-center space-y-4">
//                       <div className="flex gap-2">
//                         {LIVENESS_TASKS.map((task, idx) => (
//                           <div key={idx} className={`w-3 h-3 rounded-full ${idx < currentLivenessStep ? "bg-[#24aa4d]" : idx === currentLivenessStep && !livenessPassed ? "bg-white animate-pulse" : "bg-gray-600"}`} />
//                         ))}
//                       </div>

//                       {!livenessPassed ? (
//                         <>
//                           <p className="text-2xl text-[#24aa4d] font-black animate-pulse">
//                             {currentLivenessStep < LIVENESS_TASKS.length ? LIVENESS_TASKS[currentLivenessStep].label : "Evaluating..."}
//                           </p>
//                           <p className="text-gray-400 font-semibold tracking-wider text-sm uppercase">Please follow the instructions on screen</p>
//                         </>
//                       ) : (
//                         <motion.button
//                           initial={{ scale: 0.8 }} animate={{ scale: 1 }}
//                           onClick={() => captureFinalImageAndSave(liveDescriptor)}
//                           className="bg-[#24aa4d] text-white hover:bg-[#1e8f40] transition-colors font-bold py-4 px-10 rounded-lg shadow-2xl text-lg flex items-center gap-3"
//                         >
//                           📸 Capture Final Image
//                         </motion.button>
//                       )}
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           </motion.div>
//         )}

//         {/* ── RESULT SCREEN: Side-by-side comparison ─────────────────────────
//              Shown after capture. Left = agent DB photo, Right = live selfie.
//              Matches the reference screenshot design.
//         ──────────────────────────────────────────────────────────────────── */}
//         {verificationResult && (
//           <motion.div
//             initial={{ opacity: 0, scale: 0.96 }}
//             animate={{ opacity: 1, scale: 1 }}
//             className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
//           >
//             <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-3xl shadow-[0_40px_80px_rgba(120,0,200,0.3)] w-full max-w-md overflow-hidden">
//               {/* Header */}
//               <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10 bg-gradient-to-r from-purple-900/40 to-transparent">
//                 <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
//                   <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
//                     <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
//                     <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
//                   </svg>
//                 </div>
//                 <div>
//                   <h2 className="font-black text-white">Agent Verification</h2>
//                   <p className="text-gray-400 text-xs">Field agent selfie submission</p>
//                 </div>
//               </div>

//               {/* Side-by-side photos */}
//               <div className="px-8 pt-8 pb-4">
//                 <div className="grid grid-cols-2 gap-4">
//                   {/* Left: Known Agent Avatar from DB */}
//                   <div className="flex flex-col items-center gap-2">
//                     <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-white/10 bg-white/5">
//                       {verificationResult.agentImage ? (
//                         <img
//                           src={verificationResult.agentImage}
//                           alt="Known agent avatar"
//                           className="w-full h-full object-cover"
//                         />
//                       ) : (
//                         <div className="w-full h-full flex items-center justify-center">
//                           <span className="text-gray-500 text-xs text-center px-2">No agent photo in DB</span>
//                         </div>
//                       )}
//                     </div>
//                     <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
//                       Known <span className="text-white">Avatar</span>
//                     </p>
//                   </div>

//                   {/* Right: Live Selfie Captured */}
//                   <div className="flex flex-col items-center gap-2">
//                     <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-white/10 bg-black">
//                       <img
//                         src={verificationResult.capturedImage}
//                         alt="Your selfie"
//                         className="w-full h-full object-cover scale-x-[-1]"
//                       />
//                     </div>
//                     <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
//                       Your <span className="text-white">Selfie</span>
//                     </p>
//                   </div>
//                 </div>
//               </div>

//               {/* Result verdict */}
//               <div className="px-8 pb-8 flex flex-col items-center gap-4">
//                 {/* Icon */}
//                 <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${verificationResult.confidence >= 60
//                   ? "bg-[#24aa4d] shadow-[0_0_30px_rgba(36,170,77,0.5)]"
//                   : "bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]"
//                   }`}>
//                   {verificationResult.confidence >= 60 ? (
//                     <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
//                       <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
//                     </svg>
//                   ) : (
//                     <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
//                       <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
//                     </svg>
//                   )}
//                 </div>

//                 {/* Status label */}
//                 <div className="text-center">
//                   <p className={`text-2xl font-black ${verificationResult.confidence >= 60 ? "text-[#24aa4d]" : "text-red-500"
//                     }`}>
//                     {verificationResult.confidence >= 60 ? "Verified" : "Unverified"}
//                   </p>
//                   <p className="text-gray-400 text-sm mt-1">
//                     Confidence score:{" "}
//                     <span className="font-black text-white">{verificationResult.confidence}%</span>
//                   </p>
//                   <p className="text-gray-600 text-xs mt-0.5">Agent: {verificationResult.agentName}</p>
//                 </div>

//                 {/* Action buttons */}
//                 <div className="flex gap-3 w-full mt-2">
//                   <button
//                     onClick={() => {
//                       setVerificationResult(null);
//                       setCapturedImage(null);
//                       setFoundAccount(null);
//                       setLoanSearch("");
//                       setCurrentLivenessStep(0);
//                       setLivenessPassed(false);
//                       setIsVerifying(false);
//                     }}
//                     className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm transition-all"
//                   >
//                     Start Over
//                   </button>
//                   <button
//                     onClick={() => {
//                       window.location.href = "/?verified=" + verificationResult.loanKey;
//                     }}
//                     className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all"
//                   >
//                     Back to Map →
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </motion.div>
//         )}

//       </div>
//       <ToastContainer position="bottom-center" theme="dark" />
//     </div>
//   );
// }
// app/verify/page.tsx (Integrated Version)
"use client";
export const dynamic = "force-dynamic";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSearchParams } from "next/navigation";

// Liveness detection configuration
const LIVENESS_TASKS = [
  {
    id: "look_left",
    label: "Turn Head Left",
    instruction: "Slowly turn your head to the LEFT",
    check: (landmarks) => {
      if (!landmarks) return false;
      const nose = landmarks.getNose()[3];
      const leftJaw = landmarks.getJawOutline()[0];
      const rightJaw = landmarks.getJawOutline()[16];
      const leftDist = nose.x - leftJaw.x;
      const rightDist = rightJaw.x - nose.x;
      return leftDist / rightDist < 0.5;
    }
  },
  {
    id: "look_right",
    label: "Turn Head Right",
    instruction: "Slowly turn your head to the RIGHT",
    check: (landmarks) => {
      if (!landmarks) return false;
      const nose = landmarks.getNose()[3];
      const leftJaw = landmarks.getJawOutline()[0];
      const rightJaw = landmarks.getJawOutline()[16];
      const leftDist = nose.x - leftJaw.x;
      const rightDist = rightJaw.x - nose.x;
      return rightDist / leftDist < 0.5;
    }
  },
  {
    id: "smile",
    label: "Smile",
    instruction: "Show a natural smile",
    check: (landmarks) => {
      if (!landmarks) return false;
      const mouth = landmarks.getMouth();
      const jaw = landmarks.getJawOutline();
      const mouthWidth = mouth[6].x - mouth[0].x;
      const faceWidth = jaw[16].x - jaw[0].x;
      return (mouthWidth / faceWidth) > 0.45;
    }
  },
  {
    id: "open_mouth",
    label: "Open Mouth",
    instruction: "Open your mouth slightly",
    check: (landmarks) => {
      if (!landmarks) return false;
      const mouth = landmarks.getMouth();
      const jaw = landmarks.getJawOutline();
      const leftEye = landmarks.getLeftEye();
      const gap = mouth[18].y - mouth[14].y;
      const faceHeight = jaw[8].y - leftEye[0].y;
      return (gap / faceHeight) > 0.08;
    }
  },
  {
    id: "blink",
    label: "Blink Once",
    instruction: "Blink your eyes naturally",
    check: (landmarks) => {
      if (!landmarks) return false;
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      const leftEyeHeight = Math.abs(leftEye[3].y - leftEye[0].y);
      const rightEyeHeight = Math.abs(rightEye[3].y - rightEye[0].y);
      return leftEyeHeight < 5 && rightEyeHeight < 5;
    }
  }
];

export default function AgentVerificationPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const searchParams = useSearchParams();
  const [loanSearch, setLoanSearch] = useState("");

  const [error, setError] = useState("");
  const [foundCustomer, setFoundCustomer] = useState(null);
  const [foundAgent, setFoundAgent] = useState(null);

  if (!mounted) return null;

  // Camera & Liveness States

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [livenessStep, setLivenessStep] = useState(0);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [liveDescriptor, setLiveDescriptor] = useState(null);
  const [livenessScore, setLivenessScore] = useState(0);
  const [livenessMessage, setLivenessMessage] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const livenessIntervalRef = useRef(null);

  // Pre-fill loan from URL
  useEffect(() => {
    const loanParam = searchParams?.get("loan");
    if (loanParam) setLoanSearch(loanParam);
  }, [searchParams]);

  // Load Face-API.js
  useEffect(() => {
    const loadFaceAPI = async () => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
      script.async = true;
      script.onload = async () => {
        const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";
        try {
          await window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
          await window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
          await window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
          console.log("✅ FaceAPI models loaded");
        } catch (e) {
          console.error("❌ Failed to load FaceAPI models", e);
        }
      };
      document.body.appendChild(script);
    };
    loadFaceAPI();
  }, []);

  // Search for loan account
  const handleSearch = async (e) => {
    e.preventDefault();
    setError("");
    setFoundCustomer(null);
    setFoundAgent(null);
    setVerificationResult(null);

    try {
      const res = await fetch("/api/agents/with-customers");
      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const json = await res.json();
      const agents = json.data || [];

      // Search for matching loan
      let match = null;
      for (const agent of agents) {
        const customer = (agent.customers || []).find(
          (c) => c.loan === loanSearch || c._id === loanSearch
        );
        if (customer) {
          match = { customer, agent };
          break;
        }
      }

      if (match) {
        setFoundCustomer(match.customer);
        setFoundAgent(match.agent);
      } else {
        setError("No matching Loan Account Number found.");
      }
    } catch (err) {
      console.error("[Verify] Search failed:", err);
      setError("Could not reach the server. Please try again.");
    }
  };

  // Start camera
  const startCamera = async () => {
    setCameraActive(true);
    setCapturedImage(null);
    setVerificationResult(null);
    setLivenessStep(0);
    setLivenessPassed(false);
    setLivenessScore(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setError("Camera access denied or unavailable.");
      setCameraActive(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Start liveness detection sequence
  const startLivenessCheck = async () => {
    setIsVerifying(true);
    setLivenessStep(0);
    setLivenessPassed(false);
    setLivenessScore(0);

    let currentStep = 0;
    let stepCompleted = false;

    // Clear any existing interval
    if (livenessIntervalRef.current) {
      clearInterval(livenessIntervalRef.current);
    }

    livenessIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !window.faceapi || livenessPassed) return;

      try {
        const detection = await window.faceapi
          .detectSingleFace(
            videoRef.current,
            new window.faceapi.TinyFaceDetectorOptions()
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) {
          setLivenessMessage("No face detected. Please center your face.");
          return;
        }

        setLivenessMessage("");
        const task = LIVENESS_TASKS[currentStep];

        if (task && task.check(detection.landmarks) && !stepCompleted) {
          stepCompleted = true;
          currentStep++;
          setLivenessStep(currentStep);

          // Show success feedback
          toast.success(`✓ ${task.label} completed!`, { autoClose: 1000 });

          if (currentStep >= LIVENESS_TASKS.length) {
            // All liveness checks passed
            clearInterval(livenessIntervalRef.current);
            setLiveDescriptor(detection.descriptor);
            setLivenessPassed(true);
            setLivenessScore(95); // High score for passing all checks
            setLivenessMessage("Liveness verification passed!");
            toast.success("✅ Liveness verification passed!");
            setIsVerifying(false);
          }
        }
      } catch (err) {
        console.error("Liveness check error:", err);
      }
    }, 500);
  };

  // Capture final image and compare with agent
  const captureAndVerify = async () => {
    if (!videoRef.current || !liveDescriptor) {
      toast.error("Please complete liveness check first");
      return;
    }

    // Capture image from video
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0);
    const capturedImageData = canvas.toDataURL("image/jpeg");

    setCapturedImage(capturedImageData);

    // Compare with agent's profile image
    let faceMatchConfidence = 0;
    let faceMatchMessage = "";

    if (foundAgent?.image && window.faceapi) {
      try {
        const agentImageUrl = foundAgent.image.startsWith("/")
          ? window.location.origin + foundAgent.image
          : foundAgent.image;

        const agentImg = await window.faceapi.fetchImage(agentImageUrl);
        const agentDetection = await window.faceapi
          .detectSingleFace(agentImg, new window.faceapi.TinyFaceDetectorOptions())
          .withFaceDescriptor();

        if (agentDetection && liveDescriptor) {
          const distance = window.faceapi.euclideanDistance(liveDescriptor, agentDetection.descriptor);
          faceMatchConfidence = Math.max(0, Math.round((1 - distance) * 100));
          faceMatchMessage = faceMatchConfidence >= 70
            ? "Face matches agent profile"
            : "Face does not match agent profile";
        } else {
          faceMatchMessage = "Could not detect face in agent photo";
        }
      } catch (e) {
        console.warn("Face comparison failed:", e);
        faceMatchMessage = "Face comparison failed";
      }
    } else {
      faceMatchMessage = "No agent profile image available for comparison";
    }

    // Calculate final verification score (60% liveness + 40% face match)
    const finalScore = Math.round((livenessScore * 0.6) + (faceMatchConfidence * 0.4));
    const isVerified = finalScore >= 65;

    // Prepare verification payload
    const verificationPayload = {
      customerId: foundCustomer._id,
      customerName: foundCustomer.name,
      loanNumber: foundCustomer.loan,
      agentId: foundAgent._id,
      agentName: foundAgent.name,
      capturedImage: capturedImageData,
      agentImage: foundAgent.image,
      livenessScore,
      faceMatchConfidence,
      finalScore,
      isVerified,
      livenessStepsPassed: livenessStep,
      timestamp: new Date().toISOString(),
      verifiedBy: "field-agent"
    };

    // Save to backend
    try {
      const saveRes = await fetch("/api/agent-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verificationPayload)
      });

      if (saveRes.ok) {
        toast.success("Verification saved to database");
      } else {
        console.warn("Failed to save to database");
      }
    } catch (err) {
      console.warn("Database save failed:", err);
    }

    // Save to localStorage as fallback
    localStorage.setItem(
      `verification_${foundCustomer.loan}`,
      JSON.stringify(verificationPayload)
    );

    // Stop camera
    stopCamera();

    // Show result
    setVerificationResult({
      ...verificationPayload,
      capturedImage: capturedImageData
    });

    toast[isVerified ? "success" : "error"](
      isVerified
        ? `✅ Verification Passed! Score: ${finalScore}%`
        : `❌ Verification Failed! Score: ${finalScore}%`
    );
  };

  // Cancel and reset
  const resetVerification = () => {
    stopCamera();
    if (livenessIntervalRef.current) {
      clearInterval(livenessIntervalRef.current);
    }
    setCameraActive(false);
    setIsVerifying(false);
    setCapturedImage(null);
    setVerificationResult(null);
    setLivenessStep(0);
    setLivenessPassed(false);
    setLiveDescriptor(null);
    setLivenessScore(0);
    setLivenessMessage("");
    setFoundCustomer(null);
    setFoundAgent(null);
    setLoanSearch("");
  };

  // Retry verification
  const retryVerification = () => {
    setVerificationResult(null);
    setCapturedImage(null);
    setLivenessStep(0);
    setLivenessPassed(false);
    setLiveDescriptor(null);
    startCamera();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-green-400 to-purple-400 bg-clip-text text-transparent">
            Agent Identity Verification
          </h1>
          <p className="text-gray-400 mt-2">Verify your identity to complete customer verification</p>
        </div>

        {/* Step 1: Search Loan */}
        {!foundCustomer && !verificationResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
          >
            <h2 className="text-xl font-bold mb-4">Enter Customer Loan Details</h2>
            <form onSubmit={handleSearch} className="space-y-4">
              <input
                type="text"
                placeholder="Loan Account Number (e.g., LN123456)"
                className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 outline-none focus:border-green-500 transition-colors"
                value={loanSearch}
                onChange={(e) => setLoanSearch(e.target.value)}
                required
              />
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 font-bold py-3 rounded-lg transition-all transform hover:scale-105"
              >
                Search Loan
              </button>
            </form>
            {error && (
              <p className="text-red-400 mt-4 text-sm">{error}</p>
            )}
          </motion.div>
        )}

        {/* Step 2: Customer & Agent Info */}
        {foundCustomer && foundAgent && !cameraActive && !verificationResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-green-400 font-bold text-lg mb-3">Customer Information</h3>
              <div className="space-y-2">
                <p><span className="text-gray-400">Name:</span> {foundCustomer.name}</p>
                <p><span className="text-gray-400">Loan Number:</span> {foundCustomer.loan}</p>
                <p><span className="text-gray-400">Assigned Agent:</span> {foundAgent.name}</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-purple-400 font-bold text-lg mb-3">Agent Profile</h3>
              <div className="flex items-center gap-4">
                {foundAgent.image ? (
                  <img
                    src={foundAgent.image}
                    alt={foundAgent.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-purple-400"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <span className="text-2xl">👤</span>
                  </div>
                )}
                <div>
                  <p className="font-bold">{foundAgent.name}</p>
                  <p className="text-sm text-gray-400">{foundAgent.role || "Field Agent"}</p>
                </div>
              </div>
            </div>

            <button
              onClick={startCamera}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 font-bold py-4 rounded-lg transition-all transform hover:scale-105 text-lg"
            >
              Start Verification (Camera)
            </button>
          </motion.div>
        )}

        {/* Step 3: Camera & Liveness Check */}
        {cameraActive && !verificationResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
          >
            {/* Video Feed */}
            <div className="relative mb-6">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg border-2 border-purple-500/50 transform -scale-x-100"
              />

              {/* Face Guide Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 rounded-full border-2 border-dashed border-green-400 opacity-60"></div>
              </div>
            </div>

            {/* Liveness Progress */}
            {!isVerifying && !livenessPassed && (
              <button
                onClick={startLivenessCheck}
                className="w-full bg-green-500 hover:bg-green-600 font-bold py-3 rounded-lg transition-colors"
              >
                Start Liveness Check
              </button>
            )}

            {isVerifying && !livenessPassed && (
              <div className="space-y-4">
                <div className="flex justify-center gap-2">
                  {LIVENESS_TASKS.map((task, idx) => (
                    <div
                      key={task.id}
                      className={`w-3 h-3 rounded-full transition-all ${idx < livenessStep
                        ? "bg-green-500"
                        : idx === livenessStep
                          ? "bg-yellow-500 animate-pulse"
                          : "bg-gray-600"
                        }`}
                    />
                  ))}
                </div>

                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">
                    {livenessStep < LIVENESS_TASKS.length
                      ? LIVENESS_TASKS[livenessStep].label
                      : "Completed!"}
                  </p>
                  <p className="text-gray-400 mt-2">
                    {livenessStep < LIVENESS_TASKS.length
                      ? LIVENESS_TASKS[livenessStep].instruction
                      : "Liveness check passed!"}
                  </p>
                  {livenessMessage && (
                    <p className="text-yellow-400 text-sm mt-2">{livenessMessage}</p>
                  )}
                </div>
              </div>
            )}

            {livenessPassed && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-5xl mb-2">✅</div>
                  <p className="text-green-400 font-bold">Liveness Check Passed!</p>
                  <p className="text-sm text-gray-400">Score: {livenessScore}%</p>
                </div>
                <button
                  onClick={captureAndVerify}
                  className="w-full bg-purple-500 hover:bg-purple-600 font-bold py-3 rounded-lg transition-colors"
                >
                  Capture & Verify Identity
                </button>
              </div>
            )}

            <button
              onClick={stopCamera}
              className="w-full mt-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        )}

        {/* Step 4: Verification Result */}
        {verificationResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
          >
            <h2 className="text-2xl font-bold text-center mb-6">
              Verification {verificationResult.isVerified ? "Passed ✓" : "Failed ✗"}
            </h2>

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center">
                <div className="bg-black/50 rounded-lg overflow-hidden mb-2 aspect-square">
                  {verificationResult.agentImage ? (
                    <img
                      src={verificationResult.agentImage}
                      alt="Agent Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-500">No Image</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-400">Agent Profile</p>
              </div>
              <div className="text-center">
                <div className="bg-black/50 rounded-lg overflow-hidden mb-2 aspect-square">
                  <img
                    src={verificationResult.capturedImage}
                    alt="Captured Selfie"
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                </div>
                <p className="text-sm text-gray-400">Your Selfie</p>
              </div>
            </div>

            {/* Scores */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Liveness Score:</span>
                <span className={`font-bold ${verificationResult.livenessScore >= 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {verificationResult.livenessScore}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Face Match Score:</span>
                <span className={`font-bold ${verificationResult.faceMatchConfidence >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                  {verificationResult.faceMatchConfidence}%
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="font-bold">Final Score:</span>
                <span className={`text-2xl font-bold ${verificationResult.isVerified ? 'text-green-400' : 'text-red-400'}`}>
                  {verificationResult.finalScore}%
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={retryVerification}
                className="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 font-bold py-2 rounded-lg transition-colors"
              >
                Retry
              </button>
              <button
                onClick={resetVerification}
                className="flex-1 bg-green-500 hover:bg-green-600 font-bold py-2 rounded-lg transition-colors"
              >
                New Verification
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <ToastContainer position="bottom-center" theme="dark" />
    </div>
  );
}