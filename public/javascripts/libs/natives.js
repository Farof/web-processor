/*
  declares: natives
  requires:
  infos:
*/
(function (exports) {
  "use strict";

  /* Object */
  Object.defineProperties(Object, {
    undefined: {
      value: (function () {}()),
      writable: false
    },

    isUndefined: {
      value: function (value) {
        return value === null || value === Object.undefined;
      }
    },

    isDefined: {
      value: function (value) {
        return !Object.isUndefined(value);
      }
    },

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
        var key;
        for (key in obj) {
          func(obj[key], key, obj);
        }
      }
    },

    map: {
      value: function (obj, func) {
        var key, map = {};

        for (key in obj) {
          map[key] = func(obj[key], key, obj);
        }

        return map;
      }
    },

    some: {
      value: function (obj, func) {
        var key, some = true;

        for (key in obj) {
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
        var key;
        for (key in obj) {
          if (!func(obj[key], key, obj)) {
            return false;
          }
        }

        return true;
      }
    },

    match: {
      value: function (obj, func) {
        var key;
        for (key in obj) {
          if (func(obj[key], key, obj)) {
            return key;
          }
        }
        return null;
      }
    },

    lastMatch: {
      value: function (obj, func) {
        var key, ret = null;
        for (key in obj) {
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
        var values = [], key;

        if (typeof obj !== 'object' || Array.isArray(obj)) {
          return obj;
        }

        for (key in obj) {
          values.push(obj[key]);
        }

        return values;
      }
    },

    merge: {
      value: function (source, adds) {
        var key;
        for (key in adds) {
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
        var copy = {}, key;

        for (key in obj) {
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
        var func = this;
        setTimeout(function () {
          func.call(bind);
        }, delay || 4);
        return this;
      }
    },

    unshift: {
      value: function (arg, bind) {
        var func = this;
        return function () {
          return func.apply(bind || this, [arg].concat(Array.prototype.slice.call(arguments)));
        }
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


  /* Array */
  Object.defineProperties(Array, {
    from: {
      value: function (obj) {
        return Array.isArray(obj) ?
                obj :
                (obj === Object.undefined ?
                  [] :
                  ((typeof obj === 'object' && typeof obj.length === 'number') ?
                    Array.prototype.slice.call(obj) :
                    [obj])
                );
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

    match: {
      value: function (func) {
        var i, ln;

        for (i = 0, ln = this.length; i < ln; i += 1) {
          if (func(this[i], i, this)) {
            return this[i];
          }
        }

        return;
      }
    },

    lastMatch: {
      value: function (func) {
        var i, ln, ret;

        for (i = 0, ln = this.length; i < ln; i += 1) {
          if (func(this[i], i, this)) {
            ret = this[i];
          }
        }

        return ret;
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
        var i, ln;
        items = Array.isArray(items) ? items : [];

        for (i = 0, ln = items.length; i < ln; i += 1) {
          this.include(items[i], true);
        }

        return this;
      }
    },

    remove: {
      value: function (item) {
        var i = this.indexOf(item);
        if (i > -1) {
          this.splice(i, 1);
        }
        return this;
      }
    },

    every: {
      value: function (func) {
        var i, ln;

        for (i = 0, ln = this.length; i < ln; i += 1) {
          if (!func(this[i], i, this)) {
            return false;
          }
        }

        return true;
      }
    },

    some: {
      value: function (func) {
        var i, ln;

        for (i = 0, ln = this.length; i < ln; i += 1) {
          if (func(this[i], i, this)) {
            return true;
          }
        }

        return this.length > 0 ? false : true;
      }
    },

    flatten: {
      value: function (recursive) {
        var ret = [];
        var done = true;

        for (var item of this) {
          ret = ret.concat(item);
          if (Array.isArray(item)) {
            done = false;
          }
        }

        return (!recursive || done) ? ret : ret.flatten(true);
      }
    }
  });

  /* HTMLDocument.prototype */
  Object.defineProperties(HTMLDocument.prototype, {
    $: {
      enumerable: true,
      value: function (...args) {
        return this.querySelector.apply(this, args);
      }
    },

    $$: {
      enumerable: true,
      value: function (...args) {
        return this.querySelectorAll.apply(this, args);
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
    
    addEvents: {
      enumerable: true,
      value: function (events) {
        for (var ev in events) {
          this.addEventListener(ev, events[ev]);
        }
      }
    },

    getPosition: {
      enumerable: true,
      value: function (topParent) {
        var
          rect = this.getBoundingClientRect(),
          parentRect = (topParent || document.body).getBoundingClientRect(),
          coord = Object.create({}, HTMLElement.ClientRectOverload);

          coord.left = rect.left - parentRect.left;
          coord.top = rect.top - parentRect.top;
          coord.width = rect.width;
          coord.height = rect.height;
          coord.right = coord.left + rect.width;
          coord.bottom = coord.top + rect.height;

          return coord;
      }
    },

    /*getPosition: {
      enumerable: true,
      value: function (topParent) {
        var
          parent,
          node = this,
          coord = {
            left: node.offsetLeft,
            top: node.offsetTop
          };

        topParent = topParent || document.body;
        parent = node.offsetParent;

        while (parent && parent !== topParent) {
          coord.left += parent.offsetLeft;
          coord.top += parent.offsetTop;
          parent = parent.offsetParent;
        }

        coord.right = coord.left + node.scrollWidth;
        coord.centerX = coord.left + node.scrollWidth / 2;
        coord.bottom = coord.top + node.scrollHeight;
        coord.centerY = coord.top + node.scrollHeight / 2;

        return coord;
      },
    }*/

    setDragAction: {
      value: function (action, options) {
        var
          container = options.container || document,
          mouseup = function (e) {
            container.removeEventListener('mousemove', action, false);
            container.removeEventListener('mouseup', mouseup, false);
          };

        action = action.bind(this);

        this.addEventListener('mousedown', function (e) {
          e.stop();
          container.addEventListener('mousemove', action, false);
          container.addEventListener('mouseup', mouseup, false);
        }, false);

        if (typeof options.mousedown === 'function') {
          this.addEventListener('mousedown', options.mousedown, false);
        }
        if (typeof options.mouseup === 'function') {
          this.addEventListener('mouseup', options.mouseup, false);
        }

        return this;
      }
    },

    setAbsolute: {
      value: function (bound) {
        var
          pos = this.getPosition(bound);

        this.style.left = pos.left + 'px';
        this.style.top = pos.top + 'px';
        this.style.position = 'absolute';

        return this;
      }
    }
  });


  /* String.prototype */
  Object.defineProperties(String.prototype, {
    contains: {
      value: function (substr) {
        return this.indexOf(substr) > -1;
      }
    },

    repeat: {
      value: function (times, separator) {
        var i, ln, ret = '';
        times = typeof times === 'number' ? Math.max(0, times) : 1;
        separator = separator || '';

        for (i = 0, ln = times; i < ln; i += 1) {
          ret += this + separator;
        }

        return ret.substring(0, ret.length - separator.length);
      }
    },

    wrapTag: {
      value: function (tag, indent) {
        return '<' + tag + '>' + (indent ? ('\n' + '\t'.repeat(indent)) : '') + this + (indent ? '\n' : '') + '</' + tag + '>';
      }
    },
    
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
        var r = new Number.Range(min, max);
        return Math.floor(r.min + Math.random() * (r.max - r.min + 1));
      }
    }
  });

})(this);
