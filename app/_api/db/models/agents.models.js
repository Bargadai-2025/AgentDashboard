import mongoose from "mongoose";

const Agents = new mongoose.Schema({
    name: String,
    image: String,
    address: String,
    location: String,
    customers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customers"
        }
    ]
}, {
    timestamps: true
});

const AgentModel = mongoose.models.Agents || mongoose.model("Agents", Agents);
export default AgentModel;