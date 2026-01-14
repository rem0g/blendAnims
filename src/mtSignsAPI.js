/**
 * MT Signs API
 * Fetches signs from the matched_transcriptions database
 */

const MT_SIGNS_API_URL = 'https://signcollect.nl/animDB/getMTSigns.php';

/**
 * Fetch MT signs from the API
 * @param {number} limit - Maximum number of signs to fetch (default: 100)
 * @returns {Promise<Array>} Array of sign objects compatible with availableSigns format
 */
export async function fetchMTSigns(limit = 100) {
    try {
        const url = `${MT_SIGNS_API_URL}?limit=${limit}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.error('MT Signs API error:', response.status, response.statusText);
            return [];
        }

        const data = await response.json();

        if (data.success && data.data && data.data.signs) {
            console.log(`Loaded ${data.data.count} MT signs`);
            if (data.data.not_found_count > 0) {
                console.warn(`${data.data.not_found_count} MT signs not found on disk:`, data.data.not_found);
            }
            return data.data.signs;
        }

        console.error('MT Signs API returned unsuccessful response:', data.error);
        return [];
    } catch (error) {
        console.error('Failed to fetch MT signs:', error);
        return [];
    }
}
