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
    params: [{ type: 'text' }]
  });

  wp.LibraryType.ListInput = new wp.LibraryType({
    listNode: node,
    name: 'ListInput',
    displayName: 'List',
    nin: 0,
    params: [{ type: 'list' }]
  });

})(this);
