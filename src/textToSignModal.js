// Text to Sign Modal Controller
import OpenRouterNGTTranslator from './openRouterNGTTranslator.js';

class TextToSignModal {
  constructor(uiController) {
    this.uiController = uiController;
    this.modal = document.getElementById('textToSignModal');
    this.textInput = document.getElementById('dutchTextInput');
    this.convertBtn = document.getElementById('convertButton');
    this.ngtTranslateBtn = document.getElementById('ngtTranslateButton');
    this.addToSeqBtn = document.getElementById('addToSequencer');
    
    // Debug: Check if NGT button exists
    console.log('NGT Translate Button found:', this.ngtTranslateBtn);
    console.log('Convert Button found:', this.convertBtn);
    this.resultsSection = document.getElementById('resultsSection');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.errorMessage = document.getElementById('errorMessage');
    this.wordSelections = document.getElementById('wordSelections');
    this.ngtResults = document.getElementById('ngtResults');
    
    // Initialize OpenRouter NGT Translator
    this.ngtTranslator = new OpenRouterNGTTranslator();
    this.currentMode = 'api'; // 'api' or 'ngt'
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.convertBtn.addEventListener('click', () => this.handleConvert());
    
    // Add NGT translate button listener if it exists
    if (this.ngtTranslateBtn) {
      console.log('✅ Setting up NGT translate button listener');
      this.ngtTranslateBtn.addEventListener('click', () => this.handleNGTTranslate());
    } else {
      console.warn('❌ NGT translate button not found in DOM');
    }
    
    this.addToSeqBtn.addEventListener('click', () => this.handleAddToSequencer());
    
    // Close modal when clicking outside
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
    
    // Handle enter key in text input
    this.textInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleConvert();
      }
    });
  }
  
  async handleConvert() {
    const text = this.textInput.value.trim();
    
    if (!text) {
      this.showError('Please enter some text');
      return;
    }
    
    this.showLoading(true);
    this.hideError();
    this.currentMode = 'api';
    
    try {
      const apiData = await this.convertTextToSigns(text);
      this.displayWordSelections(apiData);
      this.resultsSection.style.display = 'block';
      if (this.ngtResults) this.ngtResults.style.display = 'none';
      
      // Show summary
      console.log(`Found ${apiData.summary.found_words} words with ${apiData.summary.animations_found} animations`);
      
    } catch (error) {
      this.showError('Failed to convert text: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async handleNGTTranslate() {
    console.log('🔥 NGT Translate button clicked!');
    
    const text = this.textInput.value.trim();
    console.log('Input text:', text);
    
    if (!text) {
      this.showError('Please enter some text');
      return;
    }
    
    this.showLoading(true);
    this.hideError();
    this.currentMode = 'ngt';
    
    console.log('🚀 Starting NGT translation...');
    
    try {
      const ngtResult = await this.ngtTranslator.translateAndMatch(text);
      
      if (ngtResult.success) {
        this.displayNGTResults(ngtResult);
        if (this.ngtResults) this.ngtResults.style.display = 'block';
        this.resultsSection.style.display = 'none';
        
        console.log(`NGT Translation completed. Found ${ngtResult.animation_matches.matched.length} matched gebaren, ${ngtResult.animation_matches.unmatched.length} unmatched.`);
      } else {
        this.showError('NGT Translation failed: ' + ngtResult.error);
      }
      
    } catch (error) {
      this.showError('Failed to translate with NGT: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }
  
  async handleAddToSequencer() {
    let selections = [];
    
    if (this.currentMode === 'api') {
      selections = this.collectSelectedAnimations();
    } else if (this.currentMode === 'ngt') {
      selections = this.collectNGTAnimations();
    }
    
    if (selections.length === 0) {
      this.showError('Please select at least one animation');
      return;
    }
    
    this.showLoading(true);
    
    try {
      let addedCount;
      
      if (this.currentMode === 'api') {
        addedCount = await this.addAnimationsToSequencer(selections);
      } else if (this.currentMode === 'ngt') {
        addedCount = await this.addNGTAnimationsToSequencer(selections);
      }
      
      // Close modal and show success
      this.close();
      this.uiController.showNotification(`Added ${addedCount} animations to sequencer`, 'success');
      
    } catch (error) {
      this.showError('Failed to add animations: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }
  
  async convertTextToSigns(text) {
    // Use the updated sensesToGlos.php API that now includes timing data
    const apiUrl = '/api/signcollect/animDB/sensesToGlos.php';
    
    try {
      console.log(`🔍 Using updated sensesToGlos API with timing data for: "${text}"`);
      
      const response = await fetch(`${apiUrl}?text=${encodeURIComponent(text)}&limit=5`);
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Found ${data.data.summary.animations_found} animations with timing data`);
        return data.data;
      } else {
        throw new Error(data.error || 'API error occurred');
      }
    } catch (error) {
      console.error('Error calling updated sensesToGlos API:', error);
      throw error;
    }
  }
  
  displayWordSelections(apiData) {
    this.wordSelections.innerHTML = '';
    
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
        
        let bestMatch = null;
        let bestScore = 0;
        
        // Add animation options and find best match
        wordData.animations.forEach(anim => {
          // Debug: log raw animation data from API response (should now include timing)
          console.log(`🔍 Raw animation data from updated API for ${anim.gloss}:`, anim);
          console.log(`   Timing: start=${anim.startTime}, end=${anim.endTime}`);
          
          const option = document.createElement('option');
          option.value = JSON.stringify({
            filename: anim.filename,
            url: anim.file_url,
            gloss: anim.gloss,
            startTime: anim.startTime,
            endTime: anim.endTime,
            originalStartTime: anim.originalStartTime,
            originalEndTime: anim.originalEndTime
          });
          option.textContent = `${anim.gloss} - ${anim.filename}`;
          select.appendChild(option);
          
          // Calculate similarity score
          const score = this.calculateSimilarity(wordData.word.toLowerCase(), anim.gloss.toLowerCase());
          if (score > bestScore) {
            bestScore = score;
            bestMatch = option;
          }
        });
        
        // Auto-select the best match if similarity is good enough
        if (bestMatch && bestScore > 0.3) {
          bestMatch.selected = true;
        }
      } else {
        // No animations available
        select.innerHTML = '<option value="">No animations available</option>';
        select.disabled = true;
      }
      
      wordDiv.appendChild(label);
      wordDiv.appendChild(select);
      this.wordSelections.appendChild(wordDiv);
    });
  }
  
  collectSelectedAnimations() {
    const selections = [];
    const selects = document.querySelectorAll('[id^="word-select-"]');
    
    selects.forEach(select => {
      if (select.value && !select.disabled) {
        const animData = JSON.parse(select.value);
        
        // Debug: log the raw animation data from API
        console.log(`📋 Collected API animation data for ${animData.gloss}:`, animData);
        
        selections.push({
          word: select.dataset.word,
          filename: animData.filename,
          url: animData.url,
          gloss: animData.gloss,
          startTime: animData.startTime,
          endTime: animData.endTime,
          originalStartTime: animData.originalStartTime,
          originalEndTime: animData.originalEndTime
        });
      }
    });
    
    return selections;
  }
  
  async addAnimationsToSequencer(animations) {
    // Use the existing SignCollectAPI to handle downloads with proper CORS handling
    const downloadPromises = animations.map(async (anim) => {
      try {
        // Debug: log incoming animation data
        console.log(`🔍 Processing API animation: ${anim.gloss || anim.word}`, anim);
        
        // Create animation object compatible with SignCollectAPI.getCachedFileUrl
        const animation = {
          filename: anim.filename,
          file_url: anim.url,
          gloss: anim.gloss,
          originalStartTime: anim.originalStartTime,
          originalEndTime: anim.originalEndTime
        };
        
        console.log(`🔧 Created animation object:`, animation);
        
        const cachedUrl = await this.uiController.signCollectAPI.getCachedFileUrl(animation);
        
        // Convert timing data if available
        let startFrame = null;
        let endFrame = null;
        
        if (anim.originalStartTime && anim.originalEndTime) {
          // Convert timing from API data to frames
          console.log(`🕐 Converting timing for ${anim.gloss}:`);
          console.log(`   Original time: ${anim.originalStartTime} - ${anim.originalEndTime}`);
          
          const timingData = await this.uiController.signCollectAPI.convertTimingToFrames(animation);
          startFrame = timingData.start;
          endFrame = timingData.end;
          
          console.log(`   Converted frames: ${startFrame} - ${endFrame}`);
        } else {
          console.log(`⚠️ No timing data for ${anim.gloss || anim.word}`);
        }
        
        // Create sign object compatible with the existing system
        return {
          name: anim.gloss || anim.word,
          file: cachedUrl,
          isApi: true,
          originalUrl: anim.url,
          filename: anim.filename,
          start: startFrame || 0,
          end: endFrame || null,
          timingData: {
            originalStartTime: anim.originalStartTime,
            originalEndTime: anim.originalEndTime,
            apiFps: 24,
            actualFps: 60 // Will be updated when animation loads
          }
        };
      } catch (error) {
        console.error(`Failed to download ${anim.filename}:`, error);
        return null;
      }
    });
    
    const downloadedAnimations = await Promise.all(downloadPromises);
    const validAnimations = downloadedAnimations.filter(a => a !== null);
    
    // Add to sequencer using uniform method (same as library and NGT)
    const addPromises = validAnimations.map(async (sign) => {
      // Debug: log the frame data being used for API signs
      console.log(`🎯 Adding API animation with uniform method: ${sign.name}`);
      console.log(`   Frame range: ${sign.start} - ${sign.end}`);
      console.log(`   Sign object:`, sign);

      // Use the same addToSequence method - it already handles API signs properly
      await this.uiController.addToSequence(sign);
    });

    // Wait for all signs to be added
    await Promise.all(addPromises);
    
    return validAnimations.length;
  }

  displayNGTResults(ngtResult) {
    if (!this.ngtResults) {
      console.warn('NGT results element not found in DOM');
      return;
    }

    this.ngtResults.innerHTML = '';

    // Create main container
    const container = document.createElement('div');
    container.className = 'ngt-results-container';

    // Display original text and NGT translation info
    const translationInfo = document.createElement('div');
    translationInfo.className = 'ngt-translation-info';
    translationInfo.innerHTML = `
      <h3>NGT Translation</h3>
      <p><strong>Original:</strong> ${ngtResult.original_text}</p>
      <p><strong>NGT Sequence:</strong> ${ngtResult.ngt_translation.ng_vertaling.gebaren_opeenvolging.join(' → ')}</p>
      <p><strong>Grammar:</strong> ${ngtResult.ngt_translation.ng_vertaling.grammatica_uitleg}</p>
      <p><strong>NMM:</strong> ${ngtResult.ngt_translation.ng_vertaling.nmm_essentieel}</p>
    `;
    container.appendChild(translationInfo);

    // Display matched animations
    if (ngtResult.animation_matches.matched.length > 0) {
      const matchedSection = document.createElement('div');
      matchedSection.className = 'ngt-matched-section';
      matchedSection.innerHTML = '<h4>Matched Animations</h4>';

      ngtResult.animation_matches.matched.forEach((match, index) => {
        const matchDiv = document.createElement('div');
        matchDiv.className = 'ngt-match-selection';

        const label = document.createElement('label');
        label.textContent = `${match.gebaar}:`;

        const select = document.createElement('select');
        select.id = `ngt-select-${index}`;
        select.dataset.gebaar = match.gebaar;

        // Add "none" option
        select.innerHTML = '<option value="">-- Select animation --</option>';

        let bestMatch = null;
        let bestScore = 0;

        // Add animation options
        match.matches.forEach(anim => {
          const option = document.createElement('option');
          option.value = JSON.stringify({
            name: anim.name,
            file: anim.file,
            start: anim.start,
            end: anim.end,
            folder: anim.folder,
            similarity: anim.similarity,
            matchType: anim.matchType
          });
          option.textContent = `${anim.name} (${Math.round(anim.similarity * 100)}% match)`;
          select.appendChild(option);

          if (anim.similarity > bestScore) {
            bestScore = anim.similarity;
            bestMatch = option;
          }
        });

        // Auto-select the best match if similarity is good enough
        if (bestMatch && bestScore > 0.5) {
          bestMatch.selected = true;
        }

        matchDiv.appendChild(label);
        matchDiv.appendChild(select);
        matchedSection.appendChild(matchDiv);
      });

      container.appendChild(matchedSection);
    }

    // Display unmatched gebaren
    if (ngtResult.animation_matches.unmatched.length > 0) {
      const unmatchedSection = document.createElement('div');
      unmatchedSection.className = 'ngt-unmatched-section';
      unmatchedSection.innerHTML = `
        <h4>Unmatched Gebaren</h4>
        <p>No animations found for: <strong>${ngtResult.animation_matches.unmatched.join(', ')}</strong></p>
      `;
      container.appendChild(unmatchedSection);
    }

    this.ngtResults.appendChild(container);
  }

  collectNGTAnimations() {
    const selections = [];
    const selects = document.querySelectorAll('[id^="ngt-select-"]');

    selects.forEach(select => {
      if (select.value && !select.disabled) {
        const animData = JSON.parse(select.value);
        selections.push({
          gebaar: select.dataset.gebaar,
          ...animData
        });
      }
    });

    return selections;
  }

  async addNGTAnimationsToSequencer(animations) {
    // NGT animations are local files from availableSigns, so they should be treated 
    // exactly like library signs to ensure proper frame timing
    
    const addPromises = animations.map(async (anim) => {
      // Create sign object that matches the exact structure of availableSigns
      const sign = {
        name: anim.name,
        file: anim.file,
        start: anim.start,  // Frame data from availableSigns lookup
        end: anim.end,      // Frame data from availableSigns lookup  
        folder: anim.folder,
        // Remove NGT-specific properties to match library sign structure
        // originalGebaar: anim.gebaar,
        // similarity: anim.similarity,
        // matchType: anim.matchType,
        // isNGT: true  // Don't mark as NGT, let it be treated as normal library sign
      };

      // Debug: log the frame data being used
      console.log(`🎯 Adding NGT animation as library sign: ${anim.name}`);
      console.log(`   Frame range: ${anim.start} - ${anim.end}`);
      console.log(`   Sign object:`, sign);

      // Use the same path as library signs by calling addToSequence
      await this.uiController.addToSequence(sign);
    });

    // Wait for all signs to be added
    await Promise.all(addPromises);
    
    return animations.length;
  }
  
  showLoading(show) {
    this.loadingIndicator.style.display = show ? 'block' : 'none';
    this.convertBtn.disabled = show;
    if (this.ngtTranslateBtn) this.ngtTranslateBtn.disabled = show;
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
    this.wordSelections.innerHTML = '';
    if (this.ngtResults) {
      this.ngtResults.style.display = 'none';
      this.ngtResults.innerHTML = '';
    }
    this.hideError();
    this.textInput.focus();
  }
  
  close() {
    this.modal.style.display = 'none';
  }
  
  // Calculate similarity between two strings using multiple methods
  calculateSimilarity(word1, word2) {
    // Exact match gets highest score
    if (word1 === word2) {
      return 1.0;
    }
    
    // Check if one word starts with the other
    if (word1.startsWith(word2) || word2.startsWith(word1)) {
      return 0.8;
    }
    
    // Check if one word contains the other
    if (word1.includes(word2) || word2.includes(word1)) {
      return 0.6;
    }
    
    // Levenshtein distance based similarity
    const distance = this.levenshteinDistance(word1, word2);
    const maxLength = Math.max(word1.length, word2.length);
    const similarity = 1 - (distance / maxLength);
    
    return similarity;
  }
  
  // Calculate Levenshtein distance between two strings
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    // Create matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

export default TextToSignModal;