// Delivery Days layering, delivery dot, bridge blend, and spacing override.
// Vans draw under hubs/settlements, delivery status dots distinguish waiting vs assigned, bridges blend like roads, and new locations keep 2+ tiles apart.
(function(){
  function nodeDistance(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
  function isLocation(n){ return n && n.type !== 'hub'; }

  // Draw order: background -> roads/bridges -> vans -> buildings/locations.
  // This lets vans visually leave/enter hubs instead of driving over the building art.
  drawMap = function(){
    bg();
    roads();
    S.g.vans.forEach(drawVan);
    S.g.nodes.forEach(drawNode);
  };

  function locationStatusCounts(n){
    const out = {};
    for(const r of activeReq(n)){
      const c = r.colour || 'yellow';
      if(!out[c]) out[c] = { waiting:0, assigned:0, late:false, urgent:false, minDue:999 };
      if(r.status === 'waiting') out[c].waiting++;
      else out[c].assigned++;
      if(r.late) out[c].late = true;
      if(r.due <= 2) out[c].urgent = true;
      out[c].minDue = Math.min(out[c].minDue, r.due);
    }
    return out;
  }

  // Main delivery circles: solid count = waiting. Smaller offset dot = assigned/loading/en route.
  demandPin = function(n){
    if(!isLocation(n)) return;
    const counts = locationStatusCounts(n);
    const colours = Object.keys(counts).sort();
    if(!colours.length) return;

    const sz = sizeOf(n);
    const startX = n.x - ((colours.length - 1) * 28) / 2;
    const y = n.y - sz.h / 2 - 27;

    colours.forEach((colour, i) => {
      const data = counts[colour];
      const x = startX + i * 28;
      const hubCol = HUB[colour] || C.yellow;
      const borderCol = data.late || data.urgent ? C.red : 'white';

      // Waiting deliveries: large solid coloured bubble.
      if(data.waiting > 0){
        ctx.fillStyle = data.late ? C.red : hubCol;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = borderCol;
        ctx.lineWidth = 3;
        ctx.stroke();
        txt(String(data.waiting), x, y, 11, 'white', 'center', true);
      } else {
        // No waiting, but assigned work exists: hollow coloured bubble so it reads as already handled.
        ctx.fillStyle = 'rgba(251,250,244,.95)';
        ctx.beginPath();
        ctx.arc(x, y, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = hubCol;
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // Assigned/loading/en-route deliveries: separate small dot to the lower-right.
      if(data.assigned > 0){
        const ax = x + 13;
        const ay = y + 12;
        ctx.fillStyle = hubCol;
        ctx.beginPath();
        ctx.arc(ax, ay, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 2;
        ctx.stroke();
        txt(String(data.assigned), ax, ay, 8, 'white', 'center', true);
      }

      txt(data.late ? 'late' : `${data.minDue}d`, x, y + 26, 10, data.late || data.urgent ? C.red : C.ink, 'center', true);
    });
  };

  function roadEndpoints(){
    const m = new Map();
    for(const r of S.g.roads){
      for(const p of [r.a,r.b]){
        const k = Math.round(p.x)+','+Math.round(p.y);
        if(!m.has(k)) m.set(k,p);
      }
    }
    return [...m.values()];
  }

  // Redraw roads and bridges in one connected pass so bridge pieces blend over tile joins like roads.
  roads = function(){
    const list = S.g.roads || [];
    if(!list.length) return;
    const normal = list.filter(r => !r.bridge);
    const bridge = list.filter(r => r.bridge);

    ctx.save();
    ctx.lineCap='round';
    ctx.lineJoin='round';

    // Shared shadow, so roads/bridges feel part of one network.
    ctx.strokeStyle='rgba(0,0,0,.16)';
    ctx.lineWidth=24;
    for(const r of list){ctx.beginPath();ctx.moveTo(r.a.x+5,r.a.y+6);ctx.lineTo(r.b.x+5,r.b.y+6);ctx.stroke();}

    // Normal road body.
    ctx.strokeStyle=C.roadEdge; ctx.lineWidth=20;
    for(const r of normal){ctx.beginPath();ctx.moveTo(r.a.x,r.a.y);ctx.lineTo(r.b.x,r.b.y);ctx.stroke();}
    ctx.strokeStyle=C.road; ctx.lineWidth=16;
    for(const r of normal){ctx.beginPath();ctx.moveTo(r.a.x,r.a.y);ctx.lineTo(r.b.x,r.b.y);ctx.stroke();}

    // Bridge deck under the road, drawn wider and continuous.
    ctx.strokeStyle='#7b5a38'; ctx.lineWidth=27;
    for(const r of bridge){ctx.beginPath();ctx.moveTo(r.a.x,r.a.y);ctx.lineTo(r.b.x,r.b.y);ctx.stroke();}
    ctx.strokeStyle='#bd9465'; ctx.lineWidth=23;
    for(const r of bridge){ctx.beginPath();ctx.moveTo(r.a.x,r.a.y);ctx.lineTo(r.b.x,r.b.y);ctx.stroke();}

    // Road surface over bridge, same width as regular road so it connects seamlessly.
    ctx.strokeStyle=C.roadEdge; ctx.lineWidth=20;
    for(const r of bridge){ctx.beginPath();ctx.moveTo(r.a.x,r.a.y);ctx.lineTo(r.b.x,r.b.y);ctx.stroke();}
    ctx.strokeStyle=C.road; ctx.lineWidth=16;
    for(const r of bridge){ctx.beginPath();ctx.moveTo(r.a.x,r.a.y);ctx.lineTo(r.b.x,r.b.y);ctx.stroke();}

    // Endpoint circles merge all joins, including bridge/road joins.
    ctx.fillStyle=C.road;
    for(const p of roadEndpoints()){ctx.beginPath();ctx.arc(p.x,p.y,8.2,0,Math.PI*2);ctx.fill();}

    // Subtle bridge side rails only on bridge sections, above the road edge but below dash.
    ctx.strokeStyle='rgba(80,56,34,.82)'; ctx.lineWidth=2; ctx.setLineDash([]);
    for(const r of bridge){
      const ang=Math.atan2(r.b.y-r.a.y,r.b.x-r.a.x)+Math.PI/2;
      const ox=Math.cos(ang)*12, oy=Math.sin(ang)*12;
      ctx.beginPath();ctx.moveTo(r.a.x+ox,r.a.y+oy);ctx.lineTo(r.b.x+ox,r.b.y+oy);ctx.stroke();
      ctx.beginPath();ctx.moveTo(r.a.x-ox,r.a.y-oy);ctx.lineTo(r.b.x-ox,r.b.y-oy);ctx.stroke();
    }

    // One dash layer over everything.
    ctx.strokeStyle=C.roadDash; ctx.lineWidth=3; ctx.setLineDash([11,12]);
    for(const r of list){ctx.beginPath();ctx.moveTo(r.a.x,r.a.y);ctx.lineTo(r.b.x,r.b.y);ctx.stroke();}
    ctx.setLineDash([]);
    ctx.restore();
  };

  function validNewLocationSpot(p, selfId=null){
    if(p.x<90||p.x>WORLD_W-90||p.y<96||p.y>WORLD_H-96) return false;
    for(const n of S.g.nodes){
      if(n.id === selfId) continue;
      if(isLocation(n) && nodeDistance(p,n) < GRID*2) return false;
      if(n.type === 'hub' && nodeDistance(p,n) < GRID*2.6) return false;
    }
    if(typeof pointInWater === 'function' && pointInWater(p)) return false;
    return true;
  }

  function pushNewLocationApart(n){
    if(!isLocation(n)) return;
    if(validNewLocationSpot(n,n.id)) return;
    const hub = S.g.nodes.find(x=>x.type==='hub'&&x.colour==='yellow') || S.g.nodes.find(x=>x.type==='hub');
    const base = hub || n;
    for(let ring=2; ring<22; ring++){
      for(let a=0; a<24; a++){
        const ang = a/24*Math.PI*2;
        const p = snapP(base.x + Math.cos(ang)*GRID*ring, base.y + Math.sin(ang)*GRID*ring);
        if(validNewLocationSpot(p,n.id)){ n.x=p.x; n.y=p.y; return; }
      }
    }
  }

  const previousUpdate = update;
  update = function(dt){
    const before = new Set((S.g?.nodes || []).map(n=>n.id));
    previousUpdate(dt);
    if(!S.g) return;
    for(const n of S.g.nodes){
      if(isLocation(n) && !before.has(n.id)) pushNewLocationApart(n);
    }
  };
})();
