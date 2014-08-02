(exports => {
  "use strict";

  var $ = this.$ = function (selector) {
    return document.querySelector(selector);
  };

  var wp = this.wp = {
    initialized: false,

    events: new Map(),

    addEventListener: function (ev, cb) {
      var list = this.events.get(ev);
      if (!list) this.events.set(ev, list = new Set());
      list.add(cb);
    },

    dispatchEvent: function (ev, ...args) {
      var list = this.events.get(ev);
      if (list) {
        for (var cb of list) cb(...args);
      }
    },

    removeEventListener: function (ev, cb) {
      var list = this.events.get(ev);
      if (list) {
        if (cb) list.delete(cb);
        else list.clear();
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
    
    wp.initialized = true;
    localStorage['wp-version'] = '0.0.1';
  });

})(this);
