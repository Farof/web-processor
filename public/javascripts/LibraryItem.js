(exports => {
  "use strict";

  // library items
  var LibraryItem = wp.LibraryItem = function ({ _uuid, type, value }) {
    this.uuid = _uuid || uuid();
    this.type = type;
    this.in = new Set();
    this.out = new Set();
    this.value = value || this.type.defaultValue;
    this.initialized = false;

    if (this.type.constructor) this.type.constructor.call(this);

    wp.addEventListener(this.uuid + ':value:changed', newValue => {
      this.oldValue = this.value;
      this.value = newValue;
      this.update();
      this.process.save();
    });
  };

  LibraryItem.prototype.serialize = function () {
    return {
      uuid: this.uuid,
      type: this.type.name,
      // in: Array.from(this.in).map(i => i.uuid),
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
    }

    function dragstop(ev) {
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', dragstop);

      node.setLeft(Math.trunc((left + ev.clientX - startX) / node.parentNode.clientWidth * 100));
      node.setTop(Math.trunc((top + ev.clientY - startY) / node.parentNode.clientHeight * 100));
      self.process.save();
    }

    function mousedown(ev) {
      if (ev.altKey) {
        self.process.removeItem(self);
      } else if (ev.shiftKey && self.type.nout !== 0) {
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
      }
    }).adopt(
      new Element('h4', {
        text: this.type.displayName,
        events: {
          mousedown: dragstart
        }
      }),

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

  LibraryItem.prototype.linkTo = function (item) {
    this.out.add(item);
    item.in.add(this);
    item.update();
    this.validate();
    this.process.save();
  };

  LibraryItem.prototype.removeLinkTo = function (item) {
    this.out.delete(item);
    item.in.delete(this);
    item.update();
    this.validate();
    this.process.save();
  };

  LibraryItem.prototype.destroy = function () {
    this.in.forEach(i => i.out.delete(this));
    this.out.forEach(o => o.in.delete(this));
    if (this.type.destroyer) this.type.destroyer.call(this);
    delete this.process;
    delete this.type;
    delete this.node.wpobj;
    this.node.unload();
  };

  LibraryItem.prototype.update = function (manual) {
    var p;
    if (this.type.updater && (this.process.autoexec || manual)) p = this.type.updater.call(this, manual);

    if (this.validate() && (this.process.autoexec || manual)) {
      if (p) {
        console.log(this.process.autoexec, manual);
        p.then(() => {
          for (var out of this.out) out.update(manual);
        })
      } else {
        for (var out of this.out) out.update(manual);
      }
    }
  };

  LibraryItem.prototype.validate = function () {
    var success = true;

    if (this.type.validator && !this.type.validator.call(this)) success = false;
    else if (this.type.nin !== 0 && !this.in.size) success = false;
    else if (this.type.nout !== 0 && !this.out.size) success = false;

    if (success) this.node.classList.add('success');
    else this.node.classList.remove('success');

    return success;
  };

  // library item type
  var LibraryType = wp.LibraryType = function LibraryType({ listNode, name, displayName, nin, nout, nosave,
    builder, constructor, destroyer, updater, validator, defaultValue }) {
    this.name = name;
    this.displayName = displayName;
    this.nin = typeof nin === 'number' ? nin : -1;
    this.nout = typeof nout === 'number' ? nout : -1;
    this.nosave = !!nosave;
    this.builder = builder;
    this.constructor = constructor;
    this.destroyer = destroyer;
    this.updater = updater;
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
