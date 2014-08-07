(exports => {
  "use strict";

  var WPObjType = wp.WPObjType = function ({ name, defaultItemName, listNode,
    constructor, serializer, loader, contentBuilder }) {
    this.name = name;
    this.items = new Map();
    this.defaultItemName = defaultItemName;
    this.listNode = listNode;
    this.constructor = constructor;
    this.serializer = serializer;
    this.loader = loader;
    this.contentBuilder = contentBuilder;
  };

  WPObjType.prototype.save = function () {
    if (!wp.initialized) return;
    localStorage['wp-type-' + this.name] = JSON.stringify(Array.from(this.items.values()).map(item => item.uuid));
  };

  WPObjType.prototype.loadAll = function () {
    var data = localStorage['wp-type-' + this.name];
    if (data) {
      try {
        data = JSON.parse(data);
      } catch (err) {
        console.log(err);
        console.log(data);
      }
    }

    if (data) {
      for (var uuid of data) {
        this.load(uuid);
      }
    }
  };

  WPObjType.prototype.load = function (uuid) {
    var data = localStorage['wp-obj-' + uuid];
    if (data) {
      try {
        data = JSON.parse(data);
      } catch (err) {
        console.log(err);
        console.log(data);
      }
    }

    if (data) {
      var item = wp[data.type].new({ _uuid: data.uuid, name: data.name });
      if (data.visible) {
        item.show();
        if (data.minimized) item.minimize();
      };
      if (item.type.loader) item.type.loader.call(item, data);
    }
  };

  WPObjType.prototype.new = function ({ _uuid, name }) {
    var item = new WPObj({ _uuid: _uuid, type: this, name: name || this.defaultItemName });

    this.listNode.grab(item.buildObjNode());
    if (name) item.initialized = true;
    else item.objNode.edit();

    return item;
  };

  var WPObj = wp.WPObj = function ({ _uuid, type, name }) {
    this.uuid = _uuid || uuid();
    this.type = type;
    this.name = name;
    this.initialized = false;

    if (type.constructor) type.constructor.call(this);

    this.type.items.set(this.uuid, this);
    this.buildContentNode();
    this.type.save();
    this.save();
    wp.dispatchEvent(this.type.name + ':new', this);
  }

  WPObj.prototype.destroy = function () {
    wp.dispatchEvent(this.type.name + ':destroy', this);
    this.removeEventListener('name:changed');

    if (this.objNode) this.objNode.unload();
    if (this.contentNode) this.contentNode.unload();
    if (this.type.destroyer) this.type.destroyer.call(this);

    delete localStorage['wp-obj-' + this.uuid];
    this.type.items.delete(this.uuid);
    this.type.save();
  };

  WPObj.prototype.save = function () {
    if (!wp.initialized) return;
    try {
      localStorage['wp-obj-' + this.uuid] = JSON.stringify(this.serialize());
    } catch (err) {
      console.log('failed to save ' + this.name + ' -- ' + this.uuid);
      console.log(err);
      console.log(this.serialize());
    }
  };

  WPObj.prototype.serialize = function () {
    var data = Object.merge({
      uuid: this.uuid,
      type: this.type.name,
      name: this.name,
      visible: Array.from($('#content-list').children).findIndex(child => child.wpobj.uuid === this.uuid) > -1,
      minimized: this.contentNode && this.contentNode.classList.contains('minimized')
    }, this.type.serializer ? this.type.serializer.call(this) : {});

    return data;
  };

  WPObj.prototype.buildObjNode = function () {
    var self = this;

    var node = this.objNode = new Element('div', {
      class: 'collection-item',
      properties: { wpobj: this }
    }).adopt(
      new Element('p', { class: 'item-name-line control-container' }).adopt(
        new Element('span', { class: 'item-name', text: this.name, events: {
          click: this.show.bind(this),
          dblclick: edit
        } }),
        new Element('span', { class: 'control-del control', text: '-', events: {
          click: this.destroy.bind(this)
        } })
      ),
      new Element('input', {
        class: 'item-input',
        type: 'text',
        value: this.name,
        events: {
          keydown: function keydown(ev) {
            if (ev.keyCode === 27) { // escape
              if (node.classList.contains('editing')) {
                node.classList.remove('editing');
                if (!self.initialized) self.destroy();
              }
            } else if (ev.keyCode === 13) { // enter
              this.blur()
            }
          },
          blur: function edit_done() {
            if (node.classList.contains('editing')) {
              node.classList.remove('editing');
              self.name = node.$('input').value;
              if (!self.initialized) {
                self.initialized = true;
                self.show();
              }
              self.save();
              self.dispatchEvent('name:changed', self);
            }
          }
        }
      })
    );

    function edit(ev) {
      if (ev) ev.stop();
      if (!node.classList.contains('editing')) {
        // be sure to reset the input value if last change was canceled
        node.$('input').value = node.wpobj.name;
        node.classList.add('editing');
        node.$('input').focus();
      }
    }

    this.addEventListener('name:changed', obj => {
      node.$('.item-name').textContent = obj.name;
    });

    node.edit = edit;

    return node;
  };

  WPObj.prototype.show = function () {
    $('#content-list').grab(this.contentNode || this.buildContentNode());
    this.contentNode.classList.remove('minimized');
    this.save();
  };

  WPObj.prototype.minimize = function () {
    if (this.contentNode) {
      this.contentNode.classList.add('minimized');
      this.save();
    }
  };

  WPObj.prototype.close = function () {
    if (this.contentNode && this.contentNode.parentNode) {
      this.contentNode.unload();
      this.save();
    }
  };

  WPObj.prototype.buildContentNode = function () {
    var self = this;
    var node = this.contentNode = new Element('div', {
      class: this.type.name + '-content content'
    }).adopt(
      new Element('h3', {
        class: 'control-container'
      }).adopt(
        new Element('span', { class: 'item-name', text: this.name }),
        new Element('span', { class: 'control control-min', text: '-', events: {
          click: function min() {
            node.classList.add('minimized');
            self.save();
          }
        } }),
        new Element('span', { class: 'control control-show', text: '+', events: {
          click: function show() {
            node.classList.remove('minimized');
            self.save();
          }
        } }),
        new Element('span', { class: 'control control-close', text: 'x', events: {
          click: this.close.bind(this)
        } })
      ),

      new Element('div', {
        class: 'content-workspace'
      })
    );

    this.addEventListener('name:changed', obj => {
      node.$('.item-name').textContent = obj.name;
    });

    this.workspace = node.$('.content-workspace');
    if (this.type.contentBuilder) node = this.type.contentBuilder.call(this, node);

    node.wpobj = this;

    return node;
  };
  
  Evented(WPObj);

})(this);
