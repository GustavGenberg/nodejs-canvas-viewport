var express = require('express');
var io = require('socket.io')(3000);
var app = express();

app.use(express.static(__dirname + '/www/'));
app.listen(2000, function () {
  console.log('Express app listening on port ' + 2000);
});

var log = function (data) {
  console.log(data);
};

var getRandomValue = function (a, b) {
  return Math.floor(Math.random() * b) + a;
};

var config = {
  viewport: {
    height: 500,
    width: 500
  },
  map: {
    height: 5000,
    width: 5000,
    fps: 60,
    bg: '/bg.jpg',
    border: {
      width: 10
    }
  },
  player: {
    speed: 2,
    width: 50,
    height: 50
  },
  minimap: {
    scale: 50
  }
};


var playerCount = 0, foodCount = 0, Objects = {}, Sockets = {}, Intervals = {};
Objects.Players = {};
Objects.Food = {};

io.on('connect', function (socket) {
  playerCount++;
  Objects.Players[playerCount] = new Player (playerCount, 'Unnamed' + getRandomValue(0, 100), getRandomValue(0, config.map.width / 10) * 10, getRandomValue(0, config.map.height / 10) * 10, socket);

  log('user connected');
  socket.emit('config', config);

  socket.on('disconnect', function () {
    clearInterval(Intervals[playerCount]);
    delete Sockets[playerCount];
    delete Objects.Players[playerCount];
  });
});

var Player = function (id, nickname, x, y, socket) {
  this.id = id;
  this.nickname = nickname;
  this.x = x;
  this.y = y;
  this.viewport = {
    minx: x - (config.viewport.width / 2) + (config.player.width / 2),
    miny: y - (config.viewport.height / 2) + (config.player.width / 2),
    maxx: x + (config.viewport.width / 2) + (config.player.width / 2),
    maxy: y + (config.viewport.height / 2) + (config.player.width / 2)
  };
  Sockets[id] = socket;
  this.keysDown = {};
  this.width = config.player.width;
  this.height = config.player.height;

  this.setEmit();
  this.bindKeys();
};

Player.prototype = {
  setEmit: function () {
    var player = this;
    Intervals[player.id] = setInterval(function () {
      if(player.keysDown[37] == true) { // Left
        if(player.x > 0) {
          player.x = player.x - config.player.speed;
          player.viewport.minx = player.viewport.minx - config.player.speed;
          player.viewport.maxx = player.viewport.maxx - config.player.speed;
        }
      }
      if(player.keysDown[39] == true) { // Right
        if(player.x < config.map.width - config.player.width) {
          player.x = player.x + config.player.speed;
          player.viewport.minx = player.viewport.minx + config.player.speed;
          player.viewport.maxx = player.viewport.maxx + config.player.speed;
        }
      }
      if(player.keysDown[38] == true) { // Up
        if(player.y > 0) {
          player.y = player.y - config.player.speed;
          player.viewport.miny = player.viewport.miny - config.player.speed;
          player.viewport.maxy = player.viewport.maxy - config.player.speed;
        }
      }
      if(player.keysDown[40] == true) { // Down
        if(player.y < config.map.height - config.player.height) {
          player.y = player.y + config.player.speed;
          player.viewport.miny = player.viewport.miny + config.player.speed;
          player.viewport.maxy = player.viewport.maxy + config.player.speed;
        }
      }

      for (foodPcs in Objects.Food) {
        var food = Objects.Food[foodPcs];
        if((player.x + player.width) >= (food.x - food.r - food.w)
        && (player.x) <= (food.x + food.r + food.w)
        && (player.y + player.height) >= (food.y - food.r - food.w)
        && (player.y) <= (food.y + food.r + food.w)) {
          delete Objects.Food[foodPcs];
        }
      }

      Sockets[player.id].emit('drawData', [Objects, player.viewport]);
    }, 1000 / config.map.fps);
  },
  bindKeys: function () {
    var player = this;
    Sockets[player.id].on('keysDown', function (keysDown) {
      player.keysDown = keysDown;
    });
  }
};

var Food = function (id, x, y, r, w) {
  this.id = id;
  this.x = x;
  this.y = y;
  this.r = r;
  this.w = w;
};

setInterval(function () {
  if(Object.keys(Objects.Food).length < 20) {
    foodCount++;
    Objects.Food[foodCount] = new Food(foodCount, getRandomValue(100, 4900), getRandomValue(100, 4900), getRandomValue(5, 10), getRandomValue(5, 10));
  }
}, 1000);
