(exports => {
  "use strict";

  var View = wp.View = new wp.WPObjType({
    name: 'View',
    defaultItemName: 'My view',
    listNode: $('#view-list')
  });

})(this);
