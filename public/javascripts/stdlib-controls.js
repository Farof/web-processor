(exports => {
  "use strict";

  var node = new Element('div', {
    id: 'library-controls',
    class: 'collection-category'
  }).grab(new Element('h3', { text: 'Controls' }));
  $('#library').grab(node);

  wp.LibraryType.TestControl = new wp.LibraryType({
    listNode: node,
    name: 'TestControl',
    displayName: 'Test',
    nin: 1,
    nout: -1,
    nosave: true,
    bindings: {
      'test-binding': {}
    },

    builder: function () {
      return new Element('select', { class: 'test-binding' }).adopt(
        new Element('option', { value: 'a', text: 'x2' }),
        new Element('option', { value: 'b', text: 'x4' }),
        new Element('option', { value: 'c', text: 'x8' })
      );
    }
  });

  wp.LibraryType.ProcessConf = new wp.LibraryType({
    listNode: node,
    name: 'ProcessConf',
    displayName: 'Configuration',
    nin: 0,
    nout: 0,
    nosave: true,

    destroyer: function () {
      for (var [name, type] of this.process.conf) {
        this.process.removeEventListener(name + ':changed', this['update' + name.capitalize()]);
      }
    },

    initialize: function () {
      // build things here because this.process is not yet set in constructor or builder
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

        function onChange() {
          self.process[name] = this.value;
          self.process.save();
          self.process.dispatchEvent(name + ':changed', self.process);
        }

        if (type === 'text') {
          this.dataNode.grab(
            new Element('p').adopt(
              new Element('span', { text: name + ': ' } ),
              new Element('input', {
                class: 'process-conf-' + name,
                type: 'text',
                events: { input: onChange }
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
                events: { click: onChange }
              })
            )
          );
        }

        updater(this.process);
        this.process.addEventListener(name + ':changed', updater);
      });

      this.node.classList.remove('empty');
    }
  });

  wp.LibraryType.ExecuteControl = new wp.LibraryType({
    listNode: node,
    name: 'ExecuteControl',
    displayName: 'Execute',
    nin: 0,
    nout: 0,
    nosave: true,

    builder: function () {
      var self = this;
      return new Element('button', {
        text: 'Execute',
        events: {
          click: function () {
            self.process.execute(true);
          }
        }
      })
    }
  });


})(this);
