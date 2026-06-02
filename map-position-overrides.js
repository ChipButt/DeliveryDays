// Delivery Days map-position overrides: add blank map space to the left and place starter hub at the marked screen position.
(function(){
  const LEFT_MAP_PADDING = GRID * 7;
  const HUB_SCREEN_TARGET = { x: 470, y: 226 };

  function safeSay(msg){ try { say(msg); } catch (_) {} }
  function rnd(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function locName(type){
    const names = {
      village: ['Hazel Wick','Brooklet','Pinewell','Moss End','Oakmere','Larch End'],
      town: ['Dockminster','Fernport','Stoneford','Ashford','Northmarket','Ridgewell'],
      city: ['New Carrow','Eastport','Silverhaven','Crown City']
    };
    return rnd(names[type] || names.village);
  }
  function shiftPoint(x, y){
    return snapP(x + LEFT_MAP_PADDING, y);
  }
  function baseYellowHub(level){
    const h = (level.map.hubs || []).find(x => x[3] !== 'blue') || [210, 220, 'Central Hub', 'yellow'];
    const p = shiftPoint(h[0], h[1]);
    return { x: p.x, y: p.y, name: h[2] || 'Central Hub', colour: h[3] || 'yellow' };
  }
  function shiftedHubDef(h){
    const p = shiftPoint(h[0], h[1]);
    return { x: p.x, y: p.y, name: h[2] || 'Hub', colour: h[3] || 'yellow' };
  }
  function starterPlacesFromHub(h){
    return [
      ['village', h.x + GRID * 3, h.y - GRID * 2, 'Oakmere'],
      ['village', h.x - GRID * 3, h.y + GRID * 2, 'Larch End'],
      ['town',    h.x + GRID * 5, h.y + GRID * 2, 'Ashford']
    ].map(p => {
      const s = snapP(p[1], p[2]);
      return [p[0], s.x, s.y, p[3]];
    });
  }
  function startZoomForPosition(day){
    const week = Math.floor(Math.max(1, day || 1) / 7);
    return Math.max(0.80, Math.min(1.22, 1.16 - week * 0.055));
  }
  function primaryHub(){
    return S.g?.nodes.find(n => n.type === 'hub' && n.colour === 'yellow') || S.g?.nodes.find(n => n.type === 'hub');
  }
  function setCameraToMarkedHubPosition(){
    const h = primaryHub();
    if (!h || S.edit) return;
    S.cam.z = startZoomForPosition(S.g.day);
    S.cam.x = h.x - HUB_SCREEN_TARGET.x / S.cam.z;
    S.cam.y = h.y - HUB_SCREEN_TARGET.y / S.cam.z;
    clampCam();
  }
  function revealRadius(){
    const g = S.g;
    if (!g) return GRID * 7;
    return GRID * (7 + Math.floor((g.day - 1) / 7) * 2.2);
  }
  function distance(a, b){ return Math.hypot(a.x - b.x, a.y - b.y); }
  function validSpawnPointLocal(p){
    const h = primaryHub();
    if (h && distance(p, h) > revealRadius()) return false;
    if (p.x < 90 || p.x > WORLD_W - 90 || p.y < 96 || p.y > WORLD_H - 96) return false;
    if (S.g.nodes.some(n => n.type === 'hub' && distance(p, n) < GRID * 2.6)) return false;
    if (S.g.nodes.some(n => distance(p, n) < GRID * 3)) return false;
    return true;
  }

  start = function(level){
    const g = {
      l: level,
      caps: caps(level.id),
      day: 1,
      clock: 0,
      cash: level.cash,
      tiles: 15,
      bridges: level.map.river ? 99 : 0,
      late: 0,
      score: 0,
      nodes: [],
      roads: [],
      vans: [],
      reserve: new Map(),
      blueAdded: level.id > 1,
      lastGrow: 0
    };

    const h = baseYellowHub(level);
    const hn = node('hub', h.x, h.y, h.name, h.colour);
    hn.drivers = 2 + Math.floor(level.id / 4);
    hn.idle = hn.drivers;
    g.nodes.push(hn);

    if (level.id > 1) {
      const rawBlue = (level.map.hubs || []).find(x => x[3] === 'blue') || (level.map.extraHubs || [])[0];
      if (rawBlue) {
        const bh = shiftedHubDef(rawBlue);
        const bn = node('hub', bh.x, bh.y, bh.name || 'Blue Hub', bh.colour || 'blue');
        bn.drivers = 2 + Math.floor(level.id / 5);
        bn.idle = bn.drivers;
        g.nodes.push(bn);
      }
    }

    starterPlacesFromHub(h)
      .filter(p => p[1] > 70 && p[1] < WORLD_W - 70 && p[2] > 90 && p[2] < WORLD_H - 90)
      .slice(0, 3)
      .forEach(p => g.nodes.push(node(p[0], p[1], p[2], p[3])));

    S.g = g;
    S.screen = 'game';
    S.edit = false;
    S.paused = false;
    S.speed = 1;
    S.panel = null;
    S.infoOpen = false;
    S.cam = { x: 0, y: 0, z: startZoomForPosition(1) };
    setCameraToMarkedHubPosition();
    safeSay('Start local. Extra blank map space is now on the left.');
  };

  addBlueHub = function(){
    const g = S.g;
    if (!g || g.blueAdded) return;
    const raw = (g.l.map.extraHubs && g.l.map.extraHubs[0]) || [primaryHub().x + GRID * 7 - LEFT_MAP_PADDING, primaryHub().y + GRID * 2, 'Blue Hub', 'blue'];
    const h = shiftedHubDef(raw);
    const n = node('hub', h.x, h.y, h.name || 'Blue Hub', h.colour || 'blue');
    n.drivers = 2;
    n.idle = 2;
    g.nodes.push(n);
    g.blueAdded = true;
    safeSay('Blue Hub opened. Blue requests need blue drivers.');
  };

  grow = function(){
    const g = S.g;
    if (!g) return;
    const type = g.day > 50 && Math.random() < .18 ? 'city' : g.day > 28 && Math.random() < .45 ? 'town' : 'village';
    const h = primaryHub();
    if (!h) return;
    for (let a = 0; a < 120; a++) {
      const r = GRID * (5 + Math.random() * (7 + Math.floor(g.day / 7) * 2));
      const ang = Math.random() * Math.PI * 2;
      const p = snapP(h.x + Math.cos(ang) * r, h.y + Math.sin(ang) * r);
      if (validSpawnPointLocal(p)) {
        const n = node(type, p.x, p.y, locName(type));
        g.nodes.push(n);
        addRequest(n);
        safeSay('New ' + type + ' appeared with a delivery request.');
        return;
      }
    }
  };

  const previousUpdate = update;
  update = function(dt){
    const before = S.g?.day;
    previousUpdate(dt);
    if (S.g && !S.edit) setCameraToMarkedHubPosition();
    if (S.g && before !== S.g.day && S.g.day % 7 === 0) {
      setCameraToMarkedHubPosition();
      safeSay('The delivery area expanded.');
    }
  };

  const previousAction = action;
  action = function(id){
    const result = previousAction(id);
    if (id === 'edit' && !S.edit && S.g) setCameraToMarkedHubPosition();
    return result;
  };
})();
