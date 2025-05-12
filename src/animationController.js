class AnimationController {
    constructor(scene, characterController, isPlaying, sequenceItems) {
        this.scene = scene;
        this.characterController = characterController;
        this.isPlaying = isPlaying;
    }

    // Initialize the AnimationController
    init(sequenceItems) {
        this.sequenceItems = sequenceItems;
        console.log("AnimationController initialized with sequence items:", this.sequenceItems);  
    }

    // Play a single sign animation
    async playSign(signName) {
        console.log(`Playing sign: ${signName}`);

        if (this.characterController) {
        try {
            // Load and queue the animation
            await this.characterController.loadAnimation(signName);
            await this.characterController.playAnimation(signName);
        } catch (error) {
            console.error(`Error loading animation for ${signName}:`, error);
        }
        } else {
        console.warn("Character controller not available for animation");
        }
    }

    // Play the full sequence of signs
  async playSequence(sequenceItems) {
    if (this.isPlaying || sequenceItems.length == 0) return;
    
    // Disable play button during playback
    const playButton = document.getElementById("play-sequence-button");
    if (playButton) {
      playButton.disabled = true;
      playButton.innerHTML = "Playing...";
    }
    
    this.isPlaying = true;
    
    try {

        console.log("Sequence items:", sequenceItems[0]);
      // Play each sign in sequence
      for (let i = 0; i < sequenceItems.length; i++) {
        const item = sequenceItems[i];
        
        // Highlight the current item
        const sequenceItem = document.getElementById(`sequence-item-${item.id}`);
        if (sequenceItem) {
          sequenceItem.classList.add("playing");
        }
        console.log(`Playing sign: ${item.sign}`);
        // Play the sign
        await this.playSign(item.sign.name);
        
        // Remove highlight
        if (sequenceItem) {
          sequenceItem.classList.remove("playing");
        }
      }
    } catch (error) {
      console.error("Error playing sequence:", error);
    } finally {
      this.isPlaying = false;
      
      // Re-enable play button
      if (playButton) {
        playButton.disabled = false;
        playButton.innerHTML = "Play Sequence";
      }
    }
  }
}

// Export the AnimationController class
export default AnimationController;
