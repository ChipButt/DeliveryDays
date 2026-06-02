// Delivery Days water, bridge, and visible-area rules.
// Roads cannot cross river tiles without a bridge. Locations avoid rivers. Bridge tokens are earned every 14 days.
(function(){
  const WATER_RADIUS = 38;
  const usedBridgeAwardDays = new Set();

  function silence(){ S.msg=''; S.msgT=0; S.bottomAlert=null; S.newLocationFocus=null; }
  say = function(){ silence(); };

  function primaryHub(){ return S.g?.nodes.find(n=>n.type==='hub'&&n.colour==='yellow') || S.g?.nodes.find(n=>n.type==='hub'); }
  function d(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
  function segDist(p,a,b){ const l2=(b.x-a.x)**2+(b.y-a.y)**2; const t=l2?Math.max(0,Math.min(1,((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/l2)):0; return Math.hypot(p.x-(a.x+(b.x-a.x)*t),p.y-(a.y+(b.y-a.y)*t)); }
  function river(){ return S.g?.l?.map?.river || null; }
  function pointInWater(p){ const r=river(); if(!r) return false; for(let i=0;i<r.length-1;i++){ if(segDist(p,{x:r[i][0],y:r[i][1]},{x:r[i+1][0],y:r[i+1][1]}) < WATER_RADIUS) return true; } return false; }
  function segmentNeedsBridge(a,b){ const r=river(); if(!r) return false; const steps=Math.max(2,Math.ceil(d(a,b)/12)); for(let i=0;i<=steps;i++){ const t=i/steps; if(pointInWater({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t})) return true; } return false; }
  function revealRadius(day){ return GRID*(7 + Math.floor((Math.max(1,day)-1)/7)*2.2); }
  function visibleHubColours(){ const h=primaryHub(); const rad=revealRadius(S.g?.day||1); const set=new Set(); for(const n of S.g?.nodes||[]){ if(n.type==='hub' && (!h || d(n,h)<=rad+GRID)) set.add(n.colour||'yellow'); } return [...set]; }

  requestColour = function(){ const colours=visibleHubColours(); return colours.includes('blue') && Math.random()<0.42 ? 'blue' : (colours[0] || 'yellow'); };

  function drySpotNearHub(){ const h=primaryHub(); if(!h) return snapP(180,180); const rad=revealRadius(S.g.day); for(let tries=0;tries<160;tries++){ const rr=GRID*(3+Math.random()*Math.max(4,rad/GRID-3)); const ang=Math.random()*Math.PI*2; const p=snapP(h.x+Math.cos(ang)*rr,h.y+Math.sin(ang)*rr); if(p.x>90&&p.x<WORLD_W-90&&p.y>96&&p.y<WORLD_H-96&&!pointInWater(p)&&!(S.g.nodes||[]).some(n=>n.type!=='hub'&&d(n,p)<GRID*2.4)) return p; } return h; }
  function moveWaterLocations(){ if(!S.g) return; for(const n of S.g.nodes){ if(n.type!=='hub' && pointInWater(n)){ const p=drySpotNearHub(); n.x=p.x; n.y=p.y; } } }

  const previousStart=start;
  start=function(level){ previousStart(level); usedBridgeAwardDays.clear(); if(S.g) S.g.bridges=0; moveWaterLocations(); silence(); };

  const previousAddBlueHub=addBlueHub;
  addBlueHub=function(){
    if(!S.g || S.g.blueAdded) return;
    const h=primaryHub();
    let p=h ? snapP(h.x+GRID*5,h.y-GRID*3) : snapP(520,220);
    if(pointInWater(p)) p=drySpotNearHub();
    const n=node('hub',p.x,p.y,'Blue Hub','blue'); n.drivers=2; n.idle=2; S.g.nodes.push(n); S.g.blueAdded=true;
    if(S.g.l.id===1 && typeof previousAddBlueHub==='function'){
      S.blueHubTutorial={nodeId:n.id,previousPaused:!!S.paused,returnCam:{x:S.cam.x,y:S.cam.y,z:S.cam.z}};
      S.paused=true; S.panel=null; S.infoOpen=false;
    }
    silence();
  };

  const previousAddRoad=addRoad;
  addRoad=function(a,b){
    if(!S.g) return;
    if(eq(a,b) || S.g.roads.some(r=>(eq(r.a,a)&&eq(r.b,b))||(eq(r.a,b)&&eq(r.b,a)))) return;
    const bridge=segmentNeedsBridge(a,b);
    if(bridge && S.tool!=='bridge') return;
    if(bridge && (S.g.bridges||0)<=0) return;
    if(S.g.tiles<1) return;
    S.g.tiles--;
    if(bridge) S.g.bridges--;
    S.g.roads.push({a:{x:a.x,y:a.y},b:{x:b.x,y:b.y},cost:1,bridge});
  };

  const previousRoads=roads;
  roads=function(){
    previousRoads();
    if(!S.g?.roads?.length) return;
    ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round';
    for(const r of S.g.roads.filter(x=>x.bridge)){
      ctx.strokeStyle='#7a5a43'; ctx.lineWidth=26; ctx.beginPath(); ctx.moveTo(r.a.x,r.a.y); ctx.lineTo(r.b.x,r.b.y); ctx.stroke();
      ctx.strokeStyle='#b99163'; ctx.lineWidth=20; ctx.beginPath(); ctx.moveTo(r.a.x,r.a.y); ctx.lineTo(r.b.x,r.b.y); ctx.stroke();
      ctx.strokeStyle=C.road; ctx.lineWidth=14; ctx.beginPath(); ctx.moveTo(r.a.x,r.a.y); ctx.lineTo(r.b.x,r.b.y); ctx.stroke();
      ctx.strokeStyle=C.roadDash; ctx.lineWidth=3; ctx.setLineDash([11,12]); ctx.beginPath(); ctx.moveTo(r.a.x,r.a.y); ctx.lineTo(r.b.x,r.b.y); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  };

  function drawBridgeStat(){ if(!S.g?.l?.map?.river) return; fill(12,262,110,38,12,'rgba(251,250,244,.92)'); txt('BRIDGES',24,274,10,C.muted,'left',true); txt(String(S.g.bridges||0),24,290,15,C.ink,'left',true); }
  const previousHud=hud;
  hud=function(){ previousHud(); drawBridgeStat(); };

  const previousBottom=bottom;
  bottom=function(){
    if(!S.edit) return previousBottom();
    fill(14,326,816,52,16,'rgba(251,250,244,.95)');
    btn('draw','Draw',30,336,78,32,S.tool==='draw'?'teal':'pale',15);
    btn('bridge','Bridge',120,336,86,32,S.tool==='bridge'?'teal':'pale',15);
    btn('delete','Delete',218,336,86,32,S.tool==='delete'?'red':'pale',15);
    btn('pan','Pan Map',316,336,94,32,S.tool==='pan'?'dark':'pale',15);
    txt('Bridge mode crosses water. Bridges: '+(S.g.bridges||0),426,352,13,C.muted,'left',true);
  };

  const previousAction=action;
  action=function(id){ if(id==='bridge'){S.tool='bridge'; return;} return previousAction(id); };

  const previousUpdate=update;
  update=function(dt){
    const before=S.g?.day;
    previousUpdate(dt);
    if(S.g){
      if(before!==S.g.day && S.g.l.map.river && S.g.day%14===0 && !usedBridgeAwardDays.has(S.g.day)){ usedBridgeAwardDays.add(S.g.day); S.g.bridges=(S.g.bridges||0)+1; }
      moveWaterLocations(); silence();
    }
  };
})();
