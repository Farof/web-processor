(exports => {
  "use strict";

  var Process = wp.Process = new wp.WPObjType({
    name: 'Process',
    defaultItemName: 'My process',
    listNode: $('#process-list'),

    constructor: function Process_constructor() {
      this.items = new Map();
      this.autoexec = true;

      this.addItem = function Process_addItem(item) {
        var node = item.buildNode();
        this.workspace.grab(node);

        item.process = this;
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
        var co = {};

        for (var item of items) {
          co[item.uuid] = item.out;
          this.addItem(new wp.LibraryItem({ _uuid: item.uuid, type: wp.LibraryType[item.type], value: item.value }))
              .node.setLeft(item.left).setTop(item.top);
        }

        for (var [uuid, item] of this.items) {
          for (var out of (co[uuid] || [])) {
            item.linkTo(this.items.get(out));
          }
        }

        this.update();
      };

      this.update = function () {
        for (var [uuid, item] of this.items) {
          item.update();
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
        var pos = self.workspace.getBoundingClientRect();

        var node = self.addItem(item).node;
        node.setLeft(Math.trunc((ev.clientX - pos.left - node.clientWidth / 2) / pos.width * 100))
            .setTop(Math.trunc((ev.clientY - pos.top - node.$('h4').offsetHeight / 2) / pos.height * 100));

        self.save();
        var item = node.wpobj;
        if (item.type.name === 'ProcessConf') item.update();
      }

      function mousedown(ev) {
        if (ev.altKey && c_conf.hoverLink) {
          c_conf.hoverLink.source.wpobj.removeLinkTo(c_conf.hoverLink.target.wpobj);
          c_update();
        }
      }

      function mousemove(ev) {
        var pos = canvas.getBoundingClientRect();

        c_conf.cursor.in = true;
        c_conf.cursor.x = Math.round(ev.clientX - pos.x);
        c_conf.cursor.y = Math.round(ev.clientY - pos.y);

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
        // if (c_conf.cursor.in) c_cursor();
        if (c_conf.linkFrom) c_drawNewLink(ev);
        c_drawLinks(ev);
      }

      function c_clear() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
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
        if (target && target !== start && target.wpobj.type.nin !== 0) {
          start.wpobj.linkTo(target.wpobj);
        }

        delete c_conf.linkFrom;

        c_update();
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

      function c_applyConf(conf) {
        for (var key in conf) {
          ctx[key] = conf[key];
        }
      }

      function c_pointInPath() {
        return c_conf.cursor.in && ctx.isPointInStroke(c_conf.cursor.x, c_conf.cursor.y);
      }

      function c_drawCircle(x, y, r, conf, stroke, fill) {
        c_applyConf(conf);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI, false);
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
        ctx.closePath();

        return c_pointInPath();
      }

      function c_drawLine(x, y, xx, yy, conf, stroke, fill) {
        c_applyConf(conf);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(xx, yy);
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
        ctx.closePath();

        return c_pointInPath();
      }

      function c_cursor() {
        c_drawCircle(c_conf.cursor.x, c_conf.cursor.y, 5, {
          strokeStyle: 'grey',
          lineWidth: 1
        }, true);
      }

      function c_link(x, y, xx, yy, a) {
        var hover;

        hover = c_drawCircle(x, y, 4, {
          strokeStyle: 'black',
          fillStyle: 'black'
        }, true, true) || hover;

        hover = c_drawLine(x, y, xx, yy, {
          lineWidth: 3
        }, true, true) || hover;

        return hover;
      }

      function c_drawLink(source, target, ev) {
        var { a, dir, x, y, xx, yy } = c_getLinkInfo(
          source.offsetTop, source.offsetLeft + source.offsetWidth,
          source.offsetTop + source.offsetHeight, source.offsetLeft,
          target.offsetTop, target.offsetLeft + target.offsetWidth,
          target.offsetTop + target.offsetHeight, target.offsetLeft
        );

        // if hover link, set variables and redraw with blur
        if (c_link(x, y, xx, yy, a) && !c_conf.linkFrom) {
          var { shadowBlur, shadowColor } = ctx;
          c_conf.hoverLink = { source: source, target: target };

          c_applyConf({ shadowBlur: 3, shadowColor: 'red' });
          c_link(x, y, xx, yy, a);
          c_applyConf({ shadowBlur: shadowBlur, shadowColor: shadowColor });
        } else if (c_conf.hoverLink && c_conf.hoverLink.source === source && c_conf.hoverLink.target === target) {
          delete c_conf.hoverLink;
        }
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

        c_drawLink(c_conf.linkFrom, target, ev);
      }

      function c_drawLinks(ev) {
        for (var [uuid, item] of self.items) {
          for (var out of item.out) {
            c_drawLink(item.node, out.node, ev);
          }
        }
      }

      this.workspace.addEvents({
        mousedown: mousedown,
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
          canvas.width = self.workspace.offsetWidth;
          canvas.height = self.workspace.offsetHeight;
        });
      });

      node.grab(
        wrapper.adopt(
          self.workspace,
          canvas
        )
      );

      return node;
    }
  });

})(this);
