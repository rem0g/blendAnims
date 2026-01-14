/**
 * API client for fetching comparison pairs
 * Retrieves GLB file pairs (default_pp and default) for side-by-side comparison
 */

const API_URL = 'https://signcollect.nl/animDB/getComparisonPairs.php';

/**
 * Fetch all comparison pairs from the API
 * @param {Object} options - Optional parameters
 * @param {string} options.search - Filter by name
 * @param {number} options.limit - Limit number of results
 * @returns {Promise<Array>} Array of pair objects
 */
export async function fetchComparisonPairs(options = {}) {
    try {
        const params = new URLSearchParams();
        if (options.search) params.append('search', options.search);
        if (options.limit) params.append('limit', options.limit);

        const url = params.toString() ? `${API_URL}?${params}` : API_URL;
        const response = await fetch(url);

        if (!response.ok) {
            console.error('Failed to fetch comparison pairs:', response.status);
            return [];
        }

        const data = await response.json();

        if (data.success && data.data?.pairs) {
            console.log(`Loaded ${data.data.count} comparison pairs`);
            if (data.data.missingCount > 0) {
                console.warn(`${data.data.missingCount} files missing matching partner`);
            }
            return data.data.pairs;
        }

        console.warn('Unexpected API response format:', data);
        return [];
    } catch (error) {
        console.error('Failed to fetch comparison pairs:', error);
        return [];
    }
}

export default { fetchComparisonPairs };
