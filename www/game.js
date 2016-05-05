var init = function () {
  var canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 500;
  canvas.style.border = '1px solid red';
  document.body.appendChild(canvas);
};

$(document).ready(init);
