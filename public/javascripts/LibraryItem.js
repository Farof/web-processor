(exports => {
  "use strict";

  // library items
  var LibraryItem = wp.LibraryItem = function ({ _uuid, type, value }) {
    this.uuid = _uuid || uuid();
    this.type = type;
    this.in = new Set();
    this.out = new Set();
    this.downstreams = new Map();
    this.value = value || this.type.defaultValue;
    this.initialized = false;

    this.addEventListener('value:changed', newValue => {
      this.oldValue = this.value;
      this.value = newValue;
      this.process.save();
      if (wp.initialized) this.updateDownstreams();
    });

    this.addEventListener('link', this.onLink);
    this.addEventListener('unlink', this.onUnlink);
    this.addEventListener('linked', this.onLinked);
    this.addEventListener('unlinked', this.onUnlinked);
    this.onDownstreamLink = this.onDownstreamLink.bind(this);
    this.onDownstreamUnlink = this.onDownstreamUnlink.bind(this);

    if (this.type.constructor) this.type.constructor.call(this);

    wp.dispatchEvent('process-item:new', this);
  };

  LibraryItem.prototype.initialize = function () {
    if (!this.initialized) {
      if (this.type.initialize) this.type.initialize.call(this);
      this.initialized = true;
      this.validate();
    }
  };

  LibraryItem.prototype.serialize = function () {
    return {
      uuid: this.uuid,
      type: this.type.name,
      out: Array.from(this.out).map(o => o.uuid),
      left: parseInt(this.node.style.left, 10),
      top: parseInt(this.node.style.top, 10),
      value: this.type.nosave ? null : this.value
    };
  };

  LibraryItem.prototype.buildNode = function () {
    var startX, startY, left, top, self = this;

    function dragstart(ev) {
      if (ev.shiftKey || ev.altKey) return;
      ev.stop();

      node.parentNode.grab(node);

      left = node.offsetLeft;
      top = node.offsetTop;
      startX = ev.clientX;
      startY = ev.clientY;

      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', dragstop);
    }

    function drag(ev) {
      node.setLeft((left + ev.clientX - startX) / node.parentNode.clientWidth * 100);
      node.setTop((top + ev.clientY - startY) / node.parentNode.clientHeight * 100);
      node.wpobj.process.canvas.update();
    }

    function dragstop(ev) {
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', dragstop);

      node.setLeft(Math.trunc((left + ev.clientX - startX) / node.parentNode.clientWidth * 100));
      node.setTop(Math.trunc((top + ev.clientY - startY) / node.parentNode.clientHeight * 100));

      self.process.save();
      node.wpobj.process.canvas.update();
    }

    function mousedown(ev) {
      if (ev.altKey) {
        self.process.removeItem(self);
      } else if (ev.shiftKey && self.canEmitLink()) {
        ev.stop();
        self.process.canvas.startLink(ev);
      }
    }

    this.dataNode = new Element('div', {
      class: 'content-item-data'
    });

    var node = this.node = new Element('div', {
      class: 'content-item',
      style: {
        left: left + 'px',
        top: top + 'px'
      },
      events: {
        mousedown: mousedown,
        mouseenter: function () {
          self.process.c_conf.hover = node;
          // console.log(self.value);
        },
        mouseleave: function () { self.process.c_conf.hover = null; }
      },
      properties: {
        // see Process.js c_drawNewLink
        // wpobj: this
      }
    }).adopt(
      new Element('h4', {
        text: this.type.displayName,
        events: {
          mousedown: dragstart
        }
      }).grab(
        new Element('span', {
          class: 'item-info',
          text: '\uFE0F\u26A0',
          title: 'something is wrong'
        })
      ),

      this.dataNode
    );

    node.setLeft = function (left) {
      var w = node.parentNode.clientWidth;
      this.style.left = Math.min(Math.max(left, 0), Math.trunc((w - node.clientWidth) / w * 100)) + '%';
      return this;
    };

    node.setTop = function (top) {
      var h = node.parentNode.clientHeight;
      this.style.top = Math.min(Math.max(top, 0), Math.trunc((h - node.offsetHeight) / h * 100)) + '%';
      return this;
    };

    if (this.type.builder) this.dataNode.adopt(this.type.builder.call(this));
    else this.node.classList.add('empty');

    node.wpobj = this;

    return node;
  };

  LibraryItem.prototype.destroy = function () {
    this.destroying = true;
    wp.dispatchEvent('process-item:destroy', this);

    this.out.forEach(target => this.dispatchEvent('unlink', target, this));
    this.in.forEach(source => source.dispatchEvent('unlink', this, source));

    this.removeEventListener('link');
    this.removeEventListener('unlink');
    this.removeEventListener('linked');
    this.removeEventListener('unlinked');

    if (this.type.destroyer) this.type.destroyer.call(this);
    delete this.process;
    delete this.type;
    delete this.node.wpobj;
    this.node.unload();
  };

  LibraryItem.prototype.canEmitLink = function () {
    return this.type.nout === -1 || (this.type.nout === 1 && this.out.size < 1);
  };

  LibraryItem.prototype.canAcceptLink = function (source) {
    return (this.type.nin === -1 && !this.in.has(source)) || (this.type.nin === 1 && this.in.size < 1);
  };

  LibraryItem.prototype.onLink = function (target) {
    this.out.add(target);

    if (target.downstreams.size > 0) {
      this.downstreams.set(target.uuid, target.getUniqueDownstreams());
    } else {
      this.downstreams.set(target.uuid, new Set([target]));
    }

    target.addEventListener('link', this.onDownstreamLink);

    target.dispatchEvent('linked', this);
    if (wp.initialized) {
      this.validate();
      this.process.save();
    }
  };

  LibraryItem.prototype.onUnlink = function (target) {
    this.out.delete(target);
    this.downstreams.delete(target.uuid);

    target.removeEventListener('link', this.onDownstreamLink);

    target.dispatchEvent('unlinked', this);
    if (wp.initialized && !this.destroying) {
      this.validate();
      this.process.save();
    }
  };

  LibraryItem.prototype.onLinked = function (source) {
    this.in.add(source);

    if (wp.initialized) {
      this.validate();
      this.updateDownstreams();
    }
  };

  LibraryItem.prototype.onUnlinked = function (source) {
    this.in.delete(source);
    if (wp.initialized && !this.destroying) {
      this.validate();
      this.updateDownstreams();
    }
  };

  LibraryItem.prototype.onDownstreamLink = function (target, downstream) {
    this.downstreams.set(
      downstream.uuid,
      new Set(Array.from(downstream.downstreams.values()).reduce((a, b) => a.concat(Array.from(b)), []))
    );
    this.in.forEach(i => i.onDownstreamLink(downstream, this));
  };

  LibraryItem.prototype.onDownstreamUnlink = function (target, downstream) {
    if (downstream.downstreams.size > 0) {
      this.downstreams.set(downstream.uuid, downstream.getUniqueDownstreams());
    } else {
      this.downstreams.set(downstream.uuid, new Set([downstream]));
    }
    this.in.forEach(i => i.onDownstreamUnlink(downstream, this));
  };

  LibraryItem.prototype.getUniqueDownstreams = function () {
    return new Set(Array.from(this.downstreams.values()).reduce((a, b) => a.concat(Array.from(b)), []))
  };

  LibraryItem.prototype.getAllUpdates = function (sources, manual) {
    return Array.from(sources).reduce((a, b) => a.concat(b.update(manual)), [])
  };

  LibraryItem.prototype.updateDownstreams = function () {
    if (this.downstreams.size > 0) {
      return Promise.all(this.getAllUpdates(this.getUniqueDownstreams()));
    } else {
      return this.update();
    }
  };

  LibraryItem.prototype.update = function (manual) {
    // console.log('update: ', this.type.name, this.node, this.updateInProgress);
    var p = this.updateInProgress || (this.updateInProgress = new Promise((resolve, reject) => {

      if (this.process.autoexec || manual) {
        if (this.validate()) {
          if (this.in.size === 0) {
            this.execute(this.value).then(resolve, reject);
          } else {
            Promise.all(this.getAllUpdates(this.in.values(), manual)).then(values => {
              this.execute(values).then(resolve, reject);
            }, err => {
              this.validate('upstream error: ' + err);
              this.dispatchEvent('upstream:error');
              reject(err);
            });
          }
        } else {
          reject(this.errorMessage);
        }
      } else {
        reject('autoexec disabled');
      }
    }));

    // when the current update finishes, delete its cache to allow a new one to take place
    p.then(() => delete this.updateInProgress, () => delete this.updateInProgress)
    .catch(() => delete this.updateInProgress);

    return p;
  };

  LibraryItem.prototype.execute = function (values) {
    return values ? new Promise((resolve, reject) => {
      if (this.type.execute) this.type.execute.call(this, values).then(resolve, reject);
      else resolve(this.value);
    }) : Promise.reject('value was undefined');
  };

  LibraryItem.prototype.validate = function (err = '') {
    if (this.type.validator && !this.type.validator.call(this)) err = this.errorMessage;
    else if (this.type.nin !== 0 && !this.in.size) err = 'input needed';
    else if (this.type.nout !== 0 && !this.out.size) err = 'output needed';

    if (!err) this.node.classList.add('success');
    else {
      this.node.classList.remove('success');
      this.node.$('.item-info').title = err;
      this.errorMessage = err;
    }

    return !err;
  };

  Evented(wp.LibraryItem);

  // library item type
  var LibraryType = wp.LibraryType = function LibraryType({ listNode, name, displayName, nin, nout, nosave,
    builder, constructor, initialize, destroyer, execute, validator, defaultValue }) {
    this.name = name;
    this.displayName = displayName;
    this.nin = typeof nin === 'number' ? nin : -1;
    this.nout = typeof nout === 'number' ? nout : -1;
    this.nosave = !!nosave;
    this.builder = builder;
    this.constructor = constructor;
    this.initialize = initialize;
    this.destroyer = destroyer;
    this.execute = execute;
    this.validator = validator;
    this.defaultValue = defaultValue;

    listNode.grab(
      new Element('p', {
        class: 'collection-item item-name-line item-name',
        text: displayName,
        draggable: true,
        events: {
          dragstart: function dragstart(ev) {
            ev.dataTransfer.setData('application/x-wp-library-item', name);
          }
        }
      })
    );
  };

})(this);
