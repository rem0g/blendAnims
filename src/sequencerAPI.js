/**
 * Sequencer API Client
 * Handles communication with the backend API for saving and loading sequences
 */

class SequencerAPI {
  constructor(baseURL = 'https://signcollect.nl/animDB') {
    this.baseURL = baseURL;
    this.saveEndpoint = `${baseURL}/saveSequencer.php`;
    this.getEndpoint = `${baseURL}/getSequencer.php`;
  }

  /**
   * Save a sequence to the database
   * @param {string} sequenceName - Name of the sequence
   * @param {Array} sequenceItems - Array of sequence items from UIController
   * @param {Object} options - Additional options (user_id, metadata, sequence_id for updates)
   * @returns {Promise<Object>} Response from the server
   */
  async saveSequence(sequenceName, sequenceItems, options = {}) {
    try {
      // Transform sequence items to match API format
      const items = sequenceItems.map((item, index) => ({
        sign_name: item.sign.name,
        frame_start: item.frameRange.start,
        frame_end: item.frameRange.end,
        take_number: item.sign.takeNumber || 1,
        item_data: {
          original_id: item.id,
          // Add any additional item data here
        }
      }));

      const requestBody = {
        sequence_name: sequenceName,
        items: items,
        ...options // Include user_id, metadata, sequence_id if provided
      };

      const response = await fetch(this.saveEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Error saving sequence:', error);
      throw error;
    }
  }

  /**
   * Get sequences from the database
   * @param {Object} params - Query parameters (id, user_id, search, limit, offset)
   * @returns {Promise<Object>} Response containing sequences
   */
  async getSequences(params = {}) {
    try {
      // Build query string
      const queryParams = new URLSearchParams(params);
      const url = `${this.getEndpoint}?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Error getting sequences:', error);
      throw error;
    }
  }

  /**
   * Get a single sequence by ID
   * @param {number} sequenceId - The sequence ID
   * @returns {Promise<Object>} The sequence data
   */
  async getSequenceById(sequenceId) {
    const response = await this.getSequences({ id: sequenceId });
    if (response.success && response.data.sequences.length > 0) {
      return response.data.sequences[0];
    }
    throw new Error('Sequence not found');
  }

  /**
   * Search sequences by name
   * @param {string} searchTerm - Search term
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} Array of sequences
   */
  async searchSequences(searchTerm, limit = 10) {
    const response = await this.getSequences({ 
      search: searchTerm, 
      limit: limit 
    });
    return response.data.sequences;
  }

  /**
   * Delete a sequence (requires backend implementation)
   * @param {number} sequenceId - The sequence ID to delete
   * @returns {Promise<Object>} Response from server
   */
  async deleteSequence(sequenceId) {
    // This would require a deleteSequencer.php endpoint
    throw new Error('Delete functionality not yet implemented on backend');
  }
}

// Export the API client
export default SequencerAPI;