// Delivery Days network connection fix.
// Fixes false "No Matching Hub" when roads connect to any occupied tile of a hub/location.
(function(){
  function normColour(c){ return String(c || 'yellow').toLowerCase(); }
  function pKey(p){ return Math.round(p.x) + ',' + Math.round(p.y); }
  function same(a,b){ return Math.abs(a.x-b.x)<3 && Math.abs(a.y-b.y)<3; }

  function nodeGridPoints(n){
    const sz = sizeOf(n);
    const cols = Math.max(1, Math.round(sz.w / GRID));
    const rows = Math.max(1, Math.round(sz.h / GRID));
    const startX = n.x - (cols - 1) * GRID / 2;
    const startY = n.y - (rows - 1) * GRID / 2;
    const pts = [];
    for(let cx=0; cx<cols; cx++){
      for(let cy=0; cy<rows; cy++){
        pts.push({ x:startX + cx * GRID, y:startY + cy * GRID });
      }
    }
    // Always include centre as fallback for older saves.
    pts.push({x:n.x,y:n.y});
    const seen = new Set();
    return pts.filter(p => { const k=pKey(p); if(seen.has(k)) return false; seen.add(k); return true; });
  }

  function roadNeighbours(p){
    const out = [];
    for(const r of S.g.roads){
      if(same(r.a,p)) out.push(r.b);
      else if(same(r.b,p)) out.push(r.a);
    }
    return out;
  }

  function shortestBetweenNodeFootprints(startNode, destNode){
    const starts = nodeGridPoints(startNode);
    const dests = nodeGridPoints(destNode);
    const destKeys = new Set(dests.map(pKey));
    const q = [];
    const seen = new Map();

    for(const s of starts){
      q.push({p:s,path:[s],cost:0});
      seen.set(pKey(s),0);
    }

    while(q.length){
      q.sort((a,b)=>a.cost-b.cost);
      const cur = q.shift();
      if(destKeys.has(pKey(cur.p))) return cur;
      for(const nb of roadNeighbours(cur.p)){
        const cost = cur.cost + Math.hypot(nb.x-cur.p.x, nb.y-cur.p.y);
        const k = pKey(nb);
        if(seen.has(k) && seen.get(k) <= cost) continue;
        seen.set(k,cost);
        q.push({p:{x:nb.x,y:nb.y}, path:cur.path.concat({x:nb.x,y:nb.y}), cost});
      }
    }
    return null;
  }

  bestHub = function(dest, managerOnly=false, colour=null){
    const targetColour = colour ? normColour(colour) : null;
    let best = null;
    const hubs = S.g.nodes.filter(n =>
      n.type === 'hub' &&
      n.idle > 0 &&
      (!targetColour || normColour(n.colour) === targetColour) &&
      (!managerOnly || n.manager)
    );
    for(const h of hubs){
      const p = shortestBetweenNodeFootprints(h,dest);
      if(p && (!best || p.cost < best.cost)) best = {h,path:p.path,cost:p.cost};
    }
    return best;
  };

  locPanel = function(n){
    const x = Math.round((W - 410) / 2), y = H - 170 - 16;
    card(x,y,410,170);
    const a = activeReq(n);
    const waiting = a.filter(r=>r.status==='waiting').length;
    const loading = a.filter(r=>r.status==='loading').length;
    const enroute = a.filter(r=>r.status==='enroute').length;
    txt(n.name || 'Unnamed', x+205, y+24, 22, C.ink, 'center', true);
    txt(String(n.type||'Location').charAt(0).toUpperCase()+String(n.type||'Location').slice(1)+' delivery point', x+205, y+48, 13, C.muted, 'center');
    txt(`Active: ${a.length}   Waiting: ${waiting}`, x+205, y+76, 15, a.length ? C.red : C.ink, 'center', true);
    txt(`Loading: ${loading}   En route: ${enroute}`, x+205, y+100, 13, C.ink, 'center');
    txt(reqDueText(n), x+205, y+124, 12, a.some(r=>r.late||r.due<=2) ? C.red : C.ink, 'center');

    const hasMatchingHub = waitingReq(n).some(r => !!bestHub(n,false,r.colour));
    btn('dispatch', waiting > 0 ? (hasMatchingHub ? 'Start Loading' : 'No Available Driver / Road') : 'No Waiting Requests', x+110, y+139, 190, 26, waiting > 0 && hasMatchingHub ? 'teal' : 'pale', 13);
  };
})();
