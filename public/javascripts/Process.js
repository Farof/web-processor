(exports => {
  "use strict";

  var Process = wp.Process = new wp.WPObjType({
    name: 'Process',
    defaultItemName: 'My process',
    listNode: $('#process-list'),

    constructor: function Process_constructor() {
      this.items = new Map();

      this.addItem = function Process_addItem(item, x, y) {
        var node = item.buildNode();
        this.contentNode.$('.content-workspace').grab(node);

        node.setLeft(x);
        node.setTop(y);

        item.process = this;
        this.items.set(item.uuid, item);

        this.save();
      };

      this.removeItem = function Process_removeItem(item) {
        item.destroy();
        this.items.delete(item.uuid);
        this.save();
        this.canvas.update();
      };

      this.loadItems = function Process_loadItems(items) {
        var co = {};

        for (var item of items) {
          co[item.uuid] = item.out;
          this.addItem(new wp.LibraryItem({ _uuid: item.uuid, type: wp.LibraryType[item.type], value: item.value }), item.left, item.top);
        }

        for (var [uuid, item] of this.items) {
          for (var out of (co[uuid] || [])) {
            item.linkTo(this.items.get(out));
          }
        }
      };
    },

    serializer: function Process_serializer() {
      return {
        items: Array.from(this.items.values()).map(item => item.serialize())
      }
    },

    loader: function Process_loader(data) {
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
        var n = item.buildNode();
        var pos = ev.target.getBoundingClientRect();

        self.addItem(
          item,
          (ev.clientX - pos.x - n.clientWidth / 2) / pos.width * 100,
          (ev.clientY - pos.y - n.$('h4').offsetHeight / 2) / pos.height * 100
        );
      }

      function mousemove(ev) {
        var pos = canvas.getBoundingClientRect();

        c_conf.cursor.in = true;
        c_conf.cursor.x = ev.clientX - pos.x;
        c_conf.cursor.y = ev.clientY - pos.y;

        c_update(ev);
      }

      function mouseleave(ev) {
        c_conf.cursor.in = false;
        c_update();
      }

      var c_conf = this.c_conf = {
        cursor: {
          in: false
        }
      };

      function c_update(ev) {
        c_clear();
        if (c_conf.cursor.in) c_cursor();
        if (c_conf.linkFrom) c_drawNewLink(ev);
        c_drawLinks();
      }

      function c_clear() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      function c_cursor(x, y) {
        ctx.strokeStyle = 'grey';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(c_conf.cursor.x, c_conf.cursor.y, 5, 0, 2 * Math.PI, false);
        ctx.stroke();
      }

      function c_startLink(ev) {
        document.addEventListener('mousemove', c_moveLink);
        document.addEventListener('mouseup', c_stopLink);

        c_conf.linkFrom = ev.target.getParent('.content-item');
      }

      function c_moveLink(ev) {

      }

      function c_stopLink(ev) {
        document.removeEventListener('mousemove', c_moveLink);
        document.removeEventListener('mouseup', c_stopLink);

        var start = c_conf.linkFrom, target = c_conf.hover;
        if (target && target !== start && target.wpobj.nin !== 0) {
          // faire un lien entre les objets
          start.wpobj.linkTo(target.wpobj);
        }

        delete c_conf.linkFrom;
      }

      function c_getLinkInfo(at, ar, ab, al, bt, br, bb, bl) {
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
      }

      function c_drawLink(source, target) {
        var { a, dir, x, y, xx, yy } = c_getLinkInfo(
          source.offsetTop, source.offsetLeft + source.offsetWidth,
          source.offsetTop + source.offsetHeight, source.offsetLeft,
          target.offsetTop, target.offsetLeft + target.offsetWidth,
          target.offsetTop + target.offsetHeight, target.offsetLeft
        );

        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI, false);
        ctx.stroke();
        ctx.fill();

        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(xx, yy);
        ctx.fill();
        ctx.stroke();
      }

      function c_drawNewLink(ev) {
        var target = c_conf.hover;

        if (!target || target === c_conf.linkFrom || target.wpobj.nin === 0) {
          var pos = canvas.getBoundingClientRect();
          target = {
            offsetLeft: ev.clientX - pos.left,
            offsetTop: ev.clientY - pos.top,
            offsetWidth: 0,
            offsetHeight: 0
          };
        }

        c_drawLink(c_conf.linkFrom, target);
      }

      function c_drawLinks() {
        for (var [uuid, item] of self.items) {
          for (var out of item.out) {
            c_drawLink(item.node, out.node);
          }
        }
      }

      var workspace = node.$('.content-workspace');
      workspace.addEvents({
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
      canvas.moveLink = c_moveLink;
      canvas.stopLink = c_stopLink;
      canvas.update = c_update;

      var wrapper = new Element('div', { class: 'content-wrapper' });
      var observer = new MutationObserver(function (mutations) {
        for (var record of mutations) {
          if (Array.from(record.addedNodes).contains(workspace)) {
            window.requestAnimationFrame(function () {
              canvas.width = workspace.offsetWidth;
              canvas.height = workspace.offsetHeight;
              c_update();
            });

            observer.disconnect();
          }
        }
      });
      observer.observe(wrapper, { childList: true });

      window.addEventListener('resize', function () {
        window.requestAnimationFrame(function () {
          canvas.width = workspace.offsetWidth;
          canvas.height = workspace.offsetHeight;
        });
      });

      node.grab(
        wrapper.adopt(
          workspace,
          canvas
        )
      );

      return node;
    }
  });

})(this);
