import type { NearbyCore } from '../types';

// The API response structure from NOAA NCEI
interface NceiApiResponse {
    study: NceiStudy[];
}

interface NceiStudy {
    studyName: string;
    lat: number;
    lon: number;
    waterDepth: number | null;
    investigators: string;
    onlineResourceLink: string[];
}

const NOAA_API_BASE_URL = 'https://www.ncei.noaa.gov/access/paleo-search/data/search.json';

const mapNceiStudyToNearbyCore = (item: NceiStudy): NearbyCore => ({
    studyName: item.studyName,
    lat: item.lat,
    lon: item.lon,
    waterDepth: item.waterDepth || null,
    investigators: item.investigators || 'N/A',
    // The first link is typically the main data page
    dataUrl: item.onlineResourceLink?.[0] || '#',
});

export const findNearbyCores = async (lat: number, lon: number, radiusKm: number): Promise<NearbyCore[]> => {
    // The NOAA Paleo Search API uses GET requests with URL parameters.
    const params = new URLSearchParams({
        locations: `${lat},${lon}`, // API expects 'lat,lon' string
        radius: `${radiusKm}km`,     // API expects radius with units, e.g., '100km'
        dataTypes: 'Marine Sediment', // Focus on relevant data types
        limit: '50',                 // Limit the number of results
    });

    const url = `${NOAA_API_BASE_URL}?${params.toString()}`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            // NOAA API might not return a JSON error body, so we use statusText
            throw new Error(`NOAA NCEI API responded with status: ${response.status} ${response.statusText}`);
        }

        const result: NceiApiResponse = await response.json();
        
        if (!result.study || result.study.length === 0) {
            return [];
        }

        // Map the API response to our internal NearbyCore type for consistency
        return result.study.map(mapNceiStudyToNearbyCore);

    } catch (error) {
        console.error("Error fetching data from NOAA NCEI:", error);
        if (error instanceof Error) {
            // Re-throw with a more user-friendly message
            throw new Error(`Failed to fetch nearby cores: ${error.message}. The NOAA service may be temporarily unavailable.`);
        }
        throw new Error("An unknown error occurred while fetching nearby cores.");
    }
};

export const findCoresInBoundary = async (bbox: [number, number, number, number]): Promise<NearbyCore[]> => {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const params = new URLSearchParams({
        bbox: `${minLon},${minLat},${maxLon},${maxLat}`,
        dataTypes: 'Marine Sediment',
        limit: '200', // Higher limit for area searches
    });
    
    const url = `${NOAA_API_BASE_URL}?${params.toString()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`NOAA NCEI API responded with status: ${response.status} ${response.statusText}`);
        }
        const result: NceiApiResponse = await response.json();
        if (!result.study || result.study.length === 0) {
            return [];
        }
        return result.study.map(mapNceiStudyToNearbyCore);
    } catch (error) {
        console.error("Error fetching boundary data from NOAA NCEI:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to fetch cores in boundary: ${error.message}.`);
        }
        throw new Error("An unknown error occurred while fetching cores in boundary.");
    }
};