// Copyright (c) 2010 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var page = {
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
          page.defaultScrollBarWidth;
    } else if (axis == 'y') {
      if (window.getComputedStyle(body).overflowY == 'scroll')
        return true;
      return Math.abs(body.scrollHeight - docElement.clientHeight) >=
          page.defaultScrollBarWidth;
    }
  },

  getOriginalViewPortWidth: function() {
    chrome.extension.sendMessage({ msg: 'original_view_port_width'},
      function(originalViewPortWidth) {
        if (originalViewPortWidth) {
          page.originalViewPortWidth = page.hasScrollBar('y') ?
            originalViewPortWidth - page.defaultScrollBarWidth : originalViewPortWidth;
        } else {
          page.originalViewPortWidth = document.documentElement.clientWidth;
        }
      });
  },

  calculateSizeAfterZooming: function(originalSize) {
    var originalViewPortWidth = page.originalViewPortWidth;
    var currentViewPortWidth = document.documentElement.clientWidth;
    if (originalViewPortWidth == currentViewPortWidth)
      return originalSize;
    return Math.round(
        originalViewPortWidth * originalSize / currentViewPortWidth);
  },

  getZoomLevel: function() {
    return page.originalViewPortWidth / document.documentElement.clientWidth;
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
      if (page.isSelectionAreaTurnOn) {
        page.removeSelectionArea();
      }
      switch (request.msg) {
        case 'show_selection_area': page.showSelectionArea(); break;
        case 'capture_selected':
          var viewPortSize = page.getViewPortSize();
          var docWidth = document.body.scrollWidth;
          var docHeight = document.body.scrollHeight;
          response({
            'msg': 'capture_selected',
            'startX': page.calculateSizeAfterZooming(page.startX),
            'startY': page.calculateSizeAfterZooming(page.startY),
            'scrollX': window.scrollX,
            'scrollY': window.scrollY,
            'docHeight': docHeight,
            'docWidth': docWidth,
            'visibleWidth': viewPortSize.width,
            'visibleHeight': viewPortSize.height,
            'canvasWidth': page.calculateSizeAfterZooming(page.endX - page.startX),
            'canvasHeight': page.calculateSizeAfterZooming(page.endY - page.startY),
            'scrollXCount': 0,
            'scrollYCount': 0,
            'zoom': page.getZoomLevel()
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
    page.createFloatLayer();
    setTimeout(page.createSelectionArea, 100);
  },

  getWindowSize: function() {
    var docWidth = document.body.clientWidth;
    var docHeight = document.body.clientHeight;
    return {'msg':'capture_window',
            'docWidth': docWidth,
            'docHeight': docHeight};
  },

  getSelectionSize: function() {
    page.removeSelectionArea();
    setTimeout(function() {
      page.sendMessage({
        'msg': 'capture_selected',
        'x': page.startX,
        'y': page.startY,
        'width': page.endX - page.startX,
        'height': page.endY - page.startY,
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
    page.createDiv(document.body, 'sc_drag_area_protector');
  },

  matchMarginValue: function(str) {
    return str.match(/\d+/);
  },

  /**
  * Load the screenshot area interface
  */
  createSelectionArea: function() {
    var areaProtector = $('sc_drag_area_protector');
    var zoom = page.getZoomLevel();
    var bodyStyle = window.getComputedStyle(document.body, null);
    if ('relative' == bodyStyle['position']) {
      page.marginTop = page.matchMarginValue(bodyStyle['marginTop']);
      page.marginLeft = page.matchMarginValue(bodyStyle['marginLeft']);
      areaProtector.style.top =  - parseInt(page.marginTop) + 'px';
      areaProtector.style.left =  - parseInt(page.marginLeft) + 'px';
    }
    areaProtector.style.width =
      Math.round((document.body.clientWidth + parseInt(page.marginLeft)) / zoom) + 'px';
    areaProtector.style.height =
      Math.round((document.body.clientHeight + parseInt(page.marginTop)) / zoom) + 'px';
    areaProtector.onclick = function() {
      event.stopPropagation();
      return false;
    };

    // Create elements for area capture.
    page.createDiv(areaProtector, 'sc_drag_shadow_top');
    page.createDiv(areaProtector, 'sc_drag_shadow_bottom');
    page.createDiv(areaProtector, 'sc_drag_shadow_left');
    page.createDiv(areaProtector, 'sc_drag_shadow_right');

    var areaElement = page.createDiv(areaProtector, 'sc_drag_area');
    page.createDiv(areaElement, 'sc_drag_container');
    page.createDiv(areaElement, 'sc_drag_size');

    // Add event listener for 'cancel' and 'capture' button.
    var cancel = page.createDiv(areaElement, 'sc_drag_cancel');
    cancel.addEventListener('mousedown', function () {
      // Remove area capture containers and event listeners.
      page.removeSelectionArea();
    }, true);
    cancel.innerHTML = "cancel";

    var crop = page.createDiv(areaElement, 'sc_drag_crop');
    crop.addEventListener('mousedown', function() {
      page.removeSelectionArea();
      page.sendMessage({msg: 'capture_selected'});
    }, false);
    crop.innerHTML = 'ok';

    page.createDiv(areaElement, 'sc_drag_north_west');
    page.createDiv(areaElement, 'sc_drag_north_east');
    page.createDiv(areaElement, 'sc_drag_south_east');
    page.createDiv(areaElement, 'sc_drag_south_west');

    areaProtector.addEventListener('mousedown', page.onMouseDown, false);
    document.addEventListener('mousemove', page.onMouseMove, false);
    document.addEventListener('mouseup', page.onMouseUp, false);
    $('sc_drag_container').addEventListener('dblclick', function() {
      page.removeSelectionArea();
      page.sendMessage({msg: 'capture_selected'});
    }, false);

    page.pageHeight = $('sc_drag_area_protector').clientHeight;
    page.pageWidth = $('sc_drag_area_protector').clientWidth;

    var areaElement = $('sc_drag_area');
    areaElement.style.left = page.getElementLeft(areaElement) + 'px';
    areaElement.style.top = page.getElementTop(areaElement) + 'px';

    page.startX = page.getElementLeft(areaElement);
    page.startY = page.getElementTop(areaElement);
    page.endX = page.getElementLeft(areaElement) + 250;
    page.endY = page.getElementTop(areaElement) + 150;

    areaElement.style.width = '250px';
    areaElement.style.height = '150px';
    page.isSelectionAreaTurnOn = true;
    page.updateShadow(areaElement);
    page.updateSize();
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
          page.isMouseDown = true;

          var areaElement = $('sc_drag_area');
          var xPosition = event.pageX;
          var yPosition = event.pageY;

          if (areaElement) {
            if (element == $('sc_drag_container')) {
              page.moving = true;
              page.moveX = xPosition - areaElement.offsetLeft;
              page.moveY = yPosition - areaElement.offsetTop;
            } else if (element == $('sc_drag_north_east')) {
              page.resizing = true;
              page.startX = areaElement.offsetLeft;
              page.startY = areaElement.offsetTop + areaElement.clientHeight;
            } else if (element == $('sc_drag_north_west')) {
              page.resizing = true;
              page.startX = areaElement.offsetLeft + areaElement.clientWidth;
              page.startY = areaElement.offsetTop + areaElement.clientHeight;
            } else if (element == $('sc_drag_south_east')) {
              page.resizing = true;
              page.startX = areaElement.offsetLeft;
              page.startY = areaElement.offsetTop;
            } else if (element == $('sc_drag_south_west')) {
              page.resizing = true;
              page.startX = areaElement.offsetLeft + areaElement.clientWidth;
              page.startY = areaElement.offsetTop;
            } else {
              page.dragging = true;
              page.endX = 0;
              page.endY = 0;
              page.endX = page.startX = xPosition;
              page.endY = page.startY = yPosition;
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
    if (element && page.isMouseDown) {
      var areaElement = $('sc_drag_area');
      if (areaElement) {
        var xPosition = event.pageX;
        var yPosition = event.pageY;
        if (page.dragging || page.resizing) {
          var width = 0;
          var height = 0;
          var zoom = page.getZoomLevel();
          var viewWidth = Math.round(document.body.clientWidth / zoom);
          var viewHeight = Math.round(document.body.clientHeight / zoom);
          if (xPosition > viewWidth) {
            xPosition = viewWidth;
          } else if (xPosition < 0) {
            xPosition = 0;
          }
          if (yPosition > viewHeight) {
            yPosition = viewHeight;
          } else if (yPosition < 0) {
            yPosition = 0;
          }
          page.endX = xPosition;
          page.endY = yPosition;
          if (page.startX > page.endX) {
            width = page.startX - page.endX;
            areaElement.style.left = xPosition + 'px';
          } else {
            width = page.endX - page.startX;
            areaElement.style.left = page.startX + 'px';
          }
          if (page.startY > page.endY) {
            height = page.startY - page.endY;
            areaElement.style.top = page.endY + 'px';
          } else {
            height = page.endY - page.startY;
            areaElement.style.top = page.startY + 'px';
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
        } else if (page.moving) {
          var newXPosition = xPosition - page.moveX;
          var newYPosition = yPosition - page.moveY;
          if (newXPosition < 0) {
            newXPosition = 0;
          } else if (newXPosition + areaElement.clientWidth > page.pageWidth) {
            newXPosition = page.pageWidth - areaElement.clientWidth;
          }
          if (newYPosition < 0) {
            newYPosition = 0;
          } else if (newYPosition + areaElement.clientHeight >
                     page.pageHeight) {
            newYPosition = page.pageHeight - areaElement.clientHeight;
          }

          areaElement.style.left = newXPosition + 'px';
          areaElement.style.top = newYPosition + 'px';
          page.endX = newXPosition + areaElement.clientWidth;
          page.startX = newXPosition;
          page.endY = newYPosition + areaElement.clientHeight;
          page.startY = newYPosition;

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
        page.updateShadow(areaElement);
        page.updateSize();

      }
    }
  },

 /**
  * Fix the selection area position when mouse up
  */
  onMouseUp: function() {
    page.isMouseDown = false;
    if (event.button != 2) {
      page.resizing = false;
      page.dragging = false;
      page.moving = false;
      page.moveX = 0;
      page.moveY = 0;
      var temp;
      if (page.endX < page.startX) {
        temp = page.endX;
        page.endX = page.startX;
        page.startX = temp;
      }
      if (page.endY < page.startY) {
        temp = page.endY;
        page.endY = page.startY;
        page.startY = temp;
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
        (page.pageHeight - parseInt(areaElement.style.top)) + 'px';
    $('sc_drag_shadow_left').style.width =
        parseInt(areaElement.style.left) + 'px';

    var height = (parseInt(areaElement.style.top) +
        parseInt(areaElement.style.height) + 1);
    height = (height < 0) ? 0 : height;
    var width = (page.pageWidth) - 1 - (parseInt(areaElement.style.left) +
        parseInt(areaElement.style.width));
    width = (width < 0) ? 0 : width;
    $('sc_drag_shadow_right').style.height = height + 'px';
    $('sc_drag_shadow_right').style.width =  width + 'px';

    height = (page.pageHeight - 1 - (parseInt(areaElement.style.top) +
        parseInt(areaElement.style.height)));
    height = (height < 0) ? 0 : height;
    width = (page.pageWidth) - parseInt(areaElement.style.left);
    width = (width < 0) ? 0 : width;
    $('sc_drag_shadow_bottom').style.height = height + 'px';
    $('sc_drag_shadow_bottom').style.width = width + 'px';
  },

  /**
  * Remove selection area
  */
  removeSelectionArea: function() {
    document.removeEventListener('mousedown', page.onMouseDown, false);
    document.removeEventListener('mousemove', page.onMouseMove, false);
    document.removeEventListener('mouseup', page.onMouseUp, false);
    $('sc_drag_container').removeEventListener('dblclick',function() {
      page.removeSelectionArea();
      page.sendMessage({msg: 'capture_selected'});}, false);
    page.removeElement('sc_drag_area_protector');
    page.removeElement('sc_drag_area');
    page.isSelectionAreaTurnOn = false;
  },

  /**
  * Refresh the size info
  */
  updateSize: function() {
    var width = Math.abs(page.endX - page.startX);
    var height = Math.abs(page.endY - page.startY);
    $('sc_drag_size').innerText = page.calculateSizeAfterZooming(width) +
      ' x ' + page.calculateSizeAfterZooming(height);
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
    if (document.body.hasAttribute('screen_capture_injected')) {
      return;
    }
    this.injectCssResource('style.css');
    this.addMessageListener();
    this.injectJavaScriptResource("js/page_context.js");

    // Retrieve original width of view port and cache.
    page.getOriginalViewPortWidth();
  }
};


function $(id) {
  return document.getElementById(id);
}

page.init();

window.addEventListener('resize', function() {
  if (page.isSelectionAreaTurnOn) {
    page.removeSelectionArea();
    page.showSelectionArea();
  }

  // Reget original width of view port if browser window resized or page zoomed.
  page.getOriginalViewPortWidth();
}, false);
