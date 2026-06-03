// Delivery Days zoom render authority override.
// Last-load camera authority: computes zoom from one formula and applies it immediately before drawing.
// This prevents older wrappers from rendering one frame at the wrong zoom on day 6/7 transitions.
(function(){
  const TARGET = { x: 470, y: 226 };
  let runId = null;
  let transition = null;
  let widestZoomSeen = null;

  function primaryHub(){
    return S.g?.nodes.find(n => n.type === 'hub' && n.colour === 'yellow') || S.g?.nodes.find(n => n.type === 'hub');
  }

  function baseZoomForWeek(week){
    return Math.max(0.72, 1.16 - week * 0.055);
  }

  function expandedWeekForDay(day){
    // Day 1-6: week 0. Day 7-13: week 1. Day 14-20: week 2.
    return Math.max(0, Math.floor(Math.max(1, day || 1) / 7));
  }

  function smooth(t){
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  }

  function intendedZoom(){
    if(!S.g) return S.cam.z || 1;
    const day = Math.max(1, S.g.day || 1);
    const clock = Math.max(0, Math.min(1, S.g.clock || 0));
    const dayInWeek = ((day - 1) % 7) + 1;

    if(dayInWeek === 6){
      const nextWeek = expandedWeekForDay(day) + 1;
      const key = `${S.g.l.id}:${nextWeek}:${day}`;
      if(!transition || transition.key !== key){
        transition = {
          key,
          from: S.cam.z || baseZoomForWeek(nextWeek - 1),
          to: baseZoomForWeek(nextWeek)
        };
        if(transition.to > transition.from) transition.to = transition.from;
      }
      return transition.from + (transition.to - transition.from) * smooth(clock);
    }

    transition = null;
    return baseZoomForWeek(expandedWeekForDay(day));
  }

  function applyZoom(){
    const h = primaryHub();
    if(!S.g || !h || S.edit || S.blueHubTutorial || S.newLocationFocus) return;

    const currentRun = S.g.l.id + ':' + S.g.l.target + ':' + S.g.l.fail;
    if(runId !== currentRun || S.g.day <= 1){
      runId = currentRun;
      widestZoomSeen = null;
      transition = null;
    }

    let z = intendedZoom();
    if(widestZoomSeen == null) widestZoomSeen = z;
    widestZoomSeen = Math.min(widestZoomSeen, z);
    z = widestZoomSeen;

    S.cam.z = z;
    S.cam.x = h.x - TARGET.x / z;
    S.cam.y = h.y - TARGET.y / z;
    clampCam();
  }

  window.lockZoomForCurrentDay = applyZoom;

  const previousUpdate = update;
  update = function(dt){
    previousUpdate(dt);
    applyZoom();
  };

  // Fully re-render the game after older game wrappers have run, using the final authoritative camera.
  const previousGame = game;
  game = function(){
    previousGame();
    if(S.screen !== 'game') return;
    applyZoom();
    S.ui = [];
    mapDraw(drawMap);
    hud();
    bottom();
    if(S.panel) panel(S.panel);
    if(S.msgT > 0){
      fill(230,78,384,34,14,'rgba(48,55,61,.88)');
      txt(S.msg,W/2,95,13,'white','center',true);
    }
    if(S.edit){
      ctx.strokeStyle = C.red;
      ctx.lineWidth = 5;
      ctx.strokeRect(3,3,W-6,H-6);
      txt('EDIT MODE - TIME FROZEN',W/2,36,15,C.red,'center',true);
    }
  };

  const previousAction = action;
  action = function(id){
    const result = previousAction(id);
    if(id === 'edit' && !S.edit) applyZoom();
    return result;
  };
})();
