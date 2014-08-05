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
    nin: -1,
    nout: 0,
    nosave: true
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
        wp.removeEventListener([this.process.uuid, name, 'changed'].join(':'), this['update' + name.capitalize()]);
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
