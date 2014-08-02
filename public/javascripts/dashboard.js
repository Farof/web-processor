(exports => {
  "use strict";

  var $ = this.$ = function (selector) {
    return document.querySelector(selector);
  };

  var wp = this.wp = {
    events: {},

    addEventListener: function (ev, cb) {
      if (!this.events[ev]) this.events[ev] = [];
      this.events[ev].include(cb);
    },

    dispatchEvent: function (ev, ...args) {
      if (this.events[ev]) {
        for (var cb of this.events[ev]) {
          cb(...args);
        }
      }
    },

    removeEventListener: function (ev, cb) {
      if (this.events[ev]) {
        if (cb) this.events[ev].remove(cb);
        else this.events[ev] = [];
      }
    },

    dump: function () {
      console.log('Processes: ', wp.Process.items);
      console.log('View: ', wp.View.items);
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    wp.Process.loadAll();
    wp.View.loadAll();

    localStorage['wp-version'] = '0.0.1';
  });

})(this);
