(exports => {
  "use strict";

  var Obj = function Obj({  listNode, typeName, defaultName,
                            constructor, buildContentNode, serialize }) {
    var Type = function Obj_Type({ _uuid, name, node }) {
      this.uuid = _uuid || uuid();
      this.name = name;
      this.listNode = node;

      if (constructor) constructor.call(this);

      Type.items.include(this);
    };

    Type.items = [];

    Type.save = function save_Type() {
      localStorage['type' + typeName.capitalize()] = JSON.stringify(Type.items.map(item => item.serialize()));
    };

    Type.load = function load_Type() {
      var data = localStorage['type' + typeName.capitalize()];
      if (data) {
        try {
          data = JSON.parse(data);
        } catch (err) {
          console.log(err);
          console.log(data);
        }
      }

      // console.log('load: ', typeName, data);
      if (data) {
        for (var info of data) {
          // console.log('load item', item);

          var item = Type.new({ uuid: info.uuid, name: info.name });

          if (info.visible) {
            item.show();
            if (info.minimized) item.contentNode.wp_min();
          };

          if (info.items) item.loadItems(info.items);
        }
      }
    };

    Type.remove = function rem_Type(item) {
      Type.items.remove(item);
      listNode.removeChild(item.listNode);
      item.contentNode.unload();
      Type.save();
    };

    Type.new = function new_Type({ uuid, name }) {
      var n = name || defaultName;

      function edit() {
        if (!node.classList.contains('editing')) {
          node.classList.add('editing');
          if (node.wpobj) {
            node.querySelector('input').value = node.wpobj.name;
          }
          node.querySelector('input').focus();
        }
      }

      function edit_cancel() {
        if (node.classList.contains('editing')) {
          if (!node.wpobj) {
            // node.unload();
            listNode.removeChild(node);
          } else {
            node.classList.remove('editing');
          }
        }
      }

      function edit_done() {
        if (node.classList.contains('editing')) {
          var name = node.querySelector('input').value;
          if (!node.wpobj) {
            node.wpobj = new Type({ name, node })
            Type.save();
          } else {
            node.wpobj.name = name;
          }
          node.querySelector('.item-name').textContent = name;
          node.classList.remove('editing');
        }
      }

      function keydown(ev) {
        // console.log('keydown: ', ev)
        if (ev.keyCode === 27) edit_cancel()
        else if (ev.keyCode === 13) edit_done()
      }

      function item_del() {
        Type.remove(node.wpobj);
      }

      function show() {
        node.wpobj.show();
      }

      var node = new Element('div', {
        class: 'collection-item'
      }).adopt(
        new Element('p', { class: 'item-name-line control-container' }).adopt(
          new Element('span', { class: 'item-name', text: name, events: {
            click: show,
            dblclick: edit
          } }),
          new Element('span', { class: 'control-del control', text: '-', events: {
            click: item_del
          } })
        ),
        new Element('input', {
          class: 'item-input',
          type: 'text',
          value: n,
          events: {
            keydown: keydown,
            blur: edit_done
          }
        })
      );

      listNode.grab(node);
      if (name) {
        node.wpobj = new Type({ uuid, name, node });
        Type.save();
      } else {
        edit();
      }

      return node.wpobj;
    };

    Type.prototype.serialize = function () {
      var data = {
        uuid: this.uuid,
        name: this.name,
        visible: !![].filter.call($('#content-list').children, child => child === this.contentNode).length,
        minimized: this.contentNode && this.contentNode.classList.contains('minimized')
      };

      if (serialize) {
        var addon = serialize.call(this);
        for (var key in addon) {
          data[key] = addon[key];
        }
      }

      // console.log('serialize: ', data);

      return data;
    };

    Type.prototype.buildContentNode = function Type_buildContentNode() {
      function min() {
        node.classList.add('minimized');
        Type.save();
      }

      function show() {
        node.classList.remove('minimized');
        Type.save();
      }

      var node = new Element('div', {
        class: typeName + '-content content'
      }).adopt(
        new Element('h3', {
          class: 'control-container'
        }).adopt(
          new Element('span', { class: 'item-name', text: this.name }),
          new Element('span', { class: 'control control-min', text: '-', events: {
            click: min
          } }),
          new Element('span', { class: 'control control-show', text: '+', events: {
            click: show
          } }),
          new Element('span', { class: 'control control-close', text: 'x', events: {
            click: this.close.bind(this)
          } })
        ),

        new Element('div', {
          class: 'content-workspace'
        })
      );

      if (buildContentNode) node = buildContentNode.call(this, node);

      node.wp_min = min;
      node.wp_show = show

      this.contentNode = node;
      node.wpobj = this;

      return node;
    };

    Type.prototype.show = function Type_show() {
      $('#content-list').grab(this.contentNode || this.buildContentNode());
      Type.save();
    };

    Type.prototype.close = function Type_close() {
      if (this.contentNode && this.contentNode.parentNode) {
        this.contentNode.unload();
        Type.save();
      }
    }

    return Type;
  };

  // Process
  var Process = wp.Process = new Obj({
    listNode: $('#process-list'),
    typeName: 'process',
    defaultName: 'My process',

    constructor: function () {
      this.items = {};
    },

    buildContentNode: function (node) {
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

        node.wpobj.addItem(
          item,
          (ev.clientX - pos.x - n.clientWidth / 2) / pos.width * 100,
          (ev.clientY - pos.y - n.querySelector('h4').offsetHeight / 2) / pos.height * 100
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
        // console.log('update canvas: ', c_conf);
        c_clear();
        if (c_conf.cursor.in) c_cursor();
        if (c_conf.link) c_drawNewLink();
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
        // console.log('link start: ', ev);
        document.addEventListener('mousemove', c_moveLink);
        document.addEventListener('mouseup', c_stopLink);

        c_conf.link = {
          startNode: ev.target.parentNode,
          startX: c_conf.cursor.x,
          startY: c_conf.cursor.y
        };
      }

      function c_moveLink(ev) {
        // console.log('link move');
      }

      function c_stopLink(ev) {
        document.removeEventListener('mousemove', c_moveLink);
        document.removeEventListener('mouseup', c_stopLink);

        var start = c_conf.link.startNode, target = c_conf.hover;
        if (target && target !== start && target.wpobj.nin !== 0) {
          // faire un lien entre les objets
          start.wpobj.linkTo(target.wpobj);
        }

        delete c_conf.link;
      }
      
      function c_drawLink(x, y, xx, yy) {
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

      function c_drawNewLink() {
        var x, y, xx, yy, dir, target = c_conf.hover,
        cursor = c_conf.cursor, node = c_conf.link.startNode,
        l = node.offsetLeft, r = l + node.offsetWidth,
        t = node.offsetTop, b = t + node.offsetHeight,
        cx = l + node.offsetWidth / 2, cy = t + node.offsetHeight / 2,

        a = Math.atan2(cy - cursor.y, cursor.x - cx),
        qp = Math.PI / 4;

        if (a < qp * 3 && a >= qp) {
          dir = 'up';
          x = cx;
          y = t;
        } else if (a < qp && a >= -qp) {
          dir = 'right';
          x = r;
          y = cy;
        } else if (a < -qp && a >= -qp * 3) {
          dir = 'down';
          x = cx;
          y = b;
        } else {
          dir = 'left';
          x = l;
          y = cy;
        }

        if (target && target !== node && target.wpobj.nin !== 0) {
          if (dir === 'up') {
            xx = target.offsetLeft + target.offsetWidth / 2;
            yy = target.offsetTop + target.offsetHeight;
          } else if (dir === 'right') {
            xx = target.offsetLeft;
            yy = target.offsetTop + target.offsetHeight / 2;
          } else if (dir === 'down') {
            xx = target.offsetLeft + target.offsetWidth / 2;
            yy = target.offsetTop;
          } else {
            xx = target.offsetLeft + target.offsetWidth;
            yy = target.offsetTop + target.offsetHeight / 2;
          }
        } else {
          xx = cursor.x;
          yy = cursor.y;
        }

        c_drawLink(x, y, xx, yy);
      }

      function c_drawLinks() {
        for (var uuid in self.items) {
          var item = self.items[uuid];
          for (var out of item.out) {
            var x, y, xx, yy, dir,
            node = item.node, target = out.node,
            l = node.offsetLeft, r = l + node.offsetWidth,
            t = node.offsetTop, b = t + node.offsetHeight,
            cx = l + node.offsetWidth / 2, cy = t + node.offsetHeight / 2,
            cxx = target.offsetLeft + target.offsetWidth / 2, cyy = target.offsetTop + target.offsetHeight / 2,
            
            a = Math.atan2(cy - cyy, cxx - cx),
            qp = Math.PI / 4;

            if (a < qp * 3 && a >= qp) {
              dir = 'up';
              x = cx;
              y = t;
            } else if (a < qp && a >= -qp) {
              dir = 'right';
              x = r;
              y = cy;
            } else if (a < -qp && a >= -qp * 3) {
              dir = 'down';
              x = cx;
              y = b;
            } else {
              dir = 'left';
              x = l;
              y = cy;
            }

            if (target && target !== node && target.wpobj.nin !== 0) {
              if (dir === 'up') {
                xx = target.offsetLeft + target.offsetWidth / 2;
                yy = target.offsetTop + target.offsetHeight;
              } else if (dir === 'right') {
                xx = target.offsetLeft;
                yy = target.offsetTop + target.offsetHeight / 2;
              } else if (dir === 'down') {
                xx = target.offsetLeft + target.offsetWidth / 2;
                yy = target.offsetTop;
              } else {
                xx = target.offsetLeft + target.offsetWidth;
                yy = target.offsetTop + target.offsetHeight / 2;
              }
            } else {
              xx = cursor.x;
              yy = cursor.y;
            }

            c_drawLink(x, y, xx, yy);
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
      // canvas.update = c_update();

      var wrapper = new Element('div', { class: 'content-wrapper' });
      var observer = new MutationObserver(function (mutations) {
        for (var record of mutations) {
          if ([].contains.call(record.addedNodes, workspace)) {
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
    },

    serialize: function () {
      return {
        items: Object.values(this.items).map(item => item.serialize())
      }
    }
  });

  Process.prototype.addItem = function Process_addItem(item, x, y) {
    var node = item.buildNode();
    this.contentNode.$('.content-workspace').grab(node);

    node.setLeft(x);
    node.setTop(y);

    item.process = this;
    this.items[item.uuid] = item;

    Process.save();
  };

  Process.prototype.removeItem = function Process_removeItem(item) {
    item.destroy();
    delete this.items[item.uuid];
    Process.save();
  };

  Process.prototype.loadItems = function Process_loadItems(items) {
    var co = {};

    for (var item of items) {
      co[item.uuid] = item.out;
      this.addItem(new wp.LibraryItem({ _uuid: item.uuid, type: wp.LibraryType[item.type], value: item.value }), item.left, item.top);
    }

    for (var uuid in this.items) {
      var outs = co[uuid] || [];
      for (var out of outs) {
        this.items[uuid].linkTo(this.items[out]);
      }
    }
  };

  // View
  var View = wp.View = new Obj({
    listNode: $('#view-list'),
    typeName: 'view',
    defaultName: 'My view'
  });

})(this);
