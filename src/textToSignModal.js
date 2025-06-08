// Text to Sign Modal Controller
class TextToSignModal {
  constructor(uiController) {
    this.uiController = uiController;
    this.modal = document.getElementById('textToSignModal');
    this.textInput = document.getElementById('dutchTextInput');
    this.convertBtn = document.getElementById('convertButton');
    this.addToSeqBtn = document.getElementById('addToSequencer');
    this.resultsSection = document.getElementById('resultsSection');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.errorMessage = document.getElementById('errorMessage');
    this.wordSelections = document.getElementById('wordSelections');
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.convertBtn.addEventListener('click', () => this.handleConvert());
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
    
    try {
      const apiData = await this.convertTextToSigns(text);
      this.displayWordSelections(apiData);
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
    const selections = this.collectSelectedAnimations();
    
    if (selections.length === 0) {
      this.showError('Please select at least one animation');
      return;
    }
    
    this.showLoading(true);
    
    try {
      const addedCount = await this.addAnimationsToSequencer(selections);
      
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
    // Use the proxy configured in vite.config.js for development
    const apiUrl = '/api/signcollect/animDB/sensesToGlos.php';
    
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
      this.wordSelections.appendChild(wordDiv);
    });
  }
  
  collectSelectedAnimations() {
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
  
  async addAnimationsToSequencer(animations) {
    // Use the existing SignCollectAPI to handle downloads with proper CORS handling
    const downloadPromises = animations.map(async (anim) => {
      try {
        // Create animation object compatible with SignCollectAPI.getCachedFileUrl
        const animation = {
          filename: anim.filename,
          file_url: anim.url,
          gloss: anim.gloss
        };
        
        const cachedUrl = await this.uiController.signCollectAPI.getCachedFileUrl(animation);
        
        // Create sign object compatible with the existing system
        return {
          name: anim.gloss || anim.word,
          file: cachedUrl,
          isApi: true,
          originalUrl: anim.url,
          filename: anim.filename,
          start: 0,
          end: null
        };
      } catch (error) {
        console.error(`Failed to download ${anim.filename}:`, error);
        return null;
      }
    });
    
    const downloadedAnimations = await Promise.all(downloadPromises);
    const validAnimations = downloadedAnimations.filter(a => a !== null);
    
    // Add to sequencer using existing method
    validAnimations.forEach((sign) => {
      this.uiController.addToSequence(sign);
    });
    
    return validAnimations.length;
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
    this.wordSelections.innerHTML = '';
    this.hideError();
    this.textInput.focus();
  }
  
  close() {
    this.modal.style.display = 'none';
  }
}

export default TextToSignModal;