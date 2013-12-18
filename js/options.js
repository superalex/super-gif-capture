var bg = chrome.extension.getBackgroundPage();

var MAX_DURATION = 15000;
var QUALITY = 50;
var FPS = 5;

function $(id) {
  return document.getElementById(id);
}

function isInt(value){
    var er = /^[0-9]+$/;
    return ( er.test(value) ) ? true : false;
}

function init() {
  $('saveAndClose').addEventListener('click', saveAndCloseSettings);
  $('reset').addEventListener('click', resetSettings);
  initSettings();
}

function initSettings() {
  $('max-duration').value = localStorage.maxDuration || MAX_DURATION;
  $('quality').value = localStorage.quality || QUALITY;
  $('fps').value = localStorage.fps || FPS;
}

function saveSettings() {
  var maxDuration = $('max-duration').value;
  if (!isInt(maxDuration) || maxDuration < 1000){
      ErrorInfo.show('Invalid value for max duration, it must be an integer greater than 1000')
      return false;
  }
  var quality = $('quality').value;
  if (!isInt(quality) || quality < 0 || quality > 100){
      ErrorInfo.show('Invalid value for quality, it must be an integer from 0 to 100')
      return false;
  }
  var fps = $('fps').value;
  if (!isInt(fps) || fps < 0){
      ErrorInfo.show('Invalid value for fps, it must be an integer greater than 0')
      return false;
  }

  localStorage.maxDuration = parseInt(maxDuration);
  localStorage.quality = parseInt(quality);
  localStorage.fps = parseInt(fps);

  return true;
}

function saveAndCloseSettings() {
  if (saveSettings()){
    chrome.tabs.getSelected(null, function(tab) {
      chrome.tabs.remove(tab.id);
    });
  }
}

function resetSettings() {
  $('max-duration').value = MAX_DURATION;
  $('quality').value = QUALITY;
  $('fps').value = FPS;
  saveSettings();
}

var ErrorInfo = (function() {
  return {
    show: function(msg) {
      var infoWrapper = $('error-info');
      infoWrapper.innerText = msg;
      UI.show(infoWrapper);
    },

    hide: function() {
      var infoWrapper = $('error-info');
      if (infoWrapper) {
        UI.hide(infoWrapper);
      }
    }
  };
})();

document.addEventListener('DOMContentLoaded', init);
