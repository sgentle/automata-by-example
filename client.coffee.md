Automata by Example
===================

This is a demonstration of two awesome things, cellular automata and rule
generation. Using the two together, we can build all sorts of interesting
automata by just clicking around and experimenting.

The way it works is that each rule has a pattern and a modifier, both in a 3x3
grid. If the pattern matches any cell, we toggle any cells that are set in the
modifier. Like so:

```
(pattern) (modifier) (result)
   ...       ...       ...
   .x.   +   ..x   ->  .xx
   ...       ...       ...
```

In other words, this rule adds a cell to the right of any cell with no
neighbours.

Because these rules map closely to "if-then" type conditions, we can
optimistically generate them as you click. The above rule could be generated
by clicking one cell to the right of an existing cell with no neighbours.

Clicking always generates a rule centred on the current mouse position, but
there are many rules that can't be generated this way. So we also have a rule
editor for more methodical rule entry.


Utils and setup
---------------

Dollar store jQuery + the setup for our canvas

    $ = document.querySelector.bind(document)
    canvas = $('#canvas')
    ctx = canvas.getContext("2d")
    ctx.fillRect(0, 0, canvas.width, canvas.height)

Set up our data. We really only use the canvas as a pixel grid, so most of the
work we'll be doing is with these arrays. We need `data` and `olddata` so that
our automata appear to run instantaneously, and for nice lerping between
generations.

    DATA_W = 100
    DATA_H = 100
    DATA_LENGTH = DATA_W*DATA_H

    data = new Uint8Array(DATA_LENGTH)
    olddata = new Uint8Array(DATA_LENGTH)
    drawdata = new Uint8ClampedArray(DATA_LENGTH*4) #RGBA

