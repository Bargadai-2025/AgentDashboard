// Utility to convert Lat/Lng to a human-readable address using Mappls API
export async function reverseGeocode(lat, lng) {
    const apiKey = process.env.MAPPLS_API_KEY || "c0ae557754e8913f692841c11b9d979c";
    const url = `https://apis.mappls.com/advancedmaps/v1/${apiKey}/rev_geocode?lat=${lat}&lng=${lng}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        // Mappls returns an array in "results". We want the "formatted_address"
        if (data && data.results && data.results.length > 0) {
            return data.results[0].formatted_address || "Address not found";
        }
        return "Unknown Location";
    } catch (error) {
        console.error("[ReverseGeocode] Error:", error.message);
        return "Failed to fetch address";
    }
}
