const axios = require("axios");
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Get route details using Google Maps API
exports.getRouteDetails = async (from, to) => {
    try {
        const response = await axios.get("https://maps.googleapis.com/maps/api/directions/json", {
            params: {
                origin: from,
                destination: to,
                key: GOOGLE_MAPS_API_KEY
            }
        });
        
        if (response.data.status !== "OK") throw new Error("Invalid route");
        
        return {
            startAddress: response.data.routes[0].legs[0].start_address,
            endAddress: response.data.routes[0].legs[0].end_address,
            distance: response.data.routes[0].legs[0].distance.text,
            duration: response.data.routes[0].legs[0].duration.text
        };
    } catch (error) {
        throw new Error("Error fetching route details");
    }
};
