(exports => {
  "use strict";

  var node = new Element('div', {
    id: 'library-operators',
    class: 'collection-category'
  }).grab(new Element('h3', { text: 'Operators' }));
  $('#library').grab(node);

  wp.LibraryType.LowerCaseOperator = new wp.LibraryType({
    listNode: node,
    name: 'LowerCaseOperator',
    displayName: 'LowerCase',
    defaultValue: '',
    nosave: true,

    updater: function () {
      this.value = [];
      for (var i of this.in) {
        for (var value of Array.from(i.value)) {
          this.value.push(String(value).toLowerCase());
        }
      }
    }
  });

  wp.LibraryType.UpperCaseOperator = new wp.LibraryType({
    listNode: node,
    name: 'UpperCaseOperator',
    displayName: 'UpperCase',
    defaultValue: '',
    nosave: true,

    updater: function () {
      this.value = [];
      for (var i of this.in) {
        for (var value of Array.from(i.value)) {
          this.value.push(String(value).toUpperCase());
        }
      }
    }
  });

  wp.LibraryType.OrderOperator = new wp.LibraryType({
    listNode: node,
    name: 'OrderOperator',
    displayName: 'Order',
    defaultValue: '',

    constructor: function () {
      if (this.value === '') this.value = [];
    },

    updater: function () {
      this.value = Array.from(this.in).reduce((a, b) => a.concat(b.value), []).sort((a, b) => {
        return a.toLowerCase() > b.toLowerCase();
      });
    }
  });

  wp.LibraryType.RequestXML = new wp.LibraryType({
    listNode: node,
    name: 'RequestXML',
    displayName: 'Request XML',
    nin: 1,
    defaultValue: '',
    nosave: true,

    updater: function () {
      // handle 400, 500, 502
      if (this.in.size > 0) {
        var url = this.in.values().next().value.value;
        console.log('request: ', url);

        if (this.request) {
          this.request.abort();
        }

        var { xhr, promise } = XHR.getXML(wp.proxyURL + url);
        this.request = xhr;

        return promise.then(xml => {
          delete this.request;
          wp.dispatchEvent(this.uuid + ':value:changed', xml);
        }, err => {
          delete this.request;
          console.log('handle getXML error: ', err);
        });
      } else {
        this.value = null;
      }
    }
  });

  wp.LibraryType.parseRSS = new wp.LibraryType({
    listNode: node,
    name: 'parseRSS',
    displayName: 'Parse RSS',
    nin: 1,
    nosave: true,
    defaultValue: {},

    updater: function () {
      if (this.in.size > 0) {
        var xml = this.in.values().next().value.value;
        if (xml instanceof XMLDocument) {
          this.value = {
            title: xml.querySelector('channel > title').textContent,
            items: Array.from(xml.querySelectorAll('channel > item')).map(item => {
              return {
                title: item.querySelector('title').textContent,
                link: item.querySelector('link').textContent,
                description: item.querySelector('description').textContent,
                pubDate: new Date(item.querySelector('pubDate').textContent)
              };
            })
          };
        }
      } else {
        this.value = {};
      }
    },

    validator: function () {
      return this.in.size > 0 && (this.in.values().next().value.value instanceof XMLDocument);
    }
  });

  wp.LibraryType.RSStoHTML = new wp.LibraryType({
    listNode: node,
    name: 'RSStoHTML',
    displayName: 'RSS to HTML',
    nin: 1,
    nosave: true,
    defaultValue: '',

    updater: function () {
      if (this.in.size > 0) {
        var feed = this.in.values().next().value.value, str = '';
        if (feed.title) {
          str += '<h3>' + feed.title + '<h4>';
          str += '<div>';
          for (var item of feed.items) {
            str += '<div>';
            str += '<h4><a href="' + item.link + '">' + item.title + '</a></h4>';
            str += item.pubDate.toString().small();
            str += '<div>';
            str += item.description;
            str += '</div>';
            str += '</div>';
          }
          str += '</div>';
          this.value = str;
        }
      } else {
        this.value = '';
      }
    },

    validator: function () {
      var val;
      if (this.in.size > 0) {
        val = this.in.values().next().value.value;
        return val && typeof val === 'object';
      }
    }
  });

})(this);
