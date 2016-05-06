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
    width: 500,
    defaultScale: 1
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
    speed: 5,
    width: 50,
    height: 50
  },
  minimap: {
    scale: 50
  },
  food: {
    limit: 50
  }
};


var playerCount = 0, foodCount = 0, Objects = {}, Sockets = {}, Intervals = {}, ObjectsInView = {};
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
    log('User disconnected');
  });
});

var Player = function (id, nickname, x, y, socket) {
  this.id = id;
  this.nickname = nickname;
  this.x = x;
  this.y = y;
  this.viewport = {
    minx: x - ((config.viewport.width / 2) * config.viewport.defaultScale) + ((config.player.width / 2) * config.viewport.defaultScale),
    miny: y - ((config.viewport.height / 2) * config.viewport.defaultScale) + ((config.player.height / 2) * config.viewport.defaultScale),
    maxx: x + ((config.viewport.width / 2) * config.viewport.defaultScale) + ((config.player.width / 2) * config.viewport.defaultScale),
    maxy: y + ((config.viewport.height / 2) * config.viewport.defaultScale) + ((config.player.height / 2) * config.viewport.defaultScale),
    scale: config.viewport.defaultScale
  };
  Sockets[id] = socket;
  ObjectsInView[id] = {Players: {}, Food: {}};
  this.keysDown = {};
  this.width = config.player.width;
  this.height = config.player.height;
  this.speed = config.player.speed;

  this.setEmit();
  this.bindKeys();
  this.pingCheck();
};

Player.prototype = {
  setEmit: function () {
    var player = this;
    Intervals[player.id] = setInterval(function () {
      if(player.keysDown[37] == true) { // Left
        if(player.x > 0) {
          player.x = player.x - player.speed;
          player.viewport.minx = player.viewport.minx - player.speed;
          player.viewport.maxx = player.viewport.maxx - player.speed;
        }
      }
      if(player.keysDown[39] == true) { // Right
        if(player.x < config.map.width - config.player.width) {
          player.x = player.x + player.speed;
          player.viewport.minx = player.viewport.minx + player.speed;
          player.viewport.maxx = player.viewport.maxx + player.speed;
        }
      }
      if(player.keysDown[38] == true) { // Up
        if(player.y > 0) {
          player.y = player.y - player.speed;
          player.viewport.miny = player.viewport.miny - player.speed;
          player.viewport.maxy = player.viewport.maxy - player.speed;
        }
      }
      if(player.keysDown[40] == true) { // Down
        if(player.y < config.map.height - config.player.height) {
          player.y = player.y + player.speed;
          player.viewport.miny = player.viewport.miny + player.speed;
          player.viewport.maxy = player.viewport.maxy + player.speed;
        }
      }

      ObjectsInView[player.id] = {Players: {}, Food: {}};

      for (foodPcs in Objects.Food) {
        var food = Objects.Food[foodPcs];

        if(food.x > player.viewport.minx
        && food.x < player.viewport.maxx
        && food.y > player.viewport.miny
        && food.y < player.viewport.maxy) {
          if((player.x + player.width) >= (food.x - food.r - food.w)
          && (player.x) <= (food.x + food.r + food.w)
          && (player.y + player.height) >= (food.y - food.r - food.w)
          && (player.y) <= (food.y + food.r + food.w)) {
            delete Objects.Food[foodPcs];
            player.viewport.scale += 1;
            player.rescaleViewport();
          } else {
            ObjectsInView[player.id].Food[food.id] = Objects.Food[food.id];
          }
        }
      }

      for (players in Objects.Players) {
        if(Objects.Players[players].x + Objects.Players[players].width > player.viewport.minx
          && Objects.Players[players].x < player.viewport.maxx
          && Objects.Players[players].y + Objects.Players[players].height > player.viewport.miny
          && Objects.Players[players].y < player.viewport.maxy) {
          ObjectsInView[player.id].Players[Objects.Players[players].id] = Objects.Players[players];
        }
      }

      Sockets[player.id].emit('drawData', [ObjectsInView[player.id], player.viewport, {count: {players: Object.keys(Objects.Players).length, food: Object.keys(Objects.Food).length}}]);
    }, 1000 / config.map.fps);
  },
  bindKeys: function () {
    var player = this;
    Sockets[player.id].on('keysDown', function (keysDown) {
      player.keysDown = keysDown;
    });
  },
  pingCheck: function () {
    var player = this;
    Sockets[player.id].on('pingCheck', function (data) {
      if(Sockets[player.id]) {
        Sockets[player.id].emit('pingCheck', data);
      }
    });
  },
  rescaleViewport: function () {
    var viewport = this.viewport;
    var player = this;
    /*viewport.minx = player.x - (((config.viewport.width / 2) * viewport.scale) - (((player.width / 2) * viewport.scale) / 2));
    viewport.miny = player.y - (((config.viewport.height / 2) * viewport.scale) - (((player.height / 2) * viewport.scale) / 2));
    viewport.maxx = player.x + (((config.viewport.width / 2) * viewport.scale));
    viewport.maxy = player.y + (((config.viewport.height / 2) * viewport.scale));*/

    /*player.viewport = {
      minx: player.x - ((config.viewport.width / 2) * viewport.scale) + ((player.width / 2) * viewport.scale),
      miny: player.y - ((config.viewport.height / 2) * viewport.scale) + ((player.height / 2) * viewport.scale),
      maxx: player.x + ((config.viewport.width / 2) * viewport.scale) + ((player.width / 2) * viewport.scale),
      maxy: player.y + ((config.viewport.height / 2) * viewport.scale) + ((player.height / 2) * viewport.scale),
      scale: viewport.scale
    };*/

    viewport.minx = player.x - ((config.viewport.width * viewport.scale) / 2) + (player.width / 2);
    viewport.maxx = player.x + ((config.viewport.width * viewport.scale) / 2) - (player.width / 2);

    viewport.miny = player.y - ((config.viewport.height * viewport.scale) / 2) + (player.height / 2);
    viewport.maxy = player.y + ((config.viewport.height * viewport.scale) / 2) - (player.height / 2);
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
  if(Object.keys(Objects.Food).length < config.food.limit) {
    foodCount++;
    Objects.Food[foodCount] = new Food(foodCount, getRandomValue(100, 4900), getRandomValue(100, 4900), getRandomValue(5, 10), getRandomValue(5, 10));
  }
}, 100);
