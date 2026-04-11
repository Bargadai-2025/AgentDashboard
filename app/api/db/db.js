import mongoose from "mongoose";

export async function DBConnection() {
    // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    if (mongoose.connection.readyState === 1) {
        return;
    }

    const uri = process.env.NEXT_PUBLIC_DB_URL || process.env.MONGODB_URI || process.env.DB_URL;

    if (!uri) {
        console.error("❌ MongoDB URI is undefined. Please check your environment variables in your Production (Vercel) settings.");
        throw new Error("Mongoose Error: The uri parameter must be a string. Check that NEXT_PUBLIC_DB_URL or MONGODB_URI is set in your environment variables.");
    }

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000, // 10 seconds timeout
        });
        console.log("DB Connected successfully");
    } catch (error) {
        console.error("DB Connection Error:", error);
        throw error;
    }
}
