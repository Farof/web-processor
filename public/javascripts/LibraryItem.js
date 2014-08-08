(exports => {
  "use strict";

  // library items
  var LibraryItem = wp.LibraryItem = function ({ _uuid, type, value, params }) {
    this.uuid = _uuid || wp.uuid();
    if (!isNaN(parseInt(this.uuid, 10))) console.log('invalid uuid', this);
    this.type = type;
    this.in = new Map();
    this.out = new Map();
    this.params = new Map(params || this.type.params.map(param => [param.name || this.type.value, param.defaultValue]));
    this.initialized = false;

    if (this.type.constructor) this.type.constructor.call(this);
    this.hideInfoPanel = this.hideInfoPanel.bind(this);

    wp.dispatchEvent('process-item:new', this);
  };

  LibraryItem.prototype.initialize = function () {
    if (!this.initialized) {
      if (this.type.initialize) this.type.initialize.call(this);
      this.initialized = true;
      this.validate();
    }
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
      params: Array.from(this.params),
      bindings: Array.from(this.in.values()).filter(link => link.bound).map(link => [link.source.uuid, link.bound])
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
      uuid: this.uuid,
      properties: { wpobj: this },
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
        mouseenter: function () { self.process.c_conf.hover = self; },
        mouseleave: function () { self.process.c_conf.hover = null; }
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
      }).adopt(
        new Element('span', {
          class: 'item-options',
          text: '\u2699',
          title: 'options',
          events: {
            click: function () { self.showInfoPanel(); }
          }
        }),
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
          this.dataNode.adopt(builder.call(this, param));
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

    return node;
  };

  LibraryItem.prototype.destroy = function () {
    this.destroying = true;
    this.dispatchEvent('destroy', this);

    this.hideInfoPanel();
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
    return !new Set(this.in.keys()).has(source) && (this.type.nin === -1 ||
    (this.type.nin === 1 && (!this.in.size || Array.from(this.in.values()).every(link => link.bound))));
  };

  LibraryItem.prototype.canAcceptBinding = function (source) {
    return !new Set(this.in.keys()).has(source) && !!this.getNextBindableParam();
  };

  LibraryItem.prototype.getNextBindableParam = function () {
    return this.type.params.find(param => param.bindable && !Array.from(this.in.values).some(link => {
      return link.bound && link.bound === (param.name || type.type.value);
    }));
  };

  LibraryItem.prototype.link = function (target, param) {
    if (!param && target.canAcceptLink(this)) {
      return new wp.Link(this, target);
    }

    param = param || target.getNextBindableParam();
    var link = new wp.Link(this, target);
    link.target.bindParam(typeof param === 'object' ? (param.name || target.type.value) : param, link);
    return link;
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
      return Promise.all(Array.from(this.getUniqueDownstreams()).map(item => item.update()))
    } else {
      return this.update();
    }
  };

  LibraryItem.prototype.update = function (manual) {
    var p = this.updateInProgress || (this.updateInProgress = new Promise((resolve, reject) => {
      if (this.process.autoexec || manual) {
        if (this.validate()) {
          if (this.in.size === 0) {
            this.execute(this.params.get(this.type.value)).then(resolve, reject);
          } else {
            var updates = new Map();
            this.in.forEach(link => {
              updates.set(link, link.source.update(manual));
            });

            Promise.all(Array.from(updates.values())).then(_values => {
              var links = Array.from(updates.keys());
              var bindings = {}, key, value, success = true;
              var values = [];

              // separate bound parameters from data values
              _values.forEach((value, index) => {
                var link = links[index];
                if (link.bound) {
                  bindings[link.bound] = value;
                } else {
                  values.push(value);
                }
              });

              for (key in bindings) {
                success = (bindings[key] = !!this.node.$('[name=' + key + ']').bindParam(bindings[key])) && success;
                if (bindings[key]) {
                  delete bindings[key];
                } else {
                  Array.from(this.in.values()).find(link => link.bound === key).source.validate(
                    'Invalid value for parameter "' + key + '"'
                  )
                }
              }

              if (success) {
                this.execute(values).then(resolve, reject);
              } else {
                this.validate(
                  'Invalid bound parameters: ' + Object.keys(bindings).join(', ')
                );
                this.dispatchEvent('upstream:error');
                reject('invalid bound parameter');
              }
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
      else resolve(values);
    }) : Promise.reject('value was undefined');
  };

  LibraryItem.prototype.validate = function (err = '') {
    if (this.type.validator && !this.type.validator.call(this)) err = this.errorMessage;
    else if (this.type.nin !== 0 && !this.in.size) err = 'input needed';
    else if (this.type.nout !== 0 && !this.out.size) err = 'output needed';

    if (!err) {
      this.node.classList.add('success');
      this.errorMessage = '';
    } else {
      this.node.classList.remove('success');
      this.node.$('.item-info').title = err;
      this.errorMessage = err;
    }

    return !err;
  };

  LibraryItem.prototype.showInfoPanel = function () {
    var
    self = this,
    overlay = this.process.overlay,
    panel = this.buildInfoPanel(),
    previous = overlay.$('.panel');

    if (previous) previous.wpobj.hideInfoPanel();

    overlay.grab(panel);
    panel.style.left = Math.trunc(this.process.c_conf.cursor.x - panel.offsetWidth / 2) + 'px';
    panel.style.top = Math.trunc(this.process.c_conf.cursor.y - 15) + 'px';

    panel.addEventListener('mousemove', function onmove() {
      document.addEventListener('click', self.hideInfoPanel);
      panel.removeEventListener('mousemove', onmove);
    });
  };

  LibraryItem.prototype.hideInfoPanel = function (ev) {
    if (ev && ev.target.getParent('.panel', true)) return;
    if (this.panel) this.panel.unload();
    document.removeEventListener('click', this.hideInfoPanel);
  };

  LibraryItem.prototype.buildInfoPanel = function () {
    if (this.panel) return this.panel;
    var self = this;

    return (this.panel = new Element('div', {
      class: 'item-options panel',
      properties: { wpobj: this }
    }).adopt(
      new Element('div', {
        class: 'panel-actions'
      }).grab(
        new Element('button', {
          class: 'action-delete',
          text: 'delete',
          events: { click: function () { self.process.removeItem(self); } }
        })
      ).adopt(this.type.params.filter(param => param.bindable).map(param => {
        var name = param.name || self.type.value;
        return new Element('p', {
          events: {
            mouseenter: function () {
              var node = self.dataNode.$('[name=' + name + ']');
              if (node) node.classList.add('highlight');
            },
            mouseleave: function () {
              var node = self.dataNode.$('[name=' + name + ']');
              if (node) node.classList.remove('highlight');
            }
          }
        }).adopt(
          new Element('span', { text: param.name.capitalize() + ': ' }),
          (() => {
            function addLink(link) {
              var opt = new Element('option', {
                text: link.source.type.displayName,
                value: link.source.uuid,
                name: link.uuid,
                properties: { wpobj: link },
                selected: link.bound === name,
                events: {
                  mouseenter: function () {
                    self.process.workspace.$('[uuid=' + link.source.uuid + ']').classList.add('highlight');
                  },
                  mouseleave: function () {
                    self.process.workspace.$('[uuid=' + link.source.uuid + ']').classList.remove('highlight');
                  },
                  click: function () {
                    self.bindParam(name, link);
                  }
                }
              });

              map.set(link.source, opt);
              // linkMap.set(link.source.uuid, link);
              select.grab(opt);
            }

            function removeLink(source) {
              map.get(source).unload();
            }

            var map = new WeakMap();
            // var linkMap = new WeakMap();

            var select = new Element('select').grab(
              new Element('option', {
                text: '<none>',
                value: '<none>',
                events: { click: function () {
                  self.bindParam('<none>', Array.from(self.in.values()).find(link => link.bound === name));
                } }
              })
            );

            this.in.forEach(addLink);
            this.addEventListener('linked', addLink);
            this.addEventListener('unlinked', removeLink);

            return select;
          })()
        );
      }))
    ));
  };

  LibraryItem.prototype.bindParam = function (name, link) {
    if (name !== '<none>') {
      // unbind previous binding
      this.in.forEach(link => {
        if (link.bound === name) {
          delete link.bound;
        }
      })
      link.bound = name;
      this.dataNode.$('.param[name=' + name + ']').setAttribute('disabled', true);
    } else {
      // if the binding link can't stay as a value link, destroy it
      this.dataNode.$('.param[name=' + link.bound + ']').removeAttribute('disabled');
      if (link.target.type.nin !== -1 && link.target.in.size > 1) {
        link.destroy();
      } else {
        delete link.bound;
      }
    }
    this.process.save();
    if (wp.initialized) this.updateDownstreams();
    this.process.canvas.update();
  };

  LibraryItem.param = new Map();

  LibraryItem.param.set('text', function (param) {
    var
    self = this,
    name = param.name || this.type.value,
    value = this.params.get(name);

    if (value === undefined) {
      value = param.defaultValue || '';
      this.params.set(name, value);
    }

    return new Element('input', {
      class: 'param',
      name: name,
      type: 'text',
      value: value,
      events: { input: function () { self.setParam(this.name, this.value); } }
    });
  });

  LibraryItem.param.set('list', function (param) {
    function save() {
      self.setParam(name, Array.from(self.dataNode.$$('input')).map(input => input.value));
    }

    function buildInput(value) {
      return new Element('p').adopt(
        new Element('input', {
          type: 'text',
          value: value || '',
          events: {
            input: save
          }
        }),

        new Element('button', {
          text: param.delLabel || 'delete',
          events: {
            click: function () {
              this.parentNode.unload();
              self.process.canvas.update();
              save();
            }
          }
        })
      );
    }

    var
    self = this,
    name = param.name || this.type.value,
    value = this.params.get(name);

    if (!value) {
      value = param.defaultValue || [];
      this.params.set(name, value);
    }

    return [new Element('button', {
      text: param.addLabel || 'add',
      events: {
        click: function () {
          var line = buildInput();
          this.parentNode.grab(line);
          line.$('input').focus();
          self.process.canvas.update();
        }
      }
    })].concat(value.map(buildInput));
  });

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

    var self = this, name = param.name || this.type.value,
    node = new Element('select', {
      class: 'param',
      name: name,
      events: { change: function () { self.setParam(this.name, this.value); } }
    });

    if (param.values) {
      node.adopt(param.values.map(opt => {
        return new Element('option', {
          value: opt.value,
          text: opt.label,
          // == operator because value is auto-casted into string when saving
          selected: opt.value == this.params.get(name)
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

    if (param.bindable) {
      node.bindParam = function (value) {
        var opt = Array.from(node.options).find(n => n.value == value);
        if (opt) {
          node.value = value;
          self.setParam(name, value);
          return true;
        }
        return false;
      };
    }

    return node;
  });

  Evented(LibraryItem);

  // library item type
  var LibraryType = wp.LibraryType = function LibraryType({ listNode, name, displayName, nin, nout,
    builder, constructor, initialize, destroyer, execute, validator, value, params }) {
    this.name = name;
    this.displayName = displayName;
    this.nin = typeof nin === 'number' ? nin : -1;
    this.nout = typeof nout === 'number' ? nout : -1;
    this.builder = builder;
    this.constructor = constructor;
    this.initialize = initialize;
    this.destroyer = destroyer;
    this.execute = execute;
    this.validator = validator;
    this.value = value || 'value';
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
