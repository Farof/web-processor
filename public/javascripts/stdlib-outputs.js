(exports => {
  "use strict";

  var node = new Element('div', {
    id: 'library-outputs',
    class: 'collection-category'
  }).grab(new Element('h3', { text: 'Outputs' }));
  $('#library').grab(node);

  wp.LibraryType.ViewOutput = new wp.LibraryType({
    listNode: node,
    name: 'ViewOutput',
    displayName: 'View',
    nin: -1,
    nout: 0,
    defaultValue: '<none>',

    constructor: function () {
      this.viewAdded = function (view) {
        this.addOption(this.node.$('select'), view);
      }.bind(this);

      this.viewRemoved = function (view) {
        var select = this.node.$('select'), oldValue = select.value;
        for (var opt of select.children) {
          if (opt.value === view.uuid) {
            opt.unload();
            if (select.value !== oldValue) {
              wp.dispatchEvent(this.uuid + ':value:changed', select.value);
            }
            break;
          }
        }
      }.bind(this);

      this.addOption = function (select, view) {
        var opt = new Element('option', {
          value: view.uuid,
          text: view.name
        });

        wp.addEventListener(view.uuid + ':name:changed', view => {
          opt.textContent = view.name;
        });

        if (view.uuid === this.value) {
          opt.setAttribute('selected', true);
          this.update();
        }

        select.grab(opt);
      }.bind(this);

      wp.addEventListener('View:new', this.viewAdded);
      wp.addEventListener('View:destroy', this.viewRemoved);
    },

    destroyer: function () {
      wp.removeEventListener('View:new', this.viewAdded);
      wp.removeEventListener('View:destroy', this.viewRemoved);
    },

    builder: function () {
      var self = this;

      var node = new Element('select', {
        name: 'select',
        value: this.value,
        events: {
          change: function (ev) {
            wp.dispatchEvent(self.uuid + ':value:changed', this.value);
          }
        }
      }).grab(new Element('option', {
        value: '<none>',
        text: '<none>'
      }));

      wp.View.items.forEach(view => this.addOption(node, view));

      return node;
    },

    updater: function () {
      var view;
      if (view = wp.View.items.get(this.value)) {
        view.workspace.empty();
        for (var i of this.in) {
          // action depending type of in and type of value
          if (Array.isArray(i.value)) {
            for (var val of i.value) {
              view.workspace.grab(new Element('p', { text: val }));
            }
          } else {
            view.workspace.grab(new Element('p', { text: i.value }));
          }
        }
      } else if (view = wp.View.items.get(this.oldValue)) {
        view.workspace.empty();
      }
    },

    validator: function () {
      return this.value !== this.type.defaultValue;
    }
  });

})(this);