We set the middle pixel on because otherwise it's very hard to make anything
interesting happen.

    data[DATA_LENGTH // 2 - DATA_W // 2] = 1
    olddata[DATA_LENGTH // 2 - DATA_W // 2] = 1


Drawing
-------

Because we only want pixels, the easiest way to do that is by just drawing the
pixels at their native size and then scaling them up by setting a global
transform. We try really hard to avoid smoothing.

    setup = ->
      ctx.setTransform(canvas.width/DATA_W, 0, 0, canvas.height/DATA_H, 0, 0)
      ctx.globalCompositeOperation = "copy"
      ctx.imageSmoothingEnabled = false
      ctx[x+"ImageSmoothingEnabled"] = false for x in 'moz ms webkit'.split(' ')

We don't want to step the automata every frame, so `drawcount` tells us how
many times we've drawn since the last step. Combined with `timeScale` we can
use that to lerp between steps.

    timeScale = 10
    drawcount = 0
    draw = ->
      drawR = drawcount/timeScale
      for i in [0...DATA_LENGTH] by 1
        v = (data[i]*drawR + olddata[i]*(1-drawR))
        n = i*4
        drawdata[n] = drawdata[n+1] = drawdata[n+2] = v*255
        drawdata[n+3] = 255

Since imageData ignores transform, we load the imageData into the canvas, then
draw the canvas onto itself.

      imageData = new ImageData(drawdata, DATA_W, DATA_H)
      ctx.putImageData(imageData, 0, 0)
      ctx.drawImage(ctx.canvas, 0, 0)

Ye olde rAF loop

    paused = false
    raf = (t) ->
      drawcount++ unless paused
      draw()
      if drawcount > timeScale
        drawcount = 0
        step()

      requestAnimationFrame raf

    setup()
    raf()


Automata engine
---------------

This is where we get to do some fun stuff! Since the 3x3 boolean grid is
basically a 9-bit number, we can just use numbers internally.

The rules are stored as a 2**9-element array. Each step, we get every cell's
3x3-equivalent number and look it up in the rule array. If it matches, we xor
that number with the rule's modifier and write it back to the cell.

The inputs don't overlap, ie olddata[n] can't affect olddata[n+1], but the
outputs can. Rules matching two adjacent input cells can both modify the same
output cells. When this happens, they xor together.

    rules = new Array(1<<8)
    step = ->
      for i in [0...DATA_LENGTH] by 1
        olddata[i] = data[i]

      for i in [0...DATA_LENGTH] by 1
        if v = rules[getNeighbours olddata, i]
          n = getNeighbours data, i
          setNeighbours data, i, (n ^ v)

The getNeighbours and setNeighbours functions convert between grid
representation and number representation of cells. I don't know if it was
strictly necessary to unroll them, but it looks way cooler and more hackery
this way.

    getNeighbours = (data, i) ->
      mid = (i + DATA_LENGTH) % DATA_LENGTH
      top = (i - DATA_W + DATA_LENGTH) % DATA_LENGTH
      bot = (i + DATA_W) % DATA_LENGTH
      r = if i % DATA_W is (DATA_W-1) then 1-DATA_W else 1
      l = if i % DATA_W is 0 then DATA_W-1 else -1

      (data[(top+l)] << 0) +
      (data[(top+0)] << 1) +
      (data[(top+r)] << 2) +
      (data[(mid+l)] << 3) +
      (data[(mid+0)] << 4) +
      (data[(mid+r)] << 5) +
      (data[(bot+l)] << 6) +
      (data[(bot+0)] << 7) +
      (data[(bot+r)] << 8)

    setNeighbours = (data, i, n) ->
      mid = (i + DATA_LENGTH) % DATA_LENGTH
      top = (i - DATA_W + DATA_LENGTH) % DATA_LENGTH
      bot = (i + DATA_W) % DATA_LENGTH
      r = if i % DATA_W is (DATA_W-1) then 1-DATA_W else 1
      l = if i % DATA_W is 0 then DATA_W-1 else -1

      data[(top+l)] = (n & 1 << 0) >> 0
      data[(top+0)] = (n & 1 << 1) >> 1
      data[(top+r)] = (n & 1 << 2) >> 2
      data[(mid+l)] = (n & 1 << 3) >> 3
      data[(mid+0)] = (n & 1 << 4) >> 4
      data[(mid+r)] = (n & 1 << 5) >> 5
      data[(bot+l)] = (n & 1 << 6) >> 6
      data[(bot+0)] = (n & 1 << 7) >> 7
      data[(bot+r)] = (n & 1 << 8) >> 8


Rules editor
------------

The golden ratio of web development:

Let C = time taken to write the actual code
Let U = time getting the UI to work
Let P = time fighting one obscure CSS problem
Let M = time making it work on Mobile Safari

Then C == D == P == M

Here we have the rule editor in the sidebar. Each rule is represented as a bit
of HTML that we generate like filthy jQuery peasants. To make up for it, we
generate the rule images using Canvas and Data URIs so that I can still hang
out with the cool developers.

    ruleContainer = $('#rules')
    addButton = $('#addrule')

    makeRuleEl = (pattern, modifier) ->
      id = "rule-#{pattern}"
      div = document.createElement 'div'
      div.className = if pattern? then 'rule' else 'temprule'
      div.innerHTML = """
        <img class='pattern' src='#{makeNeighbourImage pattern}'>
        <span>➡</span>
        <img class='modifier' src='#{makeNeighbourImage pattern ^ modifier}'>
        <button class="delrule">-</button>
      """
      div.id = id if pattern?
      div.setAttribute 'data-pattern', pattern or 0
      div.setAttribute 'data-modifier', modifier or 0
      div

    makeNeighbourImage = (n, s=100) ->
      tmpcanvas = document.createElement 'canvas'
      tmpcanvas.width = tmpcanvas.height = s
      tmpctx = tmpcanvas.getContext '2d'
      cs = s / 3
      for i in [0..8]
        x = i % 3 * cs
        y = i // 3 * cs
        tmpctx.fillStyle = if (n & 1 << i) then '#fff' else '#000'
        tmpctx.fillRect x, y, cs, cs

      tmpctx.fillStyle = 'rgb(127,127,127)'
      for i in [0..3]
        tmpctx.fillRect cs*i, 0, 1, s
        tmpctx.fillRect 0, cs*i, s, 1

      tmpcanvas.toDataURL()

    clearTempRules = ->
      x.remove() for x in ruleContainer.querySelectorAll('.temprule')

When we want to update the rules, we do a bit of dollar store virtual DOM. We
add any rules that aren't in the list, modify ones that are but have had their
modifiers changed, do nothing with the ones that haven't changed, and delete
any left over.

This code was originally nicer because it represented the rules UI as a pure
function of the actual rules list. The problem with that is then the rules are
in a non-intuitive order and, worse, if you change the pattern the rule jumps
around.

    updateRules = ->
      rules[16] = 0 if !rules.some(-> true)

      stale = {}
      stale[e.id] = e for e in ruleContainer.querySelectorAll('.rule')

      rules.forEach (modifier, pattern) ->
        id = "rule-#{pattern}"
        delete stale[id]

        existingEl = document.getElementById id
        if existingEl
          if +existingEl.getAttribute('data-modifier') != modifier
            ruleContainer.replaceChild makeRuleEl(pattern, modifier), existingEl
        else
          ruleContainer.insertBefore makeRuleEl(pattern, modifier), addButton

      updateLocation()

      e.remove() for _, e of stale

Finally, our monster onclick handler. This deals with any updates to the rules
via the side panel, separation of concerns be damned.

We have two kinds of entries, regular rules and temp rules (the greyed out
ones). Temp rules are rule entries in the list that aren't backed by an actual
rule. We do this when you click the 'add rule' button and when you would
otherwise clobber an existing rule.

    ruleContainer.addEventListener 'click', (ev) ->
      kind = ev.target.className
      return unless kind in ['pattern', 'modifier', 'delrule']
      pattern = +ev.target.parentNode.getAttribute('data-pattern')
      modifier = +ev.target.parentNode.getAttribute('data-modifier')
      x = Math.floor(ev.offsetX / ev.target.offsetWidth * 3)
      y = Math.floor(ev.offsetY / ev.target.offsetHeight * 3)
      i = y * 3 + x
      v = (1 << i)
      temprule = ev.target.parentNode.className is 'temprule'

      if kind is 'delrule'
        ev.target.parentNode.remove()
        delete rules[pattern] unless temprule
        updateRules()
        return

      if kind is 'modifier'
        newrule = modifier ^ v
        newpattern = pattern
      else if kind is 'pattern'
        newrule = modifier
        newpattern = pattern ^ v

      replacedEl = document.getElementById "rule-#{newpattern}"
      if replacedEl
        replacedEl.removeAttribute 'id'
        replacedEl.className = 'temprule'

      ruleContainer.replaceChild makeRuleEl(newpattern, newrule), ev.target.parentNode

      delete rules[pattern] unless temprule
      rules[newpattern] = newrule

      updateRules()

We also update the location to reflect the current rules, so the URL can be
shared around when you find something cool. That's right. We do social.

    locationTimer = null
    updateLocation = ->
      clearTimeout locationTimer
      locationTimer = setTimeout ->
        query = []
        rules.forEach (modifier, pattern) ->
          query.push "#{pattern.toString(16)}=#{modifier.toString(16)}" unless modifier is 0
        history.replaceState null, null, '?' + query.join '&'
      , 500



    $('#addrule').addEventListener 'click', ->
      ruleContainer.insertBefore makeRuleEl(), addButton


Drawing tool
------------

This is the code that handles rule generation by clicking. We have two modes,
rule mode and draw mode. Draw mode toggles the cell under your mouse when you
click. Rule mode instead creates the rule that would toggle the cell under
your mouse, and any others like it.

    clicking = false
    drawmode = false
    lasti = null

To preserve the aspect ratio of our canvas when scaling, we're using CSS
`object-fit`, which is basically the WHATWG's version of a "kick me" sign.
There's no way to find out what actual coordinates were clicked on, so we
reimplement the algorithm ourselves to figure out the coordinates.

    getActualBoundingBox = (ev) ->
      canvasRatio = canvas.width / canvas.height
      containerRatio = canvas.offsetWidth/canvas.offsetHeight

      if containerRatio > canvasRatio
        height = canvas.offsetHeight
        width = canvas.offsetHeight / canvasRatio
      else
        height = canvas.offsetWidth * canvasRatio
        width = canvas.offsetWidth

      left = (canvas.offsetWidth - width) / 2
      top = (canvas.offsetHeight - height) / 2

      {top, left, width, height}

With that out of the way, here's our click and/or drag handler for actually
setting the rules or pixels when we click and/or drag on them.

    click = (ev) ->
      return unless clicking

      bb = getActualBoundingBox()

      x = Math.floor (ev.offsetX - bb.left) / bb.width * DATA_W
      y = Math.floor (ev.offsetY - bb.top) / bb.height * DATA_H
      return if x >= DATA_W or y >= DATA_H or x < 0 or y < 0

      i = y * DATA_W + x
      if drawmode
        data[i] = 1-data[i] unless i is lasti
        lasti = i
      else #rule mode
        n = getNeighbours data, i
        v = (1 << 4) #Middle pixel
        rules[n] ^= v
        updateRules()

    canvas.addEventListener 'mousedown', (ev) ->
      ev.preventDefault()
      lasti = null
      clicking = true if ev.button is 0
      click(ev)

    canvas.addEventListener 'mouseup', -> clicking = false
    canvas.addEventListener 'mouseout', -> clicking = false
    canvas.addEventListener 'mousemove', (ev) -> click(ev) if drawmode


Buttons!
--------

Here's where we set the listeners for our various toggles, sliders and buttons.


    $('#rulemode').addEventListener 'click', -> drawmode = false
    $('#drawmode').addEventListener 'click', -> drawmode = true

    $('#reset').addEventListener 'click', ->
      for i in [0...data.length]
        data[i] = 0
      data[DATA_LENGTH // 2 - DATA_W // 2] = 1

    $('#random').addEventListener 'click', ->
      for i in [0...data.length]
        data[i] = Math.round(Math.random())

    $('#clear').addEventListener 'click', ->
      rules = new Array(2**9)
      updateRules()
      clearTempRules()

    $('#pause').addEventListener 'click', ->
      paused = !paused
      drawcount = timeScale
      $('#pause').textContent = if paused then "resume" else "pause"

    $('#speed').addEventListener 'input', (ev) ->
      timeScale = 51 - ev.target.value


URL parsing
-----------

Finally, we set the rules if we have a query string. Thanks for reading,
intrepid code explorer! Since you made it all this way, there's a special
easter egg for you in this function.

    rulesFromQuery = ->
      if urlrules = document.location.search.slice(1)
        if urlrules == 'conway'
          for i in [0...rules.length]
            live = (i & (1<<4))
            count = popcount(i)
            if (live and (count > 4 or count < 3)) or (!live and count == 3)
              rules[i] = (1<<4)

        else
          for urlrule in urlrules.split '&'
            [urlpattern, urlmodifier] = urlrule.split '='
            rules[parseInt(urlpattern, 16)] = parseInt(urlmodifier, 16)
      updateRules()

    rulesFromQuery()

Thanks to whichever goddamn wizard figured this magic out.

    popcount = (i) ->
      i = i - ((i >> 1) & 0x55555555)
      i = (i & 0x33333333) + ((i >> 2) & 0x33333333)
      (((i + (i >> 4)) & 0x0F0F0F0F) * 0x01010101) >> 24
