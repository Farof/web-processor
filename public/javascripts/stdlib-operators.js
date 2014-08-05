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
    nosave: true,

    execute: function (values) {
      return new Promise(resolve => {
        resolve(Array.from(values).flatten().map(value => String(value.toLowerCase())));
      });
    }
  });

  wp.LibraryType.UpperCaseOperator = new wp.LibraryType({
    listNode: node,
    name: 'UpperCaseOperator',
    displayName: 'UpperCase',
    nosave: true,

    execute: function (values) {
      return new Promise(resolve => {
        resolve(Array.from(values).flatten().map(value => String(value).toUpperCase()));
      });
    }
  });

  wp.LibraryType.OrderOperator = new wp.LibraryType({
    listNode: node,
    name: 'OrderOperator',
    displayName: 'Order',
    nosave: true,

    execute: function (values) {
      return new Promise(resolve => {
        resolve(Array.from(values).flatten().sort((a, b) => {
          return a.toLowerCase() > b.toLowerCase();
        }));
      });
    }
  });

  wp.LibraryType.RequestXML = new wp.LibraryType({
    listNode: node,
    name: 'RequestXML',
    displayName: 'Request XML',
    nin: 1,
    nosave: true,

    constructor: function () {
      this.requests = new Map();
    },

    execute: function (values) {
      return Promise.all(Array.from(values).flatten().map(url => {
        return new Promise((resolve, reject) => {
          var previous = this.requests.get(url);
          // handle redirect
          console.log('request: ', url);

          if (previous) {
            previous.abort();
          }

          var { xhr, promise } = XHR.getXML(wp.proxyURL + url);
          this.requests.set(url, xhr);

          promise.then(xml => {
            var err;
            this.requests.delete(url);

            if (xhr.status < 200 || xhr.status >= 300) err = xhr.status + ' ' + xhr.statusText;
            else if (!xml) err = 'not an xml';
            else if (xml.querySelector('parsererror')) err = 'Parser Error';

            if (err) {
              err += '\n\n' + xhr.responseText;
              this.validate(err);
              reject(err);
            } else {
              resolve(xml);
            }
          }, err => {
            this.requests.delete(url);
            this.validate('error during request of: ' + url);
            reject(err);
          });
        });
      }));
    }
  });

  wp.LibraryType.parseRSS = new wp.LibraryType({
    listNode: node,
    name: 'parseRSS',
    displayName: 'Parse RSS',
    nin: 1,
    nosave: true,

    execute: function (values) {
      return new Promise((resolve, reject) => {
        resolve(Array.from(values).flatten().map(xml => {
          if (xml instanceof XMLDocument) {
            return {
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
          } else {
            this.validate('input is not an XML');
            reject('not an XMLDocument', xml);
          }
        }));
      });
    }
  });

  wp.LibraryType.RSStoHTML = new wp.LibraryType({
    listNode: node,
    name: 'RSStoHTML',
    displayName: 'RSS to HTML',
    nin: 1,
    nosave: true,

    execute: function (values) {
      return new Promise((resolve, reject) => {
        resolve(Array.from(values).flatten().map(feed => {
          var str = '';
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
            return str;
          } else {
            this.validate('input is not RSS data');
            reject('not a rss feed');
          }
        }));
      });
    }
  });

})(this);
