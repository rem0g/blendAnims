#!/usr/bin/env node

/**
 * Simple API Server for Sign Blending Interface
 * 
 * Provides endpoints for saving signs.json file during development.
 * Run this server alongside the Vite dev server for full functionality.
 * 
 * Usage:
 *   npm run api-server
 *   or
 *   node api-server.js
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Path to signs.json file
const SIGNS_JSON_PATH = path.join(__dirname, 'src', 'signs.json');

// API endpoint to save signs data
app.post('/api/save-signs', (req, res) => {
  try {
    const signsData = req.body;
    
    // Validate the data structure
    if (!Array.isArray(signsData)) {
      return res.status(400).json({ 
        error: 'Invalid data format. Expected an array of signs.' 
      });
    }
    
    // Validate each sign object
    for (const sign of signsData) {
      if (!sign.name || !sign.file || typeof sign.start !== 'number' || typeof sign.end !== 'number') {
        return res.status(400).json({
          error: 'Invalid sign object. Each sign must have name, file, start, and end properties.'
        });
      }
    }
    
    // Create a backup of the existing file
    if (fs.existsSync(SIGNS_JSON_PATH)) {
      const backupPath = `${SIGNS_JSON_PATH}.backup.${Date.now()}`;
      fs.copyFileSync(SIGNS_JSON_PATH, backupPath);
      console.log(`📁 Created backup: ${backupPath}`);
    }
    
    // Write the new data to signs.json
    const jsonContent = JSON.stringify(signsData, null, 2);
    fs.writeFileSync(SIGNS_JSON_PATH, jsonContent, 'utf8');
    
    console.log(`✅ Successfully saved ${signsData.length} signs to signs.json`);
    
    res.json({
      success: true,
      message: `Successfully saved ${signsData.length} signs`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error saving signs.json:', error);
    res.status(500).json({
      error: 'Failed to save signs data',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    signsFile: fs.existsSync(SIGNS_JSON_PATH) ? 'exists' : 'missing'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📁 Signs file path: ${SIGNS_JSON_PATH}`);
  console.log(`🔄 Available endpoints:`);
  console.log(`   POST /api/save-signs - Save signs data`);
  console.log(`   GET  /api/health - Health check`);
});

export default app;
