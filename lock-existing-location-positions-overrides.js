// Delivery Days existing location position lock.
// Prevents focus events such as blue-hub introduction/tutorial/return from moving existing locations.
// New locations may still be placed/repositioned when they are first spawned.
(function(){
  const locked = new Map();

  function isLocation(n){ return n && n.type !== 'hub'; }
  function key(n){ return String(n.id); }

  function lockAllExisting(){
    locked.clear();
    for(const n of S.g?.nodes || []){
      if(isLocation(n)) locked.set(key(n), { x:n.x, y:n.y });
    }
  }

  function restoreLocked(idsToRestore=null){
    if(!S.g) return;
    for(const n of S.g.nodes){
      if(!isLocation(n)) continue;
      const k = key(n);
      if(idsToRestore && !idsToRestore.has(k)) continue;
      const p = locked.get(k);
      if(p){ n.x = p.x; n.y = p.y; }
    }
  }

  function addNewLocks(){
    for(const n of S.g?.nodes || []){
      if(isLocation(n) && !locked.has(key(n))) locked.set(key(n), { x:n.x, y:n.y });
    }
  }

  const previousStart = start;
  start = function(level){
    previousStart(level);
    lockAllExisting();
  };

  const previousUpdate = update;
  update = function(dt){
    const before = new Set((S.g?.nodes || []).filter(isLocation).map(n => key(n)));
    previousUpdate(dt);
    if(!S.g) return;

    // Restore only locations that existed before this update. New spawned locations are allowed to be placed once.
    restoreLocked(before);
    addNewLocks();
  };

  const previousGame = game;
  game = function(){
    const before = new Set((S.g?.nodes || []).filter(isLocation).map(n => key(n)));
    previousGame();
    if(!S.g) return;

    // Rendering/focus wrappers must not move old settlements around.
    restoreLocked(before);
    addNewLocks();
  };
})();
