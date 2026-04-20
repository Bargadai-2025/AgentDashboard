import mongoose from "mongoose";

const agentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  address: { type: String, required: true },
  location: { type: String, required: true },
  customers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Customer" }]
});

const Agent = mongoose.models.Agent || mongoose.model("Agent", agentSchema);

export default Agent;