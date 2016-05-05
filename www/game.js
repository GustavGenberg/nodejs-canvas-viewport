var init = function () {

  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var minimap = document.createElement('canvas');
  var mctx = minimap.getContext('2d');
  var socket = io(':3000');
  var fps = {fps: {out: 0, count: 0},rfps: {out: 0, count: 0}};
  var drawData = {}, viewport = {};
  var config;
  var cache = {};
  var keysDown = {};
  var image = {};
  var disconnected = false;

  cache.viewport = {x: 0, y: 0};

  var getRandomValue = function (a, b) {
    return Math.floor(Math.random() * b) + a;
  };

  var log = function (data) {
    console.log(data);
  };

  document.addEventListener('keydown', function (event) {
    keysDown[event.keyCode] = true;
  });
  document.addEventListener('keyup', function (event) {
    delete keysDown[event.keyCode];
  });

  socket.on('connect', function () {

    if(disconnected) { setTimeout(function () { location.reload() }, 100); }

    socket.on('disconnect', function () {
      disconnected = true;
    });

    socket.on('config', function (data) {
      config = data;

      canvas.width = config.viewport.width;
      canvas.height = config.viewport.height;
      canvas.id = 'game';
      minimap.width = config.map.width / config.minimap.scale;
      minimap.height = config.map.height / config.minimap.scale;
      minimap.style.border = '1px solid red';
      minimap.id = 'minimap';
      document.body.appendChild(canvas);
      document.body.appendChild(minimap);

      image.background = new Image();
      image.background.src = config.map.bg;

      image.background.onload = draw;
    });

  });

  socket.on('drawData', function (data) {
    fps.rfps.count++;
    drawData = data[0];
    viewport = data[1];
  });

  ctx.globalCompositeOperation='destination-over';

  var draw = function () {

    socket.emit('keysDown', keysDown);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, config.viewport.width, config.viewport.height);
    mctx.clearRect(0, 0, minimap.width, minimap.height);

    ctx.translate(-viewport.minx, -viewport.miny);

    for(var i = -1;i*image.background.width < config.map.width + image.background.width;i++) {
      for(var j = -1;j*image.background.height < config.map.height + image.background.height;j++) {
        ctx.drawImage(image.background, i*image.background.width, j*image.background.height);
      }
    }


    for (player in drawData.Players) {
      var player = drawData.Players[player];
      ctx.fillStyle = '#FFF';
      ctx.fillRect(player.x, player.y, config.player.width, config.player.height);
      ctx.fillText(player.nickname, player.x, player.y + config.player.height + 20);

      mctx.fillStyle = '#FFF';
      mctx.fillRect(player.x / config.minimap.scale, player.y / config.minimap.scale, 5, 5);
      mctx.fillText(player.nickname, player.x / config.minimap.scale - 25, player.y / config.minimap.scale + 15);
    }

    ctx.fillText('FPS: ' + fps.fps.out, viewport.minx + 10, viewport.miny + 15);
    ctx.fillText('rFPS: ' + fps.rfps.out + ' / ' + config.map.fps, viewport.minx + 6, viewport.miny + 25);
    ctx.fillText('X, Y: ' + Number(viewport.minx + (config.viewport.width / 2)) + ' : ' + Number(viewport.miny + (config.viewport.height / 2)), viewport.minx + 10, viewport.miny + 35);


    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, config.map.height);
    ctx.moveTo(config.map.width, 0);
    ctx.lineTo(config.map.width, config.map.height);
    ctx.moveTo(0, config.map.height);
    ctx.lineTo(config.map.width, config.map.height);
    ctx.moveTo(0, 0);
    ctx.lineTo(config.map.width, 0);
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = config.map.border.width;
    ctx.stroke();

    fps.fps.count++;
    requestAnimationFrame(draw);

  };

  setInterval(function () {
    fps.fps.out = fps.fps.count;
    fps.fps.count = 0;
    fps.rfps.out = fps.rfps.count;
    fps.rfps.count = 0;
  }, 1000);

};

$(document).ready(init);
