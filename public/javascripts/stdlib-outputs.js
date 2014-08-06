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

    params: [{
      name: 'view',
      defaultValue: '<none>',
      type: 'select',
      // { collection, emmiter: wp, name, value: 'uuid', label: 'name' }
      datasource: { name: 'View' },
      values: [
        { value: '<none>', label: '<none>' }
      ]
    }, {
      name: 'mode',
      type: 'select',
      defaultValue: 'text',
      values: [
        { value: 'text', label: 'Text' },
        { value: 'html', label: 'HTML' },
        { value: 'json', label: 'JSON' }
      ]
    }],

    constructor: function () {
      this.addEventListener('upstream:error', () => {
        var view = wp.View.items.get(this.params.get('view'));
        if (view) view.workspace.empty();
      });

      this.addEventListener('param:changed', (name, val, old) => {
        var view;
        if (name === 'view' && (view = wp.View.items.get(old))) {
          view.workspace.empty();
        }
      });

      this.addEventListener('unlinked', () => {
        var view;
        if (!this.in.size && (view = wp.View.items.get(this.params.get('view')))) {
          view.workspace.empty();
        }
      });
    },

    execute: function (values) {
      return new Promise(resolve => {
        function insertText(value) {
          view.workspace.grab(new Element('p', { text: value }));
        }

        function insertHTML(value) {
          view.workspace.innerHTML += value;
        }

        function insertJSON(value) {
          view.workspace.grab(new Element('p', { text: JSON.stringify(value) }));
        }

        var view = wp.View.items.get(this.params.get('view')), mode = this.params.get('mode'), insert;
        if (view) {
          view.workspace.empty();

          if (mode === 'text') insert = insertText;
          else if (mode === 'html') insert = insertHTML;
          else if (mode === 'json') insert = insertJSON;

          Array.from(values).flatten().forEach(insert);
        }

        resolve(values);
      });
    },

    validator: function () {
      if (this.params.get('view') === '<none>') {
        this.errorMessage = 'choose a view';
        return false;
      }
      return true;
    }
  });

})(this);
