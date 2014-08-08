(exports => {
  "use strict";

  var Process = wp.Process = new wp.WPObjType({
    name: 'Process',
    defaultItemName: 'My process',
    listNode: $('#process-list'),

    constructor: function Process_constructor() {
      this.items = new Map();
      this.autoexec = true;

      this.conf = new Map([
        ['name', 'text'],
        ['autoexec', 'bool']
      ]);

      this.addItem = function Process_addItem(item) {
        var node = item.buildNode();
        this.workspace.grab(node);

        item.process = this;
        if (wp.initialized) item.initialize();
        this.items.set(item.uuid, item);

        this.save();

        return item;
      };

      this.removeItem = function Process_removeItem(item) {
        item.destroy();
        this.items.delete(item.uuid);
        this.save();
        this.canvas.update();
      };

      this.loadItems = function Process_loadItems(items) {
        var links = {}, bindings = {}, item, uuid, out, couple;


        for (item of items) {
          links[item.uuid] = item.out;
          bindings[item.uuid] = item.bindings;
          this.addItem(new wp.LibraryItem({ _uuid: item.uuid, type: wp.LibraryType[item.type], params: item.params }))
              .node.setLeft(item.left).setTop(item.top);
        }



        for ([uuid, item] of this.items) {
          for (out of links[uuid]) {
            couple = bindings[out].find(couple => couple[0] === uuid);
            item.link(this.items.get(out), couple ? couple[1] : couple);
          }
        }
      };

      this.initialize = function () {
        this.items.forEach(item => item.initialize());
      };

      this.execute = function (manual) {
        this.getDownstreams().forEach(downstream => downstream.update(manual));
      };

      this.getDownstreams = function () {
        return new Set(Array.from(this.items.values()).reduce((a, b) => {
          return a.concat(b.out.size > 0 ? Array.from(b.getUniqueDownstreams()) : b);
        }, []));
      };

      this.addEventListener('autoexec:changed', process => {
        if (process.autoexec) this.execute();
      });
    },

    serializer: function Process_serializer() {
      return {
        autoexec: this.autoexec,
        items: Array.from(this.items.values()).map(item => item.serialize())
      }
    },

    loader: function Process_loader(data) {
      this.autoexec = data.autoexec;
      this.loadItems(data.items);
    },

    destroyer: function Process_destroyer() {
      this.items.forEach(item => item.destroy());
    },

    contentBuilder: function (node) {
      var self = this;

      function dragenter(ev) {
        if (ev.dataTransfer.types.contains('application/x-wp-library-item')) {
          ev.preventDefault();
        }
      }

      function dragover(ev) {
        if (ev.dataTransfer.types.contains('application/x-wp-library-item')) {
          ev.preventDefault();
        }
      }

      function drop(ev) {
        var item = new wp.LibraryItem({
          type: wp.LibraryType[ev.dataTransfer.getData('application/x-wp-library-item')]
        });
        var pos = self.workspace.getBoundingClientRect();

        var node = self.addItem(item).node;
        node.setLeft(Math.trunc((ev.clientX - pos.left - node.clientWidth / 2) / pos.width * 100))
            .setTop(Math.trunc((ev.clientY - pos.top - node.$('h4').offsetHeight / 2) / pos.height * 100));

        self.save();
        node.wpobj.update();
      }

      function mousedown(ev) {
        if (c_conf.hoverLink) {
          if (ev.altKey) {
            c_conf.hoverLink.destroy();
            c_update();
          } else {
            c_conf.hoverLink.showInfoPanel(c_conf.cursor.x, c_conf.cursor.y);
          }
        }
      }

      function mouse_update(ev) {
        var pos = canvas.getBoundingClientRect();

        c_conf.cursor.x = Math.round(ev.clientX - pos.x);
        c_conf.cursor.y = Math.round(ev.clientY - pos.y);
        c_conf.cursor.ev = ev;
      }

      function mouseenter(ev) {
        document.addEventListener('keydown', keydown);
        document.addEventListener('keyup', keyup);
        c_conf.cursor.in = true;
        mouse_update(ev);
        c_update(ev);
        if (c_conf.linkFrom) linkingOn();
        else if (ev.shiftKey) linkModeOn();
      }

      function mousemove(ev) {
        c_conf.cursor.in = true;
        mouse_update(ev);
        c_update(ev);
      }

      function mouseleave(ev) {
        document.removeEventListener('keydown', keydown);
        document.removeEventListener('keyup', keyup);
        c_conf.cursor.in = false;
        c_update();
        linkModeOff();
      }

      function keydown(ev) {
        if (c_conf.cursor.ev.altKey !== ev.altKey && c_conf.hoverLink) {
          c_conf.cursor.ev = ev;
          c_update(ev);
        } else if (c_conf.cursor.ev.shiftKey !== ev.shiftKey) {
          c_conf.cursor.ev = ev;
          linkModeOn();
        }
      }

      function keyup(ev) {
        if (c_conf.cursor.ev.altKey !== ev.altKey && c_conf.hoverLink) {
          c_conf.cursor.ev = ev;
          c_update(ev);
        } else if (c_conf.cursor.ev.shiftKey !== ev.shiftKey) {
          c_conf.cursor.ev = ev;
          linkModeOff();
        }
      }

      function linkModeOn() {
        self.items.forEach(item => {
          if (!item.canEmitLink()) item.node.classList.add('fade');
          else item.node.classList.remove('fade');
        });
      }

      function linkModeOff() {
        if (!c_conf.linkFrom) {
          self.items.forEach(item => {
            item.node.classList.remove('fade');
          });
        }
      }

      function linkingOn() {
        self.items.forEach(item => {
          if (item === c_conf.linkFrom) {}
          else if (item.canAcceptLink(c_conf.linkFrom) || item.canAcceptBinding(c_conf.linkFrom)) {
            item.node.classList.remove('fade');
          } else {
            item.node.classList.add('fade');
          }
        });
      }

      function linkingOff() {
        if (c_conf.cursor.in && c_conf.cursor.ev.shiftKey) linkModeOn();
        else linkModeOff();
      }

      var c_conf = this.c_conf = {
        cursor: {
          in: false
        }
      };

      function c_update(ev) {
        c_clear();
        if (c_conf.cursor.in && c_conf.linkFrom) c_drawNewLink(ev);
        self.items.forEach(item => item.out.forEach(link => link.draw(ctx, c_conf)));
      }

      function c_clear() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      function c_startLink(ev) {
        document.addEventListener('mouseup', c_stopLink);

        c_conf.linkFrom = ev.target.getParent('.content-item', true).wpobj;
        linkingOn();
      }

      function c_stopLink(ev) {
        document.removeEventListener('mouseup', c_stopLink);

        var start = c_conf.linkFrom, target = c_conf.hover;
        if (target && target !== start && (target.canAcceptLink(start) || target.canAcceptBinding(start))) {
          start.link(target);
        }

        delete c_conf.linkFrom;
        linkingOff();
        c_update();
      }

      function c_drawNewLink(ev) {
        var target = c_conf.hover;

        // sometimes a bug where target.wpobj is not defined ?
        if (!target || target === c_conf.linkFrom || !(target.canAcceptLink(c_conf.linkFrom) || target.canAcceptBinding(c_conf.linkFrom))) {
          var pos = canvas.getBoundingClientRect();
          target = {
            node: {
              offsetLeft: ev.clientX - pos.left,
              offsetTop: ev.clientY - pos.top,
              offsetWidth: 0,
              offsetHeight: 0
            }
          };
        }

        wp.Link.draw.call({ source: c_conf.linkFrom, target: target }, ctx, c_conf);
      }

      this.workspace.addEvents({
        mousedown: mousedown,
        mouseenter: mouseenter,
        mousemove: mousemove,
        mouseleave: mouseleave,
        dragenter: dragenter,
        dragover: dragover,
        drop: drop
      });

      var canvas = this.canvas = new Element('canvas', {
        class: 'content-canvas'
      });
      var ctx = canvas.getContext('2d');
      canvas.startLink = c_startLink;
      canvas.stopLink = c_stopLink;
      canvas.update = c_update;

      var wrapper = new Element('div', { class: 'content-wrapper' });
      var observer = new MutationObserver(function (mutations) {
        for (var record of mutations) {
          if (Array.from(record.addedNodes).contains(self.workspace)) {
            window.requestAnimationFrame(function () {
              canvas.width = self.workspace.offsetWidth;
              canvas.height = self.workspace.offsetHeight;
              c_update();
            });

            observer.disconnect();
          }
        }
      });
      observer.observe(wrapper, { childList: true });

      window.addEventListener('resize', function () {
        window.requestAnimationFrame(function () {
          Array.from(self.overlay.children).forEach(panel => panel.wpobj.hideInfoPanel());
          canvas.width = self.workspace.offsetWidth;
          canvas.height = self.workspace.offsetHeight;
          canvas.update();
        });
      });

      node.grab(
        wrapper.adopt(
          this.workspace,
          canvas,
          (this.overlay = new Element('div', { class: 'content-overlay' }))
        )
      );

      return node;
    }
  });

  wp.Process.initAll = function () {
    this.items.forEach(item => item.initialize());
  };

  wp.Process.executeAll = function () {
    this.items.forEach(item => item.execute(true));
  };

})(this);
