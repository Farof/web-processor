(exports => {
  "use strict";

  var node = new Element('div', {
    id: 'library-inputs',
    class: 'collection-category'
  }).grab(new Element('h3', { text: 'Inputs' }));
  $('#library').grab(node);

  wp.LibraryType.TextInput = new wp.LibraryType({
    listNode: node,
    name: 'TextInput',
    displayName: 'Text',
    nin: 0,
    nout: -1,
    defaultValue: '',

    builder: function () {
      var self = this;
      return new Element('input', {
        type: 'text',
        value: this.value,
        events: {
          input: function () {
            wp.dispatchEvent(self.uuid + ':value:changed', this.value);
          }
        }
      })
    }
  });

  wp.LibraryType.ListInput = new wp.LibraryType({
    listNode: node,
    name: 'ListInput',
    displayName: 'List',
    nin: 0,
    nout: -1,
    defaultValue: '',

    constructor: function () {
      var self = this;
      if (this.value === '') this.value = [];

      this.buildInput = str => {
        return new Element('p').adopt(
          new Element('input', {
            class: 'list-item',
            value: str || '',
            events: {
              input: function () {
                self.value = Array.from(self.dataNode.$$('.list-item')).map(input => input.value);
                wp.dispatchEvent(self.uuid + ':value:changed', self.value);
              }
            }
          }),

          new Element('button', {
            text: 'delete',
            events: {
              click: function () {
                this.parentNode.unload();
                self.process.canvas.update();
                self.value = Array.from(self.dataNode.$$('.list-item')).map(input => input.value);
                wp.dispatchEvent(self.uuid + ':value:changed', self.value);
              }
            }
          })
        );
      };

      this.add = str => {
        var i = this.buildInput();
        this.dataNode.grab(i);
        this.process.canvas.update();
        i.$('.list-item').focus();
      };
    },

    builder: function () {
      var self = this;
      console.log(this.value);
      return [
        new Element('button', {
          text: 'add',
          events: {
            click: function () { self.add(); }
          }
        })
      ].concat(this.value.map(this.buildInput));
    }
  });

})(this);
