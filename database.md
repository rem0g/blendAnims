# Sign Language Sequencer Database Schema

## Overview
This document describes the database structure and API endpoints for storing and retrieving sign language animation sequences.

## Database Schema

### Table: `sequences`
Stores the main sequence information.

| Column | Type | Description |
|--------|------|-------------|
| id | INT AUTO_INCREMENT | Primary key |
| sequence_name | VARCHAR(255) | Name of the sequence |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |
| user_id | VARCHAR(255) | Optional user identifier |
| metadata | JSON | Additional sequence metadata |

### Table: `sequence_items`
Stores individual items within a sequence.

| Column | Type | Description |
|--------|------|-------------|
| id | INT AUTO_INCREMENT | Primary key |
| sequence_id | INT | Foreign key to sequences.id |
| position | INT | Order position in sequence |
| sign_name | VARCHAR(255) | Name of the sign |
| frame_start | INT | Start frame |
| frame_end | INT | End frame |
| take_number | INT | Take number for duplicates |
| item_data | JSON | Additional item data |

## API Endpoints

### GET /animDB/getSequencer.php
Retrieves saved sequences.

**Parameters:**
- `id` (optional): Specific sequence ID
- `user_id` (optional): Filter by user
- `limit` (optional): Number of results (default: 10)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "sequences": [
      {
        "id": 1,
        "sequence_name": "My Sequence",
        "created_at": "2024-01-20 10:30:00",
        "updated_at": "2024-01-20 11:45:00",
        "items": [
          {
            "position": 0,
            "sign_name": "HALLO-C",
            "frame_start": 0,
            "frame_end": 120,
            "take_number": 1
          }
        ]
      }
    ],
    "total": 1
  }
}
```

### POST /animDB/saveSequencer.php
Saves a new sequence or updates an existing one.

**Request Body:**
```json
{
  "sequence_name": "My Sequence",
  "user_id": "user123",
  "items": [
    {
      "sign_name": "HALLO-C",
      "frame_start": 0,
      "frame_end": 120,
      "take_number": 1
    },
    {
      "sign_name": "SCHOOL-D",
      "frame_start": 10,
      "frame_end": 150,
      "take_number": 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sequence_id": 1,
    "message": "Sequence saved successfully"
  }
}
```

## SQL Schema

```sql
CREATE DATABASE IF NOT EXISTS sign_sequencer;
USE sign_sequencer;

CREATE TABLE sequences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sequence_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    user_id VARCHAR(255),
    metadata JSON,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

CREATE TABLE sequence_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sequence_id INT NOT NULL,
    position INT NOT NULL,
    sign_name VARCHAR(255) NOT NULL,
    frame_start INT NOT NULL DEFAULT 0,
    frame_end INT NOT NULL,
    take_number INT NOT NULL DEFAULT 1,
    item_data JSON,
    FOREIGN KEY (sequence_id) REFERENCES sequences(id) ON DELETE CASCADE,
    INDEX idx_sequence_position (sequence_id, position)
);
```