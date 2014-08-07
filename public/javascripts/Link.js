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

    this.hideInfoPanel = this.hideInfoPanel.bind(this);

    if (wp.initialized) {
      source.validate();
      target.updateDownstreams();
      this.process.save();
    }
  };

  Link.prototype.destroy = function () {
    this.hideInfoPanel();
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

  Link.prototype.showInfoPanel = function (x, y) {
    var
    self = this,
    overlay = this.process.overlay,
    panel = this.panel || (this.panel = this.buildInfoPanel()),
    previous = overlay.$('.link-info');

    if (previous) previous.wpobj.hideInfoPanel();

    overlay.grab(panel);
    panel.style.left = Math.trunc(x - panel.offsetWidth / 2) + 'px';
    panel.style.top = Math.trunc(y - panel.$('.link-title').offsetHeight) + 'px';

    panel.addEventListener('mousemove', function onmove() {
      document.addEventListener('click', self.hideInfoPanel);
      panel.removeEventListener('mousemove', onmove);
    });
  };

  Link.prototype.hideInfoPanel = function () {
    if (this.panel) this.panel.unload();
    document.removeEventListener('click', this.hideInfoPanel);
  };

  Link.prototype.buildInfoPanel = function () {
    var self = this;

    return new Element('div', {
      class: 'link-info',
      properties: { wpobj: this }
    }).adopt(
      new Element('h5', {
        class: 'link-title',
        text: this.source.type.displayName + ' > ' + this.target.type.displayName
      }),

      new Element('div', {
        class: 'link-actions'
      }).adopt(
        new Element('button', {
          class: 'link-delete',
          text: 'delete',
          events: { click: function () { self.destroy(); } }
        })
      )
    );
  };

  Evented(Link);

})(this);
