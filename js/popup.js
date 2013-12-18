function init() {
  var bg = chrome.extension.getBackgroundPage();
  if (bg.screenshot.isProcessing) {
    bg.screenshot.stopProcessing();
  } else {
    if (bg.screenshot.isRecording) {
        bg.screenshot.stopRecording();
      } else {
        bg.screenshot.showSelectionArea();
      }
  }

  window.close();
}

document.addEventListener('DOMContentLoaded', init);
