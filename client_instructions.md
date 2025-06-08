# Senses to Gloss API Integration Plan

## Overview

This document outlines how to integrate the `sensesToGlos.php` API into your client application to convert Dutch text into sign language animations using a modal interface.

## API Endpoint

**URL**: `https://signcollect.nl/animDB/sensesToGlos.php`  
**Method**: GET  
**Parameters**:
- `text` (required): The Dutch sentence to process
- `limit` (optional): Maximum animations per word (1-10, default: 5)

## Implementation Plan

### 1. Modal Interface Structure

```html
<div id="textToSignModal" class="modal">
  <div class="modal-content">
    <h2>Convert Text to Sign Language</h2>
    
    <!-- Input Section -->
    <div class="input-section">
      <label>Enter Dutch text:</label>
      <textarea id="dutchTextInput" placeholder="Type your sentence here..."></textarea>
      <button id="convertButton">Convert to Signs</button>
    </div>
    
    <!-- Results Section (hidden initially) -->
    <div id="resultsSection" style="display: none;">
      <h3>Select animations for each word:</h3>
      <div id="wordSelections"></div>
      <button id="addToSequencer">Add to Sequencer</button>
    </div>
    
    <!-- Loading/Error States -->
    <div id="loadingIndicator" style="display: none;">Processing...</div>
    <div id="errorMessage" style="display: none;"></div>
  </div>
</div>
```

### 2. JavaScript Implementation

#### 2.1 API Call Function

```javascript
async function convertTextToSigns(text) {
  const apiUrl = 'https://signcollect.nl/animDB/sensesToGlos.php';
  
  try {
    const response = await fetch(`${apiUrl}?text=${encodeURIComponent(text)}&limit=5`);
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'API error occurred');
    }
  } catch (error) {
    console.error('Error calling sensesToGlos API:', error);
    throw error;
  }
}
```

#### 2.2 Process API Response and Create Dropdowns

```javascript
function displayWordSelections(apiData) {
  const container = document.getElementById('wordSelections');
  container.innerHTML = '';
  
  apiData.words.forEach((wordData, index) => {
    const wordDiv = document.createElement('div');
    wordDiv.className = 'word-selection';
    
    // Word label with status
    const label = document.createElement('label');
    label.textContent = wordData.word;
    
    // Add lemma info if present
    if (wordData.lemmatized_from) {
      label.textContent += ` (lemmatized from: ${wordData.lemmatized_from})`;
    }
    
    // Create dropdown
    const select = document.createElement('select');
    select.id = `word-select-${index}`;
    select.dataset.word = wordData.word;
    
    if (wordData.animations && wordData.animations.length > 0) {
      // Add "none" option
      select.innerHTML = '<option value="">-- Select animation --</option>';
      
      // Add animation options
      wordData.animations.forEach(anim => {
        const option = document.createElement('option');
        option.value = JSON.stringify({
          filename: anim.filename,
          url: anim.file_url,
          gloss: anim.gloss
        });
        option.textContent = `${anim.gloss} - ${anim.filename}`;
        select.appendChild(option);
      });
    } else {
      // No animations available
      select.innerHTML = '<option value="">No animations available</option>';
      select.disabled = true;
    }
    
    wordDiv.appendChild(label);
    wordDiv.appendChild(select);
    container.appendChild(wordDiv);
  });
}
```

#### 2.3 Handle User Selections

```javascript
function collectSelectedAnimations() {
  const selections = [];
  const selects = document.querySelectorAll('[id^="word-select-"]');
  
  selects.forEach(select => {
    if (select.value && !select.disabled) {
      const animData = JSON.parse(select.value);
      selections.push({
        word: select.dataset.word,
        filename: animData.filename,
        url: animData.url,
        gloss: animData.gloss
      });
    }
  });
  
  return selections;
}
```

#### 2.4 Add to Sequencer

```javascript
async function addAnimationsToSequencer(animations) {
  // Download animation files
  const downloadPromises = animations.map(async (anim) => {
    try {
      const response = await fetch(anim.url);
      const blob = await response.blob();
      return {
        word: anim.word,
        gloss: anim.gloss,
        filename: anim.filename,
        blob: blob,
        url: URL.createObjectURL(blob)
      };
    } catch (error) {
      console.error(`Failed to download ${anim.filename}:`, error);
      return null;
    }
  });
  
  const downloadedAnimations = await Promise.all(downloadPromises);
  const validAnimations = downloadedAnimations.filter(a => a !== null);
  
  // Add to your sequencer
  validAnimations.forEach((anim, index) => {
    // Your sequencer add logic here
    sequencer.addAnimation({
      position: index + 1,
      sign_name: anim.gloss,
      file: anim.blob,
      url: anim.url,
      // Add other required fields
    });
  });
  
  return validAnimations.length;
}
```

### 3. Complete Modal Controller

