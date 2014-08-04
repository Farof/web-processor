(exports => {
  "use strict";

  var XHR = exports.XHR = {
    init: function (url, options = {}) {
      var xhr = new XMLHttpRequest();
      var promise = new Promise((resolve, reject) => {
        xhr.onload = ev => resolve(xhr, ev);
        xhr.onerror = err => reject(err);
      });

      xhr.open(options.method || 'GET', url, options.async || true);

      if (options.responseType) xhr.responseType = options.responseType;

      return { xhr, promise };
    },

    request: function (url, options = {}) {
      var { xhr, promise } = this.init(url, options);
      xhr.send(options.data || null);
      return { xhr, promise };
    },

    get: function (url, options = {}) {
      options.method = 'GET';
      return this.request(url, options);
    },

    getXML: function (url) {
      var { xhr, promise } = this.get(url);
      promise = promise.then(req => req.responseXML);
      return { xhr, promise };
    },

    getJSON: function (url) {
      var { xhr, promise } = this.get(url);
      promise = promise.then(req => JSON.parse(req.responseText));
      return { xhr, promise };
    }
  };

})(this);
