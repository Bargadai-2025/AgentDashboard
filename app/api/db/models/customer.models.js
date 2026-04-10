import mongoose from "mongoose";

const Customers = new mongoose.Schema({
    // Loan account reference number — used by the verify page to look up the customer
    loan: {
        type: String,
        default: "",
    },
    name: String,
    address: String,
    location: {
        lat: Number,
        lng: Number,
    },
    verifiedAgentImage: {
        type: String,
        default: ""
    },
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Agents"
    },
    // Amount collected from this customer (e.g. "2000 cash", "1500 cheque")
    cashCollected: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

const CustomerModel = mongoose.models.Customers || mongoose.model("Customers", Customers);
export default CustomerModel;