```javascript
class TextToSignModal {
  constructor() {
    this.modal = document.getElementById('textToSignModal');
    this.textInput = document.getElementById('dutchTextInput');
    this.convertBtn = document.getElementById('convertButton');
    this.addToSeqBtn = document.getElementById('addToSequencer');
    this.resultsSection = document.getElementById('resultsSection');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.errorMessage = document.getElementById('errorMessage');
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.convertBtn.addEventListener('click', () => this.handleConvert());
    this.addToSeqBtn.addEventListener('click', () => this.handleAddToSequencer());
  }
  
  async handleConvert() {
    const text = this.textInput.value.trim();
    
    if (!text) {
      this.showError('Please enter some text');
      return;
    }
    
    this.showLoading(true);
    this.hideError();
    
    try {
      const apiData = await convertTextToSigns(text);
      displayWordSelections(apiData);
      this.resultsSection.style.display = 'block';
      
      // Show summary
      console.log(`Found ${apiData.summary.found_words} words with ${apiData.summary.animations_found} animations`);
      
    } catch (error) {
      this.showError('Failed to convert text: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }
  
  async handleAddToSequencer() {
    const selections = collectSelectedAnimations();
    
    if (selections.length === 0) {
      this.showError('Please select at least one animation');
      return;
    }
    
    this.showLoading(true);
    
    try {
      const addedCount = await addAnimationsToSequencer(selections);
      
      // Close modal and show success
      this.close();
      alert(`Added ${addedCount} animations to sequencer`);
      
    } catch (error) {
      this.showError('Failed to add animations: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }
  
  showLoading(show) {
    this.loadingIndicator.style.display = show ? 'block' : 'none';
    this.convertBtn.disabled = show;
    this.addToSeqBtn.disabled = show;
  }
  
  showError(message) {
    this.errorMessage.textContent = message;
    this.errorMessage.style.display = 'block';
  }
  
  hideError() {
    this.errorMessage.style.display = 'none';
  }
  
  open() {
    this.modal.style.display = 'block';
    this.textInput.value = '';
    this.resultsSection.style.display = 'none';
    this.hideError();
  }
  
  close() {
    this.modal.style.display = 'none';
  }
}

// Initialize
const textToSignModal = new TextToSignModal();
```

### 4. CSS Styling

```css
.modal {
  display: none;
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.5);
}

.modal-content {
  background-color: #fff;
  margin: 5% auto;
  padding: 20px;
  border-radius: 8px;
  width: 80%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.word-selection {
  margin-bottom: 15px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.word-selection label {
  display: block;
  font-weight: bold;
  margin-bottom: 5px;
}

.word-selection select {
  width: 100%;
  padding: 5px;
}

#dutchTextInput {
  width: 100%;
  min-height: 100px;
  padding: 10px;
  margin-bottom: 10px;
}

button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}

button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

#errorMessage {
  color: red;
  padding: 10px;
  background-color: #f8d7da;
  border-radius: 4px;
  margin-top: 10px;
}

#loadingIndicator {
  text-align: center;
  color: #666;
  padding: 20px;
}
```

## Usage Flow

1. **User opens modal** and types a Dutch sentence
2. **Click "Convert to Signs"** - API is called with the text
3. **API returns** word analysis with available animations
4. **Dropdowns appear** for each word showing available animations
5. **User selects** desired animation for each word (or leaves blank)
6. **Click "Add to Sequencer"** - Selected animations are downloaded
7. **Animations added** to sequencer in order

## API Response Handling

### Success Response Structure
```json
{
  "success": true,
  "data": {
    "words": [
      {
        "word": "huis",
        "gloss": "HUIS-A, HUIS-B",
        "animations": [
          {
            "filename": "HUIS-A.glb",
            "file_url": "https://...",
            "gloss": "HUIS-A"
          }
        ],
        "status": "FOUND"
      }
    ],
    "summary": {
      "total_words": 3,
      "found_words": 2,
      "animations_found": 5
    }
  }
}
```

### Status Types
- `FOUND`: Direct match found
- `FOUND_VIA_LEMMA`: Found through lemmatization
- `GLB_NOT_FOUND`: Word found but no animation
- `NOT_FOUND`: Word not found at all

## Error Handling

1. **Network errors**: Show user-friendly message
2. **No animations found**: Disable dropdown for that word
3. **Lemmatization**: Show original and lemmatized form
4. **Empty selections**: Prevent adding to sequencer

## Performance Considerations

1. **Limit sentence length** to prevent overloading
2. **Cache API responses** for repeated words
3. **Batch download** animations in parallel
4. **Show progress** during long operations

## Testing

Test with various inputs:
- Single words: "huis"
- Multiple words: "ik wil naar huis"
- Words requiring lemmatization: "wil" → "willen"
- Words without animations
- Mixed results

## Future Enhancements

1. **Preview animations** before adding
2. **Reorder selections** before adding to sequencer
3. **Save common phrases** for reuse
4. **Batch processing** multiple sentences
5. **Animation timing** adjustment per word