// Delivery Days final gameplay polish overrides.
// Fixes blue hub visibility/tutorial, target wording, demand pacing, reveal-only location growth,
// coloured demand bubbles, no generic notifications, and exact-tile road snapping.
(function(){
  const expandedDays = new Set();

  function silence(){
    S.msg = '';
    S.msgT = 0;
    S.bottomAlert = null;
  }

  say = function(){ silence(); };

  function primaryHub(){
    return S.g?.nodes.find(n => n.type === 'hub' && n.colour === 'yellow') || S.g?.nodes.find(n => n.type === 'hub');
  }

  function dist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
  function textCap(s){ return String(s || 'Location').charAt(0).toUpperCase() + String(s || 'Location').slice(1); }
  function rnd(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  function levelRevealCount(){
    const fail = S.g?.l?.fail || 12;
    if(fail <= 5) return 3;
    if(fail <= 8) return 2;
    return 1;
  }

  function startZoomForDay(day){
    const week = Math.floor(Math.max(1, day || 1) / 7);
    return Math.max(0.80, Math.min(1.22, 1.16 - week * 0.055));
  }

  function revealRadiusForDay(day){
    return GRID * (7 + Math.floor((Math.max(1, day) - 1) / 7) * 2.2);
  }

  function lockStandardCamera(){
    const h = primaryHub();
    if(!S.g || !h || S.edit || S.blueHubTutorial) return;
    S.cam.z = startZoomForDay(S.g.day);
    S.cam.x = h.x - 470 / S.cam.z;
    S.cam.y = h.y - 226 / S.cam.z;
    clampCam();
  }

  function activeDeliveryCount(){
    if(!S.g) return 0;
    let count = 0;
    for(const n of S.g.nodes){
      if(n.type !== 'hub') count += activeReq(n).length;
    }
    return count;
  }

  function addDemandIfNone(){
    if(!S.g || S.g.day < 2 || activeDeliveryCount() > 0) return;
    const locations = S.g.nodes.filter(n => n.type !== 'hub');
    if(!locations.length) return;
    addRequest(rnd(locations));
  }

  ordersForDay = function(g){
    const day = g.day;
    const scale = Math.floor((g.l.id - 1) / 3);
    if(day < 2) return 0;
    if(day < 8) return 1;
    if(day < 20) return 1 + (Math.random() < 0.25 + scale * 0.03 ? 1 : 0);
    if(day < 40) return 1 + (day % 3 === 0 ? 1 : 0) + (Math.random() < 0.30 + scale * 0.035 ? 1 : 0);
    return 1 + (day % 2 === 0 ? 1 : 0) + (Math.random() < 0.35 + scale * 0.04 ? 1 : 0);
  };

  function locName(type){
    const names = {
      village: ['Hazel Wick','Brooklet','Pinewell','Moss End','Oakmere','Larch End','Greenfold','Willowby'],
      town: ['Dockminster','Fernport','Stoneford','Ashford','Northmarket','Ridgewell','Westbridge'],
      city: ['New Carrow','Eastport','Silverhaven','Crown City','Highgate']
    };
    return rnd(names[type] || names.village);
  }

  function validRevealSpot(p, oldRadius, newRadius){
    const h = primaryHub();
    if(!h) return false;
    const d = dist(p,h);
    if(d < oldRadius + GRID || d > newRadius - GRID * 0.5) return false;
    if(p.x < 90 || p.x > WORLD_W - 90 || p.y < 96 || p.y > WORLD_H - 96) return false;
    if(S.g.nodes.some(n => n.type === 'hub' && dist(p,n) < GRID * 2.6)) return false;
    if(S.g.nodes.some(n => dist(p,n) < GRID * 3)) return false;
    return true;
  }

  function revealLocationsForCurrentWeek(){
    if(!S.g || expandedDays.has(S.g.day)) return;
    expandedDays.add(S.g.day);

    const h = primaryHub();
    if(!h) return;

    const amount = levelRevealCount();
    const oldRadius = revealRadiusForDay(S.g.day - 7);
    const newRadius = revealRadiusForDay(S.g.day);

    for(let i=0;i<amount;i++){
      const type = S.g.day > 49 && Math.random() < 0.22 ? 'city' : S.g.day > 21 && Math.random() < 0.45 ? 'town' : 'village';
      for(let tries=0; tries<140; tries++){
        const r = oldRadius + GRID + Math.random() * Math.max(GRID, newRadius - oldRadius - GRID * 1.5);
        const ang = Math.random() * Math.PI * 2;
        const p = snapP(h.x + Math.cos(ang) * r, h.y + Math.sin(ang) * r);
        if(validRevealSpot(p, oldRadius, newRadius)){
          const n = node(type, p.x, p.y, locName(type));
          S.g.nodes.push(n);
          addRequest(n);
          break;
        }
      }
    }
  }

  // Disable old random location spawning. Locations now appear only when the weekly map reveal expands.
  grow = function(){};

  function blueHubPoint(){
    const h = primaryHub();
    if(!h) return snapP(520, 220);
    let p = snapP(h.x + GRID * 5, h.y - GRID * 3);
    p.x = Math.max(GRID * 2, Math.min(WORLD_W - GRID * 2, p.x));
    p.y = Math.max(GRID * 2, Math.min(WORLD_H - GRID * 2, p.y));
    return p;
  }

  function focusCameraOnNode(n){
    if(!n) return;
    S.cam.z = 1.25;
    S.cam.x = n.x - W / (2 * S.cam.z);
    S.cam.y = n.y - H / (2 * S.cam.z);
    clampCam();
  }

  function startBlueHubTutorial(n){
    S.blueHubTutorial = {
      nodeId: n.id,
      previousPaused: !!S.paused,
      returnCam: { x:S.cam.x, y:S.cam.y, z:S.cam.z }
    };
    S.paused = true;
    S.panel = null;
    S.infoOpen = false;
    focusCameraOnNode(n);
  }

  addBlueHub = function(){
    const g = S.g;
    if(!g || g.blueAdded) return;
    const p = blueHubPoint();
    const n = node('hub', p.x, p.y, 'Blue Hub', 'blue');
    n.drivers = 2;
    n.idle = 2;
    g.nodes.push(n);
    g.blueAdded = true;
    startBlueHubTutorial(n);
  };

  const previousStart = start;
  start = function(level){
    previousStart(level);
    expandedDays.clear();
    if(S.g?.blueAdded){
      const h = primaryHub();
      const blue = S.g.nodes.find(n => n.type === 'hub' && n.colour === 'blue');
      if(h && blue && dist(h, blue) > revealRadiusForDay(S.g.day)){
        const p = blueHubPoint();
        blue.x = p.x;
        blue.y = p.y;
      }
    }
    lockStandardCamera();
  };

  // Exact grid snapping only. No near-location snapping when drawing beside a location.
  roadPoint = function(x,y){
    return snapP(x,y);
  };

  demandPin = function(n){
    if(n.type === 'hub') return;
    const active = activeReq(n);
    if(!active.length) return;

    const counts = {};
    const due = {};
    for(const r of active){
      counts[r.colour] = (counts[r.colour] || 0) + 1;
      due[r.colour] = Math.min(due[r.colour] ?? 999, r.due);
    }

    const colours = Object.keys(counts).sort();
    const sz = sizeOf(n);
    const startX = n.x - ((colours.length - 1) * 24) / 2;
    const y = n.y - sz.h / 2 - 24;

    colours.forEach((colour, i) => {
      const x = startX + i * 24;
      const isLate = active.some(r => r.colour === colour && r.late);
      const urgent = active.some(r => r.colour === colour && r.due <= 2);
      ctx.fillStyle = isLate ? C.red : (HUB[colour] || C.yellow);
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isLate || urgent ? C.red : 'white';
      ctx.lineWidth = 3;
      ctx.stroke();
      txt(String(counts[colour]), x, y, 11, 'white', 'center', true);
      txt(isLate ? 'late' : `${due[colour]}d`, x, y + 22, 10, isLate || urgent ? C.red : C.ink, 'center', true);
    });
  };

  function circleBtn(id,label,x,y,r,k='pale',s=18){
    const col = k === 'dark' ? C.ink : k === 'red' ? C.red : k === 'teal' ? C.teal : C.cream;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = k === 'pale' ? '#c9d8d4' : 'rgba(255,255,255,.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.stroke();
    txt(label,x,y,s,k === 'pale' ? C.ink : 'white','center',true);
    S.ui.push({id,x:x-r,y:y-r,w:r*2,h:r*2});
  }

  function statPill(label,value,x,y,w=110){
    fill(x,y,w,38,12,'rgba(251,250,244,.92)');
    txt(label,x+12,y+12,10,C.muted,'left',true);
    txt(value,x+12,y+28,15,C.ink,'left',true);
  }

  hud = function(){
    const g = S.g;
    drawDayClock(62,50);
    statPill('TARGET', `${g.l.target} Days`, 12, 86, 126);
    statPill('ROADS', String(g.tiles), 12, 130, 110);
    statPill('LATE', `${g.late}/${g.l.fail}`, 12, 174, 110);
    statPill('CASH', `£${g.cash}`, 12, 218, 110);
    circleBtn('menu','≡',600,46,24,'pale',24);
    circleBtn('pause',S.paused?'▶':'Ⅱ',656,46,24,S.paused?'teal':'pale',20);
    circleBtn('speed',S.speed===2?'2×':'1×',712,46,24,S.speed===2?'red':'pale',16);
    circleBtn('edit',S.edit?'✓':'✎',768,46,24,S.edit?'red':'pale',20);
  };

  function drawBlueTutorial(){
    if(!S.blueHubTutorial || !S.g) return;
    const n = S.g.nodes.find(x => x.id === S.blueHubTutorial.nodeId);
    if(!n) return;
    const sx = (n.x - S.cam.x) * S.cam.z;
    const sy = (n.y - S.cam.y) * S.cam.z;
    let x = sx + 55;
    if(x > W - 310) x = sx - 335;
    x = Math.max(16, Math.min(W - 310, x));
    const y = Math.max(48, Math.min(H - 190, sy - 78));

    card(x,y,300,172);
    txt('New Blue Hub', x+150, y+26, 22, C.blue, 'center', true);
    txt('Blue delivery circles must be', x+24, y+62, 14, C.ink, 'left', true);
    txt('served by blue hub drivers.', x+24, y+84, 14, C.ink, 'left', true);
    txt('Yellow deliveries still need', x+24, y+110, 14, C.ink, 'left');
    txt('yellow hub drivers.', x+24, y+132, 14, C.ink, 'left');
    btn('blueHubGotIt', 'Got It!', x+90, y+142, 120, 26, 'teal', 14);
  }

  const previousGame = game;
  game = function(){
    previousGame();
    drawBlueTutorial();
    silence();
  };

  const previousUpdate = update;
  update = function(dt){
    if(S.blueHubTutorial){
      const n = S.g?.nodes.find(x => x.id === S.blueHubTutorial.nodeId);
      focusCameraOnNode(n);
      silence();
      return;
    }

    const beforeDay = S.g?.day;
    previousUpdate(dt);
    silence();

    if(S.g && beforeDay !== S.g.day){
      if(S.g.day % 7 === 0) revealLocationsForCurrentWeek();
      addDemandIfNone();
    }

    if(S.g && !S.edit) lockStandardCamera();
  };

  const previousAction = action;
  action = function(id){
    if(id === 'blueHubGotIt'){
      const wasPaused = !!S.blueHubTutorial?.previousPaused;
      S.blueHubTutorial = null;
      S.paused = wasPaused;
      lockStandardCamera();
      return;
    }
    return previousAction(id);
  };
})();
