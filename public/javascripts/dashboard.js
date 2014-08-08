(exports => {
  "use strict";

  var $ = this.$ = function (selector) {
    return document.querySelector(selector);
  };

  var wp = exports.wp = {
    initialized: false,
    proxyURL: '/proxy?url=',

    uuid: function () {
      var id;
      do { id = uuid(); } while (!isNaN(parseInt(id, 10)));
      return id;
    },

    cleanStorage: function () {
      var objects = [], exists = [];

      for (var key in localStorage) {
        if (key.indexOf('wp-obj') > -1) objects.push(key);
      }

      JSON.parse(localStorage['wp-type-View']).forEach(uuid => exists.push('wp-obj-' + uuid));
      JSON.parse(localStorage['wp-type-Process']).forEach(uuid => exists.push('wp-obj-' + uuid));

      console.log('valid storage objects keys: ', exists);

      for (var obj of objects) {
        if (!exists.contains(obj)) {
          delete localStorage[obj];
        } else {
          console.log('keep object entry: ', obj);
        }
      }
    }
  };

  Evented(wp);

  document.addEventListener('DOMContentLoaded', function () {
    wp.Process.loadAll();
    wp.View.loadAll();

    wp.initialized = true;
    localStorage['wp-version'] = '0.0.1';

    wp.Process.initAll();
    wp.Process.executeAll();
  });

})(this);
