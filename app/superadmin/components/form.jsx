"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";

export default function SuperAdminForm() {
    const [type, setType] = useState("agent");
    const [imagePreview, setImagePreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    // Separate states for different API payloads
    const [formData, setFormData] = useState({
        name: "",
        id: "",            // agentId (for customer) or employeeId (for agent)
        location: "",
        loan: "",          // Loan Account Number — customer only
        cashCollected: "", // Amount collected — customer only
        address: "",
    });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file);
            // Convert to base64 so the backend/Cloudinary can receive it
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result); // base64 data URI for preview
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (type === "agent") {
            // API CALL FOR AGENT
            console.log("Hitting Endpoint: /api/agent");

            if (!selectedFile) {
                toast.error('Please select an image for the agent.', { theme: "dark" });
                return;
            }

            // Send only required fields for agent creation
            const agentPayload = {
                name: formData.name,
                location: formData.location,
                image: imagePreview,
                id: formData.id || undefined,
                address: formData.address || undefined
            };
            let res = await fetch('/api/agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(agentPayload)
            });
            let data = await res.json();
            console.log(data);
            if (res.ok) {
                toast.success('Agent added successfully!', { theme: "dark" });
                setImagePreview(null);
                setSelectedFile(null);
                setFormData({ name: "", id: "", location: "", loan: "", address: "" });
                if (fileInputRef.current) fileInputRef.current.value = "";
            } else {
                toast.error(data.msg || 'Failed to add agent.', { theme: "dark" });
            }
        } else {
            // API CALL FOR CUSTOMER
            console.log("Hitting Endpoint: /api/customer");
            const customerPayload = {
                name: formData.name,
                location: formData.location,
                agentId: formData.id || undefined,
                loan: formData.loan,
                cashCollected: formData.cashCollected,
            };
            let res = await fetch('/api/customer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customerPayload)
            });
            let data = await res.json();
            console.log(data);
            if (res.ok) {
                toast.success('Customer added successfully!', { theme: "dark" });
                setFormData({ name: "", id: "", location: "", loan: "", cashCollected: "", address: "" });
            } else {
                toast.error(data.msg || 'Failed to add customer.', { theme: "dark" });
            }
        }
    };
    return (
        <div className="h-screen overflow-y-auto bg-[#000] p-8 text-white font-sans selection:bg-[#24aa4d]/30">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto"
            >
                <header className="mb-10 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-[#24aa4d]">
                            SUPER ADMIN <span className="text-white">TERMINAL</span>
                        </h1>
                        <p className="text-gray-500 mt-2 italic">Routing to: {type === 'agent' ? '/api/agents' : '/api/customers'}</p>
                    </div>
                </header>

                {/* Mode Selector */}
                <div className="flex gap-4 mb-8 bg-white/5 p-2 rounded-2xl w-fit border border-white/10">
                    {["agent", "customer"].map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => { setType(t); setImagePreview(null); }}
                            className={`px-8 py-3 rounded-xl font-black transition-all uppercase text-[10px] tracking-widest ${type === t ? "bg-[#24aa4d] text-[#000]" : "text-gray-400 hover:text-white"
                                }`}
                        >
                            Add {t}
                        </button>
                    ))}
                </div>

                <motion.form
                    key={type}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onSubmit={handleSubmit}
                    className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/5 p-8 rounded-3xl border border-white/10 shadow-2xl relative mb-10"
                >
                    {/* Shared Fields */}
                    <div className="space-y-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase text-[#24aa4d] tracking-[0.2em]">Full Name</label>
                            <input
                                suppressHydrationWarning
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                type="text" className="bg-[#000] border border-white/10 p-4 rounded-xl focus:border-[#24aa4d] outline-none transition-all"
                                placeholder="e.g. John Doe"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase text-[#24aa4d] tracking-[0.2em]">
                                {type === "agent" ? "Employee ID" : "Agent ID"}
                                {type === "customer" && <span className="text-gray-500 ml-1 normal-case tracking-normal">(optional)</span>}
                            </label>
                            <input
                                suppressHydrationWarning
                                value={formData.id}
                                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                                type="text" className="bg-[#000] border border-white/10 p-4 rounded-xl focus:border-[#24aa4d] outline-none transition-all"
                                placeholder={type === "agent" ? "BGD-XXXX" : "Agent ObjectId (optional)"}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase text-[#24aa4d] tracking-[0.2em]">Geo-Coordinates</label>
                            <input
                                suppressHydrationWarning
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                type="text" className="bg-[#000] border border-white/10 p-4 rounded-xl focus:border-[#24aa4d] outline-none transition-all"
                                placeholder="24.8607, 67.0011"
                            />
                        </div>

                        {/* Loan Number — Customer Only */}
                        {type === "customer" && (
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase text-[#24aa4d] tracking-[0.2em]">
                                    Loan Account Number
                                </label>
                                <input
                                    suppressHydrationWarning
                                    value={formData.loan}
                                    onChange={(e) => setFormData({ ...formData, loan: e.target.value })}
                                    type="text" className="bg-[#000] border border-white/10 p-4 rounded-xl focus:border-[#24aa4d] outline-none transition-all"
                                    placeholder="e.g. LN1234"
                                />
                            </div>
                        )}

                        {/* Cash Collected — Customer Only */}
                        {type === "customer" && (
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase text-[#24aa4d] tracking-[0.2em]">
                                    Cash Collected <span className="text-gray-500 normal-case tracking-normal">(optional)</span>
                                </label>
                                <input
                                    suppressHydrationWarning
                                    value={formData.cashCollected}
                                    onChange={(e) => setFormData({ ...formData, cashCollected: e.target.value })}
                                    type="text" className="bg-[#000] border border-white/10 p-4 rounded-xl focus:border-[#24aa4d] outline-none transition-all"
                                    placeholder="e.g. 2000 cash / 1500 cheque"
                                />
                            </div>
                        )}
                    </div>

                    {/* Dynamic Content: Image (Agent) or Address (Customer) */}
                    <div className="flex flex-col">
                        <label className="text-[10px] font-black uppercase text-[#24aa4d] tracking-[0.2em] mb-2">
                            {type === "agent" ? "Biometric Profile" : "Physical Address Details"}
                        </label>

                        <AnimatePresence mode="wait">
                            {type === "agent" ? (
                                <motion.div
                                    key="agent-upload"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={() => fileInputRef.current.click()}
                                    className="flex-1 min-h-[250px] cursor-pointer border-2 border-dashed border-white/10 rounded-2xl bg-[#000] flex flex-col items-center justify-center relative group overflow-hidden"
                                >
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                                    ) : (
                                        <span className="text-gray-500 group-hover:text-[#24aa4d] text-[10px] font-black">CLICK TO UPLOAD IMAGE</span>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="customer-address"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="flex-1 min-h-[250px] rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col"
                                >
                                    <textarea
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full h-full bg-transparent outline-none resize-none text-sm text-gray-300 placeholder:text-gray-700 font-mono"
                                        placeholder="Enter full physical address including street, block, and landmarks..."
                                    />
                                    <div className="mt-2 text-[9px] text-gray-500 font-black uppercase tracking-widest border-t border-white/5 pt-2">
                                        Validation: Required for Map Rendering
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.01, backgroundColor: "#1e8e41" }}
                        whileTap={{ scale: 0.98 }}
                        className="md:col-span-2 bg-[#24aa4d] text-[#000] py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-[0_10px_30px_rgba(36,170,77,0.2)] mt-4"
                    >
                        Process {type} Request
                    </motion.button>
                </motion.form>
            </motion.div>
        </div>
    );
}