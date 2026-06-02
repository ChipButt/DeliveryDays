// Delivery Days smooth continuous map expansion override.
// Fixes zoom shrinking/jumping by making the camera zoom monotonic and easing continuously over the full day before each expansion.
(function(){
  const HUB_SCREEN_TARGET = { x: 470, y: 226 };

  function primaryHub(){
    return S.g?.nodes.find(n => n.type === 'hub' && n.colour === 'yellow') || S.g?.nodes.find(n => n.type === 'hub');
  }

  function expansionIndexForDay(day){
    return Math.max(0, Math.floor((Math.max(1, day) - 1) / 7));
  }

  function zoomForExpansion(index){
    // Lower value = more of the map visible. This only ever moves downward as the game expands.
    return Math.max(0.72, 1.16 - index * 0.055);
  }

  function smoothStep(t){
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  }

  function continuousZoom(){
    if(!S.g) return 1;
    const day = Math.max(1, S.g.day || 1);
    const currentIndex = expansionIndexForDay(day);
    const currentZoom = zoomForExpansion(currentIndex);
    const nextZoom = zoomForExpansion(currentIndex + 1);

    // Day 6 of each weekly block eases toward the next expansion across the whole 10-second day.
    // Example: day 6 -> gradually zooms out, day 7 starts already at the new wider view.
    const dayInBlock = ((day - 1) % 7) + 1;
    if(dayInBlock === 6){
      const t = smoothStep(S.g.clock || 0);
      return currentZoom + (nextZoom - currentZoom) * t;
    }

    // Day 7 and onward stay at the newly expanded size until the next easing day.
    if(dayInBlock >= 7){
      return zoomForExpansion(currentIndex);
    }

    return currentZoom;
  }

  function applyContinuousCamera(){
    const h = primaryHub();
    if(!S.g || !h || S.edit || S.blueHubTutorial || S.newLocationFocus) return;
    const z = continuousZoom();
    // Never allow later overrides to zoom back in above the correct current value.
    S.cam.z = Math.min(S.cam.z || z, z);
    S.cam.z = z;
    S.cam.x = h.x - HUB_SCREEN_TARGET.x / S.cam.z;
    S.cam.y = h.y - HUB_SCREEN_TARGET.y / S.cam.z;
    clampCam();
  }

  // Override common camera lock helpers left behind by earlier patches.
  window.startZoomFor = function(day){ return zoomForExpansion(expansionIndexForDay(day)); };
  window.lockZoomForCurrentDay = applyContinuousCamera;

  const previousUpdate = update;
  update = function(dt){
    previousUpdate(dt);
    applyContinuousCamera();
    S.msg = '';
    S.msgT = 0;
    S.bottomAlert = null;
  };

  const previousGame = game;
  game = function(){
    applyContinuousCamera();
    previousGame();
  };

  const previousAction = action;
  action = function(id){
    const result = previousAction(id);
    if(id === 'edit' && !S.edit) applyContinuousCamera();
    return result;
  };
})();
