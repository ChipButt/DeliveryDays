// Delivery Days blue hub tutorial polish override.
// Moves Got It to the bottom-right, sparkles the new blue hub during the tutorial,
// and smoothly returns the camera to normal gameplay view after Got It.
(function(){
  const TARGET = { x: 470, y: 226 };
  let returnAnim = null;

  function primaryHub(){
    return S.g?.nodes.find(n => n.type === 'hub' && n.colour === 'yellow') || S.g?.nodes.find(n => n.type === 'hub');
  }

  function blueHub(){
    return S.g?.nodes.find(n => n.type === 'hub' && n.colour === 'blue') || null;
  }

  function standardZoom(){
    if(!S.g) return 1;
    const day = Math.max(1, S.g.day || 1);
    const week = Math.max(0, Math.floor(day / 7));
    return Math.max(0.72, 1.16 - week * 0.055);
  }

  function standardCamera(){
    const h = primaryHub();
    const z = standardZoom();
    if(!h) return { x:S.cam.x, y:S.cam.y, z };
    return {
      x: h.x - TARGET.x / z,
      y: h.y - TARGET.y / z,
      z
    };
  }

  function applyCamera(cam){
    S.cam.x = cam.x;
    S.cam.y = cam.y;
    S.cam.z = cam.z;
    clampCam();
  }

  function focusBlueHub(){
    const h = blueHub();
    if(!h) return;
    applyCamera({
      z: 1.25,
      x: h.x - W / (2 * 1.25),
      y: h.y - H / (2 * 1.25)
    });
  }

  function ease(t){
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  }

  function lerp(a,b,t){ return a + (b - a) * t; }

  function updateReturnCamera(dt){
    if(!returnAnim) return false;
    returnAnim.t += dt;
    const p = ease(returnAnim.t / returnAnim.duration);
    applyCamera({
      x: lerp(returnAnim.from.x, returnAnim.to.x, p),
      y: lerp(returnAnim.from.y, returnAnim.to.y, p),
      z: lerp(returnAnim.from.z, returnAnim.to.z, p)
    });
    if(p >= 1){
      S.paused = returnAnim.finalPaused;
      returnAnim = null;
      applyCamera(standardCamera());
    }
    return true;
  }

  function fireworkPixels(cx,cy,w,h,spread,count,seed){
    const t = performance.now()/1000;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.shadowColor = 'rgba(255,255,255,.75)';
    ctx.shadowBlur = 2;
    for(let b=0;b<count;b++){
      const cycle = (t*1.35 + b*.31 + seed*.01) % 1;
      if(cycle>.62) continue;
      const life = cycle/.62;
      const alpha = (1-life)*.78;
      const side = (b + Math.floor(seed)) % 4;
      const u = ((b*47 + Math.floor(seed)) % 100) / 100;
      let bx,by;
      if(side===0){ bx=cx-w/2+u*w; by=cy-h/2-spread*.45; }
      else if(side===1){ bx=cx+w/2+spread*.45; by=cy-h/2+u*h; }
      else if(side===2){ bx=cx-w/2+u*w; by=cy+h/2+spread*.45; }
      else { bx=cx-w/2-spread*.45; by=cy-h/2+u*h; }
      for(let i=0;i<5;i++){
        const a = Math.PI*2*i/5 + b*.6;
        const r = life*spread;
        ctx.globalAlpha = alpha;
        ctx.fillRect(Math.round(bx+Math.cos(a)*r), Math.round(by+Math.sin(a)*r), 1.5, 1.5);
      }
    }
    ctx.restore();
  }

  function sparkleBlueHub(){
    const h = blueHub();
    if(!h || !S.blueHubTutorial) return;
    const t = performance.now()/1000;
    ctx.save();
    ctx.globalAlpha = 0.04 + (Math.sin(t*8)+1)*0.025;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.roundRect(h.x - GRID, h.y - GRID, GRID*2, GRID*2, 12);
    ctx.fill();
    ctx.restore();
    fireworkPixels(h.x, h.y, GRID*2, GRID*2, 10, 8, h.x+h.y);
  }

  function drawTutorial(){
    if(!S.blueHubTutorial || !S.g) return;
    const h = S.g.nodes.find(n => n.id === S.blueHubTutorial.nodeId) || blueHub();
    if(!h) return;

    focusBlueHub();

    const sx = (h.x - S.cam.x) * S.cam.z;
    const sy = (h.y - S.cam.y) * S.cam.z;
    let x = sx + 58;
    if(x > W - 382) x = sx - 394;
    x = Math.max(14, Math.min(W - 382, x));
    const y = Math.max(38, Math.min(H - 236, sy - 108));

    card(x, y, 368, 220);
    txt('New Blue Hub', x + 184, y + 30, 23, C.blue, 'center', true);
    txt('Some deliveries are now blue.', x + 26, y + 68, 14, C.ink, 'left', true);
    txt('Blue delivery circles must be', x + 26, y + 96, 14, C.ink, 'left');
    txt('handled by blue hub drivers.', x + 26, y + 120, 14, C.ink, 'left', true);
    txt('Yellow deliveries still need', x + 26, y + 148, 14, C.ink, 'left');
    txt('yellow hub drivers.', x + 26, y + 172, 14, C.ink, 'left', true);
    btn('blueHubGotIt', 'Got It!', x + 232, y + 178, 112, 30, 'teal', 14);
  }

  function redrawGameWithCurrentCamera(){
    S.ui = [];
    mapDraw(function(){ bg(); roads(); S.g.vans.forEach(drawVan); S.g.nodes.forEach(drawNode); sparkleBlueHub(); });
    hud();
    bottom();
    if(S.panel) panel(S.panel);
    if(S.edit){
      ctx.strokeStyle = C.red;
      ctx.lineWidth = 5;
      ctx.strokeRect(3,3,W-6,H-6);
      txt('EDIT MODE - TIME FROZEN',W/2,36,15,C.red,'center',true);
    }
  }

  const previousUpdate = update;
  update = function(dt){
    if(returnAnim){ updateReturnCamera(dt); return; }
    if(S.blueHubTutorial){
      focusBlueHub();
      S.paused = true;
      S.msg = ''; S.msgT = 0; S.bottomAlert = null;
      return;
    }
    previousUpdate(dt);
  };

  const previousGame = game;
  game = function(){
    previousGame();
    if(S.screen !== 'game') return;
    if(returnAnim){
      updateReturnCamera(0);
      redrawGameWithCurrentCamera();
      return;
    }
    if(S.blueHubTutorial){
      redrawGameWithCurrentCamera();
      S.ui = S.ui.filter(u => u.id !== 'blueHubGotIt');
      drawTutorial();
    }
  };

  const previousAction = action;
  action = function(id){
    if(id === 'blueHubGotIt'){
      const finalPaused = !!S.blueHubTutorial?.previousPaused;
      S.blueHubTutorial = null;
      S.panel = null;
      S.infoOpen = false;
      returnAnim = {
        from: { x:S.cam.x, y:S.cam.y, z:S.cam.z },
        to: standardCamera(),
        t: 0,
        duration: 0.75,
        finalPaused
      };
      S.paused = true;
      return;
    }
    return previousAction(id);
  };
})();
