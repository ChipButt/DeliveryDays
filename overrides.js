// Delivery Days overrides: pacing, progression zoom, income, bridges, menu button, and compact HUD.
(function(){
  function safeSay(msg){ try { say(msg); } catch (_) {} }
  function dist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
  function rnd(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  function locName(type){
    const names={
      village:['Hazel Wick','Brooklet','Pinewell','Moss End','Oakmere','Larch End'],
      town:['Dockminster','Fernport','Stoneford','Ashford','Northmarket','Ridgewell'],
      city:['New Carrow','Eastport','Silverhaven','Crown City']
    };
    return rnd(names[type]||names.village);
  }
  function mapHub(level){
    const h=(level.map.hubs||[]).find(x=>x[3]!=='blue') || [210,220,'Central Hub','yellow'];
    return {x:h[0],y:h[1],name:h[2],colour:h[3]||'yellow'};
  }
  function hubSeedPlaces(h){
    return [
      ['village', h.x+GRID*3, h.y-GRID*2, 'Oakmere'],
      ['village', h.x-GRID*3, h.y+GRID*2, 'Larch End'],
      ['town', h.x+GRID*5, h.y+GRID*2, 'Ashford']
    ].map(p=>{ const s=snapP(p[1],p[2]); return [p[0],s.x,s.y,p[3]]; });
  }
  function startZoomFor(day){
    const week=Math.floor(Math.max(1,day||1)/7);
    return Math.max(0.80, Math.min(1.22, 1.16 - week*0.055));
  }
  function revealRadius(){
    const g=S.g; if(!g) return GRID*7;
    return GRID*(7 + Math.floor((g.day-1)/7)*2.2);
  }
  function primaryHub(){ return S.g?.nodes.find(n=>n.type==='hub'&&n.colour==='yellow') || S.g?.nodes.find(n=>n.type==='hub'); }
  function centreOnPrimaryHub(){
    const h=primaryHub(); if(!h) return;
    S.cam.z=startZoomFor(S.g.day);
    S.cam.x=h.x-W/(2*S.cam.z);
    S.cam.y=h.y-H/(2*S.cam.z);
    clampCam();
  }
  function lockZoomForCurrentDay(){
    if(!S.g || S.edit) return;
    S.cam.z=startZoomFor(S.g.day);
    clampCam();
  }
  function requestValue(r){
    const base=r.baseValue || 0;
    if(r.due>=0) return base;
    const decay=Math.max(3,r.originalDue||3);
    return Math.max(0, Math.round(base*(1 + r.due/decay)));
  }
  window.requestValue=requestValue;

  function circleBtn(id,label,x,y,r,k='pale',s=18){
    const col=k==='dark'?C.ink:k==='red'?C.red:k==='teal'?C.teal:C.cream;
    ctx.fillStyle=col;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=k==='pale'?'#c9d8d4':'rgba(255,255,255,.8)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
    txt(label,x,y,s,k==='pale'?C.ink:'white','center',true);
    S.ui.push({id,x:x-r,y:y-r,w:r*2,h:r*2});
  }
  function statPill(label,value,x,y,w=110){
    fill(x,y,w,38,12,'rgba(251,250,244,.92)');
    txt(label,x+12,y+12,10,C.muted,'left',true);
    txt(value,x+12,y+28,15,C.ink,'left',true);
  }

  start=function(level){
    const g={l:level,caps:caps(level.id),day:1,clock:0,cash:level.cash,tiles:15,bridges:level.map.river?99:0,late:0,score:0,nodes:[],roads:[],vans:[],reserve:new Map(),blueAdded:level.id>1,lastGrow:0};
    const h=mapHub(level);
    const hn=node('hub',h.x,h.y,h.name,h.colour); hn.drivers=2+Math.floor(level.id/4); hn.idle=hn.drivers; g.nodes.push(hn);
    if(level.id>1){
      const bh=(level.map.hubs||[]).find(x=>x[3]==='blue') || (level.map.extraHubs||[])[0];
      if(bh){ const bn=node('hub',bh[0],bh[1],bh[2]||'Blue Hub',bh[3]||'blue'); bn.drivers=2+Math.floor(level.id/5); bn.idle=bn.drivers; g.nodes.push(bn); }
    }
    const closePlaces = hubSeedPlaces(h).filter(p=>p[1]>70&&p[1]<WORLD_W-70&&p[2]>90&&p[2]<WORLD_H-90);
    closePlaces.slice(0,3).forEach(p=>g.nodes.push(node(p[0],p[1],p[2],p[3])));
    S.g=g; S.screen='game'; S.edit=false; S.paused=false; S.speed=1; S.panel=null; S.infoOpen=false;
    S.cam={x:0,y:0,z:startZoomFor(1)}; centreOnPrimaryHub();
    safeSay(level.id===1?'Start local. You begin with 15 road tiles.':'You begin with 15 road tiles.');
  };

  addBlueHub=function(){
    const g=S.g; if(!g||g.blueAdded) return;
    const h=(g.l.map.extraHubs&&g.l.map.extraHubs[0])||[primaryHub().x+GRID*7,primaryHub().y+GRID*2,'Blue Hub','blue'];
    const n=node('hub',h[0],h[1],h[2],h[3]||'blue'); n.drivers=2; n.idle=2; g.nodes.push(n); g.blueAdded=true;
    safeSay('Blue Hub opened. Blue requests need blue drivers.');
  };

  function insideReveal(p){ const h=primaryHub(); return !h || dist(p,h)<=revealRadius(); }
  function validSpawnPointOverride(p){
    if(!insideReveal(p)) return false;
    if(p.x<90||p.x>WORLD_W-90||p.y<96||p.y>WORLD_H-96) return false;
    if(S.g.nodes.some(n=>n.type==='hub' && dist(p,n)<GRID*2.6)) return false;
    if(S.g.nodes.some(n=>dist(p,n)<GRID*3)) return false;
    return true;
  }
  window.validSpawnPoint=validSpawnPointOverride;

  grow=function(){
    const g=S.g; if(!g) return;
    const type=g.day>50&&Math.random()<.18?'city':g.day>28&&Math.random()<.45?'town':'village';
    const h=primaryHub(); if(!h) return;
    for(let a=0;a<120;a++){
      const r=GRID*(5+Math.random()*(7+Math.floor(g.day/7)*2));
      const ang=Math.random()*Math.PI*2;
      const p=snapP(h.x+Math.cos(ang)*r,h.y+Math.sin(ang)*r);
      if(validSpawnPointOverride(p)){
        const n=node(type,p.x,p.y,locName(type));
        g.nodes.push(n);
        addRequest(n);
        safeSay('New '+type+' appeared with a delivery request.');
        return;
      }
    }
  };

  addRoad=function(a,b){
    const g=S.g; if(!g) return;
    if(eq(a,b)||g.roads.some(r=>(eq(r.a,a)&&eq(r.b,b))||(eq(r.a,b)&&eq(r.b,a)))) return;
    if(g.tiles<1) return safeSay('No road tiles left.');
    g.tiles--;
    g.roads.push({a:{x:a.x,y:a.y},b:{x:b.x,y:b.y},cost:1,bridge:crossRiver(a,b)});
  };

  const originalVanSpeed=vanSpeed;
  vanSpeed=function(h){ return originalVanSpeed(h)*2; };

  reqDueText=function(n){
    const a=activeReq(n).slice().sort((x,y)=>x.due-y.due);
    if(!a.length) return 'No active request';
    return a.slice(0,3).map(r=>`${r.colour[0].toUpperCase()}:${r.late?'late':r.due+'d'} £${requestValue(r)||'?'}`).join(' / ')+(a.length>3?' +'+(a.length-3):'');
  };

  dispatchTo=function(dest,auto=false,colour=null){
    let sent=0; const colours=colour?[colour]:['yellow','blue'];
    for(const c of colours){
      let b=bestHub(dest,false,c);
      while(b&&waitingReq(dest,c).length>0&&b.h.idle>0&&(b.h.manager||sent===0||auto)){
        const batch=waitingReq(dest,c).sort((a,b)=>a.due-b.due).slice(0,b.h.packLv);
        if(!batch.length) break;
        const distanceTiles=Math.max(1,Math.round((b.cost||GRID)/GRID));
        const basePerPackage=Math.round((12+distanceTiles*7)*S.g.l.reward);
        for(const r of batch){r.status='loading';r.distanceTiles=distanceTiles;r.baseValue=basePerPackage;r.originalDue=r.originalDue||r.due;}
        b.h.idle--; b.h.totalSent=(b.h.totalSent||0)+batch.length; sent+=batch.length;
        const due=Math.min(...batch.map(r=>r.due)), total=loadDays(b.h);
        b.h.loading.push({time:total,total,dest:dest.id,path:b.path,due,speed:vanSpeed(b.h),colour:b.h.colour,col:HUB[b.h.colour],reqIds:batch.map(r=>r.id)});
        b=bestHub(dest,false,c);
      }
    }
    if(sent&&!auto) safeSay(`${sent} package${sent===1?' is':'s are'} loading for ${dest.name}.`);
    else if(!sent&&!auto) safeSay('No available matching hub driver.');
  };

  completeLeg=function(t,i){
    const g=S.g,hub=g.nodes.find(n=>n.id===t.hub),dest=g.nodes.find(n=>n.id===t.dest);
    if(!t.returning){
      if(dest){
        let delivered=0,cash=0;
        dest.requests=dest.requests.filter(r=>{ if(t.reqIds?.includes(r.id)){delivered++; cash+=requestValue(r); return false;} return true; });
        dest.totalDelivered=(dest.totalDelivered||0)+delivered;
        g.cash+=cash; g.score+=cash+g.day;
      }
      t.returning=true; t.path=[...t.path].reverse(); t.seg=0; t.prog=0; t.age=0; return;
    }
    if(hub) hub.idle++;
    g.vans.splice(i,1);
  };

  const originalUpdate=update;
  update=function(dt){
    const before=S.g?.day;
    originalUpdate(dt);
    if(S.g && !S.edit) lockZoomForCurrentDay();
    if(S.g && before!==S.g.day && S.g.day%7===0){
      S.cam.z=startZoomFor(S.g.day);
      clampCam();
      safeSay('The delivery area expanded.');
    }
  };

  hud=function(){
    const g=S.g;
    drawDayClock(62,50);
    statPill('TARGET', String(g.l.target), 12, 86);
    statPill('ROADS', String(g.tiles), 12, 130);
    statPill('LATE', `${g.late}/${g.l.fail}`, 12, 174);
    statPill('CASH', `£${g.cash}`, 12, 218);
    circleBtn('menu','≡',600,46,24,'pale',24);
    circleBtn('pause',S.paused?'▶':'Ⅱ',656,46,24,S.paused?'teal':'pale',20);
    circleBtn('speed',S.speed===2?'2×':'1×',712,46,24,S.speed===2?'red':'pale',16);
    circleBtn('edit',S.edit?'✓':'✎',768,46,24,S.edit?'red':'pale',20);
  };

  const originalBottom=bottom;
  bottom=function(){
    if(S.edit) return originalBottom();
    btn('info','i',18,340,42,34,'pale',20);
    if(S.infoOpen){
      card(64,210,500,126);
      txt('Quick Info',88,234,18,C.ink,'left',true);
      txt('Initial view now shows the full starter area.',88,260,14,C.ink);
      txt('Pinch zoom is only available while editing roads.',88,284,14,C.ink);
      txt('You start with 15 road tiles.',88,308,14,C.ink);
      txt('Cash rises with distance; late deliveries pay less.',88,326,13,C.muted);
    }
  };

  const originalAction=action;
  action=function(id){
    if(id==='info'){S.infoOpen=!S.infoOpen;return;}
    if(id==='menu'){
      S.screen='menu'; S.paused=false; S.edit=false; S.panel=null; S.infoOpen=false; S.pointers?.clear?.(); S.drag=null; S.pinch=null;
      return;
    }
    if(id==='edit'){
      S.edit=!S.edit;
      if(S.edit){S.paused=true;S.tool='draw';safeSay('Edit mode: choose Draw, Delete, or Pan. Pinch zoom is enabled.');}
      else{S.paused=false;lockZoomForCurrentDay();safeSay('Road editing finished.');}
      S.panel=null;
      return;
    }
    return originalAction(id);
  };

  const originalSetPinch=setPinch;
  setPinch=function(){ if(!S.edit){S.pinch=null;return;} return originalSetPinch(); };
  const originalUpdatePinch=updatePinch;
  updatePinch=function(){ if(!S.edit){S.pinch=null;lockZoomForCurrentDay();return;} return originalUpdatePinch(); };
})();
