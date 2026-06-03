// Delivery Days final no-snap map zoom override.
// Prevents the day-6 inward snap and day-7 outward jump by capturing the current zoom at the start of the easing day.
(function(){
  const TARGET = { x: 470, y: 226 };
  let activeTransition = null;
  let minimumZoomReached = null;

  function primaryHub(){
    return S.g?.nodes.find(n => n.type === 'hub' && n.colour === 'yellow') || S.g?.nodes.find(n => n.type === 'hub');
  }

  function weekIndexForExpandedDay(day){
    // Day 1-6 = week 0. Day 7-13 = week 1. Day 14-20 = week 2.
    return Math.max(0, Math.floor(Math.max(1, day || 1) / 7));
  }

  function zoomForWeek(week){
    return Math.max(0.72, 1.16 - week * 0.055);
  }

  function smooth(t){
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  }

  function desiredZoom(){
    if(!S.g) return S.cam.z || 1;
    const day = Math.max(1, S.g.day || 1);
    const clock = Math.max(0, Math.min(1, S.g.clock || 0));
    const dayInBlock = ((day - 1) % 7) + 1;

    // On the 6th day of each block, transition from the actual current zoom, not a recalculated value.
    // This avoids the visible snap-in at the start of day 6.
    if(dayInBlock === 6){
      const targetWeek = weekIndexForExpandedDay(day) + 1;
      const key = `${S.g.l.id}:${targetWeek}:${day}`;
      if(!activeTransition || activeTransition.key !== key){
        const actualCurrent = S.cam.z || zoomForWeek(targetWeek - 1);
        const target = Math.min(actualCurrent, zoomForWeek(targetWeek));
        activeTransition = { key, from: actualCurrent, to: target };
      }
      const t = smooth(clock);
      return activeTransition.from + (activeTransition.to - activeTransition.from) * t;
    }

    activeTransition = null;
    return zoomForWeek(weekIndexForExpandedDay(day));
  }

  function lockCameraNoSnap(){
    const h = primaryHub();
    if(!S.g || !h || S.edit || S.blueHubTutorial || S.newLocationFocus) return;

    let z = desiredZoom();

    // During a run, never allow the automatic camera to zoom back in.
    // Lower z means the map is more zoomed out.
    if(minimumZoomReached == null || S.g.day <= 1){
      minimumZoomReached = z;
    } else {
      minimumZoomReached = Math.min(minimumZoomReached, z);
      z = minimumZoomReached;
    }

    S.cam.z = z;
    S.cam.x = h.x - TARGET.x / z;
    S.cam.y = h.y - TARGET.y / z;
    clampCam();
  }

  window.lockZoomForCurrentDay = lockCameraNoSnap;

  const previousStart = start;
  start = function(level){
    previousStart(level);
    activeTransition = null;
    minimumZoomReached = null;
    lockCameraNoSnap();
  };

  const previousUpdate = update;
  update = function(dt){
    previousUpdate(dt);
    lockCameraNoSnap();
  };

  const previousGame = game;
  game = function(){
    lockCameraNoSnap();
    previousGame();
  };

  const previousAction = action;
  action = function(id){
    const result = previousAction(id);
    if(id === 'edit' && !S.edit) lockCameraNoSnap();
    return result;
  };
})();
