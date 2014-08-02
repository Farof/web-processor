(exports => {
  "use strict";

  // library items
  var LibraryItem = wp.LibraryItem = function ({ _uuid, type, value }) {
    this.uuid = _uuid || uuid();
    this.type = type;
    this.in = new Set();
    this.out = new Set();
    this.value = value || this.type.defaultValue;

    if (this.type.constructor) this.type.constructor.call(this);
  };

  LibraryItem.prototype.serialize = function () {
    return {
      uuid: this.uuid,
      type: this.type.name,
      // in: Array.from(this.in).map(i => i.uuid),
      out: Array.from(this.out).map(o => o.uuid),
      left: parseInt(this.node.style.left, 10),
      top: parseInt(this.node.style.top, 10),
      value: this.value
    };
  };

  LibraryItem.prototype.buildNode = function () {
    var startX, startY, left, top, self = this;

    function dragstart(ev) {
      if (ev.shiftKey) return;
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

    var node = this.node = new Element('div', {
      class: 'content-item',
      style: {
        left: left + 'px',
        top: top + 'px'
      },
      events: {
        mousedown: mousedown,
        mouseenter: function () { self.process.c_conf.hover = node; },
        mouseleave: function () { self.process.c_conf.hover = null; }
      }
    }).adopt(
      new Element('h4', {
        text: this.type.displayName,
        events: {
          mousedown: dragstart
        }
      }),

      new Element('div', {
        class: 'content-item-data'
      }).adopt(
        this.type.builder.call(this)
      )
    );

    node.setLeft = function (left) {
      var w = node.parentNode.clientWidth;
      this.style.left = Math.min(Math.max(left, 0), (w - node.clientWidth) / w * 100) + '%';
    };

    node.setTop = function (top) {
      var h = node.parentNode.clientHeight;
      this.style.top = Math.min(Math.max(top, 0), (h - node.offsetHeight) / h * 100) + '%';
    };

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

  LibraryItem.prototype.update = function () {
    if (this.type.updater) this.type.updater.call(this);
    this.validate();
    for (var out of this.out) out.update();
  };

  LibraryItem.prototype.validate = function () {
    var success = true;

    if (this.type.nin !== 0 && !this.in.size) success = false;
    else if (this.type.nout !== 0 && !this.out.size) success = false;
    else if (this.type.validator && !this.type.validator.call(this)) success = false;

    if (success) this.node.classList.add('success');
    else this.node.classList.remove('success');
  };

  // library item type
  var LibraryType = wp.LibraryType = function LibraryType({ listNode, name, displayName, nin, nout,
    builder, constructor, destroyer, updater, validator, defaultValue }) {
    this.name = name;
    this.displayName = displayName;
    this.nin = nin;
    this.nout = nout;
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

  var TextInput = LibraryType.TextInput = new LibraryType({
    listNode: $('#library-inputs'),
    name: 'TextInput',
    displayName: 'Text',
    nin: 0,
    nout: -1,
    defaultValue: '',

    builder: function () {
      var self = this;
      return new Element('input', {
        type: 'text',
        value: this.value,
        events: {
          input: function () {
            self.value = this.value;
            self.update();
            self.process.save();
          }
        }
      })
    }
  });

  var ViewOutput = LibraryType.ViewOutput = new LibraryType({
    listNode: $('#library-outputs'),
    name: 'ViewOutput',
    displayName: 'View',
    nin: -1,
    nout: 0,
    defaultValue: '<none>',

    constructor: function () {
      this.viewAdded = function (view) {
        this.addOption(this.node.$('select'), view);
      }.bind(this);

      this.viewRemoved = function (view) {
        for (var opt of this.node.$('select').children) {
          if (opt.value === view.uuid) {
            opt.unload();
            break;
          }
        }
      }.bind(this);

      this.addOption = function (select, view) {
        var opt = new Element('option', {
          value: view.uuid,
          text: view.name
        });

        wp.addEventListener(view.uuid + ':nameChanged', view => {
          opt.textContent = view.name;
        });

        if (view.uuid === this.value) {
          opt.setAttribute('selected', true);
          this.update();
        }

        select.grab(opt);
      }.bind(this);

      wp.addEventListener('View:new', this.viewAdded);
      wp.addEventListener('View:destroy', this.viewRemoved);
    },

    destroyer: function () {
      wp.removeEventListener('View:new', this.viewAdded);
      wp.removeEventListener('View:destroy', this.viewRemoved);
    },

    builder: function () {
      var self = this;

      var node = new Element('select', {
        name: 'select',
        value: this.value,
        events: {
          change: function (ev) {
            self.value = this.value;
            self.update();
            self.process.save();
          }
        }
      }).grab(new Element('option', {
        value: '<none>',
        text: '<none>'
      }));

      wp.View.items.forEach(view => this.addOption(node, view));

      return node;
    },

    updater: function () {
      var view = wp.View.items.get(this.value);
      if (view) {
        view.workspace.empty();
        for (var i of this.in) {
          view.workspace.grab(new Element('p', { text: i.value }));
        }
      }
    },

    validator: function () {
      return this.value !== this.type.defaultValue;
    }
  });

})(this);
