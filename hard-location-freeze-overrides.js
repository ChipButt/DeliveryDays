// Delivery Days hard location freeze.
// Absolute final guard: once a location exists, its world coordinates are restored BEFORE rendering and after updates.
// This stops edit mode, camera focus, edge guards, tutorials, and reward wrappers from visually moving existing locations.
(function(){
  const frozen = new Map();

  function isLocation(n){ return n && n.type !== 'hub'; }
  function idOf(n){ return String(n.id); }

  function freezeAllCurrent(){
    if(!S.g) return;
    for(const n of S.g.nodes){
      if(isLocation(n) && !frozen.has(idOf(n))){
        frozen.set(idOf(n), { x:n.x, y:n.y });
      }
    }
  }

  function restoreAllFrozen(){
    if(!S.g) return;
    for(const n of S.g.nodes){
      if(!isLocation(n)) continue;
      const p = frozen.get(idOf(n));
      if(p){ n.x = p.x; n.y = p.y; }
    }
  }

  function captureNewOnly(previousIds){
    if(!S.g) return;
    for(const n of S.g.nodes){
      if(!isLocation(n)) continue;
      const id = idOf(n);
      if(!previousIds.has(id) && !frozen.has(id)){
        frozen.set(id, { x:n.x, y:n.y });
      }
    }
  }

  const previousStart = start;
  start = function(level){
    previousStart(level);
    frozen.clear();
    freezeAllCurrent();
  };

  const previousAction = action;
  action = function(id){
    freezeAllCurrent();
    restoreAllFrozen();
    const result = previousAction(id);
    restoreAllFrozen();
    freezeAllCurrent();
    return result;
  };

  const previousUpdate = update;
  update = function(dt){
    freezeAllCurrent();
    restoreAllFrozen();
    const before = new Set((S.g?.nodes || []).filter(isLocation).map(idOf));
    previousUpdate(dt);
    // Existing locations go back exactly where they were. Newly spawned ones freeze where the spawn logic placed them.
    restoreAllFrozen();
    captureNewOnly(before);
  };

  const previousGame = game;
  game = function(){
    freezeAllCurrent();
    restoreAllFrozen();
    previousGame();
    restoreAllFrozen();
  };
})();
