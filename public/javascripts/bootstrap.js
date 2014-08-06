(exports => {
  "use strict";

  wp.bootstrap = function () {
    wp.Process.new({ name: 'process 1' }).show();
    wp.View.new({ name: 'view 1' }).show();
    
    localStorage['wp-bootstraped'] = true;
  };

  wp.clearBootstrap = function () {
    wp.Process.items.forEach(item => item.destroy());
    wp.View.items.forEach(item => item.destroy());
    wp.Process.save();
    wp.View.save();

    localStorage['wp-bootstraped'] = false;
    window.location = window.location;
  };
  
  if (localStorage['wp-bootstraped'] !== 'true') {
    document.addEventListener('DOMContentLoaded', wp.bootstrap);
  }

})(this);
