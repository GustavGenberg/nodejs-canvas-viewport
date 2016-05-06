/* All Variables */

var canvas = document.createElement('canvas');
var ctx = canvas.getContext('2d');
var minimap = document.createElement('canvas');
var mctx = minimap.getContext('2d');
var socket = io(':3000');
var fps = {fps: {out: 0, count: 0},rfps: {out: 0, count: 0}};
var drawData = {}, viewport = {}, info = {};
var config;
var cache = {ping: 'NULL', toggleInfo: false, toggleMinimap: false, toggleVPborders: false, toggleBg: false, toggleBorders: false};
var keysDown = {};
var image = {};
var disconnected = false;

/* END All Variables */

// Init function
var init = function () {

  var getRandomValue = function (a, b) {
    return Math.floor(Math.random() * b) + a;
  };

  var log = function (data) {
    console.log(data);
  };

  document.addEventListener('keydown', function (event) {
    if([37, 39, 38, 40].indexOf(event.keyCode) > -1) {
      keysDown[event.keyCode] = true;
    } else if(event.keyCode == 32) {
      cache.toggleInfo = !cache.toggleInfo;
    } else if(event.keyCode == 77) {
      cache.toggleMinimap = !cache.toggleMinimap;
      if(cache.toggleMinimap){minimap.style.border='1px solid red';}else{minimap.style.border='';}
    } else if(event.keyCode == 66) {
      cache.toggleBorders = !cache.toggleBorders;
    } else if(event.keyCode == 86) {
      cache.toggleVPborders = !cache.toggleVPborders;
    } else if(event.keyCode == 65) {
      cache.toggleBg = !cache.toggleBg;
    } else if(event.keyCode == 13) {
      cache.toggleInfo = !cache.toggleInfo;
      cache.toggleMinimap = !cache.toggleMinimap;
      if(cache.toggleMinimap){minimap.style.border='1px solid red';}else{minimap.style.border='';}
      cache.toggleBorders = !cache.toggleBorders;
      cache.toggleVPborders = !cache.toggleVPborders;
      cache.toggleBg = !cache.toggleBg;
    }
  });
  document.addEventListener('keyup', function (event) {
    delete keysDown[event.keyCode];
  });


  // Socket on connection
  socket.on('connect', function () {

    //if(disconnected) { alert('disconnected');location.reload() }

    socket.on('disconnect', function (r) {
      disconnected = true;
      alert(r);
    });

    socket.on('config', function (data) {
      // Setting config
      config = data;

      // Setting some attributes to the game and minimap canvas and adding them to the body
      canvas.width = config.viewport.width;//document.documentElement.clientWidth;//config.viewport.width;
      canvas.height = config.viewport.height;//document.documentElement.clientHeight;//config.viewport.height;
      canvas.id = 'game';
      minimap.width = config.map.width / config.minimap.scale;
      minimap.height = config.map.height / config.minimap.scale;
      minimap.id = 'minimap';
      document.body.appendChild(canvas);
      document.body.appendChild(minimap);

      image.background = new Image();
      image.background.src = config.map.bg;

      image.background.onload = function () {
        setTimeout(function () {
          draw();
        }, 100);
      };
    });

  });

  // Receiving data from the server
  socket.on('drawData', function (data) {
    fps.rfps.count++;
    drawData = data[0];
    viewport = data[1];
    info = data[2];
  });

  // The main draw() function that draws everything to the screen
  var draw = function () {

    // Sending active keys
    socket.emit('keysDown', keysDown);

    // Resetting translate() to default
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Clear the game and minimap canvas
    ctx.clearRect(0, 0, config.viewport.width, config.viewport.height);
    mctx.clearRect(0, 0, minimap.width, minimap.height);

    // Main viewport function
    ctx.translate(-viewport.minx / viewport.scale, -viewport.miny / viewport.scale);

    // Drawing the background
    if(cache.toggleBg) {
      for(var i = -1;i*image.background.width / viewport.scale < (config.map.width / viewport.scale) + (image.background.width / viewport.scale);i++) {
        for(var j = -1;j*image.background.height  / viewport.scale < (config.map.height / viewport.scale) + (image.background.height / viewport.scale);j++) {
          ctx.drawImage(image.background, 0, 0, image.background.width, image.background.height, i*image.background.width / viewport.scale, j*image.background.height / viewport.scale, image.background.width / viewport.scale, image.background.height / viewport.scale);
        }
      }
    }

    // Drawing all players
    for (player in drawData.Players) {
      var player = drawData.Players[player];
      ctx.fillStyle = '#FFF';
      ctx.fillRect(player.x / viewport.scale, player.y / viewport.scale, player.width / viewport.scale, player.height / viewport.scale);
      ctx.fillText(player.nickname, player.x / viewport.scale, (player.y + player.height + (10 * viewport.scale)) / viewport.scale);

      if(cache.toggleMinimap) {
        mctx.fillStyle = '#FFF';
        mctx.fillRect(player.x / config.minimap.scale - 2.5, player.y / config.minimap.scale - 2.5, 5, 5);
        mctx.fillText(player.nickname, player.x / config.minimap.scale - 25, player.y / config.minimap.scale + 10);
      }
    }

    // Drawing all food peaces
    for (food in drawData.Food) {
      var food = drawData.Food[food];
      ctx.beginPath();
      ctx.arc(food.x / viewport.scale, food.y / viewport.scale, food.r / viewport.scale, 0, 2*Math.PI);
      ctx.fillStyle = 'red';
      ctx.fill();
      ctx.strokeStyle = 'rgb(107, 0, 255)';
      ctx.lineWidth = food.w / viewport.scale;
      ctx.stroke();
      ctx.closePath();

      if(cache.toggleMinimap) {
        mctx.beginPath();
        mctx.arc(food.x / config.minimap.scale, food.y / config.minimap.scale, food.r / config.minimap.scale + 1, 0, 2*Math.PI);
        mctx.fillStyle = 'red';
        mctx.fill();
        mctx.closePath();
      }
    }

    if(cache.toggleVPborders) {
      // Add the viewport border
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(viewport.minx / viewport.scale - ctx.lineWidth, viewport.miny / viewport.scale - ctx.lineWidth, (viewport.maxx - viewport.minx) / viewport.scale + ctx.lineWidth + 1, (viewport.maxy - viewport.miny) / viewport.scale + ctx.lineWidth + 1);
    }

    // Drawing map borders
    if(cache.toggleBorders) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, config.map.height / viewport.scale);
      ctx.moveTo(config.map.width / viewport.scale, 0);
      ctx.lineTo(config.map.width / viewport.scale, config.map.height / viewport.scale);
      ctx.moveTo(0, config.map.height / viewport.scale);
      ctx.lineTo(config.map.width / viewport.scale, config.map.height / viewport.scale);
      ctx.moveTo(0, 0);
      ctx.lineTo(config.map.width / viewport.scale, 0);
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = config.map.border.width / viewport.scale;
      ctx.stroke();
    }

    if(cache.toggleInfo) {
      // Drawins FPS, rFPS, X, Y, Players, Ping, Scale
      ctx.fillStyle = '#FFF';
      ctx.fillText('FPS: ' + fps.fps.out, viewport.minx / viewport.scale + 10, viewport.miny / viewport.scale + 15);
      ctx.fillText('rFPS: ' + fps.rfps.out + ' / ' + config.map.fps, viewport.minx / viewport.scale + 6, viewport.miny / viewport.scale + 25);
      ctx.fillText('X,Y: ' + Math.floor(Number(viewport.minx + (config.viewport.width / 2))) + '|' + Math.floor(Number(viewport.miny + (config.viewport.height / 2))), viewport.minx / viewport.scale + 10, viewport.miny / viewport.scale + 35);
      ctx.fillText('Players: ' + info.count.players, viewport.minx / viewport.scale + 10, viewport.miny / viewport.scale + 45);
      ctx.fillText('Ping: ' + cache.ping + ' ms', viewport.minx / viewport.scale + 10, viewport.miny / viewport.scale + 55);
      ctx.fillText('Scale: ' + viewport.scale, viewport.minx / viewport.scale + 10, viewport.miny / viewport.scale + 65);
      ctx.fillText('Size: ' + info.count.size[0] + '|' + info.count.size[1], viewport.minx / viewport.scale + 10, viewport.miny / viewport.scale + 75);
    }
    fps.fps.count++;
    requestAnimationFrame(draw);

  };

  // Reset the fps counter and check ping
  setInterval(function () {
    fps.fps.out = fps.fps.count;
    fps.fps.count = 0;
    fps.rfps.out = fps.rfps.count;
    fps.rfps.count = 0;

    socket.emit('pingCheck', new Date().getTime());
  }, 1000);

  socket.on('pingCheck', function (data) {
    cache.ping = new Date().getTime() - data;
  });

};

// Running init() when document is ready
$(document).ready(init);
