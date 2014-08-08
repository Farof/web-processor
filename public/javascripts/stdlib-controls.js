(exports => {
  "use strict";

  const node = new Element('div', {
    id: 'library-controls',
    class: 'collection-category'
  }).grab(new Element('h3', { text: 'Controls' }));
  $('#library').grab(node);

  wp.LibraryType.TestControl2 = new wp.LibraryType({
    listNode: node,
    name: 'TestControl2',
    displayName: 'Test 2',
    nin: 0,
    nout: -1,
    params: [{
      type: 'text'
    }]
  });

  wp.LibraryType.TestControl = new wp.LibraryType({
    listNode: node,
    name: 'TestControl',
    displayName: 'Test',
    nin: 1,
    nout: -1,
    params: [{
      name: 'multiplicator',
      type: 'select',
      defaultValue: 2,
      bindable: true,
      values: [
        { value: 2, label: 'x2' },
        { value: 4, label: 'x4' },
        { value: 8, label: 'x8' }
      ]
    }],

    execute: function (values) {
      return Promise.resolve(values.map(value => Number(value) * this.params.get('multiplicator')));
    }
  });

  wp.LibraryType.ProcessConf = new wp.LibraryType({
    listNode: node,
    name: 'ProcessConf',
    displayName: 'Configuration',
    nin: 0,
    nout: 0,

    destroyer: function () {
      for (let [name, type] of this.process.conf) {
        this.process.removeEventListener(name + ':changed', this['update' + name.capitalize()]);
      }
    },

    initialize: function () {
      // build things here because this.process is not yet set in constructor or builder
      const self = this;

      this.process.conf.forEach((type, name) => {
        this['update' + name.capitalize()] = process => {
          const node = this.node.$('.process-conf-' + name);
          if (type === 'text') {
            node.value = process[name];
          } else if (type === 'bool') {
            node.checked = process[name];
          }
        };

        const updater = this['update' + name.capitalize()];

        if (type === 'text') {
          this.dataNode.grab(
            new Element('p').adopt(
              new Element('span', { text: name + ': ' } ),
              new Element('input', {
                class: 'process-conf-' + name,
                type: 'text',
                events: { input: function onChange() {
                  self.process[name] = this.value;
                  self.process.save();
                  self.process.dispatchEvent(name + ':changed', self.process);
                } }
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
                events: { click: function onChange() {
                  self.process[name] = this.checked;
                  self.process.save();
                  self.process.dispatchEvent(name + ':changed', self.process);
                } }
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

    builder: function () {
      const self = this;
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
