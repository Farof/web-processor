(exports => {
  "use strict";

  var LibraryType = wp.LibraryType;

  /***** CONTROLS *****/

  LibraryType.ProcessConf = new LibraryType({
    listNode: $('#library-controls'),
    name: 'ProcessConf',
    displayName: 'Configuration',
    nin: 0,
    nout: 0,
    defaultValue: null,

    constructor: function () {
      this.initialized = false;
    },

    destroyer: function () {
      for (var [name, type] of this.process.conf) {
        wp.removeEventListener([this.process.uuid, name, 'changed'].join(':'), this['update' + name.capitalize()]);
      }
    },

    updater: function () {
      if (!this.initialized) {
        var updater, self = this;

        this.process.conf.forEach((type, name) => {
          this['update' + name.capitalize()] = process => {
            var node = this.node.$('.process-conf-' + name);
            if (type === 'text') {
              node.value = process[name];
            } else if (type === 'bool') {
              node.checked = process[name];
            }
          };

          updater = this['update' + name.capitalize()];

          if (type === 'text') {
            this.dataNode.grab(
              new Element('p').adopt(
                new Element('span', { text: name + ': ' } ),
                new Element('input', {
                  class: 'process-conf-' + name,
                  type: 'text',
                  events: {
                    input: function () {
                      self.process[name] = this.value;
                      self.process.save();
                      wp.dispatchEvent([self.process.uuid, name, 'changed'].join(':'), self.process);
                    }
                  }
                })
              )
            );
          } else if (type === 'bool') {
            this.dataNode.grab(
              new Element('p').adopt(
                new Element('span', { text: name + ': ' } ),
                new Element('input', {
                  class: 'process-conf-' + name,
                  type: 'checkbox',
                  events: {
                    click: function () {
                      self.process[name] = this.checked;
                      self.process.save();
                      wp.dispatchEvent([self.process.uuid, name, 'changed'].join(':'), self.process);
                    }
                  }
                })
              )
            );
          }

          updater(this.process);
          wp.addEventListener([this.process.uuid, name, 'changed'].join(':'), updater);
        });

        this.initialized = true;
      }
    }
  });

  LibraryType.ExecuteControl = new LibraryType({
    listNode: $('#library-controls'),
    name: 'ExecuteControl',
    displayName: 'Execute',
    nin: 0,
    nout: 0,
    defaultValue: null,

    builder: function () {
      var self = this;
      return new Element('button', {
        text: 'Execute',
        events: {
          click: function () {
            self.process.execute();
          }
        }
      })
    }
  })

  /***** INPUTS *****/

  LibraryType.TextInput = new LibraryType({
    listNode: $('#library-inputs'),
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

  /***** OPERATORS *****/

  LibraryType.LowerCaseOperator = new LibraryType({
    listNode: $('#library-operators'),
    name: 'LowerCaseOperator',
    displayName: 'LowerCase',
    nin: -1,
    nout: -1,
    defaultValue: '',

    builder: function () {
      return [
        new Element('p', { text: 'In: '}).adopt(new Element('span', { class: 'item-in-count', text: 0 })),
        new Element('p', { text: 'Out: '}).adopt(new Element('span', { class: 'item-out-count', text: 0 }))
      ];
    },

    updater: function () {
      this.value = [];
      for (var i of this.in) {
        this.value.push(String(i.value).toLowerCase());
      }
    },

    validator: function () {
      this.node.$('.item-in-count').textContent = this.in.size;
      this.node.$('.item-out-count').textContent = this.out.size;
      return true;
    }
  });

  LibraryType.UpperCaseOperator = new LibraryType({
    listNode: $('#library-operators'),
    name: 'UpperCaseOperator',
    displayName: 'UpperCase',
    nin: -1,
    nout: -1,
    defaultValue: '',

    builder: function () {
      return [
        new Element('p', { text: 'In: '}).adopt(new Element('span', { class: 'item-in-count', text: 0 })),
        new Element('p', { text: 'Out: '}).adopt(new Element('span', { class: 'item-out-count', text: 0 }))
      ];
    },

    updater: function () {
      this.value = [];
      for (var i of this.in) {
        this.value.push(String(i.value).toUpperCase());
      }
    },

    validator: function () {
      this.node.$('.item-in-count').textContent = this.in.size;
      this.node.$('.item-out-count').textContent = this.out.size;
      return true;
    }
  });

  /***** OUTPUTS *****/

  LibraryType.ViewOutput = new LibraryType({
    listNode: $('#library-outputs'),
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
