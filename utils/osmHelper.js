const axios = require('axios');

async function getCoordinates(address) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json`;
    try {
        const response = await axios.get(url);
        if (response.data.length === 0) {
            throw new Error('Address not found');
        }
        return {
            lat: response.data[0].lat,
            lon: response.data[0].lon
        };
    } catch (error) {
        console.error('Geocoding error:', error.message);
        throw error;
    }
}

//Get Route Using Coordinates
async function getRoute(fromAddress, toAddress) {
    try {
        // Get coordinates for both addresses
        const fromCoords = await getCoordinates(fromAddress);
        const toCoords = await getCoordinates(toAddress);

        // OSRM Routing API (Driving mode)
        const routeUrl = `https://router.project-osrm.org/route/v1/driving/${fromCoords.lon},${fromCoords.lat};${toCoords.lon},${toCoords.lat}?overview=full&geometries=geojson`;
        const response = await axios.get(routeUrl);

        return response.data.routes[0]; // Returns route details
    } catch (error) {
        console.error('Error getting route:', error.message);
        throw error;
    }
}
module.exports = { getRoute };

