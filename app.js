var express = require('express');
var io = require('socket.io')(3000);
var app = express();
var util = require('util');

app.use(express.static(__dirname + '/www/'));
app.listen(2000, function () {
  console.log('Express app listening on port ' + 2000);
});

var log = function (data) {
  console.log(data);
};

// Command Line
var lastCommand = 'quit';
process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', function (command) {
  command = command.replace('\n', '');

  // Commands
  var Commands = {
    quit: {
      call: function () {
        process.exit();
      }
    },
    reset: {
      call: function () {
        Map.Reset();
      }
    },
    '': {
      call: function () {
        Commands[lastCommand].call();
      }
    }
  }

  if(Commands[command]) {
    Commands[command].call();
    if(command !== '') {
      lastCommand = command;
    }
    log('The command "' + lastCommand + '" was successfully executed!');
  } else {
    log('not found');
  }

});
// END Comamnd Line

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
    height: 50,
    reduceLimit: 100 * 100,
    sizeLimit: 1000 * 1000
  },
  minimap: {
    scale: 50
  },
  food: {
    limit: 100
  }
};


var playerCount = 0, foodCount = 0, Objects = {}, Sockets = {}, Intervals = {}, ObjectsInView = {}, Map = {};
Objects.Players = {};
Objects.Food = {};

io.on('connect', function (socket) {
  playerCount++;
  Objects.Players[playerCount] = new Player (playerCount, 'Unnamed' + getRandomValue(0, 100), getRandomValue(0, config.map.width / 10) * 10, getRandomValue(0, config.map.height / 10) * 10, socket);

  log('User connected');

  setTimeout(function () {
    socket.emit('config', config);
  }, 100);
});

Map.Reset = function () {
  for(player in Objects.Players) {
    Objects.Players[player].x = getRandomValue(0, config.map.width / 10) * 10;
    Objects.Players[player].y = getRandomValue(0, config.map.height / 10) * 10;
    Objects.Players[player].viewport = {
      minx: Objects.Players[player].x - ((config.viewport.width / 2) * config.viewport.defaultScale) + ((config.player.width / 2) * config.viewport.defaultScale),
      miny: Objects.Players[player].y - ((config.viewport.height / 2) * config.viewport.defaultScale) + ((config.player.height / 2) * config.viewport.defaultScale),
      maxx: Objects.Players[player].x + ((config.viewport.width / 2) * config.viewport.defaultScale) + ((config.player.width / 2) * config.viewport.defaultScale),
      maxy: Objects.Players[player].y + ((config.viewport.height / 2) * config.viewport.defaultScale) + ((config.player.height / 2) * config.viewport.defaultScale),
      scale: config.viewport.defaultScale
    };
    Objects.Players[player].width = config.player.width;
    Objects.Players[player].height = config.player.height;
    Objects.Players[player].speed = config.player.speed;
  }

  for(food in Objects.Food) {
    delete Objects.Food[food];
  }
};

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
  this.bindEvents();
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
        if(player.x < config.map.width - player.width) {
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
        if(player.y < config.map.height - player.height) {
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
            if(player.width * player.height < config.player.sizeLimit) {
              player.reSize(player.width + food.r, player.height + food.r, player.viewport.scale + (0.01 * food.r));
            }
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

          if((player.x + player.width) >= (Objects.Players[players].x)
          && (player.x) <= (Objects.Players[players].x + Objects.Players[players].width)
          && (player.y + player.height) >= (Objects.Players[players].y)
          && (player.y) <= (Objects.Players[players].y + Objects.Players[players].height)) {

            if(player.id !== Objects.Players[players].id) {
              if(player.width * player.height > Objects.Players[players].width * Objects.Players[players].height) {
                if(player.width * player.height < config.player.sizeLimit) {
                  player.reSize(player.width + Objects.Players[players].width, player.height + Objects.Players[players].height, player.viewport.scale + (0.01 * (Objects.Players[players].height + Objects.Players[players].width) / 2));
                }
                Objects.Players[players].reSpawn();
              }
            }

          }
        }
      }

      if(player.width * player.height > config.player.reduceLimit) {
        player.reSize(player.width - 0.05, player.height - 0.05, player.viewport.scale - 0.0005);
      }

      Sockets[player.id].emit('drawData', [ObjectsInView[player.id], player.viewport, {count: {players: Object.keys(Objects.Players).length, food: Object.keys(Objects.Food).length, size: [player.width, player.height]}}]);
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
    viewport.maxx = player.x - ((config.viewport.width * viewport.scale) / 2) + (player.width / 2) + (config.viewport.width * viewport.scale);

    viewport.miny = player.y - ((config.viewport.height * viewport.scale) / 2) + (player.height / 2);
    viewport.maxy = player.y - ((config.viewport.height * viewport.scale) / 2) + (player.height / 2) + (config.viewport.height * viewport.scale);

    /*viewport.minx = player.x - ((config.viewport.width * viewport.scale) / 2) + ((player.width / viewport.scale) / 2);
    viewport.maxx = player.x - ((config.viewport.width * viewport.scale) / 2) + ((player.width / viewport.scale) / 2) + (config.viewport.width * viewport.scale);

    viewport.miny = player.y - ((config.viewport.height * viewport.scale) / 2) + ((player.height / viewport.scale) / 2);
    viewport.maxy = player.y - ((config.viewport.height * viewport.scale) / 2) + ((player.height / viewport.scale) / 2) + (config.viewport.height * viewport.scale);
  */
  },
  reSize: function (w, h, s) {
    var player = this;

    player.viewport.scale = s;

    if(w > player.width) {
      player.x -= ((w - player.width) / 2);
      player.y -= ((h - player.height) / 2);
    }
    if(w < player.width) {
      player.x += ((player.width - w) / 2);
      player.y += ((player.height - h) / 2);
    }
    if(h > player.hieght) {
      player.x -= ((w - player.width) / 2);
      player.y -= ((h - player.height) / 2);
    }
    if(h < player.height) {
      player.x += ((player.width - w) / 2);
      player.y += ((player.height - h) / 2);
    }

    player.width = w;
    player.height = h;

    player.rescaleViewport();

  },
  bindEvents: function () {
    var player = this;
    Sockets[player.id].on('disconnect', function (r) {
      clearInterval(Intervals[player.id]);
      delete Sockets[player.id];
      delete Objects.Players[player.id];
      log('User disconnected | ' + r);
    });
  },
  reSpawn: function () {
    this.x = getRandomValue(0, config.map.width / 10) * 10;
    this.y = getRandomValue(0, config.map.height / 10) * 10;
    this.viewport = {
      minx: this.x - ((config.viewport.width / 2) * config.viewport.defaultScale) + ((config.player.width / 2) * config.viewport.defaultScale),
      miny: this.y - ((config.viewport.height / 2) * config.viewport.defaultScale) + ((config.player.height / 2) * config.viewport.defaultScale),
      maxx: this.x + ((config.viewport.width / 2) * config.viewport.defaultScale) + ((config.player.width / 2) * config.viewport.defaultScale),
      maxy: this.y + ((config.viewport.height / 2) * config.viewport.defaultScale) + ((config.player.height / 2) * config.viewport.defaultScale),
      scale: config.viewport.defaultScale
    };
    this.width = config.player.width;
    this.height = config.player.height;
    this.speed = config.player.speed;
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
