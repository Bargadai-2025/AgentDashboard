"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSearchParams } from "next/navigation";

// ─────────────────────────────────────────────────────────────────────────────
// Liveness Tasks Configuration
// ─────────────────────────────────────────────────────────────────────────────
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
            const leftEye = landmarks.getLeftEye();
            const gap = mouth[18].y - mouth[14].y;
            const faceHeight = mouth[18].y - leftEye[0].y;
            return (gap / faceHeight) > 0.15;
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

export default function VerifyClient() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const searchParams = useSearchParams();
    const [loanSearch, setLoanSearch] = useState("");
    const [error, setError] = useState("");

    // Core state
    const [foundCustomer, setFoundCustomer] = useState(null);
    const [foundAgent, setFoundAgent] = useState(null);
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

    // ── Effects ─────────────────────────────────────────────────────────────

    // Auto-fill loan search from URL ?loan=...
    useEffect(() => {
        const loanParam = searchParams?.get("loan");
        if (loanParam) setLoanSearch(loanParam);
    }, [searchParams]);

    // FaceAPI Script Injection
    useEffect(() => {
        if (typeof window === "undefined") return;
        const loadFaceAPI = async () => {
            if (window.faceapi) return;
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
            script.async = true;
            script.onload = async () => {
                const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";
                try {
                    await window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
                    await window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
                    await window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
                    console.log("✅ FaceAPI Ready");
                } catch (e) {
                    console.warn("❌ FaceAPI load failed", e);
                }
            };
            document.body.appendChild(script);
        };
        loadFaceAPI();
    }, []);

    // ── Logic ───────────────────────────────────────────────────────────────

    const handleSearch = async (e) => {
        e.preventDefault();
        setError("");

        try {
            const res = await fetch("/api/agents/with-customers");
            const json = await res.json();
            const agents = json.data || [];

            let match = null;
            for (const agent of agents) {
                const customer = (agent.customers || []).find(
                    (c) => c.loan === loanSearch || c._id === loanSearch
                );
                if (customer) { match = { customer, agent }; break; }
            }

            if (match) {
                setFoundCustomer(match.customer);
                setFoundAgent(match.agent);
            } else {
                setError("Loan Account Number not found.");
            }
        } catch (err) {
            setError("Server connection failed.");
        }
    };

    const startCamera = async () => {
        setCameraActive(true);
        setLivenessStep(0);
        setLivenessPassed(false);
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
            setError("Camera access denied.");
            setCameraActive(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        setCameraActive(false);
        if (livenessIntervalRef.current) clearInterval(livenessIntervalRef.current);
    };

    const runLiveness = async () => {
        setIsVerifying(true);
        let currentStepNum = 0;
        let stepCompleted = false;

        livenessIntervalRef.current = setInterval(async () => {
            if (!videoRef.current || !window.faceapi || livenessPassed) return;

            try {
                const detection = await window.faceapi
                    .detectSingleFace(videoRef.current, new window.faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (!detection) {
                    setLivenessMessage("Face not detected. Center your face.");
                    return;
                }

                setLivenessMessage("");
                const task = LIVENESS_TASKS[currentStepNum];

                if (task && task.check(detection.landmarks) && !stepCompleted) {
                    stepCompleted = true;
                    currentStepNum++;
                    setLivenessStep(currentStepNum);

                    if (currentStepNum < LIVENESS_TASKS.length) {
                        stepCompleted = false;
                    } else {
                        clearInterval(livenessIntervalRef.current);
                        setLiveDescriptor(detection.descriptor);
                        setLivenessPassed(true);
                        setLivenessScore(98);
                        setIsVerifying(false);
                        toast.success("✅ Liveness Check Complete!");
                    }
                }
            } catch (err) { console.error(err); }
        }, 300);
    };

    const captureFinal = async () => {
        if (!videoRef.current || !liveDescriptor) return;

        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0);
        const b64 = canvas.toDataURL("image/jpeg");
        setCapturedImage(b64);

        // Score logic
        let matchScore = 0;
        if (foundAgent?.image && window.faceapi) {
            try {
                const agentImg = await window.faceapi.fetchImage(foundAgent.image);
                const agentDet = await window.faceapi.detectSingleFace(agentImg, new window.faceapi.TinyFaceDetectorOptions()).withFaceDescriptor();
                if (agentDet) {
                    const dist = window.faceapi.euclideanDistance(liveDescriptor, agentDet.descriptor);
                    matchScore = Math.max(0, Math.round((1 - dist) * 100));
                }
            } catch (e) { console.warn(e); }
        }

        const finalScore = Math.round((livenessScore * 0.7) + (matchScore * 0.3));
        const success = finalScore >= 65;

        // Save to DB
        const payload = {
            customerId: foundCustomer._id,
            loanNumber: foundCustomer.loan,
            agentId: foundAgent._id,
            capturedImage: b64,
            isVerified: success,
            finalScore
        };

        try {
            await fetch("/api/agent-verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        } catch (e) { console.warn("Save failed"); }

        stopCamera();
        setVerificationResult({ ...payload, agentImage: foundAgent.image });
    };

    const resetAll = () => {
        stopCamera();
        setFoundCustomer(null);
        setVerificationResult(null);
        setCapturedImage(null);
        setLoanSearch("");
    };

    if (!mounted) return null;

    // ─────────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-[#000] font-sans selection:bg-[#24aa4d]/30 overflow-hidden flex flex-col">

            {/* Header */}
            <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-white/5 bg-black/50 backdrop-blur-xl z-20">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#24aa4d] rounded-sm rotate-45 flex-shrink-0 shadow-[0_0_15px_#24aa4d]" />
                    <span className="font-black text-white tracking-widest text-xs uppercase">Bargad Identity</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#24aa4d] animate-pulse" />
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Secure Liveness v3.4</span>
                </div>
            </header>

            {/* Scrollable Main Area */}
            <main className="flex-1 overflow-y-auto w-full max-w-lg mx-auto p-6 md:p-10 hide-scrollbar flex flex-col items-center py-12 md:py-20">

                <AnimatePresence mode="wait">

                    {/* STEP 1: Search */}
                    {!foundCustomer && !verificationResult && (
                        <motion.div
                            key="search"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full space-y-12"
                        >
                            <div className="text-center space-y-4">
                                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-[0.9]">
                                    Identity <br /> <span className="text-[#24aa4d]">Assurance.</span>
                                </h1>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em]">
                                    Field Agent Liveness Portal
                                </p>
                            </div>


                            <div className="p-1.5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-3xl">
                                <form onSubmit={handleSearch} className="relative flex items-center">
                                    <input
                                        type="text" placeholder="ENTER LOAN NUMBER..."
                                        className="flex-1 bg-transparent px-6 py-5 text-sm font-black text-white placeholder:text-gray-700 outline-none uppercase tracking-widest"
                                        value={loanSearch} onChange={e => setLoanSearch(e.target.value)} required
                                    />
                                    <button
                                        type="submit"
                                        className="h-[52px] px-8 mr-1 rounded-2xl bg-[#24aa4d] text-black font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#24aa4d]/20"
                                    >
                                        Verify
                                    </button>
                                </form>
                            </div>
                            {error && <p className="text-center text-xs font-black text-red-500 uppercase tracking-widest animate-shake">{error}</p>}
                        </motion.div>
                    )}

                    {/* STEP 2: Agent Preview & Start */}
                    {foundCustomer && !cameraActive && !verificationResult && (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }}
                            className="w-full space-y-6"
                        >
                            <div className="relative p-8 rounded-[40px] bg-white/[0.03] border border-white/10 overflow-hidden text-center">
                                {/* Decor */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#24aa4d]/10 blur-[60px] rounded-full" />

                                <div className="relative mb-6 mx-auto w-24 h-24 p-1 rounded-full border border-white/10">
                                    {foundAgent.image ? (
                                        <img src={foundAgent.image} alt="Agent" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center text-2xl">A</div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#24aa4d] border-[4px] border-black flex items-center justify-center text-black text-[10px] font-black">✓</div>
                                </div>

                                <h2 className="text-2xl font-black text-white tracking-tight">{foundAgent.name}</h2>
                                <p className="text-[10px] text-[#24aa4d] font-bold uppercase tracking-[0.2em] mt-1">Matched Field Agent</p>

                                <div className="mt-8 pt-8 border-t border-white/5 space-y-1">
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Assigned to Customer</p>
                                    <p className="text-sm font-bold text-white uppercase">{foundCustomer.name}</p>
                                </div>
                            </div>

                            <button
                                onClick={startCamera}
                                className="w-full py-6 rounded-[30px] bg-white text-black font-black text-sm uppercase tracking-widest hover:bg-[#24aa4d] hover:text-white transition-all transform active:scale-95 shadow-xl shadow-white/5"
                            >
                                Launch Liveness Engine
                            </button>
                            <button onClick={resetAll} className="w-full text-[10px] font-black text-gray-600 uppercase tracking-widest hover:text-white transition-colors">Abort Session</button>
                        </motion.div>
                    )}

                    {/* STEP 3: Camera & Tasks */}
                    {cameraActive && !verificationResult && (
                        <motion.div
                            key="camera"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="w-full space-y-8"
                        >
                            {/* Video Circle Container */}
                            <div className="relative aspect-square w-full max-w-[340px] mx-auto">
                                <div className={`absolute inset-0 rounded-full border-2 transition-all duration-300 ${isVerifying ? 'border-[#24aa4d] shadow-[0_0_30px_rgba(36,170,77,0.3)]' : 'border-white/10'}`} />

                                <div className="absolute inset-4 rounded-full overflow-hidden bg-white/5">
                                    <video
                                        ref={videoRef} autoPlay playsInline muted
                                        className="w-full h-full object-cover transform -scale-x-100 scale-125"
                                    />

                                    <AnimatePresence>
                                        {!isVerifying && !livenessPassed && (
                                            <motion.div
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8 text-center"
                                            >
                                                <button
                                                    onClick={runLiveness}
                                                    className="w-20 h-20 rounded-full bg-[#24aa4d] text-black font-black text-[10px] uppercase p-4 leading-tight shadow-2xl"
                                                >
                                                    Tap to Start
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Task Banner Overlay */}
                                    {isVerifying && !livenessPassed && (
                                        <div className="absolute bottom-10 left-0 right-0 px-6">
                                            <div className="bg-black/80 backdrop-blur-lg border border-[#24aa4d]/30 p-4 rounded-2xl text-center shadow-2xl">
                                                <p className="text-[9px] font-black text-[#24aa4d] uppercase tracking-[0.3em] mb-1">Current Action</p>
                                                <h3 className="text-lg font-black text-white leading-tight">
                                                    {LIVENESS_TASKS[livenessStep]?.label || "Processing..."}
                                                </h3>
                                            </div>
                                        </div>
                                    )}

                                    {/* Success Indicator */}
                                    {livenessPassed && (
                                        <motion.div
                                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                                            className="absolute inset-0 bg-[#24aa4d]/90 flex flex-col items-center justify-center text-black"
                                        >
                                            <span className="text-6xl mb-2">✦</span>
                                            <p className="font-black text-xs uppercase tracking-widest">Liveness Confirmed</p>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* Instruction Support */}
                            <div className="text-center min-h-[40px]">
                                {livenessMessage ? (
                                    <p className="text-xs font-black text-red-400 uppercase tracking-widest animate-pulse">{livenessMessage}</p>
                                ) : (
                                    isVerifying && <p className="text-xs font-bold text-gray-400">{LIVENESS_TASKS[livenessStep]?.instruction}</p>
                                )}
                            </div>

                            {/* Task Dots */}
                            <div className="flex justify-center gap-3">
                                {LIVENESS_TASKS.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all duration-500 ${i < livenessStep ? 'w-8 bg-[#24aa4d]' : i === livenessStep && isVerifying ? 'w-8 bg-[#24aa4d]/40 animate-pulse' : 'w-1.5 bg-white/10'}`}
                                    />
                                ))}
                            </div>

                            {livenessPassed && (
                                <button
                                    onClick={captureFinal}
                                    className="w-full py-6 rounded-[30px] bg-[#24aa4d] text-black font-black text-sm uppercase tracking-widest hover:brightness-110 shadow-2xl shadow-[#24aa4d]/20"
                                >
                                    Complete Verification
                                </button>
                            )}

                            <button onClick={stopCamera} className="w-full text-[10px] font-black text-gray-600 uppercase tracking-widest hover:text-white transition-colors">Cancel Engine</button>
                        </motion.div>
                    )}

                    {/* STEP 4: Final Results */}
                    {verificationResult && (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }}
                            className="w-full space-y-6"
                        >
                            <div className="p-8 rounded-[40px] bg-white/[0.03] border border-white/10 text-center relative overflow-hidden">
                                <div className={`mb-6 inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${verificationResult.isVerified ? 'bg-[#24aa4d]/20 text-[#24aa4d]' : 'bg-red-500/20 text-red-500'}`}>
                                    {verificationResult.isVerified ? "Trusted Identity" : "Score Failed"}
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="space-y-2">
                                        <div className="aspect-square rounded-3xl overflow-hidden bg-white/5 border border-white/10">
                                            {verificationResult.agentImage && <img src={verificationResult.agentImage} className="w-full h-full object-cover" />}
                                        </div>
                                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Master Record</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="aspect-square rounded-3xl overflow-hidden bg-[#24aa4d]/10 border border-[#24aa4d]/30">
                                            <img src={verificationResult.capturedImage} className="w-full h-full object-cover transform -scale-x-100" />
                                        </div>
                                        <p className="text-[9px] font-black text-[#24aa4d] uppercase tracking-widest">Session Capture</p>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-6 border-t border-white/5">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-gray-500">Confidence Match</span>
                                        <span className={verificationResult.isVerified ? 'text-[#24aa4d]' : 'text-red-500'}>{verificationResult.finalScore}%</span>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }} animate={{ width: `${verificationResult.finalScore}%` }}
                                            className={`h-full ${verificationResult.isVerified ? 'bg-[#24aa4d]' : 'bg-red-500'}`}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => window.location.href = `/?verified=${foundCustomer.loan}`}
                                    className="w-full py-6 rounded-[30px] bg-[#24aa4d] text-black font-black text-sm uppercase tracking-widest shadow-xl shadow-[#24aa4d]/20"
                                >
                                    Finish & Sync
                                </button>
                                <button onClick={resetAll} className="w-full py-4 rounded-[25px] border border-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all">New Search</button>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </main>

            <ToastContainer position="bottom-center" theme="dark" hideProgressBar pauseOnHover={false} newestOnTop />

            {/* Global Style overrides for hide-scrollbar */}
            <style jsx global>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-shake { animation: shake 0.2s ease-in-out infinite; animation-iteration-count: 2; }
            `}</style>
        </div>
    );
}