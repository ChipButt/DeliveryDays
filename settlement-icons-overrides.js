// Delivery Days settlement icon overrides.
// Villages, towns, and cities are drawn as plain building icons with no circle/square badge backgrounds.
(function(){
  sizeOf = function(n){
    if(n.type === 'hub') return { w: 60, h: 60 };
    if(n.type === 'village') return { w: GRID, h: GRID };
    if(n.type === 'town') return { w: GRID * 2, h: GRID };
    return { w: GRID * 2, h: GRID * 2 };
  };

  function shadow(dx=3, dy=4){
    ctx.save();
    ctx.translate(dx, dy);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#000';
  }

  function drawHouse(cx, cy, scale=1, body='#f3e3bf', roof='#d96f5e'){
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath();
    ctx.moveTo(-13 + 3, -2 + 4);
    ctx.lineTo(0 + 3, -14 + 4);
    ctx.lineTo(13 + 3, -2 + 4);
    ctx.lineTo(10 + 3, 1 + 4);
    ctx.lineTo(10 + 3, 16 + 4);
    ctx.lineTo(-10 + 3, 16 + 4);
    ctx.lineTo(-10 + 3, 1 + 4);
    ctx.closePath();
    ctx.fill();

    // roof
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(-14, -2);
    ctx.lineTo(0, -15);
    ctx.lineTo(14, -2);
    ctx.lineTo(10, 2);
    ctx.lineTo(-10, 2);
    ctx.closePath();
    ctx.fill();

    // body
    ctx.fillStyle = body;
    ctx.fillRect(-10, 2, 20, 15);

    // outline
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeRect(-10, 2, 20, 15);
    ctx.beginPath();
    ctx.moveTo(-14, -2);
    ctx.lineTo(0, -15);
    ctx.lineTo(14, -2);
    ctx.stroke();

    // door and windows
    ctx.fillStyle = '#735238';
    ctx.fillRect(-2.7, 9, 5.4, 8);
    ctx.fillStyle = '#dff4ff';
    ctx.fillRect(-7.5, 6, 4.2, 4.2);
    ctx.fillRect(3.3, 6, 4.2, 4.2);

    ctx.restore();
  }

  function drawSemiHouse(cx, cy, scale=1, body='#f3e3bf', roof='#d96f5e'){
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(0,0,0,.16)';
    ctx.beginPath();
    ctx.moveTo(-16 + 3, -1 + 4);
    ctx.lineTo(0 + 3, -13 + 4);
    ctx.lineTo(16 + 3, -1 + 4);
    ctx.lineTo(13 + 3, 2 + 4);
    ctx.lineTo(13 + 3, 16 + 4);
    ctx.lineTo(-13 + 3, 16 + 4);
    ctx.lineTo(-13 + 3, 2 + 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(-17, -1);
    ctx.lineTo(0, -14);
    ctx.lineTo(17, -1);
    ctx.lineTo(13, 2);
    ctx.lineTo(-13, 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = body;
    ctx.fillRect(-13, 2, 26, 15);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeRect(-13, 2, 26, 15);
    ctx.beginPath();
    ctx.moveTo(-17, -1);
    ctx.lineTo(0, -14);
    ctx.lineTo(17, -1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(0, 17);
    ctx.stroke();

    ctx.fillStyle = '#735238';
    ctx.fillRect(-5, 9, 4, 8);
    ctx.fillRect(1, 9, 4, 8);
    ctx.fillStyle = '#dff4ff';
    ctx.fillRect(-10, 6, 3.6, 3.6);
    ctx.fillRect(6.4, 6, 3.6, 3.6);

    ctx.restore();
  }

  function drawTower(cx, cy, w, h, body='#c7d2db', top='#879bad'){
    ctx.save();

    ctx.fillStyle = 'rgba(0,0,0,.16)';
    ctx.fillRect(cx - w/2 + 3, cy - h/2 + 4, w, h);

    ctx.fillStyle = body;
    ctx.fillRect(cx - w/2, cy - h/2, w, h);
    ctx.fillStyle = top;
    ctx.fillRect(cx - w/2, cy - h/2, w, 5);

    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.7;
    ctx.strokeRect(cx - w/2, cy - h/2, w, h);

    ctx.fillStyle = '#eef7fb';
    for(let yy = cy - h/2 + 9; yy < cy + h/2 - 5; yy += 7){
      for(let xx = cx - w/2 + 4; xx < cx + w/2 - 3; xx += 6){
        ctx.fillRect(xx, yy, 3, 3);
      }
    }
    ctx.restore();
  }

  function drawVillageIcon(n){
    drawHouse(n.x, n.y - 2, 1.0, '#f1dfb8', '#d96f5e');
  }

  function drawTownIcon(n){
    // Three semi-detached house icons across a 2x1 tile footprint.
    drawSemiHouse(n.x - 20, n.y - 1, 0.72, '#f3e1bc', '#d86d59');
    drawSemiHouse(n.x,      n.y - 3, 0.78, '#f6e8c7', '#c96353');
    drawSemiHouse(n.x + 20, n.y - 1, 0.72, '#f3e1bc', '#d86d59');
  }

  function drawCityIcon(n){
    // Two houses plus two tower blocks inside a 2x2 tile footprint.
    drawTower(n.x - 12, n.y - 10, 16, 31, '#c9d2d8', '#90a3b3');
    drawTower(n.x + 13, n.y - 12, 18, 38, '#bfcbd4', '#8095aa');
    drawHouse(n.x - 17, n.y + 15, 0.70, '#f1e0b8', '#d96f5e');
    drawHouse(n.x + 8,  n.y + 17, 0.66, '#eed8ad', '#cf6855');
  }

  const previousDrawNode = drawNode;

  drawNode = function(n){
    if(n.type === 'hub'){
      previousDrawNode(n);
      return;
    }

    demandPin(n);

    ctx.save();
    if(n.type === 'village'){
      drawVillageIcon(n);
      txt(n.name || 'Unnamed', n.x, n.y + 25, 11, C.ink, 'center', true);
    } else if(n.type === 'town'){
      drawTownIcon(n);
      txt(n.name || 'Unnamed', n.x, n.y + 25, 11, C.ink, 'center', true);
    } else {
      drawCityIcon(n);
      txt(n.name || 'Unnamed', n.x, n.y + 43, 11, C.ink, 'center', true);
    }
    ctx.restore();
  };
})();
