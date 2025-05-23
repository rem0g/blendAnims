#!/usr/bin/env node

/**
 * Sign File Auto-Discovery Script
 * 
 * This script automatically scans the public/signs directory for GLB files
 * and updates the src/signs.json file with any new animations found.
 * 
 * Usage:
 *   npm run update-signs
 *   or
 *   node update-signs.js
 * 
 * Features:
 * - Automatically extracts sign names from filenames
 * - Adds default timing values (start: 30, end: 100) for new signs
 * - Sorts signs alphabetically
 * - Preserves existing timing values for known signs
 * - Skips duplicate sign names (warns if different files have same name)
 * 
 * File naming conventions supported:
 * - NAME_DDMMYY_N.glb (e.g., HALLO-C_250226_1.glb -> HALLO-C)
 * - NAME_DDMMYY.glb (e.g., SCHOOL_250226.glb -> SCHOOL)
 * - NAME.glb (e.g., wachten-modified.glb -> wachten-modified)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SIGNS_DIR = path.join(__dirname, 'public', 'signs');
const SIGNS_JSON_PATH = path.join(__dirname, 'src', 'signs.json');

// Default timing values for new signs
const DEFAULT_TIMING = {
  start: 30,
  end: 100
};

/**
 * Extract sign name from filename
 * Example: "HALLO-C_250226_1.glb" -> "HALLO"
 * Example: "KIJKEN-NAAR-ELKAAR_250228_1.glb" -> "KIJKEN-NAAR-ELKAAR"
 */
function extractSignName(filename) {
  // Remove .glb extension
  const nameWithoutExt = filename.replace(/\.glb$/i, '');
  
  // Split by underscore and take everything before the date pattern
  // Pattern: words_DDMMYY_number
  const parts = nameWithoutExt.split('_');
  
  // If there are multiple parts, assume the last two are date and number
  if (parts.length >= 3) {
    return parts.slice(0, -2).join('_');
  }
  
  // If only one underscore, take everything before it
  if (parts.length === 2) {
    return parts[0];
  }
  
  // If no underscore, use the whole name
  return nameWithoutExt;
}

/**
 * Read existing signs from JSON file
 */
function readExistingSigns() {
  try {
    if (fs.existsSync(SIGNS_JSON_PATH)) {
      const data = fs.readFileSync(SIGNS_JSON_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading existing signs.json:', error.message);
  }
  return [];
}

/**
 * Write signs to JSON file
 */
function writeSignsToFile(signs) {
  try {
    const jsonContent = JSON.stringify(signs, null, 2);
    fs.writeFileSync(SIGNS_JSON_PATH, jsonContent, 'utf8');
    console.log(`✓ Updated signs.json with ${signs.length} signs`);
  } catch (error) {
    console.error('Error writing signs.json:', error.message);
    process.exit(1);
  }
}

/**
 * Scan the signs directory for GLB files
 */
function scanSignsDirectory() {
  try {
    if (!fs.existsSync(SIGNS_DIR)) {
      console.error(`Signs directory does not exist: ${SIGNS_DIR}`);
      process.exit(1);
    }

    const files = fs.readdirSync(SIGNS_DIR);
    return files.filter(file => file.toLowerCase().endsWith('.glb'));
  } catch (error) {
    console.error('Error scanning signs directory:', error.message);
    process.exit(1);
  }
}

/**
 * Main function to update signs
 */
function updateSigns() {
  console.log('🔍 Scanning for sign files...');
  
  // Read existing signs
  const existingSigns = readExistingSigns();
  const existingFiles = new Set(existingSigns.map(sign => sign.file));
  
  // Scan directory for GLB files
  const glbFiles = scanSignsDirectory();
  
  console.log(`Found ${glbFiles.length} GLB files in signs directory`);
  
  let newSignsAdded = 0;
  
  // Process each GLB file
  for (const filename of glbFiles) {
    const filePath = `signs/${filename}`;
    
    // Check if this file is already in our signs list
    if (!existingFiles.has(filePath)) {
      const signName = extractSignName(filename);
      
      // Check if we already have a sign with this name (different file)
      const existingSign = existingSigns.find(sign => sign.name === signName);
      
      if (existingSign) {
        console.log(`⚠️  Sign "${signName}" already exists with file "${existingSign.file}", skipping "${filename}"`);
        continue;
      }
      
      // Add new sign
      const newSign = {
        name: signName,
        file: filePath,
        start: DEFAULT_TIMING.start,
        end: DEFAULT_TIMING.end
      };
      
      existingSigns.push(newSign);
      newSignsAdded++;
      
      console.log(`➕ Added new sign: ${signName} (${filename})`);
    }
  }
  
  // Sort signs alphabetically by name
  existingSigns.sort((a, b) => a.name.localeCompare(b.name));
  
  // Write updated signs to file
  writeSignsToFile(existingSigns);
  
  if (newSignsAdded > 0) {
    console.log(`\n🎉 Added ${newSignsAdded} new sign(s) to signs.json`);
    console.log('📝 Please review the timing values (start/end frames) for the new signs');
  } else {
    console.log('\n✅ No new signs found - signs.json is up to date');
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  updateSigns();
}

export { updateSigns, extractSignName };
