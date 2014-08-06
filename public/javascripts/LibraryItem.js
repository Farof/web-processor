(exports => {
  "use strict";

  // library items
  var LibraryItem = wp.LibraryItem = function ({ _uuid, type, value, params }) {
    this.uuid = _uuid || uuid();
    this.type = type;
    this.in = new Map();
    this.out = new Map();
    this.value = value || this.type.defaultValue;
    this.params = new Map(params || this.type.params.map(param => [param.name, param.defaultValue]));
    this.initialized = false;

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

  LibraryItem.prototype.setValue = function (newValue) {
    this.oldValue = this.value;
    this.value = newValue;
    this.process.save();
    this.dispatchEvent('value:changed', this.value);
    if (wp.initialized) this.updateDownstreams();
  };

  LibraryItem.prototype.setParam = function (name, value) {
    var old = this.params.get(name);
    this.params.set(name, value);
    this.process.save();
    this.dispatchEvent('param:changed', name, value, old);
    if (wp.initialized) this.updateDownstreams();
  };

  LibraryItem.prototype.serialize = function () {
    return {
      uuid: this.uuid,
      type: this.type.name,
      out: Array.from(this.out.keys()).map(target => target.uuid),
      left: parseInt(this.node.style.left, 10),
      top: parseInt(this.node.style.top, 10),
      value: this.type.nosave ? null : this.value,
      params: Array.from(this.params)
    };
  };

  LibraryItem.prototype.buildNode = function () {
    var startX, startY, left, top, self = this;

    function drag(ev) {
      node.setLeft((left + ev.clientX - startX) / node.parentNode.clientWidth * 100);
      node.setTop((top + ev.clientY - startY) / node.parentNode.clientHeight * 100);
      self.process.canvas.update();
    }

    function dragstop(ev) {
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', dragstop);

      node.setLeft(Math.trunc((left + ev.clientX - startX) / node.parentNode.clientWidth * 100));
      node.setTop(Math.trunc((top + ev.clientY - startY) / node.parentNode.clientHeight * 100));

      self.process.save();
      self.process.canvas.update();
    }

    var node = this.node = new Element('div', {
      class: 'content-item',
      style: {
        left: left + 'px',
        top: top + 'px'
      },
      events: {
        mousedown: function (ev) {
          if (ev.altKey) {
            self.process.removeItem(self);
          } else if (ev.shiftKey && self.canEmitLink()) {
            ev.stop();
            self.process.canvas.startLink(ev);
          }
        },
        mouseenter: function () {
          self.process.c_conf.hover = self;
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
          mousedown: function (ev) {
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
        }
      }).grab(
        new Element('span', {
          class: 'item-info',
          text: '\uFE0F\u26A0',
          title: 'something is wrong'
        })
      ),

      (this.dataNode = new Element('div', {
        class: 'content-item-data'
      }))
    );

    if (this.type.params) {
      this.type.params.forEach(param => {
        var builder = LibraryItem.param.get(param.type);
        if (builder) {
          builder.call(this, param);
        }
      });
    }

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

    node.wpobj = this;

    return node;
  };

  LibraryItem.prototype.destroy = function () {
    this.destroying = true;
    this.dispatchEvent('destroy', this);

    this.out.forEach(link => link.destroy());
    this.in.forEach(link => link.destroy());

    this.removeEventListener('param:changed');
    this.removeEventListener('link');
    this.removeEventListener('unlink');
    this.removeEventListener('linked');
    this.removeEventListener('unlinked');
    this.removeEventListener('upstream:error');
    this.removeEventListener('destroy');

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
    return (this.type.nin === -1 && !new Set(this.in.keys()).has(source)) || (this.type.nin === 1 && this.in.size < 1);
  };

  LibraryItem.prototype.link = function (target) {
    return new wp.Link(this, target);
  };

  LibraryItem.prototype.getUniqueDownstreams = function () {
    return new Set(Array.from(Array.from(this.out.keys()).map(target => {
      return target.out.size ? target.getUniqueDownstreams() : target;
    }))).flatten2();
  };

  LibraryItem.prototype.getAllUpdates = function (sources, manual) {
    return Array.from(sources).reduce((a, b) => a.concat(b.update(manual)), [])
  };

  LibraryItem.prototype.updateDownstreams = function () {
    if (this.out.size) {
      return Promise.all(this.getAllUpdates(this.getUniqueDownstreams()));
    } else {
      return this.update();
    }
  };

  LibraryItem.prototype.update = function (manual) {
    var p = this.updateInProgress || (this.updateInProgress = new Promise((resolve, reject) => {

      if (this.process.autoexec || manual) {
        if (this.validate()) {
          if (this.in.size === 0) {
            this.execute(this.value).then(resolve, reject);
          } else {
            Promise.all(this.getAllUpdates(this.in.keys(), manual)).then(values => {
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
    return (values !== undefined) ? new Promise((resolve, reject) => {
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

  LibraryItem.param = new Map();

  LibraryItem.param.set('select', function (param) {
    function sourceAdd(source) {
      function labelChanged(source) {
        opt.textContent = source[label];
      }

      var opt = new Element('option', {
        value: source[value],
        text: source[label]
      });

      source.addEventListener(label + ':changed', labelChanged);

      self.addEventListener('destroy', item => {
        source.removeEventListener(label + ':changed', labelChanged);
      });

      if (source[value] === self.params.get(param.name)) {
        opt.setAttribute('selected', true);
      }

      node.grab(opt);
    }

    function sourceDel(source) {
      var oldValue = node.value;
      for (var opt of node.children) {
        if (opt.value === source[value]) {
          opt.unload();
          if (node.value !== oldValue) {
            self.setParam(param.name, node.value);
          }
          break;
        }
      }
    }

    var self = this, node = new Element('select', {
      name: param.name,
      events: { change: function () { self.setParam(this.name, this.value); } }
    });

    if (param.values) {
      node.adopt(param.values.map(opt => {
        return new Element('option', {
          value: opt.value,
          text: opt.label,
          // == operator because value is auto-casted into string when saving
          selected: opt.value == this.params.get(param.name)
        })
      }));
    }

    if (param.datasource) {
      var
      emitter = param.datasource.emitter || wp,
      collection = param.datasource.collection || wp[param.datasource.name].items,
      label = param.datasource.label || 'name',
      value = param.datasource.value || 'uuid';

      emitter.addEventListener(param.datasource.name + ':new', sourceAdd);
      emitter.addEventListener(param.datasource.name + ':destroy', sourceDel);

      collection.forEach(sourceAdd);

      this.addEventListener('destroy', item => {
        emitter.removeEventListener(param.datasource.name + ':new', sourceAdd);
        emitter.removeEventListener(param.datasource.name + ':destroy', sourceDel);
      });
    }

    this.dataNode.grab(node);
  });

  Evented(LibraryItem);

  // library item type
  var LibraryType = wp.LibraryType = function LibraryType({ listNode, name, displayName, nin, nout, nosave,
    builder, constructor, initialize, destroyer, execute, validator, defaultValue, params }) {
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
    this.params = params || [];

    listNode.grab(
      new Element('p', {
        class: 'collection-item item-name-line item-name',
        text: displayName,
        draggable: true,
        events: {
          dragstart: function (ev) {
            ev.dataTransfer.setData('application/x-wp-library-item', name);
          }
        }
      })
    );
  };

})(this);
