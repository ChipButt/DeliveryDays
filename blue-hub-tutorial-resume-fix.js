// Delivery Days blue hub tutorial resume fix.
// Ensures the Level 1 blue-hub instructions render above final re-render wrappers,
// and that Got It reliably resumes gameplay and restores the normal camera.
(function(){
  const TARGET = { x: 470, y: 226 };

  function primaryHub(){
    return S.g?.nodes.find(n => n.type === 'hub' && n.colour === 'yellow') || S.g?.nodes.find(n => n.type === 'hub');
  }

  function blueHub(){
    return S.g?.nodes.find(n => n.type === 'hub' && n.colour === 'blue') || null;
  }

  function baseZoomForWeek(week){
    return Math.max(0.72, 1.16 - week * 0.055);
  }

  function currentStandardZoom(){
    if(!S.g) return 1;
    const day = Math.max(1, S.g.day || 1);
    const week = Math.max(0, Math.floor(day / 7));
    return baseZoomForWeek(week);
  }

  function setStandardCamera(){
    const h = primaryHub();
    if(!S.g || !h) return;
    const z = currentStandardZoom();
    S.cam.z = z;
    S.cam.x = h.x - TARGET.x / z;
    S.cam.y = h.y - TARGET.y / z;
    clampCam();
  }

  function focusBlueHub(){
    const h = blueHub();
    if(!h) return;
    S.cam.z = 1.25;
    S.cam.x = h.x - W / (2 * S.cam.z);
    S.cam.y = h.y - H / (2 * S.cam.z);
    clampCam();
  }

  function beginBlueTutorial(h){
    S.blueHubTutorial = {
      nodeId: h.id,
      previousPaused: !!S.paused,
      returnCam: { x:S.cam.x, y:S.cam.y, z:S.cam.z }
    };
    S.paused = true;
    S.panel = null;
    S.infoOpen = false;
    focusBlueHub();
  }

  // Override again after all earlier addBlueHub wrappers so Level 1 always gets a reliable tutorial.
  addBlueHub = function(){
    if(!S.g || S.g.blueAdded) return;
    const y = primaryHub();
    let p = y ? snapP(y.x + GRID * 5, y.y - GRID * 3) : snapP(520,220);
    if(typeof pointInWater === 'function' && pointInWater(p)) p = y ? snapP(y.x + GRID * 4, y.y + GRID * 3) : p;
    const h = node('hub', p.x, p.y, 'Blue Hub', 'blue');
    h.drivers = 2;
    h.idle = 2;
    S.g.nodes.push(h);
    S.g.blueAdded = true;

    if(S.g.l.id === 1) beginBlueTutorial(h);
  };

  function drawBlueTutorial(){
    if(!S.blueHubTutorial || !S.g) return;
    const h = S.g.nodes.find(n => n.id === S.blueHubTutorial.nodeId) || blueHub();
    if(!h) return;

    focusBlueHub();

    const sx = (h.x - S.cam.x) * S.cam.z;
    const sy = (h.y - S.cam.y) * S.cam.z;
    let x = sx + 58;
    if(x > W - 326) x = sx - 338;
    x = Math.max(14, Math.min(W - 326, x));
    const y = Math.max(44, Math.min(H - 204, sy - 88));

    card(x, y, 312, 188);
    txt('New Blue Hub', x + 156, y + 28, 22, C.blue, 'center', true);
    txt('Some deliveries are now blue.', x + 24, y + 62, 14, C.ink, 'left', true);
    txt('Blue delivery circles must be', x + 24, y + 88, 14, C.ink, 'left');
    txt('handled by blue hub drivers.', x + 24, y + 110, 14, C.ink, 'left', true);
    txt('Yellow deliveries still need', x + 24, y + 136, 14, C.ink, 'left');
    txt('yellow hub drivers.', x + 24, y + 158, 14, C.ink, 'left', true);
    btn('blueHubGotIt', 'Got It!', x + 96, y + 150, 120, 30, 'teal', 14);
  }

  const previousGame = game;
  game = function(){
    previousGame();
    if(S.blueHubTutorial){
      S.ui = S.ui.filter(u => u.id !== 'blueHubGotIt');
      drawBlueTutorial();
    }
  };

  const previousUpdate = update;
  update = function(dt){
    if(S.blueHubTutorial){
      focusBlueHub();
      S.msg = '';
      S.msgT = 0;
      S.bottomAlert = null;
      return;
    }
    previousUpdate(dt);
  };

  const previousAction = action;
  action = function(id){
    if(id === 'blueHubGotIt'){
      const wasPaused = !!S.blueHubTutorial?.previousPaused;
      S.blueHubTutorial = null;
      S.paused = wasPaused;
      S.panel = null;
      S.infoOpen = false;
      setStandardCamera();
      return;
    }
    return previousAction(id);
  };
})();
