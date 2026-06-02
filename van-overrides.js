// Delivery Days van overrides: faster default movement and hub-coloured vans.
(function(){
  const previousVanSpeed = vanSpeed;
  vanSpeed = function(h){
    return previousVanSpeed(h) * 2;
  };

  drawVan = function(t){
    const p = truckPoint(t);
    const hubColour = HUB?.[t.colour] || t.col || C.yellow;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ang + Math.PI / 2);
    ctx.translate(-5, 0);

    // Always use the originating hub colour, including return journeys.
    fill(-4, -8, 8, 16, 3, hubColour);

    ctx.fillStyle = 'rgba(255,255,255,.86)';
    ctx.beginPath();
    ctx.moveTo(-2.7, -5.5);
    ctx.lineTo(2.7, -5.5);
    ctx.lineTo(2.2, -1.8);
    ctx.lineTo(-2.2, -1.8);
    ctx.closePath();
    ctx.fill();

    fill(-2.5, 1.5, 5, 4, 2, 'rgba(255,255,255,.52)');

    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -7.2);
    ctx.lineTo(0, 6.8);
    ctx.stroke();

    ctx.fillStyle = C.ink;
    ctx.fillRect(-5, -5.5, 1.6, 4);
    ctx.fillRect(3.4, -5.5, 1.6, 4);
    ctx.fillRect(-5, 2.5, 1.6, 4);
    ctx.fillRect(3.4, 2.5, 1.6, 4);

    if (t.packages > 1) txt(String(t.packages), 0, 0, 7, 'white', 'center', true);
    if (t.returning) {
      ctx.fillStyle = 'rgba(48,55,61,.35)';
      ctx.beginPath();
      ctx.arc(0, 10, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (t.wait) {
      ctx.fillStyle = C.red;
      ctx.beginPath();
      ctx.arc(0, -12, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };
})();
