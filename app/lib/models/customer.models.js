import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  loan: { type: String, required: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  location: { type: Object, required: true }, // { lat, lng }
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent" },
  verifiedAgentImage: { type: String },
  cashCollected: { type: Number, default: 0 },
  verificationScore: { type: Number, default: 0 },
  verificationStatus: { type: String, default: "pending" }
});

const Customer = mongoose.models.Customer || mongoose.model("Customer", customerSchema);

export default Customer;