// Generated by CoffeeScript 1.10.0
(function() {
  var $, DATA_H, DATA_LENGTH, DATA_W, addButton, canvas, clearTempRules, click, clicking, ctx, data, draw, drawcount, drawdata, drawmode, getActualBoundingBox, getNeighbours, lasti, locationTimer, makeNeighbourImage, makeRuleEl, olddata, paused, popcount, raf, ruleContainer, rules, rulesFromQuery, setNeighbours, setup, step, timeScale, updateLocation, updateRules;

  $ = document.querySelector.bind(document);

  canvas = $('#canvas');

  ctx = canvas.getContext("2d");

  ctx.fillRect(0, 0, canvas.width, canvas.height);

  DATA_W = 100;

  DATA_H = 100;

  DATA_LENGTH = DATA_W * DATA_H;

  data = new Uint8Array(DATA_LENGTH);

  olddata = new Uint8Array(DATA_LENGTH);

  drawdata = new Uint8ClampedArray(DATA_LENGTH * 4);

  data[Math.floor(DATA_LENGTH / 2) - Math.floor(DATA_W / 2)] = 1;

  olddata[Math.floor(DATA_LENGTH / 2) - Math.floor(DATA_W / 2)] = 1;

  setup = function() {
    var j, len, ref, results, x;
    ctx.setTransform(canvas.width / DATA_W, 0, 0, canvas.height / DATA_H, 0, 0);
    ctx.globalCompositeOperation = "copy";
    ctx.imageSmoothingEnabled = false;
    ref = 'moz ms webkit'.split(' ');
    results = [];
    for (j = 0, len = ref.length; j < len; j++) {
      x = ref[j];
      results.push(ctx[x + "ImageSmoothingEnabled"] = false);
    }
    return results;
  };

  timeScale = 10;

  drawcount = 0;

  draw = function() {
    var drawR, i, imageData, j, n, ref, v;
    drawR = drawcount / timeScale;
    for (i = j = 0, ref = DATA_LENGTH; j < ref; i = j += 1) {
      v = data[i] * drawR + olddata[i] * (1 - drawR);
      n = i * 4;
      drawdata[n] = drawdata[n + 1] = drawdata[n + 2] = v * 255;
      drawdata[n + 3] = 255;
    }
    imageData = new ImageData(drawdata, DATA_W, DATA_H);
    ctx.putImageData(imageData, 0, 0);
    return ctx.drawImage(ctx.canvas, 0, 0);
  };

  paused = false;

  raf = function(t) {
    if (!paused) {
      drawcount++;
    }
    draw();
    if (drawcount > timeScale) {
      drawcount = 0;
      step();
    }
    return requestAnimationFrame(raf);
  };

  setup();

  raf();

  rules = new Array(1 << 8);

  step = function() {
    var i, j, k, n, ref, ref1, results, v;
    for (i = j = 0, ref = DATA_LENGTH; j < ref; i = j += 1) {
      olddata[i] = data[i];
    }
    results = [];
    for (i = k = 0, ref1 = DATA_LENGTH; k < ref1; i = k += 1) {
      if (v = rules[getNeighbours(olddata, i)]) {
        n = getNeighbours(data, i);
        results.push(setNeighbours(data, i, n ^ v));
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  getNeighbours = function(data, i) {
    var bot, l, mid, r, top;
    mid = (i + DATA_LENGTH) % DATA_LENGTH;
    top = (i - DATA_W + DATA_LENGTH) % DATA_LENGTH;
    bot = (i + DATA_W) % DATA_LENGTH;
    r = i % DATA_W === (DATA_W - 1) ? 1 - DATA_W : 1;
    l = i % DATA_W === 0 ? DATA_W - 1 : -1;
    return (data[top + l] << 0) + (data[top + 0] << 1) + (data[top + r] << 2) + (data[mid + l] << 3) + (data[mid + 0] << 4) + (data[mid + r] << 5) + (data[bot + l] << 6) + (data[bot + 0] << 7) + (data[bot + r] << 8);
  };

  setNeighbours = function(data, i, n) {
    var bot, l, mid, r, top;
    mid = (i + DATA_LENGTH) % DATA_LENGTH;
    top = (i - DATA_W + DATA_LENGTH) % DATA_LENGTH;
    bot = (i + DATA_W) % DATA_LENGTH;
    r = i % DATA_W === (DATA_W - 1) ? 1 - DATA_W : 1;
    l = i % DATA_W === 0 ? DATA_W - 1 : -1;
    data[top + l] = (n & 1 << 0) >> 0;
    data[top + 0] = (n & 1 << 1) >> 1;
    data[top + r] = (n & 1 << 2) >> 2;
    data[mid + l] = (n & 1 << 3) >> 3;
    data[mid + 0] = (n & 1 << 4) >> 4;
    data[mid + r] = (n & 1 << 5) >> 5;
    data[bot + l] = (n & 1 << 6) >> 6;
    data[bot + 0] = (n & 1 << 7) >> 7;
    return data[bot + r] = (n & 1 << 8) >> 8;
  };

  ruleContainer = $('#rules');

  addButton = $('#addrule');

  makeRuleEl = function(pattern, modifier) {
    var div, id;
    id = "rule-" + pattern;
    div = document.createElement('div');
    div.className = pattern != null ? 'rule' : 'temprule';
    div.innerHTML = "<img class='pattern' src='" + (makeNeighbourImage(pattern)) + "'>\n<span>➡</span>\n<img class='modifier' src='" + (makeNeighbourImage(pattern ^ modifier)) + "'>\n<button class=\"delrule\">-</button>";
    if (pattern != null) {
      div.id = id;
    }
    div.setAttribute('data-pattern', pattern || 0);
    div.setAttribute('data-modifier', modifier || 0);
    return div;
  };

  makeNeighbourImage = function(n, s) {
    var cs, i, j, k, tmpcanvas, tmpctx, x, y;
    if (s == null) {
      s = 100;
    }
    tmpcanvas = document.createElement('canvas');
    tmpcanvas.width = tmpcanvas.height = s;
    tmpctx = tmpcanvas.getContext('2d');
    cs = s / 3;
    for (i = j = 0; j <= 8; i = ++j) {
      x = i % 3 * cs;
      y = Math.floor(i / 3) * cs;
      tmpctx.fillStyle = n & 1 << i ? '#fff' : '#000';
      tmpctx.fillRect(x, y, cs, cs);
    }
    tmpctx.fillStyle = 'rgb(127,127,127)';
    for (i = k = 0; k <= 3; i = ++k) {
      tmpctx.fillRect(cs * i, 0, 1, s);
      tmpctx.fillRect(0, cs * i, s, 1);
    }
    return tmpcanvas.toDataURL();
  };

  clearTempRules = function() {
    var j, len, ref, results, x;
    ref = ruleContainer.querySelectorAll('.temprule');
    results = [];
    for (j = 0, len = ref.length; j < len; j++) {
      x = ref[j];
      results.push(x.remove());
    }
    return results;
  };

  updateRules = function() {
    var _, e, j, len, ref, results, stale;
    if (!rules.some(function() {
      return true;
    })) {
      rules[16] = 0;
    }
    stale = {};
    ref = ruleContainer.querySelectorAll('.rule');
    for (j = 0, len = ref.length; j < len; j++) {
      e = ref[j];
      stale[e.id] = e;
    }
    rules.forEach(function(modifier, pattern) {
      var existingEl, id;
      id = "rule-" + pattern;
      delete stale[id];
      existingEl = document.getElementById(id);
      if (existingEl) {
        if (+existingEl.getAttribute('data-modifier') !== modifier) {
          return ruleContainer.replaceChild(makeRuleEl(pattern, modifier), existingEl);
        }
      } else {
        return ruleContainer.insertBefore(makeRuleEl(pattern, modifier), addButton);
      }
    });
    updateLocation();
    results = [];
    for (_ in stale) {
      e = stale[_];
      results.push(e.remove());
    }
    return results;
  };

  ruleContainer.addEventListener('click', function(ev) {
    var i, kind, modifier, newpattern, newrule, pattern, replacedEl, temprule, v, x, y;
    kind = ev.target.className;
    if (kind !== 'pattern' && kind !== 'modifier' && kind !== 'delrule') {
      return;
    }
    pattern = +ev.target.parentNode.getAttribute('data-pattern');
    modifier = +ev.target.parentNode.getAttribute('data-modifier');
    x = Math.floor(ev.offsetX / ev.target.offsetWidth * 3);
    y = Math.floor(ev.offsetY / ev.target.offsetHeight * 3);
    i = y * 3 + x;
    v = 1 << i;
    temprule = ev.target.parentNode.className === 'temprule';
    if (kind === 'delrule') {
      ev.target.parentNode.remove();
      if (!temprule) {
        delete rules[pattern];
      }
      updateRules();
      return;
    }
    if (kind === 'modifier') {
      newrule = modifier ^ v;
      newpattern = pattern;
    } else if (kind === 'pattern') {
      newrule = modifier;
      newpattern = pattern ^ v;
    }
    replacedEl = document.getElementById("rule-" + newpattern);
    if (replacedEl) {
      replacedEl.removeAttribute('id');
      replacedEl.className = 'temprule';
    }
    ruleContainer.replaceChild(makeRuleEl(newpattern, newrule), ev.target.parentNode);
    if (!temprule) {
      delete rules[pattern];
    }
    rules[newpattern] = newrule;
    return updateRules();
  });

  locationTimer = null;

  updateLocation = function() {
    clearTimeout(locationTimer);
    return locationTimer = setTimeout(function() {
      var query;
      query = [];
      rules.forEach(function(modifier, pattern) {
        if (modifier !== 0) {
          return query.push((pattern.toString(16)) + "=" + (modifier.toString(16)));
        }
      });
      return history.replaceState(null, null, '?' + query.join('&'));
    }, 500);
  };

  $('#addrule').addEventListener('click', function() {
    return ruleContainer.insertBefore(makeRuleEl(), addButton);
  });

  clicking = false;

  drawmode = false;

  lasti = null;

  getActualBoundingBox = function(ev) {
    var canvasRatio, containerRatio, height, left, top, width;
    canvasRatio = canvas.width / canvas.height;
    containerRatio = canvas.offsetWidth / canvas.offsetHeight;
    if (containerRatio > canvasRatio) {
      height = canvas.offsetHeight;
      width = canvas.offsetHeight / canvasRatio;
    } else {
      height = canvas.offsetWidth * canvasRatio;
      width = canvas.offsetWidth;
    }
    left = (canvas.offsetWidth - width) / 2;
    top = (canvas.offsetHeight - height) / 2;
    return {
      top: top,
      left: left,
      width: width,
      height: height
    };
  };

  click = function(ev) {
    var bb, i, n, v, x, y;
    if (!clicking) {
      return;
    }
    bb = getActualBoundingBox();
    x = Math.floor((ev.offsetX - bb.left) / bb.width * DATA_W);
    y = Math.floor((ev.offsetY - bb.top) / bb.height * DATA_H);
    if (x >= DATA_W || y >= DATA_H || x < 0 || y < 0) {
      return;
    }
    i = y * DATA_W + x;
    if (drawmode) {
      if (i !== lasti) {
        data[i] = 1 - data[i];
      }
      return lasti = i;
    } else {
      n = getNeighbours(data, i);
      v = 1 << 4;
      rules[n] ^= v;
      return updateRules();
    }
  };

  canvas.addEventListener('mousedown', function(ev) {
    ev.preventDefault();
    lasti = null;
    if (ev.button === 0) {
      clicking = true;
    }
    return click(ev);
  });

  canvas.addEventListener('mouseup', function() {
    return clicking = false;
  });

  canvas.addEventListener('mouseout', function() {
    return clicking = false;
  });

  canvas.addEventListener('mousemove', function(ev) {
    if (drawmode) {
      return click(ev);
    }
  });

  $('#rulemode').addEventListener('click', function() {
    return drawmode = false;
  });

  $('#drawmode').addEventListener('click', function() {
    return drawmode = true;
  });

  $('#reset').addEventListener('click', function() {
    var i, j, ref;
    for (i = j = 0, ref = data.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      data[i] = 0;
    }
    return data[Math.floor(DATA_LENGTH / 2) - Math.floor(DATA_W / 2)] = 1;
  });

  $('#random').addEventListener('click', function() {
    var i, j, ref, results;
    results = [];
    for (i = j = 0, ref = data.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      results.push(data[i] = Math.round(Math.random()));
    }
    return results;
  });

  $('#clear').addEventListener('click', function() {
    rules = new Array(Math.pow(2, 9));
    updateRules();
    return clearTempRules();
  });

  $('#pause').addEventListener('click', function() {
    paused = !paused;
    drawcount = timeScale;
    return $('#pause').textContent = paused ? "resume" : "pause";
  });

  $('#speed').addEventListener('input', function(ev) {
    return timeScale = 51 - ev.target.value;
  });

  rulesFromQuery = function() {
    var count, i, j, k, len, live, ref, ref1, ref2, urlmodifier, urlpattern, urlrule, urlrules;
    if (urlrules = document.location.search.slice(1)) {
      if (urlrules === 'conway') {
        for (i = j = 0, ref = rules.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
          live = i & (1 << 4);
          count = popcount(i);
          if ((live && (count > 4 || count < 3)) || (!live && count === 3)) {
            rules[i] = 1 << 4;
          }
        }
      } else {
        ref1 = urlrules.split('&');
        for (k = 0, len = ref1.length; k < len; k++) {
          urlrule = ref1[k];
          ref2 = urlrule.split('='), urlpattern = ref2[0], urlmodifier = ref2[1];
          rules[parseInt(urlpattern, 16)] = parseInt(urlmodifier, 16);
        }
      }
    }
    return updateRules();
  };

  rulesFromQuery();

  popcount = function(i) {
    i = i - ((i >> 1) & 0x55555555);
    i = (i & 0x33333333) + ((i >> 2) & 0x33333333);
    return (((i + (i >> 4)) & 0x0F0F0F0F) * 0x01010101) >> 24;
  };

}).call(this);
