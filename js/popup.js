// Copyright (c) 2009 The Chromium Authors. All rights reserved.  Use of this
// source code is governed by a BSD-style license that can be found in the
// LICENSE file.

function init() {
  var bg = chrome.extension.getBackgroundPage();

  if (bg.screenshot.isRecording) {
    bg.screenshot.stopRecording();
  } else {
    bg.screenshot.showSelectionArea();
  }
  window.close();
}

document.addEventListener('DOMContentLoaded', init);
