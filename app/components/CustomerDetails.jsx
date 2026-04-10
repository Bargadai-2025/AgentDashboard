"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function CustomerDetails({ customer, onBack }) {
  const [verificationData, setVerificationData] = useState(null);

  useEffect(() => {
    if (customer?.loan) {
      const stored = localStorage.getItem("verified_customer_" + customer.loan);
      if (stored) {
        try { setVerificationData(JSON.parse(stored)); } catch (e) { console.error(e); }
      } else {
        setVerificationData(null);
      }
    }
  }, [customer]);

  return (
    <motion.div
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 50, opacity: 0 }}
      className="h-full flex flex-col bg-transparent"
    >
      {/* Header */}
      <div className="p-6 bg-gradient-to-br from-[#24aa4d]/20 to-transparent border-b border-white/5">
        <button 
          onClick={onBack}
          className="mb-4 text-[10px] font-black text-[#24aa4d] tracking-widest uppercase flex items-center gap-2"
        >
          <span className="text-lg">×</span> Close Profile
        </button>
        <h2 className="text-3xl font-black text-white leading-none">{customer.name}</h2>
        <p className="text-gray-500 text-xs mt-2 font-mono">LN-REF: {customer.loan}</p>
      </div>

      <div className="p-6 space-y-8 overflow-y-auto no-scrollbar">
        {/* Verification Status */}
        <section>
          <div className={`p-4 rounded-2xl border transition-all duration-500 ${
            verificationData 
            ? "bg-[#24aa4d]/10 border-[#24aa4d]/30" 
            : "bg-red-500/5 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${verificationData ? "bg-[#24aa4d] shadow-[0_0_10px_#24aa4d]" : "bg-red-500 animate-pulse"}`} />
              <span className={`text-[11px] font-black uppercase tracking-tighter ${verificationData ? "text-[#24aa4d]" : "text-red-500"}`}>
                {verificationData ? "Identity Verified" : "Verification Required"}
              </span>
            </div>
            
            <div className="mt-4">
              {verificationData ? (
                <div className="flex items-center gap-4">
                  <motion.img 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    src={verificationData.image} 
                    className="w-16 h-16 rounded-xl object-cover border border-[#24aa4d]/50"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-bold">Biometric Match</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 uppercase font-mono">{verificationData.timestamp}</p>
                    {verificationData.confidence !== undefined && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-[#24aa4d]" 
                            style={{ width: `${Math.min(100, Math.max(0, verificationData.confidence))}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-black text-[#24aa4d]">
                          {verificationData.confidence}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href={`/verify?loan=${customer.loan}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-red-500 text-white font-bold text-xs"
                >
                  START LIVENESS CAPTURE
                  <span className="text-lg">→</span>
                </motion.a>
              )}
            </div>
          </div>
        </section>

        {/* Journey Logs - Tech Style */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Telemetry Logs</h3>
          <div className="relative border-l border-white/10 ml-2 pl-6 space-y-6">
            {[
              { label: "Dispatch Initiated", time: "09:30 AM", status: "past" },
              { label: "Geofence Entry", time: "10:05 AM", status: "past" },
              { label: "Final Validation", time: verificationData?.timestamp || "Pending", status: verificationData ? "past" : "current" }
            ].map((step, i) => (
              <div key={i} className="relative">
                <div className={`absolute -left-[31px] top-1 w-2 h-2 rounded-full border-2 border-[#0f0f0f] ${
                  step.status === 'past' ? "bg-[#24aa4d]" : "bg-gray-600 animate-pulse"
                }`} />
                <p className={`text-xs font-bold ${step.status === 'past' ? "text-white" : "text-gray-500"}`}>
                  {step.label}
                </p>
                <p className="text-[10px] text-gray-600 font-mono mt-0.5">{step.time}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Action Button */}
        <motion.button
          whileHover={{ backgroundColor: "rgba(36, 170, 77, 1)", color: "#000" }}
          className="w-full py-4 rounded-2xl border border-[#24aa4d] text-[#24aa4d] font-black text-xs tracking-widest transition-colors uppercase"
        >
          Generate Report
        </motion.button>
      </div>
    </motion.div>
  );
}