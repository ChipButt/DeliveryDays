// Delivery Days hub visual override.
// Hubs use a 2x2 delivery depot icon with built-in driver, loading, and manager indicators.
(function(){
  const previousSizeOf = sizeOf;
  sizeOf = function(n){
    if(n.type === 'hub') return { w: GRID * 2, h: GRID * 2 };
    return previousSizeOf(n);
  };

  function accentFor(n){
    return HUB?.[n.colour] || C.yellow;
  }

  function rounded(x,y,w,h,r){
    if(ctx.roundRect){
      ctx.roundRect(x,y,w,h,r);
      return;
    }
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
  }

  function drawHubBuilding(n){
    const x = n.x;
    const y = n.y;
    const accent = accentFor(n);

    ctx.save();

    // Building shadow
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    ctx.beginPath();
    rounded(x - 31 + 4, y - 23 + 6, 62, 44, 8);
    ctx.fill();

    // Main depot block
    fill(x - 31, y - 23, 62, 44, 8, '#efe6d0');
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    rounded(x - 31, y - 23, 62, 44, 8);
    ctx.stroke();

    // Coloured roof/sign strip
    fill(x - 31, y - 32, 62, 13, 6, accent);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    rounded(x - 31, y - 32, 62, 13, 6);
    ctx.stroke();

    // Raised office/control room
    fill(x - 16, y - 43, 32, 17, 6, '#f7efda');
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    rounded(x - 16, y - 43, 32, 17, 6);
    ctx.stroke();
    ctx.fillStyle = '#dff4ff';
    ctx.fillRect(x - 11, y - 38, 6, 5);
    ctx.fillRect(x - 2, y - 38, 6, 5);
    ctx.fillRect(x + 7, y - 38, 6, 5);

    // Loading bay shutters
    for(const bx of [-20, 4]){
      fill(x + bx, y - 6, 17, 20, 3, '#d6dce2');
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(x + bx, y - 6, 17, 20);
      ctx.strokeStyle = 'rgba(48,55,61,.32)';
      ctx.lineWidth = 1;
      for(let yy = y - 1; yy <= y + 10; yy += 4){
        ctx.beginPath();
        ctx.moveTo(x + bx + 1, yy);
        ctx.lineTo(x + bx + 16, yy);
        ctx.stroke();
      }
    }

    // Pedestrian door
    fill(x - 4, y + 2, 8, 12, 2, '#7a5a43');

    // Small parcel blocks in hub colour
    fill(x - 28, y + 9, 8, 6, 2, accent);
    fill(x + 20, y + 9, 8, 6, 2, accent);

    // Driver availability badge built into the hub
    fill(x - 24, y + 24, 48, 22, 10, 'rgba(251,250,244,.98)');
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    rounded(x - 24, y + 24, 48, 22, 10);
    ctx.stroke();
    txt(`${n.idle}/${n.drivers}`, x, y + 35, 15, n.idle ? C.ink : C.red, 'center', true);

    // Loading indicator
    if(n.loading?.length){
      const job = n.loading[0];
      const frac = Math.max(0, Math.min(1, 1 - job.time / job.total));
      const cx = x + 34, cy = y - 30, r = 10;
      ctx.fillStyle = 'rgba(251,250,244,.98)';
      ctx.beginPath();
      ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      txt(String(n.loading.length), cx, cy, 9, C.ink, 'center', true);
    }

    // Hub manager badge
    if(n.manager){
      ctx.fillStyle = C.teal;
      ctx.beginPath();
      ctx.arc(x + 34, y + 24, 10, 0, Math.PI * 2);
      ctx.fill();
      txt('M', x + 34, y + 24, 10, 'white', 'center', true);
    }

    ctx.restore();

    txt(n.name || 'Hub', n.x, n.y + 57, 11, C.ink, 'center', true);
    txt((n.colour || 'hub') + ' hub', n.x, n.y + 71, 9, C.ink, 'center', true);
  }

  const previousDrawNode = drawNode;
  drawNode = function(n){
    if(n.type !== 'hub') return previousDrawNode(n);
    drawHubBuilding(n);
  };
})();
