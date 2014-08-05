(exports => {
  "use strict";

  function addEventListener(ev, cb) {
    var list = this.events.get(ev);
    if (!list) this.events.set(ev, list = new Set());
    list.add(cb);
  }

  function dispatchEvent(ev, ...args) {
    var list = this.events.get(ev);
    if (list) {
      for (var cb of list) cb.call(this, ...args);
    }
  }

  function removeEventListener(ev, cb) {
    var list = this.events.get(ev);
    if (list) {
      if (cb) list.delete(cb);
      else list.clear();
    }
  }

  exports.Evented = function (obj = {}) {
    obj = typeof obj === 'function' ? obj.prototype : obj;
    Object.defineProperties(obj, {
      events: { enumerable: true, get: function () { return this._events || (this._events = new Map()); }},
      addEventListener: { enumerable: true, value: addEventListener },
      dispatchEvent: { enumerable: true, value: dispatchEvent },
      removeEventListener: { enumerable: true, value: removeEventListener }
    });
  };

})(this);
