import mongoose from "mongoose";
import dns from "dns";

dns.setServers([
    "8.8.8.8",
    "1.1.1.1"
]);

let isConnected = false;

export async function DBConnection() {

    if (isConnected) {
        return;
    }

    try {

        const res = await mongoose.connect(
            "mongodb+srv://yj0034046_db_user:BAC2cB4Ss5vumGUW@agentdashboard.hsoipy2.mongodb.net/agentsdb"
        );

        if (res) {
            isConnected = true;
            console.log("DB Connected...");
        }

    } catch (error) {
        console.log(error);
        console.log("DB not connected...");
    }

}