import { availableSigns, availableSignsMap } from "./availableSigns.js";
class FrameEditor {
  constructor(
    scene,
    animationController,
    showNotification,
    updateLibraryUI,
    updateSequenceUI
  ) {
    this.animationController = animationController;
    this.showNotification = showNotification;
    this.UIcontroller = {
      updateLibraryUI: updateLibraryUI,
      updateSequenceUI: updateSequenceUI,
    };
    this.scene = scene;
  }

  show(sign, frameInfoElement, animationGroup, sequenceItem = null) {
    // Stop all currently playing animations
    this.scene.animationGroups.forEach(group => {
      group.stop();
      console.log(`Stopped animation: ${group.name}`);
    });
    
    // Reset the animation controller's playing state
    if (this.animationController) {
      this.animationController.isPlaying = false;
    }
    
    // Store the sign for later use in test animation
    this.currentSign = sign;
    
    const modal = this.createFrameEditorModal(sign, animationGroup, sequenceItem);
    document.body.appendChild(modal);

    const elements = this.getFrameEditorElements(modal);
    this.setupFrameEditorEventListeners(elements, sign, frameInfoElement, animationGroup, sequenceItem);
  }

  // Create the frame editor modal structure
  createFrameEditorModal(sign, animationGroup, sequenceItem = null) {
    // Find the sign in the available signs map
    console.log("Sign name map", availableSignsMap[sign.name]);

    console.log("Available signs map updated:", availableSignsMap);

    // Use sequence item's frame range if editing from sequence, otherwise use global
    let frameStart = 0;
    if (sequenceItem) {
      frameStart = sequenceItem.frameRange.start;
    } else if (!sign.isApi && availableSignsMap[sign.name]) {
      frameStart = availableSignsMap[sign.name].start || 0;
    } else if (sign.start !== undefined) {
      frameStart = sign.start;
    }
    
    // Get the actual animation end frame from the animation group
    let maxFrames = 250; // Default fallback
    if (animationGroup && animationGroup.to) {
      maxFrames = Math.ceil(animationGroup.to);
      console.log(`Animation ${sign.name} has ${maxFrames} frames total`);
    }
    
    let frameEnd = maxFrames;
    if (sequenceItem) {
      frameEnd = sequenceItem.frameRange.end;
    } else if (!sign.isApi && availableSignsMap[sign.name]) {
      frameEnd = availableSignsMap[sign.name].end || maxFrames;
    } else if (sign.end !== undefined && sign.end !== null) {
      frameEnd = sign.end;
    }

    console.log("Sign to edit:", sign);
    const modal = document.createElement("div");
    modal.className = "frame-editor-modal";
    modal.innerHTML = `
      <div class="frame-editor-content">
        <div class="frame-editor-header">
          <h3>Edit Frame Timing - ${sign.name}</h3>
          <button class="frame-editor-close">×</button>
        </div>
        <div class="frame-editor-body">
          <div class="frame-control">
            <label for="start-frame">Start Frame: <span id="start-value">${frameStart}</span></label>
            <input type="range" id="start-frame" value="${frameStart}" min="0" max="${maxFrames - 1}" step="1" class="frame-slider">
          </div>
          <div class="frame-control">
            <label for="end-frame">End Frame: <span id="end-value">${frameEnd}</span></label>
            <input type="range" id="end-frame" value="${frameEnd}" min="1" max="${maxFrames}" step="1" class="frame-slider">
          </div>
          <div class="frame-preview">
            <p>Original: ${frameStart} - ${frameEnd} (${
      frameEnd - frameStart
    } frames)</p>
            <p style="font-size: 0.9em; color: #666;">Total available frames: ${maxFrames}</p>
            <div class="frame-preview-live">
              <p id="frame-preview-text">Preview: ${frameStart} - ${frameEnd} (${
      frameEnd - frameStart
    } frames)</p>
            </div>
          </div>
          <div class="frame-editor-actions">
            <button class="test-button">🎬 Test Animation</button>
            <button class="save-button">💾 Save Changes</button>
            <button class="cancel-button">Cancel</button>
          </div>
        </div>
      </div>
    `;
    return modal;
  }

