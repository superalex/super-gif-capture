// Copyright (c) 2010 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var capturePage = {
  startX: 150,
  startY: 150,
  endX: 400,
  endY: 300,
  moveX: 0,
  moveY: 0,
  pageWidth: 0,
  pageHeight: 0,
  visibleWidth: 0,
  visibleHeight: 0,
  dragging: false,
  moving: false,
  resizing: false,
  isMouseDown: false,
  scrollXCount: 0,
  scrollYCount: 0,
  scrollX: 0,
  scrollY: 0,
  captureWidth: 0,
  captureHeight: 0,
  isSelectionAreaTurnOn: false,
  fixedElements_ : [],
  marginTop: 0,
  marginLeft: 0,
  modifiedBottomRightFixedElements: [],
  originalViewPortWidth: document.documentElement.clientWidth,
  defaultScrollBarWidth: 17, // Default scroll bar width on windows platform.

  hasScrollBar: function(axis) {
    var body = document.body;
    var docElement = document.documentElement;
    if (axis == 'x') {
      if (window.getComputedStyle(body).overflowX == 'scroll')
        return true;
      return Math.abs(body.scrollWidth - docElement.clientWidth) >=
          capturePage.defaultScrollBarWidth;
    } else if (axis == 'y') {
      if (window.getComputedStyle(body).overflowY == 'scroll')
        return true;
      return Math.abs(body.scrollHeight - docElement.clientHeight) >=
          capturePage.defaultScrollBarWidth;
    }
  },

  getOriginalViewPortWidth: function() {
    chrome.extension.sendMessage({ msg: 'original_view_port_width'},
      function(originalViewPortWidth) {
        if (originalViewPortWidth) {
          capturePage.originalViewPortWidth = capturePage.hasScrollBar('y') ?
            originalViewPortWidth - capturePage.defaultScrollBarWidth : originalViewPortWidth;
        } else {
          capturePage.originalViewPortWidth = document.documentElement.clientWidth;
        }
      });
  },

  calculateSizeAfterZooming: function(originalSize) {
    var originalViewPortWidth = capturePage.originalViewPortWidth;
    var currentViewPortWidth = document.documentElement.clientWidth;
    if (originalViewPortWidth == currentViewPortWidth)
      return originalSize;
    return Math.round(
        originalViewPortWidth * originalSize / currentViewPortWidth);
  },

  getZoomLevel: function() {
    return capturePage.originalViewPortWidth / document.documentElement.clientWidth;
  },

  getViewPortSize: function() {
    var result = {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight
    };

    if (document.compatMode == 'BackCompat') {
      result.width = document.body.clientWidth;
      result.height = document.body.clientHeight;
    }

    return result;
  },

  /**
  * Receive messages from background page, and then decide what to do next
  */
  addMessageListener: function() {
    chrome.extension.onMessage.addListener(function(request, sender, response) {
      if (capturePage.isSelectionAreaTurnOn) {
        capturePage.removeSelectionArea();
      }
      switch (request.msg) {
        case 'show_selection_layer': capturePage.showSelectionArea(); break;
        case 'capture_selected_area':
          var viewPortSize = capturePage.getViewPortSize();
          var docWidth = document.body.scrollWidth;
          var docHeight = document.body.scrollHeight;
          response({
            'msg': 'capture_selected',
            'startX': capturePage.calculateSizeAfterZooming(capturePage.startX),
            'startY': capturePage.calculateSizeAfterZooming(capturePage.startY),
            'scrollX': window.scrollX,
            'scrollY': window.scrollY,
            'docHeight': docHeight,
            'docWidth': docWidth,
            'visibleWidth': viewPortSize.width,
            'visibleHeight': viewPortSize.height,
            'canvasWidth': capturePage.calculateSizeAfterZooming(capturePage.endX - capturePage.startX),
            'canvasHeight': capturePage.calculateSizeAfterZooming(capturePage.endY - capturePage.startY),
            'scrollXCount': 0,
            'scrollYCount': 0,
            'zoom': capturePage.getZoomLevel()
          });
          break;

      }
    });
  },

  /**
  * Send Message to background page
  */
  sendMessage: function(message) {
    chrome.extension.sendMessage(message);
  },

  /**
  * Show the selection Area
  */
  showSelectionArea: function() {
    capturePage.createFloatLayer();
    setTimeout(capturePage.createSelectionArea, 100);
  },

  getWindowSize: function() {
    var docWidth = document.body.clientWidth;
    var docHeight = document.body.clientHeight;
    return {'msg':'capture_window',
            'docWidth': docWidth,
            'docHeight': docHeight};
  },

  getSelectionSize: function() {
    capturePage.removeSelectionArea();
    setTimeout(function() {
      capturePage.sendMessage({
        'msg': 'capture_selected',
        'x': capturePage.startX,
        'y': capturePage.startY,
        'width': capturePage.endX - capturePage.startX,
        'height': capturePage.endY - capturePage.startY,
        'visibleWidth': document.documentElement.clientWidth,
        'visibleHeight': document.documentElement.clientHeight,
        'docWidth': document.body.clientWidth,
        'docHeight': document.body.clientHeight
      })}, 100);
  },

  /**
  * Create a float layer on the webpage
  */
  createFloatLayer: function() {
    capturePage.createDiv(document.body, 'sc_drag_area_protector');
  },

  matchMarginValue: function(str) {
    return str.match(/\d+/);
  },

  /**
  * Load the screenshot area interface
  */
  createSelectionArea: function() {
    var areaProtector = $('sc_drag_area_protector');
    var zoom = capturePage.getZoomLevel();
    var bodyStyle = window.getComputedStyle(document.body, null);
    if ('relative' == bodyStyle['position']) {
      capturePage.marginTop = capturePage.matchMarginValue(bodyStyle['marginTop']);
      capturePage.marginLeft = capturePage.matchMarginValue(bodyStyle['marginLeft']);
      areaProtector.style.top =  - parseInt(capturePage.marginTop) + 'px';
      areaProtector.style.left =  - parseInt(capturePage.marginLeft) + 'px';
    }
    areaProtector.style.width =
      Math.round((document.body.scrollWidth + parseInt(capturePage.marginLeft)) / zoom) + 'px';
    areaProtector.style.height =
      Math.round((document.body.scrollHeight + parseInt(capturePage.marginTop)) / zoom) + 'px';
    areaProtector.onclick = function() {
      event.stopPropagation();
      return false;
    };

    // Create elements for area capture.
    capturePage.createDiv(areaProtector, 'sc_drag_shadow_top');
    capturePage.createDiv(areaProtector, 'sc_drag_shadow_bottom');
    capturePage.createDiv(areaProtector, 'sc_drag_shadow_left');
    capturePage.createDiv(areaProtector, 'sc_drag_shadow_right');

    var areaElement = capturePage.createDiv(areaProtector, 'sc_drag_area');
    capturePage.createDiv(areaElement, 'sc_drag_container');
    capturePage.createDiv(areaElement, 'sc_drag_size');

    // Add event listener for 'cancel' and 'capture' button.
    var cancel = capturePage.createDiv(areaElement, 'sc_drag_cancel');
    cancel.addEventListener('mousedown', function () {
      // Remove area capture containers and event listeners.
      capturePage.removeSelectionArea();
    }, true);
    cancel.innerHTML = "cancel";

    var crop = capturePage.createDiv(areaElement, 'sc_drag_crop');
    crop.addEventListener('mousedown', function() {
      capturePage.removeSelectionArea();
      capturePage.sendMessage({msg: 'capture_selected'});
    }, false);
    crop.innerHTML = 'ok';

    capturePage.createDiv(areaElement, 'sc_drag_north_west');
    capturePage.createDiv(areaElement, 'sc_drag_north_east');
    capturePage.createDiv(areaElement, 'sc_drag_south_east');
    capturePage.createDiv(areaElement, 'sc_drag_south_west');

    areaProtector.addEventListener('mousedown', capturePage.onMouseDown, false);
    document.addEventListener('mousemove', capturePage.onMouseMove, false);
    document.addEventListener('mouseup', capturePage.onMouseUp, false);
    $('sc_drag_container').addEventListener('dblclick', function() {
      capturePage.removeSelectionArea();
      capturePage.sendMessage({msg: 'capture_selected'});
    }, false);

    capturePage.pageHeight = $('sc_drag_area_protector').clientHeight;
    capturePage.pageWidth = $('sc_drag_area_protector').clientWidth;

    var areaElement = $('sc_drag_area');
    areaElement.style.left = capturePage.getElementLeft(areaElement) + 'px';
    areaElement.style.top = capturePage.getElementTop(areaElement) + 'px';

    capturePage.startX = capturePage.getElementLeft(areaElement);
    capturePage.startY = capturePage.getElementTop(areaElement);
    capturePage.endX = capturePage.getElementLeft(areaElement) + 250;
    capturePage.endY = capturePage.getElementTop(areaElement) + 150;

    areaElement.style.width = '250px';
    areaElement.style.height = '150px';
    capturePage.isSelectionAreaTurnOn = true;
    capturePage.updateShadow(areaElement);
    capturePage.updateSize();
  },

  getElementLeft: function(obj) {
    return (document.body.scrollLeft +
        (document.documentElement.clientWidth -
        obj.offsetWidth) / 2);
  },

  getElementTop: function(obj) {
    return (document.body.scrollTop +
        (document.documentElement.clientHeight - 200 -
        obj.offsetHeight) / 2);
  },

  /**
  * Init selection area due to the position of the mouse when mouse down
  */
  onMouseDown: function() {
    if (event.button != 2) {
      var element = event.target;

      if (element) {
        var elementName = element.tagName;
        if (elementName && document) {
          capturePage.isMouseDown = true;

          var areaElement = $('sc_drag_area');
          var xPosition = event.pageX;
          var yPosition = event.pageY;

          if (areaElement) {
            if (element == $('sc_drag_container')) {
              capturePage.moving = true;
              capturePage.moveX = xPosition - areaElement.offsetLeft;
              capturePage.moveY = yPosition - areaElement.offsetTop;
            } else if (element == $('sc_drag_north_east')) {
              capturePage.resizing = true;
              capturePage.startX = areaElement.offsetLeft;
              capturePage.startY = areaElement.offsetTop + areaElement.clientHeight;
            } else if (element == $('sc_drag_north_west')) {
              capturePage.resizing = true;
              capturePage.startX = areaElement.offsetLeft + areaElement.clientWidth;
              capturePage.startY = areaElement.offsetTop + areaElement.clientHeight;
            } else if (element == $('sc_drag_south_east')) {
              capturePage.resizing = true;
              capturePage.startX = areaElement.offsetLeft;
              capturePage.startY = areaElement.offsetTop;
            } else if (element == $('sc_drag_south_west')) {
              capturePage.resizing = true;
              capturePage.startX = areaElement.offsetLeft + areaElement.clientWidth;
              capturePage.startY = areaElement.offsetTop;
            } else {
              capturePage.dragging = true;
              capturePage.endX = 0;
              capturePage.endY = 0;
              capturePage.endX = capturePage.startX = xPosition;
              capturePage.endY = capturePage.startY = yPosition;
            }
          }
          event.preventDefault();
        }
      }
    }
  },

  /**
  * Change selection area position when mouse moved
  */
  onMouseMove: function() {
    var element = event.target;
    if (element && capturePage.isMouseDown) {
      var areaElement = $('sc_drag_area');
      if (areaElement) {
        var xPosition = event.pageX;
        var yPosition = event.pageY;
        if (capturePage.dragging || capturePage.resizing) {
          var width = 0;
          var height = 0;
          var zoom = capturePage.getZoomLevel();
          var viewWidth = Math.round(document.body.scrollWidth / zoom);
          var viewHeight = Math.round(document.body.scrollHeight / zoom);
          if (xPosition > viewWidth) {
            xPosition = viewWidth;
          } else if (xPosition < 0) {
            xPosition = 0;
          }
          console.log(yPosition, viewHeight);
          if (yPosition > viewHeight) {
            yPosition = viewHeight;
          } else if (yPosition < 0) {
            yPosition = 0;
          }
          capturePage.endX = xPosition;
          capturePage.endY = yPosition;
          if (capturePage.startX > capturePage.endX) {
            width = capturePage.startX - capturePage.endX;
            areaElement.style.left = xPosition + 'px';
          } else {
            width = capturePage.endX - capturePage.startX;
            areaElement.style.left = capturePage.startX + 'px';
          }
          if (capturePage.startY > capturePage.endY) {
            height = capturePage.startY - capturePage.endY;
            areaElement.style.top = capturePage.endY + 'px';
          } else {
            height = capturePage.endY - capturePage.startY;
            areaElement.style.top = capturePage.startY + 'px';
          }
          areaElement.style.height = height + 'px';
          areaElement.style.width  = width + 'px';
          if (window.innerWidth < xPosition) {
            document.body.scrollLeft = xPosition - window.innerWidth;
          }
          if (document.body.scrollTop + window.innerHeight < yPosition + 25) {
            document.body.scrollTop = yPosition - window.innerHeight + 25;
          }
          if (yPosition < document.body.scrollTop) {
            document.body.scrollTop -= 25;
          }
        } else if (capturePage.moving) {
          var newXPosition = xPosition - capturePage.moveX;
          var newYPosition = yPosition - capturePage.moveY;
          if (newXPosition < 0) {
            newXPosition = 0;
          } else if (newXPosition + areaElement.clientWidth > capturePage.pageWidth) {
            newXPosition = capturePage.pageWidth - areaElement.clientWidth;
          }
          if (newYPosition < 0) {
            newYPosition = 0;
          } else if (newYPosition + areaElement.clientHeight >
                     capturePage.pageHeight) {
            newYPosition = capturePage.pageHeight - areaElement.clientHeight;
          }

          areaElement.style.left = newXPosition + 'px';
          areaElement.style.top = newYPosition + 'px';
          capturePage.endX = newXPosition + areaElement.clientWidth;
          capturePage.startX = newXPosition;
          capturePage.endY = newYPosition + areaElement.clientHeight;
          capturePage.startY = newYPosition;

        }
        var crop = document.getElementById('sc_drag_crop');
        var cancel = document.getElementById('sc_drag_cancel');
        if (event.pageY + 25 > document.body.clientHeight) {
          crop.style.bottom = 0;
          cancel.style.bottom = 0
        } else {
          crop.style.bottom = '-25px';
          cancel.style.bottom = '-25px';
        }

        var dragSizeContainer = document.getElementById('sc_drag_size');
        if (event.pageY < 18) {
          dragSizeContainer.style.top = 0;
        } else {
          dragSizeContainer.style.top = '-18px';
        }
        capturePage.updateShadow(areaElement);
        capturePage.updateSize();

      }
    }
  },

 /**
  * Fix the selection area position when mouse up
  */
  onMouseUp: function() {
    capturePage.isMouseDown = false;
    if (event.button != 2) {
      capturePage.resizing = false;
      capturePage.dragging = false;
      capturePage.moving = false;
      capturePage.moveX = 0;
      capturePage.moveY = 0;
      var temp;
      if (capturePage.endX < capturePage.startX) {
        temp = capturePage.endX;
        capturePage.endX = capturePage.startX;
        capturePage.startX = temp;
      }
      if (capturePage.endY < capturePage.startY) {
        temp = capturePage.endY;
        capturePage.endY = capturePage.startY;
        capturePage.startY = temp;
      }
    }
  },

  /**
  * Update the location of the shadow layer
  */
  updateShadow: function(areaElement) {
    $('sc_drag_shadow_top').style.height =
        parseInt(areaElement.style.top) + 'px';
    $('sc_drag_shadow_top').style.width = (parseInt(areaElement.style.left) +
        parseInt(areaElement.style.width) + 1) + 'px';
    $('sc_drag_shadow_left').style.height =
        (capturePage.pageHeight - parseInt(areaElement.style.top)) + 'px';
    $('sc_drag_shadow_left').style.width =
        parseInt(areaElement.style.left) + 'px';

    var height = (parseInt(areaElement.style.top) +
        parseInt(areaElement.style.height) + 1);
    height = (height < 0) ? 0 : height;
    var width = (capturePage.pageWidth) - 1 - (parseInt(areaElement.style.left) +
        parseInt(areaElement.style.width));
    width = (width < 0) ? 0 : width;
    $('sc_drag_shadow_right').style.height = height + 'px';
    $('sc_drag_shadow_right').style.width =  width + 'px';

    height = (capturePage.pageHeight - 1 - (parseInt(areaElement.style.top) +
        parseInt(areaElement.style.height)));
    height = (height < 0) ? 0 : height;
    width = (capturePage.pageWidth) - parseInt(areaElement.style.left);
    width = (width < 0) ? 0 : width;
    $('sc_drag_shadow_bottom').style.height = height + 'px';
    $('sc_drag_shadow_bottom').style.width = width + 'px';
  },

  /**
  * Remove selection area
  */
  removeSelectionArea: function() {
    document.removeEventListener('mousedown', capturePage.onMouseDown, false);
    document.removeEventListener('mousemove', capturePage.onMouseMove, false);
    document.removeEventListener('mouseup', capturePage.onMouseUp, false);
    $('sc_drag_container').removeEventListener('dblclick',function() {
      capturePage.removeSelectionArea();
      capturePage.sendMessage({msg: 'capture_selected'});}, false);
    capturePage.removeElement('sc_drag_area_protector');
    capturePage.removeElement('sc_drag_area');
    capturePage.isSelectionAreaTurnOn = false;
  },

  /**
  * Refresh the size info
  */
  updateSize: function() {
    var width = Math.abs(capturePage.endX - capturePage.startX);
    var height = Math.abs(capturePage.endY - capturePage.startY);
    $('sc_drag_size').innerText = capturePage.calculateSizeAfterZooming(width) +
      ' x ' + capturePage.calculateSizeAfterZooming(height);
  },

  /**
  * create div
  */
  createDiv: function(parent, id) {
    var divElement = document.createElement('div');
    divElement.id = id;
    parent.appendChild(divElement);
    return divElement;
  },

  /**
  * Remove an element
  */
  removeElement: function(id) {
    if($(id)) {
      $(id).parentNode.removeChild($(id));
    }
  },

  injectCssResource: function(cssResource) {
    var css = document.createElement('LINK');
    css.type = 'text/css';
    css.rel = 'stylesheet';
    css.href = chrome.extension.getURL(cssResource);
    (document.head || document.body || document.documentElement).
        appendChild(css);
  },

  injectJavaScriptResource: function(scriptResource) {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.charset = "utf-8";
    script.src = chrome.extension.getURL(scriptResource);
    (document.head || document.body || document.documentElement).
        appendChild(script);
  },

  /**
  * Remove an element
  */
  init: function() {
    if (document.body.hasAttribute('gif_screen_capture_injected')) {
      return;
    }
    this.injectCssResource('style.css');
    this.addMessageListener();
    this.injectJavaScriptResource("js/page_context.js");

    // Retrieve original width of view port and cache.
    capturePage.getOriginalViewPortWidth();
  }
};


function $(id) {
  return document.getElementById(id);
}

capturePage.init();

window.addEventListener('resize', function() {
  if (capturePage.isSelectionAreaTurnOn) {
    capturePage.removeSelectionArea();
    capturePage.showSelectionArea();
  }

  // Reget original width of view port if browser window resized or page zoomed.
  capturePage.getOriginalViewPortWidth();
}, false);
