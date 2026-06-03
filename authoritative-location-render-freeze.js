// Delivery Days authoritative location render freeze.
// The problem was not just saved coordinates: earlier wrappers could move locations during their own render,
// draw the moved version, then restore after the frame. This final wrapper restores first, then redraws the frame.
(function(){
  const frozen = new Map();

  function isLocation(n){ return n && n.type !== 'hub'; }
  function idOf(n){ return String(n.id); }

  function freezeNewLocations(){
    if(!S.g) return;
    for(const n of S.g.nodes){
      if(isLocation(n) && !frozen.has(idOf(n))){
        frozen.set(idOf(n), { x:n.x, y:n.y });
      }
    }
  }

  function restoreLocations(){
    if(!S.g) return;
    for(const n of S.g.nodes){
      if(!isLocation(n)) continue;
      const p = frozen.get(idOf(n));
      if(p){ n.x = p.x; n.y = p.y; }
    }
  }

  function renderFrozenFrame(){
    if(!S.g || S.screen !== 'game') return;
    restoreLocations();
    S.ui = [];

    // Re-render the whole game frame after every previous wrapper has done whatever it wants.
    mapDraw(function(){
      bg();
      roads();
      S.g.vans.forEach(drawVan);
      S.g.nodes.forEach(drawNode);
      if(typeof drawJuice === 'function') drawJuice();
    });

    hud();
    bottom();
    if(S.panel) panel(S.panel);

    if(S.blueHubTutorial && typeof drawFixedBlueTutorial === 'function') drawFixedBlueTutorial();
    if(S.weeklySummary && typeof drawWeeklySummary === 'function') drawWeeklySummary();

    if(S.edit){
      ctx.strokeStyle = C.red;
      ctx.lineWidth = 5;
      ctx.strokeRect(3,3,W-6,H-6);
      txt('EDIT MODE - TIME FROZEN', W/2, 36, 15, C.red, 'center', true);
    }
  }

  const previousStart = start;
  start = function(level){
    previousStart(level);
    frozen.clear();
    freezeNewLocations();
    restoreLocations();
  };

  const previousUpdate = update;
  update = function(dt){
    freezeNewLocations();
    restoreLocations();
    const beforeIds = new Set((S.g?.nodes || []).filter(isLocation).map(idOf));
    previousUpdate(dt);
    restoreLocations();
    // Any new location added this update freezes only after all spawn-position code has finished.
    for(const n of S.g?.nodes || []){
      if(isLocation(n) && !beforeIds.has(idOf(n)) && !frozen.has(idOf(n))){
        frozen.set(idOf(n), { x:n.x, y:n.y });
      }
    }
    restoreLocations();
  };

  const previousAction = action;
  action = function(id){
    freezeNewLocations();
    restoreLocations();
    const result = previousAction(id);
    restoreLocations();
    return result;
  };

  const previousGame = game;
  game = function(){
    freezeNewLocations();
    restoreLocations();
    previousGame();
    restoreLocations();
    renderFrozenFrame();
  };
})();
