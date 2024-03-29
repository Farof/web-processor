/*
  declares: natives
  requires:
  infos:
*/
(function (exports) {
  "use strict";

  /* Object */
  Object.defineProperties(Object, {
    same: {
      value: function (a, b) {
        var key, i, ln;
        if (a === null || b === null) {
          return a === b;
        }

        if (typeof a === 'object' && typeof b === 'object') {
          if (Array.isArray(a) && Array.isArray(b)) {
            return a.length === b.length && a.every(function (value, index) {
              return Object.same(value, b[index]);
            });
          } else if (typeof a.isEqualNode === 'function' || b.isEqualNode === 'function') {
            return typeof a.isEqualNode === 'function' && typeof b.isEqualNode === 'function' && a.isEqualNode(b);
          } else {
            return Array.isArray(a) === Array.isArray(b) &&
                    Object.keys(a).length === Object.keys(b).length &&
                    Object.every(a, function (value, key) {
                      return Object.same(a[key], b[key]);
                    });
          }
        }

        return a === b;
      }
    },

    forEach: {
      value: function (obj, func) {
        for (let key in obj) {
          func(obj[key], key, obj);
        }
      }
    },

    map: {
      value: function (obj, func) {
        const map = {};

        for (let key in obj) {
          map[key] = func(obj[key], key, obj);
        }

        return map;
      }
    },

    filter: {
      value: function (obj, func) {
        const map = {};

        for (let key in obj) {
          if (func(obj[key], key, obj)) map[key] = obj[key];
        }

        return map;
      }
    },

    some: {
      value: function (obj, func) {
        let some = true;

        for (let key in obj) {
          some = func(obj[key], key, obj);

          if (some) {
            return some;
          }
        }

        return some;
      }
    },

    every: {
      value: function (obj, func) {
        for (let key in obj) {
          if (!func(obj[key], key, obj)) {
            return false;
          }
        }

        return true;
      }
    },

    match: {
      value: function (obj, func) {
        for (let key in obj) {
          if (func(obj[key], key, obj)) {
            return key;
          }
        }
        return null;
      }
    },

    lastMatch: {
      value: function (obj, func) {
        let ret = null;
        for (let key in obj) {
          if (func(obj[key], key, obj)) {
            ret = key;
          }
        }
        return ret;
      }
    },

    keyOf: {
      value: function (obj, value) {
        return Object.match(obj, function (item) {
          return value === item;
        });
      }
    },

    lastKeyOf: {
      value: function (obj, value) {
        return Object.lastMatch(obj, function (item) {
          return value === item;
        });
      }
    },

    values: {
      value: function (obj) {
        const values = [];

        if (typeof obj !== 'object' || Array.isArray(obj)) {
          return obj;
        }

        for (let key in obj) {
          values.push(obj[key]);
        }

        return values;
      }
    },

    merge: {
      value: function (source, adds) {
        for (let key in adds) {
          source[key] = adds[key];
        }
        return source;
      }
    },

    'implements': {
      value: function (source, I) {
        if (source && I && typeof I === 'object') {
          return Object.every(I, function (value, key) {
            return Object.isDefined(source[key]) && Object.same(source[key], value);
          });
        }

        return false;
      }
    },

    extend: {
      value: function (obj, I) {
        Object.defineProperties(obj, I);
        return obj;
      }
    },

    describe: {
      value: function (obj, depth) {
        var key, i, ln, ret, cr;
        if (typeof obj === 'object') {
          if (obj === null) {
            return 'null';
          } else if (Array.isArray(obj)) {
            depth = depth || 1;
            cr = '\n' + '\t'.repeat(depth);
            ret = '[' + cr;

            for (i = 0, ln = obj.length; i < ln; i += 1) {
              ret += Object.describe(obj[i], depth + 1) + ',' + cr;
            }

            ret = ret.substring(0, ret.length - cr.length - 1) + '\n' + '\t'.repeat(depth - 1) + ']';
            return ret;
          } else if (typeof obj.nodeType === 'number') {
            return obj.toString();
          } else {
            depth = depth || 1;
            cr = '\n' + '\t'.repeat(depth);
            ret = '{' + cr;
            for (key in obj) {
              ret += key + ': ' + Object.describe(obj[key], depth + 1) + ',' + cr;
            }
            // remove last comma and CR, and close object description
            ret = ret.substring(0, ret.length - cr.length - 1) + '\n' + '\t'.repeat(depth - 1) + '}';
            return ret;
          }
        }

        return typeof obj === 'undefined' ? 'undefined' : obj.toString();
      }
    },

    properties: {
      value: function (obj) {
        const copy = {};

        for (let key in obj) {
          if (typeof obj[key] !== 'function' && ((obj.constructor && obj.constructor !== Object) ? obj.constructor.prototype.propertyIsEnumerable(key) : true)) {
            copy[key] = obj[key];
          }
        }

        return copy;
      }
    }
  });

  /* Function.prototype */
  Object.defineProperties(Function.prototype, {
    'extends': {
      value: function (properties) {
        Object.defineProperties(this, properties);
        return this;
      }
    },

    'implements': {
      value: function (properties) {
        Object.defineProperties(this.prototype, properties);
        return this;
      }
    },

    delay: {
      value: function (delay, bind) {
        const func = this;
        setTimeout(function () {
          func.call(bind);
        }, delay || 4);
        return this;
      }
    }
  });

  Object.defineProperties(Event.prototype, {
    stop: {
      enumerable: true,
      value: function () {
        this.stopPropagation();
        this.preventDefault();
        return this;
      }
    }
  });

  /* Array.prototype */
  Object.defineProperties(Array.prototype, {
    clone: {
      value: function () {
        return this.concat();
      }
    },

    first: {
      get: function () {
        return this[0];
      }
    },

    last: {
      get: function () {
        return this[this.length - 1];
      }
    },

    contains: {
      value: function (item) {
        return [].indexOf.call(this, item) > -1;
      }
    },

    include: {
      value: function (item, pass) {
        if (!pass && Array.isArray(item)) {
          return this.merge(item);
        }
        if (!this.contains(item)) {
          this.push(item);
        }
        return this;
      }
    },

    merge: {
      value: function (items) {
        items = Array.isArray(items) ? items : [];

        for (let i = 0, ln = items.length; i < ln; i += 1) {
          this.include(items[i], true);
        }

        return this;
      }
    },

    remove: {
      value: function (item) {
        const i = this.indexOf(item);
        if (i > -1) {
          this.splice(i, 1);
        }
        return this;
      }
    },

    flatten: {
      value: function (recursive) {
        return this.reduce((a, b) => a.concat(Array.isArray(b) && recursive ? b.flatten(recursive) : b), []);
      }
    }
  });

  /* Set */
  Object.defineProperties(Set.prototype, {
    flatten2: {
      enumerable: true,
      value: function (recursive) {
        return new Set(Array.from(this).reduce((a, b) => {
          return a.concat(b instanceof Set ? Array.from(recursive ? b.flatten2(recursive) : b) : [b]);
        }, []));
      }
    }
  });

  /* HTMLDocument.prototype */
  Object.defineProperties(HTMLDocument.prototype, {
    $: {
      enumerable: true,
      value: function (selector) {
        return this.querySelector(selector);
      }
    },

    $$: {
      enumerable: true,
      value: function (selector) {
        return this.querySelectorAll(selector);
      }
    }
  });

  /* HTMLElement */
  Object.defineProperties(HTMLElement, {
    ClientRectOverload: {
      value: {
        centerX: {
          enumerable: true,
          get: function () {
            return (this.left + this.right) / 2;
          }
        },

        centerY: {
          enumerable: true,
          get: function () {
            return (this.top + this.bottom) / 2;
          }
        }
      }
    }
  });

  /* HTMLElement.prototype */
  Object.defineProperties(HTMLElement.prototype, {
    $: Object.getOwnPropertyDescriptor(HTMLDocument.prototype, '$'),

    $$: Object.getOwnPropertyDescriptor(HTMLDocument.prototype, '$$'),

    grab: {
      enumerable: true,
      value: function (node) {
        this.appendChild(node);
        return this;
      }
    },

    adopt: {
      enumerable: true,
      value: function (...args) {
        (Array.isArray(args[0]) ? args[0] : args).forEach(this.grab.bind(this));
        return this;
      }
    },

    unload: {
      enumerable: true,
      value: function () {
        if (this.parentNode) {
          this.parentNode.removeChild(this);
          return this;
        }
        return false;
      }
    },

    empty: {
      enumerable: true,
      value: function () {
        while (this.children[0]) {
          this.removeChild(this.children[0]);
        }
        this.textContent = '';
        return this;
      }
    },

    replaces: {
      enumerable: true,
      value: function (replaced) {
        if (replaced.parentNode) {
          replaced.parentNode.replaceChild(this, replaced);
        }
        return this;
      }
    },

    getParent: {
      enumerable: true,
      value: function (selector, self) {
        if (self && this.mozMatchesSelector(selector)) return this;
        else if (this.parentNode && this.parentNode.getParent) return this.parentNode.getParent(selector, true);
      }
    },

    addEvents: {
      enumerable: true,
      value: function (events) {
        for (let ev in events) {
          this.addEventListener(ev, events[ev]);
        }
      }
    }
  });


  /* String.prototype */
  Object.defineProperties(String.prototype, {
    capitalize: {
      value: function () {
        return this.substring(0, 1).toUpperCase() + this.substring(1);
      }
    }
  });


  /* Math */
  Object.defineProperties(Math, {
    randomInt: {
      value: function (min, max) {
        throw new Error('rewrite func');
        return Math.floor(r.min + Math.random() * (r.max - r.min + 1));
      }
    }
  });

})(this);
