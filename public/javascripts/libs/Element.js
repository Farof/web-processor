(function (exports) {
  "use strict";

  exports.Element = function (tag, options) {
    const element = document.createElement(tag);
    options = options || {};

    for (let key in options) {
      if (exports.Element.Mutators[key]) {
        exports.Element.Mutators[key].call(element, options[key]);
      } else if (['string', 'number'].contains(typeof options[key])) {
        element.setAttribute(key, options[key]);
      } else {
        element[key] = options[key];
      }
    }

    return element;
  };

  exports.Element.Mutators = {
    events: function (events) {
      for (let event in events) {
        this.addEventListener(event, events[event]);
      }
    },

    style: function (styles) {
      let str = '';
      if (typeof styles === 'string') {
        str = styles;
      } else {
        for (let style in styles) {
          str += style + ': ' + styles[style] + '; ';
        }
      }
      this.setAttribute('style', str);
    },

    text: function (text) {
      this.appendChild(document.createTextNode(text));
    },

    html: function (text) {
      this.innerHTML = text;
    },

    properties: function (properties) {
      for (let key in properties) {
        this[key] = properties[key];
      }
    }
  };

})(this);
