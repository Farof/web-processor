(exports => {
  "use strict";

  // library items
  var LibraryItem = wp.LibraryItem = function ({ _uuid, type, value }) {
    this.uuid = _uuid || uuid();
    this.type = type;
    this.in = [];
    this.out = [];
    this.value = value || '';
  };

  LibraryItem.prototype.serialize = function () {
    return {
      uuid: this.uuid,
      type: this.type.name,
      // in: this.in.map(i => i.uuid),
      out: this.out.map(o => o.uuid),
      left: parseInt(this.node.style.left, 10),
      top: parseInt(this.node.style.top, 10),
      value: this.value
    };
  };

  LibraryItem.prototype.buildNode = function () {
    var startX, startY, left, top;

    function dragstart(ev) {
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
      wp.Process.save();
    }

    function mousedown(ev) {
      if (ev.altKey) {
        node.wpobj.process.removeItem(node.wpobj);
      } else if (ev.shiftKey && node.wpobj.type.nout !== 0) {
        ev.stop();
        node.wpobj.process.canvas.startLink(ev);
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
        mouseenter: function () { node.wpobj.process.c_conf.hover = node; },
        mouseleave: function () { node.wpobj.process.c_conf.hover = null; }
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
        this.type.build.call(this, this.value)
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
    this.out.include(item);
    item.in.include(this);
    wp.Process.save();
  };

  LibraryItem.prototype.destroy = function () {
    this.in.forEach(i => i.out.remove(this));
    this.out.forEach(o => o.in.remove(this));
    delete this.process;
    delete this.type;
    delete this.node.wpobj;
    this.node.unload();
  };

  // library item type
  var LibraryType = wp.LibraryType = function LibraryType({ listNode, name, displayName, nin, nout, build }) {
    this.name = name;
    this.displayName = displayName;
    this.nin = nin;
    this.nout = nout;
    this.build = build;

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

    build: function (value) {
      var self = this;
      return new Element('input', {
        type: 'text',
        value: value,
        events: {
          input: function () {
            self.value = this.value;
            wp.Process.save();
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

    build: function (value) {
      var self = this;
      console.log('value', value);
      var options = [new Element('option', {
        value: '<none>',
        text: '<none>'
      })].concat(wp.View.items.map(view => {
        return new Element('option', {
          value: view.uuid,
          text: view.name
        })
      }));

      var node = new Element('select', {
        name: 'select',
        events: {
          change: function (ev) {
            self.value = this.value;
            wp.Process.save();
          }
        }
      }).adopt(...options);
      
      options.match(opt => {
        console.log(opt, opt.getAttribute('value') === value);
        return opt.getAttribute('value') === value;
      });
      node.selectedIndex = options.indexOf(options.match(opt => opt.getAttribute('value') === value));
      
      return node
    }
  });

})(this);
