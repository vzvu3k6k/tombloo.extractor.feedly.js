(function () {

  // Based on LDR extractors
  // in tombfix/xpi/chrome/content/library/extractors.js

  // License: Public Domain

  function expand (baseExtractor) {
    return [
      baseExtractor,
      {
        name : `Quote - ${baseExtractor.name}`,
        ICON : baseExtractor.ICON,
        check(ctx) {
          return ctx.selection && !ctx.onImage && baseExtractor.getItem(ctx);
        },
        extract(ctx) {
          return Extractors.Quote.extract(baseExtractor.overwriteCTX(ctx));
        }
      },

      {
        name : `ReBlog - ${baseExtractor.name}`,
        ICON : baseExtractor.ICON,
        check(ctx) {
          if (ctx.selection || (ctx.onLink && !ctx.onImage)) {
            return;
          }

          let info = baseExtractor.getInfo(ctx);

          if (!info) {
            return;
          }

          if (/^[^.]+\.tumblr\.com$/.test((new URL(info.href)).hostname)) {
            return true;
          }

          if (ctx.onImage) {
            let {src} = ctx.target;

            if (src) {
              return (new URL(src)).hostname === 'data.tumblr.com';
            }
          }
        },
        extract(ctx) {
          baseExtractor.overwriteCTX(ctx);

          return Extractors.ReBlog.extractByLink(ctx, ctx.href);
        }
      },

      {
        name : `Photo - ${baseExtractor.name}(FFFFOUND!)`,
        ICON : baseExtractor.ICON,
        check(ctx) {
          if (!ctx.selection && ctx.onImage) {
            let info = baseExtractor.getInfo(ctx);

            if (info) {
              return (new URL(info.href)).hostname === 'ffffound.com';
            }
          }
        },
        extract(ctx) {
          let info = baseExtractor.getInfo(ctx);

          baseExtractor.overwriteCTX(ctx);

          let uriObj = createURI(info.href);

          ctx.href = uriObj.prePath + uriObj.filePath;

          let {author} = info;

          return {
            type      : 'photo',
            item      : info.title,
            itemUrl   : ctx.target.src,
            author    : author,
            authorUrl : 'http://ffffound.com/home/' + author + '/found/',
            favorite  : {
              name : 'FFFFOUND',
              id   : ctx.href.split('/').pop()
            }
          };
        }
      },

      {
        name : `Photo - ${baseExtractor.name}`,
        ICON : baseExtractor.ICON,
        check(ctx) {
          return !ctx.selection && ctx.onImage && baseExtractor.getItem(ctx);
        },
        extract(ctx) {
          baseExtractor.overwriteCTX(ctx);

          return Extractors.check(ctx)[0].extract(ctx);
        }
      },

      {
        name : `Link - ${baseExtractor.name}`,
        ICON : baseExtractor.ICON,
        check(ctx) {
          return !(ctx.selection || ctx.onImage || ctx.onLink) &&
            baseExtractor.getItem(ctx);
        },
        extract(ctx) {
          return Extractors.Link.extract(baseExtractor.overwriteCTX(ctx));
        }
      }
    ];
  }

  let baseExtractor = {
    name     : 'Feedly',
    ICON     : 'http://feedly.com/favicon.ico',
    PARAM_RE : new RegExp(
      '[?&;]' +
        '(?:fr?(?:om)?|track|ref|FM)=(?:r(?:ss(?:all)?|df)|atom)' +
        '(?:[&;].*)?'
    ),
    getItem(ctx) {
      if (
        ctx.host === 'feedly.com' &&
          ctx.pathname.startsWith('/i/')
      ) {
        let {target} = ctx;

        if (target) {
          return target.closest('.u100Frame');
        }
      }
    },
    getInfo(ctx) {
      let item = this.getItem(ctx);

      if (!item) {
        return;
      }

      let info = {},
          itemTitle = item.querySelector('.entryHeader .title');

      info.title = itemTitle ? itemTitle.textContent : '';

      info.href = itemTitle ?
        itemTitle.href.replace(this.PARAM_RE, '') :
        '';

      info.author = '';

      let sourceTitle = item.querySelector('.sourceTitle');
      if (sourceTitle &&
          sourceTitle.nextSibling &&
          sourceTitle.nextSibling.nodeName === '#text'
         ) {
           let match = sourceTitle.nextSibling.textContent.match(/^\s*by\s+(.+?)\s*\/\s*$/);
           if (match) {
             info.author = match;
           }
         }

      return info;
    },
    overwriteCTX(ctx) {
      let info = this.getInfo(ctx);

      if (info) {
        let feedTitle = this.getFeedTitle(ctx);

        ctx.title = feedTitle ?
          feedTitle.textContent + (info.title && ' - ' + info.title) :
          info.title;

        ctx.href = info.href;
        ctx.host = (new URL(info.href)).hostname;
      }

      return ctx;
    },
    getFeedTitle(ctx) {
      return this.getItem(ctx).querySelector('.sourceTitle');
    }
  };

  Tombloo.Service.extractors.register(expand(baseExtractor), 'Photo', false);

})();
