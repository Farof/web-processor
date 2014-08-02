(exports => {
  "use strict";

  var $ = this.$ = function (selector) {
    return document.querySelector(selector);
  };

  var wp = this.wp = {
    dump: function () {
      console.log('Processes: ', wp.Process.items);
      console.log('View: ', wp.View.items);
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    wp.View.load();
    wp.Process.load();
  });

})(this);
