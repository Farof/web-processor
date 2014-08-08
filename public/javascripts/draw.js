(exports => {
  "use strict";

  function configure(ctx, conf) {
    for (let key in conf) {
      ctx[key] = conf[key];
    }
  }

  function isPointInStroke(ctx, c_conf) {
    return c_conf.cursor.in && ctx.isPointInStroke(c_conf.cursor.x, c_conf.cursor.y);
  }

  wp.draw = {
    circle: function (ctx, c_conf, x, y, r, conf, stroke, fill) {
      configure(ctx, conf);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI, false);
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
      ctx.closePath();

      return isPointInStroke(ctx, c_conf);
    },

    line: function (ctx, c_conf, x, y, xx, yy, conf, stroke, fill) {
      configure(ctx, conf);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(xx, yy);
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
      ctx.closePath();

      return isPointInStroke(ctx, c_conf);
    }
  };

  wp.draw._conf = configure;

})(this);
