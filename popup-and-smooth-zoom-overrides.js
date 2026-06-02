// Delivery Days popup and smooth zoom override.
// Hub popups have no Close button. Location popups sit beside the location and stay on-screen.
// Weekly expansion now eases out during the 6th day of each 7-day cycle.
(function(){
  function primaryHub(){ return S.g?.nodes.find(n=>n.type==='hub'&&n.colour==='yellow') || S.g?.nodes.find(n=>n.type==='hub'); }
  function ease(t){ return t<0?0:t>1?1:1-Math.pow(1-t,3); }
  function baseZoomForWeekIndex(week){ return Math.max(0.80, Math.min(1.22, 1.16 - week * 0.055)); }
  function smoothZoomForState(){
    if(!S.g) return 1;
    const completedWeeks = Math.floor((S.g.day - 1) / 7);
    let z = baseZoomForWeekIndex(completedWeeks);
    if(S.g.day % 7 === 6){
      const next = baseZoomForWeekIndex(completedWeeks + 1);
      z = z + (next - z) * ease(S.g.clock || 0);
    }
    return z;
  }
  function lockSmoothCamera(){
    const h=primaryHub();
    if(!S.g || !h || S.edit || S.blueHubTutorial) return;
    S.cam.z=smoothZoomForState();
    S.cam.x=h.x-470/S.cam.z;
    S.cam.y=h.y-226/S.cam.z;
    clampCam();
  }
  function screenPos(n){ return { x:(n.x-S.cam.x)*S.cam.z, y:(n.y-S.cam.y)*S.cam.z }; }
  function panelPosBeside(n,w,h){
    const p=screenPos(n);
    let x=p.x+46, y=p.y-h/2;
    if(x+w>W-10) x=p.x-w-46;
    x=Math.max(10,Math.min(W-w-10,x));
    y=Math.max(60,Math.min(H-h-12,y));
    return {x,y,w,h};
  }
  function capText(s){ return String(s||'Location').charAt(0).toUpperCase()+String(s||'Location').slice(1); }

  locPanel=function(n){
    const b=panelPosBeside(n,410,170);
    card(b.x,b.y,b.w,b.h);
    const a=activeReq(n), waiting=a.filter(r=>r.status==='waiting').length, loading=a.filter(r=>r.status==='loading').length, enroute=a.filter(r=>r.status==='enroute').length;
    txt(n.name||'Unnamed',b.x+b.w/2,b.y+24,22,C.ink,'center',true);
    txt(capText(n.type)+' delivery point',b.x+b.w/2,b.y+48,13,C.muted,'center');
    txt(`Active: ${a.length}   Waiting: ${waiting}`,b.x+b.w/2,b.y+76,15,a.length?C.red:C.ink,'center',true);
    txt(`Loading: ${loading}   En route: ${enroute}`,b.x+b.w/2,b.y+100,13,C.ink,'center');
    txt(reqDueText(n),b.x+b.w/2,b.y+124,12,a.some(r=>r.late||r.due<=2)?C.red:C.ink,'center');
    const ok=waitingReq(n).some(r=>!!bestHub(n,false,r.colour));
    btn('dispatch',waiting>0?(ok?'Start Loading':'No Available Driver / Road'):'No Waiting Requests',b.x+110,b.y+139,190,26,waiting>0&&ok?'teal':'pale',13);
  };

  hubPanel=function(h){
    const b=panelPosBeside(h,520,200);
    card(b.x,b.y,b.w,b.h);
    const g=S.g, cp=g.caps;
    txt(h.name,b.x+b.w/2,b.y+24,21,HUB[h.colour]||C.ink,'center',true);
    txt(`Drivers ${h.idle}/${h.drivers}   Loading ${h.loading.length}`,b.x+b.w/2,b.y+48,13,C.ink,'center');
    txt(`Load L${h.loadLv}/${cp.load} | Speed L${h.speedLv}/${cp.speed} | Cap ${h.packLv}/${cp.pack}`,b.x+b.w/2,b.y+70,12,C.ink,'center');
    txt(h.manager?'Manager hired':'Manual dispatch',b.x+b.w/2,b.y+92,13,h.manager?C.teal:C.red,'center',true);
    const c1=driverCost(h), c2=loadCost(h), c3=speedCost(h), c5=packCost(h), c4=managerCost(h);
    btn('buyDriver',h.drivers<cp.drivers?`Driver £${c1}`:'Drivers Max',b.x+22,b.y+112,150,25,h.drivers<cp.drivers&&g.cash>=c1?'teal':'pale',12);
    btn('buyLoad',h.loadLv<cp.load?`Loading £${c2}`:'Loading Max',b.x+185,b.y+112,150,25,h.loadLv<cp.load&&g.cash>=c2?'teal':'pale',12);
    btn('buySpeed',h.speedLv<cp.speed?`Speed £${c3}`:'Speed Max',b.x+348,b.y+112,150,25,h.speedLv<cp.speed&&g.cash>=c3?'teal':'pale',12);
    btn('buyPack',h.packLv<cp.pack?`Capacity +1 £${c5}`:'Capacity Max',b.x+104,b.y+148,150,25,h.packLv<cp.pack&&g.cash>=c5?'teal':'pale',12);
    btn('buyManager',h.manager?'Manager Active':`Manager £${c4}`,b.x+267,b.y+148,150,25,!h.manager&&g.cash>=c4?'teal':'pale',12);
  };

  const previousUpdate=update;
  update=function(dt){
    previousUpdate(dt);
    if(S.g && !S.edit && !S.blueHubTutorial) lockSmoothCamera();
    S.msg=''; S.msgT=0; S.bottomAlert=null;
  };

  const previousAction=action;
  action=function(id){
    const out=previousAction(id);
    if(id==='edit' && !S.edit) lockSmoothCamera();
    return out;
  };
})();
