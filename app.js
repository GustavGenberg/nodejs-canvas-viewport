var express = require('express');
var io = require('socket.io')(3000);
var app = express();


app.use(express.static(__dirname + '/www/'));
app.listen(2000, function () {
  console.log('Express app listening on port ' + 2000);
});



var playerCount = 0, Players = {};

io.on('connect', function (socket) {
  playerCount++;
  Players[playerCount] = new Player (playerCount, 'Unnamed', 10, 10, socket);
});

var Player = function (id, nickname, x, y, socket) {
  this.id = id;
  this.nickname = nickname;
  this.x = x;
  this.y = y;
  this.socket = socket;
};

Player.prototype = {

};
