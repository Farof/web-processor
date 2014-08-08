(exports => {
  "use strict";

  wp.View = new wp.WPObjType({
    name: 'View',
    defaultItemName: 'My view',
    listNode: $('#view-list')
  });
  const View = wp.View;

})(this);
