(exports => {
  "use strict";

  var Link = wp.Link = function (source, target) {
    this.source = source;
    this.target = target;
    this.process = source.process;

    source.out.set(target, this);
    target.in.set(source, this);
    source.dispatchEvent('link', this);
    target.dispatchEvent('linked', this);

    if (wp.initialized) {
      source.validate();
      target.updateDownstreams();
      this.process.save();
    }
  };

  Link.prototype.destroy = function () {
    this.source.out.delete(this.target);
    this.target.in.delete(this.source);
    this.source.dispatchEvent('unlink', this.target);
    this.target.dispatchEvent('unlinked', this.source);

    if (wp.initialized) {
      if (!this.source.destroying) this.source.validate();
      if (!this.target.destroying) this.target.updateDownstreams();
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

  Evented(Link);

})(this);
