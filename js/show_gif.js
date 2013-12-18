window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;

function $(id) {
  return document.getElementById(id);
}

var bg = chrome.extension.getBackgroundPage();

var gifViewer = {
  container: $("container"),
  downloadLink: $("download"),
  image: document.createElement("img"),

  generateDownloadLink: function(){
    // Handle errors
    function errorHandler(e) {
        var msg = '';

        switch (e.code) {
            case FileError.QUOTA_EXCEEDED_ERR:
                msg = 'QUOTA_EXCEEDED_ERR';
                break;
            case FileError.NOT_FOUND_ERR:
                msg = 'NOT_FOUND_ERR';
                break;
            case FileError.SECURITY_ERR:
                msg = 'SECURITY_ERR';
                break;
            case FileError.INVALID_MODIFICATION_ERR:
                msg = 'INVALID_MODIFICATION_ERR';
                break;
            case FileError.INVALID_STATE_ERR:
                msg = 'INVALID_STATE_ERR';
                break;
            default:
                msg = 'Unknown Error';
                break;
        };
    }

    function dataURItoBlob(dataURI, callback) {
        // convert base64 to raw binary data held in a string
        // doesn't handle URLEncoded DataURIs
        var byteString = atob(dataURI.split(',')[1]);

        // separate out the mime component
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

        // write the bytes of the string to an ArrayBuffer
        var ab = new ArrayBuffer(byteString.length);
        var ia = new Uint8Array(ab);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        // write the ArrayBuffer to a blob, and you're done
        var bb = new Blob([ab], { "type" : mimeString});
        return bb;
    }

    // Init and write gif data to file
    function onInitFs(fs) {
        fs.root.getFile('capture.gif', {create: true}, function(fileEntry) {
            gifViewer.downloadLink.href = fileEntry.toURL();
            fileEntry.isFile === true;
            fileEntry.name == 'capture.gif';
            fileEntry.fullPath == '/capture.gif';
            fileEntry.createWriter(function(fileWriter) {

                fileWriter.onwriteend = function(e) {
                    console.log('Write completed.');
                };

                fileWriter.onerror = function(e) {
                    console.log('Write failed: ' + e);
                };

                var bb = dataURItoBlob(bg.screenshot.imageDataBase_64);
                fileWriter.write(bb);

            }, errorHandler);
        }, errorHandler);
    }

    // start the party
    window.requestFileSystem(window.TEMPORARY, 0, onInitFs,errorHandler);
  },

  init: function(){
    gifViewer.image.src = bg.screenshot.imageDataBase_64;
    document.body.appendChild(gifViewer.image);
    gifViewer.generateDownloadLink();
  },
}

gifViewer.init();
