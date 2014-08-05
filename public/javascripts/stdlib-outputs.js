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
    nout: 0,
    defaultValue: {
      view: '<none>',
      mode: 'text'
    },

    constructor: function () {
      this.viewAdded = view => {
        this.addOption(this.node.$('.view-choice'), view);
      };

      this.viewRemoved = view => {
        var select = this.node.$('.view-choice'), oldValue = select.value;
        for (var opt of select.children) {
          if (opt.value === view.uuid) {
            opt.unload();

            if (select.value !== oldValue) {
              this.dispatchEvent('value:changed', { view: select.value, mode: this.value.mode });
            }
            break;
          }
        }
      };

      this.addOption = (select, view) => {
        var opt = new Element('option', {
          value: view.uuid,
          text: view.name
        });

        view.addEventListener('name:changed', view => {
          opt.textContent = view.name;
        });

        if (view.uuid === this.value.view) {
          opt.setAttribute('selected', true);
          // if (wp.initialized) this.update();
        }

        select.grab(opt);
      };

      this.onUpstreamError = () => {
        var view = wp.View.items.get(this.value.view);
        if (view) view.workspace.empty();
      };

      this.addEventListener('upstream:error', this.onUpstreamError);
      wp.addEventListener('View:new', this.viewAdded);
      wp.addEventListener('View:destroy', this.viewRemoved);
    },

    destroyer: function () {
      this.removeEventListener('upstream:error', this.onUpstreamError);
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
            self.dispatchEvent('value:changed', { view: this.value, mode: self.value.mode });
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
            self.dispatchEvent('value:changed', { view: self.value.view, mode: this.value });
          }
        }
      }).adopt(
        new Element('option', { value: 'text', text: 'Text', selected: this.value.mode === 'text' }),
        new Element('option', { value: 'html', text: 'HTML', selected: this.value.mode === 'html' }),
        new Element('option', { value: 'json', text: 'JSON', selected: this.value.mode === 'json' })
      )];
    },

    execute: function (values) {
      return new Promise(resolve => {
        var view, mode = this.value.mode;

        if (this.oldValue && (view = wp.View.items.get(this.oldValue.view))) {
          view.workspace.empty();
        }

        if (view = wp.View.items.get(this.value.view)) {
          view.workspace.empty();

          Array.from(values).flatten().forEach(value => {
            // console.log('write: ', value, mode);
            if (mode === 'text') view.workspace.grab(new Element('p', { text: value }));
            else if (mode === 'html') view.workspace.innerHTML += value;
            else if (mode === 'json') view.workspace.grab(new Element('p', { text: JSON.stringify(value) }));
          });
        }

        resolve(values);
      });
    },

    validator: function () {
      if (this.value.view === this.type.defaultValue.view) {
        this.errorMessage = 'choose a view';
        return false;
      }
      return true;
    }
  });

})(this);