  // Get all necessary elements from the modal
  getFrameEditorElements(modal) {
    return {
      startInput: modal.querySelector("#start-frame"),
      endInput: modal.querySelector("#end-frame"),
      startValueSpan: modal.querySelector("#start-value"),
      endValueSpan: modal.querySelector("#end-value"),
      previewText: modal.querySelector("#frame-preview-text"),
      closeButton: modal.querySelector(".frame-editor-close"),
      testButton: modal.querySelector(".test-button"),
      saveButton: modal.querySelector(".save-button"),
      cancelButton: modal.querySelector(".cancel-button"),
      modal: modal,
    };
  }

  // Setup all event listeners for the frame editor
  setupFrameEditorEventListeners(elements, sign, frameInfoElement, animationGroup, sequenceItem = null) {
    let autoTestTimeout;

    const updatePreview = (slider) => {
      const start = parseInt(elements.startInput.value) || 0;
      const end = parseInt(elements.endInput.value) || 1;
      const duration = Math.max(0, end - start);

      elements.startValueSpan.textContent = start;
      elements.endValueSpan.textContent = end;
      elements.previewText.textContent = `Preview: ${start} - ${end} (${duration} frames)`;

      // If editing from sequence, update the sequence item's frame range
      if (sequenceItem) {
        sequenceItem.frameRange.start = start;
        sequenceItem.frameRange.end = end;
        sequenceItem.sign.start = start;
        sequenceItem.sign.end = end;
      } else {
        // Otherwise update the global availableSignsMap
        availableSignsMap[sign.name] = {
          ...availableSignsMap[sign.name],
          start: start,
          end: end,
        };
      }

      // Preview the frame when adjusting sliders
      if (animationGroup) {
        // Normalize the animation to the new frame range
        animationGroup.normalize(start, end);
        
        // If not playing, start it first to make goToFrame work
        if (!animationGroup.isPlaying) {
          animationGroup.start(false);
        }
        
        // Make sure it's paused
        animationGroup.pause();
        
        // Go to the appropriate frame based on which slider is being adjusted
        if (slider === "start") {
          console.log("Going to start frame:", start);
          animationGroup.goToFrame(start);
        } else if (slider === "end") {
          console.log("Going to end frame:", end);
          animationGroup.goToFrame(end);
        }

        // Force a render to show the frame
        this.scene.render();
      }

      const isValid = start < end;
      elements.previewText.style.color = isValid ? "#333" : "#F44336";
      elements.saveButton.disabled = !isValid;
      elements.testButton.disabled = !isValid;

      this.UIcontroller.updateLibraryUI();
      this.UIcontroller.updateSequenceUI();
    };

    const autoTestAnimation = () => {
      const newStart = parseInt(elements.startInput.value) || 0;
      const newEnd = parseInt(elements.endInput.value) || 1;

      if (newStart >= newEnd) return;

      clearTimeout(autoTestTimeout);
      autoTestTimeout = setTimeout(async () => {
        const originalStart = sign.start;
        const originalEnd = sign.end;

        sign.start = newStart;
        sign.end = newEnd;

        // this.animationController.clearCachedAnimation(sign.name);

        try {
          await this.animationController.playSign(sign.name);
        } catch (error) {
          console.error("Error auto-testing animation:", error);
        }

        sign.start = originalStart;
        sign.end = originalEnd;
        // this.animationController.clearCachedAnimation(sign.name);
      }, 800);
    };

    const closeModal = () => {
      if (autoTestTimeout) {
        clearTimeout(autoTestTimeout);
      }
      // Stop the animation when closing the modal
      if (animationGroup) {
        animationGroup.stop();
      }
      document.body.removeChild(elements.modal);
    };

    const handleTestAnimation = async () => {
      const newStart = parseInt(elements.startInput.value) || 0;
      const newEnd = parseInt(elements.endInput.value) || 1;

      if (newStart >= newEnd) return;

      elements.testButton.disabled = true;
      elements.testButton.innerHTML = "🎬 Testing...";

      const originalStart = sign.start;
      const originalEnd = sign.end;

      sign.start = newStart;
      sign.end = newEnd;

      try {
        // Create API sign object if needed
        let apiSign = null;
        if (sign.isApi) {
          apiSign = {
            name: sign.name,
            file: sign.file,
            isApi: true,
            originalUrl: sign.originalUrl,
            filename: sign.filename
          };
        }
        await this.animationController.playSign(sign.name, null, apiSign);
      } catch (error) {
        console.error("Error testing animation:", error);
        this.showNotification("⚠️ Error testing animation", "error");
      }

      sign.start = originalStart;
      sign.end = originalEnd;
      // this.animationController.clearCachedAnimation(sign.name);

      elements.testButton.disabled = false;
      elements.testButton.innerHTML = "🎬 Test Animation";
    };

    const handleSaveChanges = async () => {
      const newStart = parseInt(elements.startInput.value) || 0;
      const newEnd = parseInt(elements.endInput.value) || 1;

      if (newStart >= newEnd) {
        console.error("End frame must be greater than start frame!");
        this.showNotification(
          "End frame must be greater than start frame!",
          "error"
        );
        return;
      }

      elements.saveButton.disabled = true;
      elements.saveButton.innerHTML = "💾 Saving...";

      try {
        // If editing from sequence, update only the sequence item
        if (sequenceItem) {
          sequenceItem.frameRange.start = newStart;
          sequenceItem.frameRange.end = newEnd;
          sequenceItem.sign.start = newStart;
          sequenceItem.sign.end = newEnd;
          frameInfoElement.textContent = `Frames: ${newStart} - ${newEnd}`;
        } else {
          // Otherwise update the sign and global map
          sign.start = newStart;
          sign.end = newEnd;
          
          // Only update availableSignsMap if it's not an API sign
          if (!sign.isApi && availableSignsMap[sign.name]) {
            availableSignsMap[sign.name] = {
              ...availableSignsMap[sign.name],
              start: newStart,
              end: newEnd,
            };
            // Update all frame info displays in the library
            const frameInfo = document.getElementById(`frame-info-${sign.name}`);
            if (frameInfo) {
              frameInfo.textContent = `Frames: ${newStart} - ${newEnd}`;
            }
          }
        }
        console.log("Available signs map after save:", availableSignsMap);
        closeModal();
      } catch (error) {
        console.error("Error saving changes:", error);
        this.showNotification("Error saving changes", "error");
        elements.saveButton.disabled = false;
        elements.saveButton.innerHTML = "💾 Save Changes";
      }
    };

    // Add event listeners
    elements.startInput.addEventListener("input", () => {
      updatePreview("start");
      autoTestAnimation();
    });
    elements.endInput.addEventListener("input", () => {
      updatePreview("end");
      autoTestAnimation();
    });
    elements.closeButton.onclick = closeModal;
    elements.cancelButton.onclick = closeModal;
    elements.modal.onclick = (e) => {
      if (e.target === elements.modal) {
        closeModal();
      }
    };
    elements.testButton.onclick = handleTestAnimation;
    elements.saveButton.onclick = handleSaveChanges;

    // Initial setup: start the animation and immediately pause it at the start frame
    if (animationGroup) {
      const currentStart = parseInt(elements.startInput.value) || 0;
      const currentEnd = parseInt(elements.endInput.value) || animationGroup.to;
      
      // Normalize the animation to the current frame range
      animationGroup.normalize(currentStart, currentEnd);
      
      // Start the animation to make goToFrame work properly
      animationGroup.start(false);
      animationGroup.pause();
      animationGroup.goToFrame(currentStart);
      
      // Force a render to show the frame
      this.scene.render();
      console.log(`Animation ${animationGroup.name} set to frame ${currentStart}`);
    }
    
    // Initial preview update
    updatePreview();
    elements.modal.focus();
  }
}

export default FrameEditor;
