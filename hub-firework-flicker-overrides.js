// Delivery Days hub firework flicker override.
// Replaces any remaining harsh sparkle feel with a subtle hub asset flicker and small white firework-burst pixels.
(function(){
  const seenUpgradeSignature = new Map();

  function affordable(h){
    if(!S.g || !h || h.type !== 'hub') return [];
    const g = S.g, cp = g.caps, out = [];
    if(h.drivers < cp.drivers && g.cash >= driverCost(h)) out.push('driver');
    if(h.loadLv < cp.load && g.cash >= loadCost(h)) out.push('load');
    if(h.speedLv < cp.speed && g.cash >= speedCost(h)) out.push('speed');
    if(h.packLv < cp.pack && g.cash >= packCost(h)) out.push('pack');
    if(!h.manager && g.cash >= managerCost(h)) out.push('manager');
    return out;
  }

  function sig(h){ return affordable(h).join('|'); }
  function shouldSignal(h){
    const s = sig(h);
    return !!s && seenUpgradeSignature.get(h.id) !== s;
  }
  function markSeen(h){ if(h?.type === 'hub') seenUpgradeSignature.set(h.id, sig(h)); }

  function fireworkPixels(cx, cy, w, h, spread, burstCount, seed){
    const t = performance.now() / 1000;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.shadowColor = 'rgba(255,255,255,.75)';
    ctx.shadowBlur = 2;

    for(let b = 0; b < burstCount; b++){
      const cycle = (t * 1.15 + b * 0.37 + seed * 0.013) % 1;
      if(cycle > 0.64) continue;
      const life = cycle / 0.64;
      const alpha = (1 - life) * 0.72;
      const side = (b + Math.floor(seed)) % 4;
      const u = ((b * 41 + Math.floor(seed)) % 100) / 100;

      let bx, by;
      if(side === 0){ bx = cx - w / 2 + u * w; by = cy - h / 2 - spread * 0.45; }
      else if(side === 1){ bx = cx + w / 2 + spread * 0.45; by = cy - h / 2 + u * h; }
      else if(side === 2){ bx = cx - w / 2 + u * w; by = cy + h / 2 + spread * 0.45; }
      else { bx = cx - w / 2 - spread * 0.45; by = cy - h / 2 + u * h; }

      const particles = 5;
      for(let i = 0; i < particles; i++){
        const a = (Math.PI * 2 / particles) * i + b * 0.7;
        const r = life * spread;
        const x = bx + Math.cos(a) * r;
        const y = by + Math.sin(a) * r;
        ctx.globalAlpha = Math.max(0, alpha * (0.65 + i * 0.07));
        ctx.fillRect(Math.round(x), Math.round(y), 1.5, 1.5);
      }
    }
    ctx.restore();
  }

  function drawHubFlicker(n){
    if(!shouldSignal(n)) return;
    const t = performance.now() / 1000;
    const flicker = 0.045 + (Math.sin(t * 7.5 + n.x * 0.02) + 1) * 0.025;

    // Subtle asset-wide white flicker, clipped roughly to the 2x2 hub footprint.
    ctx.save();
    ctx.globalAlpha = flicker;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.roundRect(n.x - GRID, n.y - GRID, GRID * 2, GRID * 2, 12);
    ctx.fill();
    ctx.restore();

    // Small white firework-style sparkle bursts around the footprint.
    fireworkPixels(n.x, n.y, GRID * 2, GRID * 2, 10, 7, n.x + n.y);
  }

  const previousDrawNode = drawNode;
  drawNode = function(n){
    previousDrawNode(n);
    if(n.type === 'hub') drawHubFlicker(n);
  };

  function panelPosBeside(n,w,h){
    const sx = (n.x - S.cam.x) * S.cam.z, sy = (n.y - S.cam.y) * S.cam.z;
    let x = sx + 46, y = sy - h / 2;
    if(x + w > W - 10) x = sx - w - 46;
    x = Math.max(10, Math.min(W - w - 10, x));
    y = Math.max(60, Math.min(H - h - 12, y));
    return {x,y,w,h};
  }

  function buttonFlicker(x,y,w,h,seed){
    const t = performance.now() / 1000;
    ctx.save();
    ctx.globalAlpha = 0.035 + (Math.sin(t * 8 + seed) + 1) * 0.018;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.restore();
    fireworkPixels(x + w / 2, y + h / 2, w, h, 5, 4, seed);
  }

  hubPanel = function(h){
    markSeen(h);
    const b = panelPosBeside(h,520,200), g = S.g, cp = g.caps;
    card(b.x,b.y,b.w,b.h);
    txt(h.name,b.x+b.w/2,b.y+24,21,HUB[h.colour]||C.ink,'center',true);
    txt(`Drivers ${h.idle}/${h.drivers}   Loading ${h.loading.length}`,b.x+b.w/2,b.y+48,13,C.ink,'center');
    txt(`Load L${h.loadLv}/${cp.load} | Speed L${h.speedLv}/${cp.speed} | Cap ${h.packLv}/${cp.pack}`,b.x+b.w/2,b.y+70,12,C.ink,'center');
    txt(h.manager?'Manager hired':'Manual dispatch',b.x+b.w/2,b.y+92,13,h.manager?C.teal:C.red,'center',true);

    const buttons = [
      ['driver','buyDriver',h.drivers<cp.drivers?`Driver £${driverCost(h)}`:'Drivers Max',b.x+22,b.y+112,150,25,h.drivers<cp.drivers&&g.cash>=driverCost(h)?'teal':'pale'],
      ['load','buyLoad',h.loadLv<cp.load?`Loading £${loadCost(h)}`:'Loading Max',b.x+185,b.y+112,150,25,h.loadLv<cp.load&&g.cash>=loadCost(h)?'teal':'pale'],
      ['speed','buySpeed',h.speedLv<cp.speed?`Speed £${speedCost(h)}`:'Speed Max',b.x+348,b.y+112,150,25,h.speedLv<cp.speed&&g.cash>=speedCost(h)?'teal':'pale'],
      ['pack','buyPack',h.packLv<cp.pack?`Capacity +1 £${packCost(h)}`:'Capacity Max',b.x+104,b.y+148,150,25,h.packLv<cp.pack&&g.cash>=packCost(h)?'teal':'pale'],
      ['manager','buyManager',h.manager?'Manager Active':`Manager £${managerCost(h)}`,b.x+267,b.y+148,150,25,!h.manager&&g.cash>=managerCost(h)?'teal':'pale']
    ];
    const aff = affordable(h);
    for(const [key,id,label,x,y,w,hgt,style] of buttons){
      btn(id,label,x,y,w,hgt,style,12);
      if(aff.includes(key)) buttonFlicker(x,y,w,hgt,x+y);
    }
  };

  const previousStart = start;
  start = function(level){
    previousStart(level);
    seenUpgradeSignature.clear();
  };

  const previousAction = action;
  action = function(id){
    const activeHub = S.panel && S.panel.type === 'hub' ? S.panel : null;
    const out = previousAction(id);
    if(activeHub && ['buyDriver','buyLoad','buySpeed','buyPack','buyManager'].includes(id)) markSeen(activeHub);
    if(S.panel?.type === 'hub') markSeen(S.panel);
    return out;
  };
})();
