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
    defaultValue: {
      view: '<none>',
      mode: 'text'
    },

    constructor: function () {
      this.viewAdded = function (view) {
        this.addOption(this.node.$('.view-choice'), view);
      }.bind(this);

      this.viewRemoved = function (view) {
        var select = this.node.$('.view-choice'), oldValue = select.value;
        for (var opt of select.children) {
          if (opt.value === view.uuid) {
            opt.unload();
            if (select.value !== oldValue.view) {
              wp.dispatchEvent(this.uuid + ':value:changed', { view: select.value, mode: oldValue.mode });
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

        if (view.uuid === this.value.view) {
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
        class: 'view-choice',
        value: this.value.view,
        events: {
          change: function (ev) {
            wp.dispatchEvent(self.uuid + ':value:changed', { view: this.value, mode: self.value.mode });
          }
        }
      }).grab(new Element('option', {
        value: '<none>',
        text: '<none>'
      }));

      wp.View.items.forEach(view => this.addOption(node, view));

      return [node, new Element('select', {
        class: 'view-mode',
        events: {
          change: function () {
            wp.dispatchEvent(self.uuid + ':value:changed', { view: self.value.view, mode: this.value });
          }
        }
      }).adopt(
        new Element('option', { value: 'text', text: 'Text', selected: this.value.mode === 'text' }),
        new Element('option', { value: 'html', text: 'HTML', selected: this.value.mode === 'html' }),
        new Element('option', { value: 'json', text: 'JSON', selected: this.value.mode === 'json' })
      )];
    },

    updater: function () {
      var view, mode;
      // console.log('updater: ', this.value);
      if (view = wp.View.items.get(this.value.view)) {
        view.workspace.empty();
        mode = this.value.mode;

        for (var i of this.in) {
          // action depending type of in and type of value
          if (Array.isArray(i.value)) {
            for (var val of i.value) {
              if (mode === 'text') view.workspace.grab(new Element('p', { text: val }));
              else if (mode === 'html') view.workspace.innerHTML += val;
              else if (mode === 'json') view.workspace.grab(new Element('p', { text: JSON.stringify(val) }));
            }
          } else {
            console.log('print: ', mode, i.value);
            if (mode === 'text') view.workspace.grab(new Element('p', { text: i.value }));
            else if (mode === 'html') view.workspace.innerHTML += i.value;
            else if (mode === 'json') view.workspace.grab(new Element('p', { text: JSON.stringify(i.value) }));
          }
        }
      } else if (this.oldValue && (view = wp.View.items.get(this.oldValue.view))) {
        view.workspace.empty();
      }
    },

    validator: function () {
      return this.value.view !== this.type.defaultValue;
    }
  });

})(this);
