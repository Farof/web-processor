(exports => {
  "use strict";

  var node = new Element('div', {
    id: 'library-operators',
    class: 'collection-category'
  }).grab(new Element('h3', { text: 'Operators' }));
  $('#library').grab(node);

  wp.LibraryType.LowerCaseOperator = new wp.LibraryType({
    listNode: node,
    name: 'LowerCaseOperator',
    displayName: 'LowerCase',
    nin: -1,
    nout: -1,
    defaultValue: '',

    updater: function () {
      this.value = [];
      for (var i of this.in) {
        for (var value of Array.from(i.value)) {
          this.value.push(String(value).toLowerCase());
        }
      }
    }
  });

  wp.LibraryType.UpperCaseOperator = new wp.LibraryType({
    listNode: node,
    name: 'UpperCaseOperator',
    displayName: 'UpperCase',
    nin: -1,
    nout: -1,
    defaultValue: '',

    updater: function () {
      this.value = [];
      for (var i of this.in) {
        for (var value of Array.from(i.value)) {
          this.value.push(String(value).toUpperCase());
        }
      }
    }
  });

  wp.LibraryType.OrderOperator = new wp.LibraryType({
    listNode: node,
    name: 'OrderOperator',
    displayName: 'Order',
    nin: -1,
    nout: -1,
    defaultValue: '',

    constructor: function () {
      if (this.value === '') this.value = [];
    },

    /*builder: function () {

    },*/

    updater: function () {
      this.value = Array.from(this.in).reduce((a, b) => a.concat(b.value), []).sort((a, b) => {
        return a.toLowerCase() > b.toLowerCase();
      });
    }
  });

})(this);
