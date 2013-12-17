// Copyright (c) 2009 The Chromium Authors. All rights reserved.  Use of this
// source code is governed by a BSD-style license that can be found in the
// LICENSE file.

var screenshot = {
  QUALITY: 50,
  FPS: 5,
  tab: 0,
  canvas: document.createElement("canvas"),
  startX: 0,
  startY: 0,
  scrollX: 0,
  scrollY: 0,
  docHeight: 0,
  docWidth: 0,
  visibleWidth: 0,
  visibleHeight: 0,
  scrollXCount: 0,
  scrollYCount: 0,
  scrollBarX: 17,
  scrollBarY: 17,
  captureStatus: true,
  isRecording: false,
  images: [],
  timer: null,
  binary_gif: null,
  imageDataBase_64: null,

  /**
  * Receive messages from content_script, and then decide what to do next
  */
  addMessageListener: function() {
    chrome.extension.onMessage.addListener(function(request, sender, response) {
      var obj = request;
      //alert("Background message listener" + obj.msg);
      switch (obj.msg) {
        case 'capture_selected':
          screenshot.captureSelected();
          break;
      }
    });
  },


  /**
  * Send the Message to content-script
  */
  sendMessage: function(message, callback) {
    chrome.tabs.getSelected(null, function(tab) {
      //alert("Background message sender" + message.msg);
      chrome.tabs.sendMessage(tab.id, message, callback);
    });
  },

  showSelectionArea: function() {
    //alert("show_selection_area *******4");
    screenshot.sendMessage({msg: 'show_selection_area'}, null);
  },

  captureSelected: function() {
    screenshot.sendMessage({msg: 'capture_selected'},
        screenshot.onResponseVisibleSize);
  },

  onResponseVisibleSize: function(response) {
    screenshot.startX = response.startX,
    screenshot.startY = response.startY,
    screenshot.scrollX = response.scrollX,
    screenshot.scrollY = response.scrollY,
    screenshot.canvas.width = response.canvasWidth;
    screenshot.canvas.height = response.canvasHeight;
    screenshot.visibleHeight = response.visibleHeight,
    screenshot.visibleWidth = response.visibleWidth,
    screenshot.scrollXCount = response.scrollXCount;
    screenshot.scrollYCount = response.scrollYCount;
    screenshot.docWidth = response.docWidth;
    screenshot.docHeight = response.docHeight;
    screenshot.zoom = response.zoom;
    screenshot.startRecording();
  },

  isThisPlatform: function(operationSystem) {
    return navigator.userAgent.toLowerCase().indexOf(operationSystem) > -1;
  },

  executeScriptsInExistingTabs: function() {
    chrome.windows.getAll(null, function(wins) {
      for (var j = 0; j < wins.length; ++j) {
        chrome.tabs.getAllInWindow(wins[j].id, function(tabs) {
          for (var i = 0; i < tabs.length; ++i) {
            if (tabs[i].url.indexOf("chrome://") != 0) {
              chrome.tabs.executeScript(tabs[i].id, { file: 'js/page.js' });
            }
          }
        });
      }
    });
  },

  startRecording: function() {
    screenshot.isRecording = true;
    //Update icon to show that it's recording
    //chrome.browserAction.setIcon({path: 'images/icon-rec.png'});
    //chrome.browserAction.setTitle({title: 'Stop recording.'});
    images = [];
    // Set up a timer to regularly get screengrabs
    timer = setInterval(function() {
      chrome.tabs.captureVisibleTab(null, {quality: screenshot.QUALITY}, function(img) {
          if (img !== undefined){
            images.push(img);
          }
      });
    }, 1000 / screenshot.FPS);
    chrome.browserAction.setBadgeText({'text': 'REC'});
  },

  stopRecording: function() {
    // Stop the timer
    clearInterval(timer);

    //Generate gif
    var x = screenshot.startX - screenshot.scrollX;
    var y = screenshot.startY - screenshot.scrollY;
    var binary_gif = screenshot.encodeGif(x, y, screenshot.canvas.width, screenshot.canvas.height);
    screenshot.binary_gif = binary_gif;
    screenshot.imageDataBase_64 = 'data:image/gif;base64,'+encode64(binary_gif);

    // Update icon to show regular icon
    //chrome.browserAction.setIcon({path: 'images/icon.png'});
    //chrome.browserAction.setTitle({title: 'Start recording.'});

    chrome.tabs.create({'url': 'show_gif.html'});
    screenshot.isRecording = false;
  },

  encodeGif: function (x, y, width, height, processingCallback){
    var ctx = screenshot.canvas.getContext("2d");
    var encoder = new GIFEncoder();
    encoder.setRepeat(0); //0  -> loop forever, 1+ -> loop n times then stop
    encoder.setDelay(1000 / screenshot.FPS); //go to next frame every n milliseconds
    encoder.start();

    for (var index = 0; index < images.length; index++) {
      chrome.browserAction.setBadgeText({'text': Math.round((index+1) * 100 / images.length)  + "%"});
      var imageData = images[index];
      var image = new Image();
      image.src = imageData;
      ctx.drawImage(image,x, y, width, height, 0, 0, width, height);
      encoder.addFrame(ctx);
      console.log(index+1, images.length);
    }
    encoder.finish();
    chrome.browserAction.setBadgeText({'text': ''});
    return encoder.stream().getData();
  },

  init: function() {
    screenshot.executeScriptsInExistingTabs();
    screenshot.addMessageListener();
  }
};

screenshot.init();
