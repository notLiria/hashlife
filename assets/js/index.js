(function (root) {
  
  function after (decoration) {
    return function(base) {
      return function() {
        var __value__;
        decoration.call(this, __value__ = base.apply(this, arguments));
        return __value__;
      };
    };
  };

  $(document).ready(function () {
    
    var WE_ARE_MOBILE = !!$('html.touch').length,
        DURATION_THRESHOLD = 1000,
        MIN_SWIPE_LENGTH = 75,
        MAX_SWIPE_WIDTH = 35,
        THROTTLE_MILLIS = WE_ARE_MOBILE
                          ? 25
                          : 10;

    var LOG2 = Math.log(2);

    // the universe
    var universe = new QuadTree();
    var currentGeneration = 0;

    var draw = _.throttle( function () {

      //synchronize window and canvas dimensions
      viewPortCanvas.width = $(window).width();
      viewPortCanvas.height = $(window).height();
      
      while (universe.doesNotEnclose({
        cellSize: Cell.size(),
        viewPort: {
          height: viewPortCanvas.height,
          width: viewPortCanvas.width,
          offset: viewportOffset
        }
      })) universe = universe.double();

      universe.drawInto({
        cellSize: Cell.size(),
        canvas: viewPortCanvas,
        context: viewportContext,
        offset: viewportOffset
      });
      
      $('#generation').text(addCommas(currentGeneration));
      $('#population').text(addCommas(universe.population));
      
      var fastForwardGenerations = addCommas(Math.ceil(universe.trimmed().maximumGenerations()));
      
      $('p#doFastForward').attr('title', 'Fast-forward ' + fastForwardGenerations + ' generations');
      
      $('p#livecells').attr('title', '' + addCommas(QuadTree.nodes()) + ' nodes in the cache');
      
    }, THROTTLE_MILLIS);
    
    var triggersRedraw = after(draw);
    
    // offline hack
    if (window.location.protocol === "file:")
      $('#ribbon').hide();

    // viewport
    var canvasProxy = $('canvas#viewport'),
        viewPortCanvas = canvasProxy[0],
        viewportContext = viewPortCanvas.getContext("2d"),
        viewportOffset = { x: 0, y: 0 },
        lastMousePosition = { x: 0, y: 0 };

    viewPortCanvas.height = window.innerHeight;
    viewPortCanvas.width = window.innerWidth;
    
    ///////////////////////////////////////////////////////////////////
    
    var panLeft = triggersRedraw( function () {
      viewportOffset.x -= viewPortCanvas.width;
    });
    
    var panRight = triggersRedraw( function () {
      viewportOffset.x += viewPortCanvas.width;
    });
    
    var panUp = triggersRedraw( function () {
      viewportOffset.y -= viewPortCanvas.height;
    });
    
    var panDown = triggersRedraw( function () {
      viewportOffset.y += viewPortCanvas.height;
    });
    
    var rotateUniverse = triggersRedraw( function () {
      universe = universe.rotate();
    });
    
    var rotateUniverseCounterClockwise = triggersRedraw( function () {
      universe = universe.rotate().rotate().rotate();
    });

    function goto (destination, strict) {
      
      if (strict == null) strict = true;
      
      var ff = triggersRedraw( function () {
        universe = universe
                          .trimmed()
                          .double()
                          .double();
        var sizeOfIteration = strict
                              ? Math.min(destination - currentGeneration, universe.maximumGenerations())
                              : universe.maximumGenerations();
        if (currentGeneration < destination) {
          universe = universe
                            .futureAt(sizeOfIteration)
                            .trimmed();
          currentGeneration = currentGeneration + sizeOfIteration;
          timerID = setTimeout(ff, 0);
        }
        else clearTimeout(timerID);
      });
      
      var timerID = setTimeout(ff, 0);
      
    };

    var fastForward = triggersRedraw( function (event, sizeOfIteration) {
      sizeOfIteration || (sizeOfIteration = universe.trimmed().maximumGenerations());
      
      universe = universe
                        .trimmed()
                        .double()
                        .double();
      sizeOfIteration = Math.max(1, Math.min(sizeOfIteration, universe.maximumGenerations()));
      universe = universe
                        .futureAt(sizeOfIteration)
                        .trimmed();
      currentGeneration = currentGeneration + sizeOfIteration;
    });

    function step (event) { 
      return fastForward(event, 1); 
    }

    var zoomIn = triggersRedraw( function () {
      Cell.size(Cell.size() * 2);
    });

    var zoomOut = triggersRedraw( function () {
      if (root.Cell.size() >= 2) {
        Cell.size(Cell.size() / 2);
      }
    });

    function noZero (n) {
      return Math.floor(n >= 0
                        ? n + 1
                        : n
             );
    }

    var insert = triggersRedraw( function (what) {

      var pasteContent = QuadTree.Library[what]();

      universe = universe.paste(pasteContent, 0, 0);

    });

    var flipCell = triggersRedraw( function (event) {

      var relativeToUniverseCenterInCells = {
        x: noZero((viewportOffset.x - (viewPortCanvas.width / 2) + event.clientX) / Cell.size()),
        y: noZero((viewportOffset.y - (viewPortCanvas.height / 2) + event.clientY) / Cell.size())
      };

      universe = universe.flip(relativeToUniverseCenterInCells);
      
    });
      
    ///////////////////////////////////////////////////////////////////
      
    if (WE_ARE_MOBILE) {

      $(document)
        .on("touchmove", function (e) { event.preventDefault(); })
        .on('gesturestart', gestureStart);
        // .on("touchstart", touchStart)
        
      canvasProxy
        .on("swipe", fastForward)
        .on("taphold", function () { insert('GosperGliderGun'); });
      
      Cell.size(32);
    
    }
    else Cell.size(16);
    
    function touchStart (event) {
      
      var startCoord = {
            left: event.originalEvent.pageX,
            top: event.originalEvent.pageY
          },
          lastCoord = {
            left: event.originalEvent.pageX,
            top: event.originalEvent.pageY
          },
          touchTime = new Date().getTime();
        
      function touchEnd (event) {
        
        $(document)
          .unbind('touchmove', touchMove)
          .unbind('touchend', touchEnd);
          
        if (new Date().getTime() - touchTime < DURATION_THRESHOLD) {
         if (
           Math.abs( startCoord.left - lastCoord.left ) > MIN_SWIPE_LENGTH &&
           Math.abs( startCoord.top - lastCoord.top ) < MAX_SWIPE_WIDTH
          ) {
           $(event.currentTarget)
            .trigger( "swipe" )
            .trigger( startCoord.left > lastCoord.left ? "swipeleft" : "swiperight" );
          }
          else if (
            Math.abs( startCoord.top - lastCoord.top ) > MIN_SWIPE_LENGTH &&
            Math.abs( startCoord.left - lastCoord.left ) < MAX_SWIPE_WIDTH
          ) {
           $(event.currentTarget)
            .trigger( "swipe" )
            .trigger( startCoord.top > lastCoord.top ? "swipeup" : "swipedown" );
          }
        }
      }
      
      function touchMove (event) {
        lastCoord.left = event.originalEvent.pageX;
        lastCoord.top = event.originalEvent.pageY;
      }
      
      $(document)
        .on('touchmove', event.data, touchMove)
        .on('touchend', event.data, touchEnd);
      
      event.preventDefault();
      
    }
    
    function gestureStart (event) {
      
      var lastCoord = {
            left: event.originalEvent.pageX,
            top: event.originalEvent.pageY
          },
          lastScale = 1.0,
          lastRotation = 0;
        
      function gestureEnd (event) {
        $(document)
          .unbind('gesturechange', gestureChange)
          .unbind('gestureend', gestureEnd);
      }
      
      var updateDrag = triggersRedraw( function (x, y) {
        viewportOffset.x = viewportOffset.x - (x - lastCoord.left);
        viewportOffset.y = viewportOffset.y - (y - lastCoord.top);

        lastCoord.left = x;
        lastCoord.top = y;
      });
      
      function gestureChange (event) {
        var currentScale = event.originalEvent.scale,
            relativeScale = currentScale / lastScale,
            currentRotation = event.originalEvent.rotation % 360,
            relativeRotation = currentRotation - lastRotation;
        
        if (relativeRotation > 90) {
          lastRotation = currentRotation;
          rotateUniverse();
        }
        else if (relativeRotation < -90) {
          lastRotation = currentRotation;
          rotateUniverseCounterClockwise();
        }
        else if (relativeScale < 0.75) {
          lastScale = currentScale;
          zoomOut();
        }
        else if (relativeScale > 1.5) {
          lastScale = currentScale;
          zoomIn();
        }
        else updateDrag(event.originalEvent.pageX, event.originalEvent.pageY);
      }
      
      $(document)
        .on('gesturechange', event.data, gestureChange)
        .on('gestureend', event.data, gestureEnd);
        
    }
    
    ///////////////////////////////////////////////////////////////////

    canvasProxy
      .on('mousedown', onDragStart)
      .on("mousemove", trackLastMousePosition);

    $(document)
      .keypress(onKeypress)
      .keyup(onKeyup);
      
    $('#doFastForward')
      .on('click', fastForward);
      
    $('#help, #discuss')
      .on('click', link);


    $(window)
      .resize(draw)
      .trigger("resize");

    ///////////////////////////////////////////////////////////////////
    
    function link (event) {
      window.location = $(event.currentTarget).attr('href');
    }

    function onKeypress (event) {
      if (event.which === 43) {
        zoomIn();
      }
      else if (event.which === 45) {
        zoomOut();
      }
    }
    
    function trackLastMousePosition (event) {
      lastMousePosition = {
        x: event.pageX,
        y: event.pageY
      }
    }

    function onKeyup (event) {
      if (event.which === 13) {
        fastForward();
      }
      else if (event.which === 32) {
        step();
      }
      
      else if (event.which === 37) {
        panLeft();
      }
      else if (event.which === 38) {
        panUp();
      }
      else if (event.which === 39) {
        panRight();
      }
      else if (event.which === 40) {
        panDown();
      }
      
      else if (event.which === 18) {
        rotateUniverse();
      }
      
      else if (event.which === 49) {
        insert('Glider');
      }
      else if (event.which === 50) {
        insert('GosperGliderGun');
      }
      else if (event.which === 51) {
        insert('BlockLayingSwitchEngine');
      }
      else if (event.which === 52) {
        insert('NoahsArk');
      }
      else if (event.which === 53) {
        insert('Rabbits');
      }
    }

    function onDragStart (event) {

      var MAXCLICKDRAGDISTANCE = 1,
          MAXIMUMCLICKMILLISECONDS = 250;
        
      var lastCoord = {
            left: event.clientX,
            top: event.clientY
          },
          mouseDownTime = new Date().getTime();

      $(document)
        .on("mouseup", event.data, onDragEnd)
        .on("mousemove", event.data, onDragging);

      document.body.style.cursor = 'all-scroll';

      function onDragging (event) {
        var delta = {
            left: (event.clientX - lastCoord.left),
            top: (event.clientY - lastCoord.top)
        };

        viewportOffset.x = viewportOffset.x - delta.left;
        viewportOffset.y = viewportOffset.y - delta.top;

        lastCoord.left = event.clientX;
        lastCoord.top = event.clientY;

        if ((delta.left + delta.top) > MAXCLICKDRAGDISTANCE ) {
          mouseDownTime = null;
        }
      
        draw();
      }

      function onDragEnd (event) {
        $(document)
          .unbind("mousemove", onDragging)
          .unbind("mouseup", onDragEnd);

        var mouseUpTime = new Date().getTime();

        if (mouseDownTime && (mouseUpTime - mouseDownTime) < MAXIMUMCLICKMILLISECONDS) {
          flipCell(event);
        }


        document.body.style.cursor = 'pointer';
      }
    }
    
    // see http://www.mredkj.com/javascript/nfbasic.html
    function addCommas (nStr) {
    	nStr += '';
    	x = nStr.split('.');
    	x1 = x[0];
    	x2 = x.length > 1 ? '.' + x[1] : '';
    	var rgx = /(\d+)(\d{3})/;
    	while (rgx.test(x1)) {
    		x1 = x1.replace(rgx, '$1' + ',' + '$2');
    	}
    	return x1 + x2;
    }
    
    // DEBUG STUFF
    
    root.universe = universe;
    
    root.GOTO = goto;

  });

})(this);