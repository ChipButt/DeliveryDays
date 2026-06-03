// Delivery Days visible edge spawn guard.
// Final safety layer: spawned locations must be inside the real current visible map area with a 2-tile screen-edge buffer.
(function(){
  const EDGE_BUFFER_TILES = 2;

  function isLocation(n){ return n && n.type !== 'hub'; }
  function primaryHub(){ return S.g?.nodes.find(n => n.type === 'hub' && n.colour === 'yellow') || S.g?.nodes.find(n => n.type === 'hub'); }
  function nodeDistance(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
  function inWater(p){ try { return typeof pointInWater === 'function' && pointInWater(p); } catch(_) { return false; } }

  function visibleWorldBounds(){
    const pad = GRID * EDGE_BUFFER_TILES;
    return {
      left: S.cam.x + pad,
      right: S.cam.x + W / S.cam.z - pad,
      top: S.cam.y + pad,
      bottom: S.cam.y + H / S.cam.z - pad
    };
  }

  function isInsideBufferedView(p){
    const b = visibleWorldBounds();
    return p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;
  }

  function isClearLocationSpot(p, selfId){
    if(!isInsideBufferedView(p)) return false;
    if(p.x < GRID * 2 || p.x > WORLD_W - GRID * 2 || p.y < GRID * 2 || p.y > WORLD_H - GRID * 2) return false;
    if(inWater(p)) return false;

    for(const n of S.g.nodes){
      if(n.id === selfId) continue;
      if(isLocation(n) && nodeDistance(p,n) < GRID * 2) return false;
      if(n.type === 'hub' && nodeDistance(p,n) < GRID * 2.6) return false;
    }
    return true;
  }

  function candidateScore(p, outerRadius){
    const h = primaryHub();
    if(!h) return 0;
    return -Math.abs(nodeDistance(p,h) - outerRadius) + Math.random() * 0.01;
  }

  function currentOuterLocationRadius(){
    const h = primaryHub();
    if(!h || !S.g) return GRID * 4;
    let max = GRID * 3;
    for(const n of S.g.nodes){
      if(isLocation(n)) max = Math.max(max, nodeDistance(h,n));
    }
    return max;
  }

  function repositionInsideView(n){
    if(!S.g || !isLocation(n)) return;
    if(isClearLocationSpot(n, n.id)) return;

    const bounds = visibleWorldBounds();
    const outer = currentOuterLocationRadius() + GRID * 1.4;
    let best = null;
    let bestScore = -Infinity;

    const minX = Math.ceil(bounds.left / GRID) * GRID + GRID / 2;
    const maxX = Math.floor(bounds.right / GRID) * GRID + GRID / 2;
    const minY = Math.ceil(bounds.top / GRID) * GRID + GRID / 2;
    const maxY = Math.floor(bounds.bottom / GRID) * GRID + GRID / 2;

    for(let x = minX; x <= maxX; x += GRID){
      for(let y = minY; y <= maxY; y += GRID){
        const p = {x,y};
        if(!isClearLocationSpot(p, n.id)) continue;
        const s = candidateScore(p, outer);
        if(s > bestScore){ best = p; bestScore = s; }
      }
    }

    if(best){
      n.x = best.x;
      n.y = best.y;
      return;
    }

    // Emergency fallback: clamp to the buffered visible bounds, then step inward until valid.
    let p = snapP(
      Math.max(bounds.left, Math.min(bounds.right, n.x)),
      Math.max(bounds.top, Math.min(bounds.bottom, n.y))
    );
    for(let ring = 0; ring < 8; ring++){
      for(let a = 0; a < 16; a++){
        const ang = (Math.PI * 2 * a) / 16;
        const q = snapP(p.x + Math.cos(ang) * GRID * ring, p.y + Math.sin(ang) * GRID * ring);
        if(isClearLocationSpot(q, n.id)){
          n.x = q.x;
          n.y = q.y;
          return;
        }
      }
    }
  }

  function fixAllVisibleEdgeLocations(){
    if(!S.g || S.screen !== 'game') return;
    for(const n of S.g.nodes){
      if(isLocation(n)) repositionInsideView(n);
    }
  }

  const previousUpdate = update;
  update = function(dt){
    const beforeIds = new Set((S.g?.nodes || []).map(n => n.id));
    previousUpdate(dt);
    if(!S.g || S.screen !== 'game') return;

    const added = S.g.nodes.filter(n => isLocation(n) && !beforeIds.has(n.id));
    if(added.length){
      // Run twice because moving the first location can affect the spacing validation for the next.
      added.forEach(repositionInsideView);
      added.forEach(repositionInsideView);
    }
  };

  const previousGame = game;
  game = function(){
    // Only enforce during normal play/render, not during pop-up focus states or editing.
    if(S.screen === 'game' && !S.edit && !S.blueHubTutorial && !S.newLocationFocus){
      fixAllVisibleEdgeLocations();
    }
    previousGame();
  };
})();
