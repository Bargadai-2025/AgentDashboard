import mongoose from "mongoose";

let isConnected = false;

export async function DBConnection() {
    if (isConnected) {
        return;
    }

    try {
        const res = await mongoose.connect(
            process.env.NEXT_PUBLIC_DB_URL,
            {
                serverSelectionTimeoutMS: 10000, // 10 seconds timeout
            }
        );

        
        isConnected = !!res;
        console.log("DB Connected successfully");
    } catch (error) {
        console.error("DB Connection Error:", error);
        throw error; // Throwing error so the caller knows it failed
    }
}
