(exports => {
  "use strict";

  var $ = this.$ = function (selector) {
    return document.querySelector(selector);
  };

  var wp = exports.wp = {
    initialized: false,
    proxyURL: '/proxy?url='
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
