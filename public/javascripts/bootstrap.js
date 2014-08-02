(exports => {
  "use strict";

  wp.bootstrap = function () {
    wp.Process.new({ name: 'process 1' }).show();
    wp.View.new({ name: 'view 1' }).show();
    
    localStorage.bootstraped = true;
  };

  wp.clearBootstrap = function () {
    wp.Process.items.forEach(item => item.destroy());
    wp.View.items.forEach(item => item.destroy());
    wp.Process.save();
    wp.View.save();

    localStorage.bootstraped = false;
    window.location = window.location;
  };
  
  if (localStorage.bootstraped !== 'true') {
    document.addEventListener('DOMContentLoaded', wp.bootstrap);
  }

})(this);
