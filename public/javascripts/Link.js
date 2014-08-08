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
    if (this.process.c_conf.hoverLink === this) delete this.process.c_conf.hoverLink;

    if (wp.initialized) {
      if (!this.source.destroying) this.source.validate();
      if (!this.target.destroying) this.target.updateDownstreams();
      this.process.save();
    }
    delete this.source;
    delete this.target;
    delete this.process;
  };

  Link._getLinkInfo = function (at, ar, ab, al, bt, br, bb, bl) {
    var qp = Math.PI / 4,
    acx = (al + ar) / 2, acy = (at + ab) / 2,
    bcx = (bl + br) / 2, bcy = (bt + bb) / 2,
    a = Math.atan2(acy - bcy, bcx - acx);

    if (a < qp * 3 && a >= qp) {
      return { a: a, dir: 'up', x: acx, y: at, xx: bcx, yy: bb };
    } else if (a < qp && a >= -qp) {
      return { a: a, dir: 'right', x: ar, y: acy, xx: bl, yy: bcy };
    } else if (a < -qp && a >= -qp * 3) {
      return { a: a, dir: 'down', x: acx, y: ab, xx: bcx, yy: bt };
    } else {
      return { a: a, dir: 'left', x: al, y: acy, xx: br, yy: bcy };
    }
  };

  Link._draw = function (x, y, xx, yy, a, dir) {
    var hover;

    hover = wp.draw.circle(this.ctx, this.c_conf, x, y, 3, {
      strokeStyle: 'black',
      fillStyle: 'black'
    }, true, true) || hover;

    hover = wp.draw.line(this.ctx, this.c_conf, x, y, xx, yy, {
      lineWidth: 3
    }, true, true) || hover;

    return hover;
  };

  Link.draw = function (ctx, c_conf) {
    var source = this.source.node, target = this.target.node;
    var { a, dir, x, y, xx, yy } = Link._getLinkInfo(
      source.offsetTop, source.offsetLeft + source.offsetWidth,
      source.offsetTop + source.offsetHeight, source.offsetLeft,
      target.offsetTop, target.offsetLeft + target.offsetWidth,
      target.offsetTop + target.offsetHeight, target.offsetLeft
    );

    // if hover link, set variables and redraw with blur
    if (this.bound) ctx.setLineDash([10, 2]);
    if (Link._draw.call({ ctx: ctx, c_conf: c_conf }, x, y, xx, yy, a, dir) && !c_conf.linkFrom) {
      var { shadowBlur, shadowColor } = ctx;
      c_conf.hoverLink = this;

      wp.draw._conf(ctx, { shadowBlur: 3, shadowColor: c_conf.cursor.ev.altKey ? 'red' : 'black' });
      Link._draw.call({ ctx: ctx, c_conf: c_conf }, x, y, xx, yy, a, dir);
      wp.draw._conf(ctx, { shadowBlur: shadowBlur, shadowColor: shadowColor });
      this.process.workspace.classList.add('clickable');
    } else if (c_conf.hoverLink === this) {
      this.process.workspace.classList.remove('clickable');
      delete c_conf.hoverLink;
    }
    if (this.bound) ctx.setLineDash([]);
  };

  Link.prototype.draw = function (ctx, c_conf) {
    return Link.draw.call(this, ctx, c_conf);
  };

  Link.prototype.showInfoPanel = function (x, y) {
    var
    self = this,
    overlay = this.process.overlay,
    panel = this.buildInfoPanel(),
    previous = overlay.$('.panel');

    if (previous) previous.wpobj.hideInfoPanel();

    overlay.grab(panel);
    panel.style.left = Math.trunc(x - panel.offsetWidth / 2) + 'px';
    panel.style.top = Math.trunc(y - panel.$('.panel-title').offsetHeight) + 'px';

    panel.addEventListener('mousemove', function onmove() {
      document.addEventListener('click', self.hideInfoPanel);
      panel.removeEventListener('mousemove', onmove);
    });
  };

  Link.prototype.hideInfoPanel = function (ev) {
    if (ev && ev.target.getParent('.panel', true)) return;
    if (this.panel) this.panel.unload();
    document.removeEventListener('click', this.hideInfoPanel);
  };

  Link.prototype.buildInfoPanel = function () {
    if (this.panel) return this.panel;
    var self = this;

    return (this.panel = new Element('div', {
      class: 'link-info panel',
      properties: { wpobj: this }
    }).adopt(
      new Element('h5', {
        class: 'panel-title',
        text: this.source.type.displayName + ' > ' + this.target.type.displayName +
              (this.bind ? '[' + this.bind + ']' : '')
      }),

      new Element('div', {
        class: 'panel-actions'
      }).adopt(
        [new Element('button', {
          class: 'action-delete',
          text: 'delete',
          events: { click: function () { self.destroy(); } }
        })].concat(
          (() => {
            var params = this.target.type.params.filter(param => param.bindable);
            if (!params.length) return [];

            return new Element('p').adopt(
              new Element('span', { text: 'Binding: ' }),
              new Element('select', {
                events: {
                  change: function () {
                    self.target.bindParam(this.value, self);
                  }
                }
              }).grab(
                new Element('option', { text: '<none>', value: '<none>' })
              ).adopt(params.map(param => {
                var name = param.name || this.target.type.value;
                return new Element('option', {
                  text: name.capitalize(),
                  value: name,
                  selected: this.bound === name,
                  events: {
                    mouseenter: function () {
                      self.target.dataNode.$('[name=' + name + ']').classList.add('highlight');
                      self.source.node.classList.add('highlight');
                    },
                    mouseleave: function () {
                      self.target.dataNode.$('[name=' + name + ']').classList.remove('highlight');
                      self.source.node.classList.remove('highlight');
                    }
                  }
                });
              }))
            )
          })()
        )
      )
    ));
  };

  Link.prototype.bindParam = function (name) {
    console.log('link', this, 'binds param', name);
  };

  Evented(Link);

})(this);
