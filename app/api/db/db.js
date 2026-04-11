import mongoose from "mongoose";

export async function DBConnection() {

    if (mongoose.connection.readyState === 1) {
        return;
    }

    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error("MongoDB URI missing");
    }

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000
        });

        console.log("DB Connected successfully");

    } catch (error) {
        console.error("DB Connection Error:", error);
        throw error;
    }
}