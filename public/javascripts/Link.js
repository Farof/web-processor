(exports => {
  "use strict";

  var Link = wp.Link = function (source, target) {
    this.source = source;
    this.target = target;
    this.process = source.process;

    source.out.set(target, this);
    target.in.set(source, this);

    if (wp.initialized) {
      source.validate();
      target.validate();
      this.process.save();
    }
  };

  Link.prototype.destroy = function (destroying) {
    this.source.out.delete(this.target);
    this.target.in.delete(this.source);
    this.source.dispatchEvent('unlink', this.target);

    if (wp.initialized && !destroying) {
      this.source.validate();
      this.target.validate();
      this.process.save();
    }
    delete this.source;
    delete this.target;
    delete this.process;
  };

  Link.prototype.showInfoPanel = function (ev) {
    console.log('show link info: ', this);
  };

  Link.prototype.hideInfoPanel = function () {

  };

  Link.prototype.buildInfoPanel = function () {

  };
  
  Link.bind = function (source, target) {
    
  };

  Evented(Link);

})(this);
