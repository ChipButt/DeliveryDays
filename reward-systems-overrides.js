// Delivery Days reward systems override.
// Adds weekly summary rewards, subtle delivery juice, hub levels, medals, near-miss feedback,
// and temporary perfect-week bonuses without adding constant large popups.
(function(){
  const BASE_REWARD = reward;
  const BASE_LOAD_DAYS = loadDays;
  const BASE_VAN_SPEED = vanSpeed;
  const BASE_FINISH = finish;
  const BASE_LEVEL_SCREEN = levelScreen;

  function ensureRewardState(){
    if(!S.g) return;
    S.g.weekStats ||= { startDay:S.g.day, startLate:S.g.late, cash:0, completed:0 };
    S.g.weekSummariesShown ||= {};
    S.g.juice ||= [];
    S.g.medal ||= null;
    S.g.hubMaxFootprint = GRID * 3;
    for(const h of S.g.nodes.filter(n => n.type === 'hub')){
      h.hubLevel ||= 1;
      h.loadLv ||= 1;
      h.speedLv ||= 1;
      h.packLv ||= 1;
    }
  }

  function perfectActive(){ return S.g && S.g.perfectBoostUntil && S.g.day < S.g.perfectBoostUntil; }

  reward = function(t,left,l,packages=1){
    const v = BASE_REWARD(t,left,l,packages);
    return perfectActive() ? Math.round(v * 2) : v;
  };

  loadDays = function(h){
    const base = BASE_LOAD_DAYS(h);
    return perfectActive() ? Math.max(0.12, base * 0.72) : base;
  };

  vanSpeed = function(h){
    const base = BASE_VAN_SPEED(h);
    return perfectActive() ? base * 1.35 : base;
  };

  hubUpgradeCost = function(h){
    const lv = h.hubLevel || 1;
    return Math.round(260 * Math.pow(1.75, lv - 1) + (S.g?.l?.id || 1) * 45);
  };

  function hubComponentMax(h){ return Math.max(1, Math.min(4, h.hubLevel || 1)); }
  function driverMaxForHub(h){ return Math.max(2, Math.min(5, (h.hubLevel || 1) + 1)); }

  const prevDriverCost = driverCost;
  driverCost = function(h){ return prevDriverCost(h) + (h.hubLevel || 1) * 20; };

  // Hub visual size: level 1 = 2x2, level 4 = 3x3. Spacing checks below assume 3x3 from the start.
  const previousSizeOf = sizeOf;
  sizeOf = function(n){
    if(n.type === 'hub'){
      const lv = Math.max(1, Math.min(4, n.hubLevel || 1));
      const tiles = 2 + (lv - 1) / 3;
      return { w: GRID * tiles, h: GRID * tiles };
    }
    return previousSizeOf(n);
  };

  function drawMedal(cx,cy,type,scale=1){
    const data = {
      perfect:['#d7f5ff','#9ad7f5','★'],
      gold:['#ffd86b','#b8860b','★'],
      silver:['#dce2e8','#8d9aa5','★'],
      bronze:['#c78b55','#7c4a2b','★']
    }[type] || ['#eef4f0','#9ba5a8','–'];
    ctx.save();
    ctx.translate(cx,cy);
    ctx.scale(scale,scale);
    ctx.fillStyle = data[1];
    ctx.beginPath();
    ctx.moveTo(-8,11); ctx.lineTo(-2,29); ctx.lineTo(2,17); ctx.lineTo(8,29); ctx.lineTo(8,11); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = data[0];
    ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = data[1];
    ctx.beginPath(); ctx.arc(0,0,11,0,Math.PI*2); ctx.fill();
    txt(data[2],0,1,13,'white','center',true);
    ctx.restore();
  }

  function medalFor(win, late, fail){
    if(!win) return null;
    if(late === 0) return 'perfect';
    if(late <= 2) return 'gold';
    if(late <= Math.floor(fail / 2)) return 'silver';
    return 'bronze';
  }

  finish = function(win){
    if(S.g){
      const m = medalFor(win, S.g.late, S.g.l.fail);
      S.g.medal = m;
      S.save.medals ||= {};
      const rank = {bronze:1,silver:2,gold:3,perfect:4};
      const old = S.save.medals[S.g.l.id];
      if(m && (!old || rank[m] > rank[old])) S.save.medals[S.g.l.id] = m;
    }
    BASE_FINISH(win);
  };

  levelScreen = function(){
    BASE_LEVEL_SCREEN();
    const st = S.page * 6;
    levels.slice(st, st + 6).forEach((l,i)=>{
      const m = S.save.medals?.[l.id];
      if(!m) return;
      const x = 64 + (i % 3) * 250;
      const y = 92 + Math.floor(i / 3) * 132;
      drawMedal(x + 190, y + 28, m, 0.62);
    });
  };

  function addJuice(dest,cash,nearMiss,packages){
    S.g.juice ||= [];
    S.g.juice.push({kind:'cash',x:dest.x,y:dest.y-42,t:0,dur:1.15,text:`+£${cash}`,colour:'#39d353'});
    S.g.juice.push({kind:'pop',x:dest.x,y:dest.y,t:0,dur:.55,colour:'#ffffff'});
    S.g.juice.push({kind:'spark',x:dest.x,y:dest.y-16,t:0,dur:.75,colour:'#ffffff'});
    if(packages > 1) S.g.juice.push({kind:'cash',x:dest.x,y:dest.y-60,t:0,dur:1.1,text:`${packages} packages`,colour:C.teal});
    if(nearMiss) S.g.juice.push({kind:'cash',x:dest.x,y:dest.y-72,t:0,dur:1.25,text:'Just in time!',colour:C.yellow});
  }

  completeLeg = function(t,i){
    let g = S.g, hub = g.nodes.find(n=>n.id===t.hub), dest = g.nodes.find(n=>n.id===t.dest);
    if(!t.returning){
      if(dest){
        let delivered = 0;
        dest.requests = dest.requests.filter(r=>{
          if(t.reqIds?.includes(r.id)){ delivered++; return false; }
          return true;
        });
        dest.totalDelivered = (dest.totalDelivered || 0) + delivered;
        const left = Math.max(0, t.due - t.age);
        const cash = reward(dest.type, left, g.l, delivered);
        g.cash += cash;
        g.score += cash + g.day;
        ensureRewardState();
        g.weekStats.cash += cash;
        g.weekStats.completed += delivered;
        addJuice(dest,cash,left <= 1,delivered);
      }
      t.returning = true;
      t.path = [...t.path].reverse();
      t.seg = 0; t.prog = 0; t.age = 0;
      return;
    }
    if(hub) hub.idle++;
    g.vans.splice(i,1);
  };

  function drawJuice(){
    if(!S.g?.juice?.length) return;
    ctx.save();
    for(const j of S.g.juice){
      const p = Math.max(0, Math.min(1, j.t / j.dur));
      if(j.kind === 'cash'){
        ctx.globalAlpha = 1 - p;
        txt(j.text,j.x,j.y - p * 28,14,j.colour || '#39d353','center',true);
      } else if(j.kind === 'pop'){
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = 'rgba(255,255,255,.9)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(j.x,j.y,8 + p * 26,0,Math.PI*2); ctx.stroke();
      } else if(j.kind === 'spark'){
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        for(let a=0;a<8;a++){
          const ang = a * Math.PI / 4;
          const r = 8 + p * 22;
          ctx.fillRect(Math.round(j.x + Math.cos(ang)*r), Math.round(j.y + Math.sin(ang)*r), 2, 2);
        }
      }
    }
    ctx.restore();
  }

  function updateJuice(dt){
    if(!S.g?.juice) return;
    for(const j of S.g.juice) j.t += dt;
    S.g.juice = S.g.juice.filter(j => j.t < j.dur);
  }

  function statPos(id){
    // left HUD target positions matching the compact stat bubbles.
    if(id === 'roads') return {x:42,y:146};
    if(id === 'bridges') return {x:42,y:278};
    if(id === 'cash') return {x:42,y:234};
    return {x:W/2,y:30};
  }

  function createWeeklySummary(day){
    const g = S.g;
    if(!g || g.weekSummariesShown[day]) return;
    g.weekSummariesShown[day] = true;
    const stats = g.weekStats || {cash:0,completed:0,startLate:g.late};
    const lateThisWeek = g.late - (stats.startLate || 0);
    const perfect = lateThisWeek === 0;
    const bridgeGain = (g.l.map.river && day % 14 === 0) ? 1 : 0;
    const roadGain = 7;
    let perfectRoadBonus = 0;
    if(perfect){
      perfectRoadBonus = 5;
      g.tiles += perfectRoadBonus;
      g.perfectBoostUntil = Math.max(g.perfectBoostUntil || 0, g.day + 7);
    }

    S.weeklySummary = {
      phase:'panel', t:0, day,
      items:[
        {id:'roads',label:'Road tiles',value:`+${roadGain}`,merge:`+${roadGain}`},
        {id:'bridges',label:'Bridges',value:`+${bridgeGain}`,merge:`+${bridgeGain}`},
        {id:'cash',label:'Cash earned',value:`£${stats.cash || 0}`,merge:`+£${stats.cash || 0}`},
        {id:'deliveries',label:'Deliveries completed',value:String(stats.completed || 0),merge:String(stats.completed || 0)},
        {id:'perfect',label:'Perfect week bonus',value:perfect?`+${perfectRoadBonus} roads + boosts`:'Not earned',merge:perfect?`+${perfectRoadBonus}`:''}
      ],
      perfect,
      startPositions:[]
    };
    S.paused = true;
    g.weekStats = { startDay:g.day, startLate:g.late, cash:0, completed:0 };
  }

  function drawWeeklySummary(){
    const s = S.weeklySummary;
    if(!s) return;
    if(s.phase === 'merge'){
      const p = Math.max(0, Math.min(1, s.t / .9));
      const e = p*p*(3-2*p);
      for(const it of s.items){
        if(!it.merge) continue;
        const from = it.from, to = statPos(it.id);
        if(!from) continue;
        const x = from.x + (to.x - from.x) * e;
        const y = from.y + (to.y - from.y) * e;
        ctx.globalAlpha = 1 - p * .15;
        txt(it.merge,x,y,17,it.id==='cash'?'#39d353':C.teal,'center',true);
        ctx.globalAlpha = 1;
      }
      return;
    }

    fill(0,0,W,H,0,'rgba(30,40,44,.18)');
    const x=182,y=42,w=480,h=300;
    card(x,y,w,h);
    txt(`Week ${Math.floor(s.day/7)} Summary`,x+w/2,y+30,25,C.ink,'center',true);
    txt(s.perfect?'Perfect Week! No late deliveries.':'Weekly progress',x+w/2,y+58,15,s.perfect?C.teal:C.muted,'center',true);
    const rows = s.items;
    rows.forEach((it,i)=>{
      const ry = y + 92 + i*36;
      txt(it.label,x+42,ry,15,C.ink,'left',i===4);
      txt(it.value,x+w-48,ry,15,it.id==='perfect'&&s.perfect?C.teal:C.ink,'right',true);
      it.from = {x:x+w-50,y:ry};
    });
    btn('weeklyCollect','Collect',x+w-160,y+h-48,126,32,'teal',15);
  }

  const previousStart = start;
  start = function(level){
    previousStart(level);
    ensureRewardState();
    for(const h of S.g.nodes.filter(n=>n.type==='hub')){
      h.hubLevel = 1;
      h.loadLv = Math.min(h.loadLv || 1, 1);
      h.speedLv = Math.min(h.speedLv || 1, 1);
      h.packLv = Math.min(h.packLv || 1, 1);
      h.drivers = Math.min(h.drivers || 2, driverMaxForHub(h));
      h.idle = Math.min(h.idle || h.drivers, h.drivers);
    }
  };

  const previousUpdate = update;
  update = function(dt){
    if(S.weeklySummary){
      if(S.weeklySummary.phase === 'merge'){
        S.weeklySummary.t += dt;
        if(S.weeklySummary.t >= .9){ S.weeklySummary = null; S.paused = false; }
      }
      updateJuice(dt);
      return;
    }

    const beforeDay = S.g?.day;
    previousUpdate(dt);
    ensureRewardState();
    updateJuice(dt);
    if(S.g && beforeDay !== S.g.day && S.g.day % 7 === 0){
      createWeeklySummary(S.g.day);
    }
  };

  const previousGame = game;
  game = function(){
    previousGame();
    if(S.screen === 'game'){
      mapDraw(drawJuice);
      drawWeeklySummary();
    }
  };

  function drawHubLevelPips(h,x,y){
    for(let i=1;i<=4;i++){
      ctx.fillStyle = i <= (h.hubLevel||1) ? (HUB[h.colour]||C.teal) : 'rgba(48,55,61,.18)';
      ctx.beginPath(); ctx.arc(x+i*14,y,5,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=C.ink; ctx.lineWidth=1; ctx.stroke();
    }
  }

  // Replace hub panel so hub upgrade sits above component upgrades and component caps obey hub level.
  hubPanel = function(h){
    ensureRewardState();
    const sx=(h.x-S.cam.x)*S.cam.z, sy=(h.y-S.cam.y)*S.cam.z;
    let x=sx+46,y=sy-116,w=540,hh=234;
    if(x+w>W-10) x=sx-w-46;
    x=Math.max(10,Math.min(W-w-10,x)); y=Math.max(50,Math.min(H-hh-12,y));
    card(x,y,w,hh);
    const g=S.g;
    const maxC=hubComponentMax(h), maxD=driverMaxForHub(h);
    txt(h.name,x+w/2,y+24,21,HUB[h.colour]||C.ink,'center',true);
    drawHubLevelPips(h,x+22,y+24);
    txt(`Hub Level ${h.hubLevel||1}/4   Drivers ${h.idle}/${h.drivers}   Loading ${h.loading.length}`,x+w/2,y+50,13,C.ink,'center');
    txt(`Load L${h.loadLv}/${maxC} | Speed L${h.speedLv}/${maxC} | Cap ${h.packLv}/${maxC}`,x+w/2,y+72,12,C.ink,'center');
    const hc=hubUpgradeCost(h);
    btn('buyHubLevel',h.hubLevel<4?`Upgrade Hub £${hc}`:'Hub Max',x+170,y+88,200,27,h.hubLevel<4&&g.cash>=hc?'teal':'pale',13);
    const c1=driverCost(h), c2=loadCost(h), c3=speedCost(h), c5=packCost(h), c4=managerCost(h);
    btn('buyDriver',h.drivers<maxD?`Driver £${c1}`:`Drivers need Hub L${Math.min(4,(h.hubLevel||1)+1)}`,x+22,y+124,150,25,h.drivers<maxD&&g.cash>=c1?'teal':'pale',12);
    btn('buyLoad',h.loadLv<maxC?`Loading £${c2}`:'Loading Max',x+185,y+124,150,25,h.loadLv<maxC&&g.cash>=c2?'teal':'pale',12);
    btn('buySpeed',h.speedLv<maxC?`Speed £${c3}`:'Speed Max',x+348,y+124,150,25,h.speedLv<maxC&&g.cash>=c3?'teal':'pale',12);
    btn('buyPack',h.packLv<maxC?`Capacity +1 £${c5}`:'Capacity Max',x+104,y+160,150,25,h.packLv<maxC&&g.cash>=c5?'teal':'pale',12);
    btn('buyManager',h.manager?'Manager Active':`Manager £${c4}`,x+267,y+160,150,25,!h.manager&&g.cash>=c4?'teal':'pale',12);
    if(perfectActive()) txt('Perfect Week Boost Active',x+w/2,y+206,14,C.teal,'center',true);
  };

  const previousAction = action;
  action = function(id){
    if(id === 'weeklyCollect' && S.weeklySummary){
      S.weeklySummary.phase = 'merge';
      S.weeklySummary.t = 0;
      return;
    }

    const h = S.panel;
    if(h && h.type === 'hub'){
      ensureRewardState();
      if(id === 'buyHubLevel'){
        const c = hubUpgradeCost(h);
        if(h.hubLevel >= 4) return;
        if(S.g.cash < c) return;
        S.g.cash -= c;
        h.hubLevel++;
        return;
      }
      if(id === 'buyDriver'){
        const c = driverCost(h), maxD = driverMaxForHub(h);
        if(h.drivers >= maxD) return;
        if(S.g.cash < c) return;
        S.g.cash -= c; h.drivers++; h.idle++; return;
      }
      if(id === 'buyLoad'){
        const c = loadCost(h), maxC = hubComponentMax(h);
        if(h.loadLv >= maxC) return;
        if(S.g.cash < c) return;
        S.g.cash -= c; h.loadLv++; return;
      }
      if(id === 'buySpeed'){
        const c = speedCost(h), maxC = hubComponentMax(h);
        if(h.speedLv >= maxC) return;
        if(S.g.cash < c) return;
        S.g.cash -= c; h.speedLv++; return;
      }
      if(id === 'buyPack'){
        const c = packCost(h), maxC = hubComponentMax(h);
        if(h.packLv >= maxC) return;
        if(S.g.cash < c) return;
        S.g.cash -= c; h.packLv++; return;
      }
    }
    return previousAction(id);
  };
})();
