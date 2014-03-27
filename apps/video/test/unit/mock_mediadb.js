'use strict';

var MockMediaDB = (function() {

  var dataBlob;

  function MockMediaDB(file, data) {
    this.file = file;
    this.data = data;
  }

  MockMediaDB.prototype = {

    getFile: function getFile(filename, callback) {

      if (dataBlob && dataBlob != null) {
        callback(dataBlob);
      }

      var uint8Array = new Uint8Array(this.data.length);
      uint8Array.set(this.data);
      dataBlob = new Blob([uint8Array], { type: 'video/webm' });
      callback(dataBlob);
    }
  };

  return MockMediaDB;

}());
