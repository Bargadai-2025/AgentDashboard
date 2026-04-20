import mongoose from "mongoose";

const Customers = new mongoose.Schema({
    loan: { type: String, default: "" },
    name: String,
    address: String,
    location: {
        lat: Number,
        lng: Number,
    },
    verifiedAgentImage: { type: String, default: "" },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agents" },
    cashCollected: { type: String, default: "" },
    verificationScore: { type: Number, default: 0 },
    verificationStatus: {
        type: String,
        enum: ["pending", "verified", "failed"],
        default: "pending"
    },
    // Meta data fields for "exact like screenshot"
    collectedAt: { type: Date },
    collectedLocation: {
        lat: Number,
        lng: Number,
    },
    deviceModel: { type: String, default: "" },
    deviceImei: { type: String, default: "" },
    networkOperator: { type: String, default: "" }
}, {
    timestamps: true
});

const CustomerModel = mongoose.models.Customers || mongoose.model("Customers", Customers);
export default CustomerModel;
