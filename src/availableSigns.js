// Import sign animations from JSON file
import signsData from './signs.json';

export const availableSigns = signsData;

// Mapping to get the item from the name
export const availableSignsMap = availableSigns.reduce((acc, sign) => {
  acc[sign.name] = sign;
  return acc;
}, {});

// Make the map globally available for runtime updates
window.availableSignsMap = availableSignsMap;  