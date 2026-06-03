// Delivery Days clarity + replay polish override.
// Loaded last so it can improve feedback without rewriting the working core loop.
(function(){
  const SAVE_KEY = 'deliveryDaysFirstRunGuideSeenV1';

  function gameActive(){ return S && S.screen === 'game' && S.g; }
  function clamp01(v){ return Math.max(0, Math.min(1, v)); }
  function worldToScreen(x,y){ return { x:(x - S.cam.x) * S.cam.z, y:(y - S.cam.y) * S.cam.z }; }
  function visibleOnScreen(p, pad=24){ return p.x > -pad && p.x < W + pad && p.y > -pad && p.y < H + pad; }
  function nodeRequests(n){ return (typeof activeReq === 'function' ? activeReq(n) : (n.requests || []).filter(r => r.status !== 'delivered')); }
  function waitingRequests(n,c){ return (typeof waitingReq === 'function' ? waitingReq(n,c) : nodeRequests(n).filter(r => r.status === 'waiting' && (!c || r.colour === c))); }
  function settlementNodes(){ return S.g?.nodes?.filter(n => n.type !== 'hub') || []; }
  function hubNodes(){ return S.g?.nodes?.filter(n => n.type === 'hub') || []; }
  function minDue(n){ const a = nodeRequests(n); return a.length ? Math.min(...a.map(r => r.late ? -1 : r.due)) : null; }
  function urgentNode(){
    const candidates = settlementNodes().map(n => ({n, due:minDue(n), waiting:waitingRequests(n).length, active:nodeRequests(n).length})).filter(x => x.active > 0);
    if(!candidates.length) return null;
    candidates.sort((a,b) => (a.due ?? 999) - (b.due ?? 999) || b.waiting - a.waiting || b.active - a.active);
    return candidates[0].n;
  }
  function mostLikelyCause(){
    const g = S.g;
    if(!g) return 'No game data available.';
    const waiting = settlementNodes().flatMap(n => waitingRequests(n).map(r => ({node:n, req:r})));
    if(waiting.length){
      const noRoute = waiting.filter(({node,req}) => !bestConnectedHub(node, req.colour));
      if(noRoute.length) return `Missing ${noRoute[0].req.colour} road connection to ${noRoute[0].node.name}.`;
      const busy = waiting.filter(({node,req}) => bestConnectedHub(node, req.colour) && !bestAvailableHub(node, req.colour));
      if(busy.length) return `Drivers were overloaded for ${busy[0].req.colour} deliveries.`;
      return 'Waiting deliveries built up faster than they were dispatched.';
    }
    const loading = hubNodes().reduce((sum,h)=>sum+(h.loading?.length||0),0);
    if(loading > 0) return 'Deliveries were still loading when the deadline pressure caught up.';
    if((g.roads?.length||0) < 8) return 'The road network was probably too small.';
    if(g.tiles <= 1) return 'Road tiles ran low at a critical moment.';
    return g.late ? 'Late requests accumulated over time.' : 'You reached the end state cleanly.';
  }
  function bestConnectedHub(dest, colour){
    let found = null;
    for(const h of hubNodes().filter(h => !colour || h.colour === colour)){
      const p = shortest(h,dest);
      if(p && (!found || p.cost < found.cost)) found = {h,path:p.path,cost:p.cost};
    }
    return found;
  }
  function bestAvailableHub(dest, colour){
    let found = null;
    for(const h of hubNodes().filter(h => h.idle > 0 && (!colour || h.colour === colour))){
      const p = shortest(h,dest);
      if(p && (!found || p.cost < found.cost)) found = {h,path:p.path,cost:p.cost};
    }
    return found;
  }
  function explainDispatchFailure(dest){
    const waiting = waitingRequests(dest);
    if(!waiting.length) return 'No waiting deliveries at this location.';
    const colours = [...new Set(waiting.map(r => r.colour || 'yellow'))];
    const details = [];
    for(const colour of colours){
      const matching = hubNodes().filter(h => h.colour === colour);
      if(!matching.length){ details.push(`No ${colour} hub exists yet.`); continue; }
      const connected = matching.filter(h => shortest(h,dest));
      if(!connected.length){ details.push(`No ${colour} road connection to ${dest.name}.`); continue; }
      if(!connected.some(h => h.idle > 0)){ details.push(`${colour[0].toUpperCase()+colour.slice(1)} hub connected, but no idle drivers.`); continue; }
      details.push(`${colour[0].toUpperCase()+colour.slice(1)} hub is ready; try Start Loading again.`);
    }
    return details[0] || 'No available matching hub driver.';
  }

  function drawRoundRect(x,y,w,h,r,fillCol,strokeCol){
    fill(x,y,w,h,r,fillCol);
    if(strokeCol){ ctx.strokeStyle = strokeCol; ctx.lineWidth = 2; rr(x,y,w,h,r); ctx.stroke(); }
  }
  function drawUrgencyOverlay(){
    if(!gameActive()) return;
    const time = performance.now() / 1000;
    for(const n of settlementNodes()){
      const reqs = nodeRequests(n);
      if(!reqs.length) continue;
      const due = minDue(n);
      const sz = sizeOf(n);
      const x = n.x + sz.w/2 - 2;
      const y = n.y - sz.h/2 - 8;
      const urgent = due <= 2;
      const late = due < 0 || reqs.some(r => r.late);
      if(urgent || late){
        ctx.save();
        ctx.globalAlpha = late ? .88 : .38 + Math.sin(time * 7) * .14;
        ctx.strokeStyle = late ? C.red : C.yellow;
        ctx.lineWidth = late ? 5 : 4;
        ctx.beginPath();
        ctx.arc(n.x, n.y, Math.max(sz.w,sz.h) * .7 + (Math.sin(time*6)+1)*3, 0, Math.PI*2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      const label = late ? '!' : String(due);
      const bg = late ? C.red : due <= 1 ? C.red : due <= 2 ? C.yellow : C.cream;
      const fg = due <= 2 || late ? 'white' : C.ink;
      ctx.shadowColor='rgba(0,0,0,.22)'; ctx.shadowOffsetX=2; ctx.shadowOffsetY=3;
      drawRoundRect(x-13,y-13,26,24,10,bg,C.ink);
      ctx.shadowColor='transparent';
      txt(label,x,y,14,fg,'center',true);
      if(reqs.length > 1){ drawRoundRect(x+9,y+5,20,16,8,C.ink,null); txt(String(reqs.length),x+19,y+13,10,'white','center',true); }
      ctx.restore();
    }

    for(const h of hubNodes()){
      const sz = sizeOf(h);
      ctx.save();
      ctx.globalAlpha = .16;
      ctx.fillStyle = HUB[h.colour] || C.teal;
      ctx.beginPath(); ctx.arc(h.x,h.y,Math.max(sz.w,sz.h)*.8,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  const previousDrawMap = drawMap;
  drawMap = function(){
    previousDrawMap();
    drawUrgencyOverlay();
  };

  const previousHud = hud;
  hud = function(){
    previousHud();
    if(!gameActive()) return;
    const u = urgentNode();
    if(!u) return;
    const due = minDue(u);
    const label = due < 0 ? `Late: ${u.name}` : due <= 2 ? `Urgent: ${u.name} ${due}d` : null;
    if(label){
      btn('jumpUrgent', label, 374, 24, 174, 31, due < 0 || due <= 1 ? 'red' : 'teal', 12);
    }
  };

  const previousAction = action;
  action = function(id){
    if(id === 'jumpUrgent'){
      const u = urgentNode();
      if(u){
        S.cam.z = Math.max(S.cam.z, 1.12);
        S.cam.x = u.x - W/(2*S.cam.z);
        S.cam.y = u.y - H/(2*S.cam.z);
        clampCam();
        S.panel = u;
        say('Showing most urgent delivery.');
      }
      return;
    }
    if(id === 'guideNext'){
      S.firstRunGuideStep = (S.firstRunGuideStep || 0) + 1;
      if(S.firstRunGuideStep > 3) finishGuide();
      return;
    }
    if(id === 'guideSkip'){
      finishGuide();
      return;
    }
    return previousAction(id);
  };

  const previousDispatchTo = dispatchTo;
  dispatchTo = function(dest,auto=false,colour=null){
    const beforeWaiting = waitingRequests(dest, colour).length;
    const beforeLoading = hubNodes().reduce((sum,h)=>sum+(h.loading?.length||0),0);
    const result = previousDispatchTo(dest,auto,colour);
    if(!auto){
      const afterWaiting = waitingRequests(dest, colour).length;
      const afterLoading = hubNodes().reduce((sum,h)=>sum+(h.loading?.length||0),0);
      if(beforeWaiting > 0 && afterWaiting === beforeWaiting && afterLoading === beforeLoading){
        say(explainDispatchFailure(dest));
      }
    }
    return result;
  };

  function beginGuide(){
    if(!gameActive()) return;
    if(S.g.l.id !== 1) return;
    if(localStorage.getItem(SAVE_KEY) === 'yes') return;
    if(S.firstRunGuideDone) return;
    S.firstRunGuideStep = 0;
    S.firstRunGuideDone = true;
  }
  function finishGuide(){
    S.firstRunGuideStep = null;
    try{ localStorage.setItem(SAVE_KEY,'yes'); }catch(e){}
  }
  function drawGuide(){
    if(!gameActive() || S.firstRunGuideStep == null) return;
    const steps = [
      {title:'Welcome to Delivery Days', body:'Connect hubs to locations, load deliveries, and stop requests becoming late.'},
      {title:'Build the road network', body:'Tap Roads, draw from the hub to a location, then tap Finish to restart the clock.'},
      {title:'Send the delivery', body:'Tap a location with a request, then press Start Loading. Matching coloured hubs handle matching requests.'},
      {title:'Watch the urgent badges', body:'Numbers above locations show days left. Red warnings mean that delivery needs attention now.'}
    ];
    const s = steps[Math.max(0, Math.min(steps.length-1, S.firstRunGuideStep))];
    S.ui = S.ui.filter(u => !String(u.id).startsWith('guide'));
    fill(0,0,W,H,0,'rgba(30,40,44,.18)');
    const x=188,y=70,w=468,h=210;
    card(x,y,w,h);
    txt(s.title,x+w/2,y+36,25,C.ink,'center',true);
    wrap(s.body,x+w/2,y+78,w-70,16,C.ink);
    txt(`Step ${S.firstRunGuideStep+1} of ${steps.length}`,x+w/2,y+138,13,C.muted,'center',true);
    btn('guideSkip','Skip',x+80,y+160,112,34,'pale',15);
    btn('guideNext',S.firstRunGuideStep === steps.length-1 ? 'Got it' : 'Next',x+w-192,y+160,112,34,'teal',15);
  }

  const previousStart = start;
  start = function(level){
    previousStart(level);
    beginGuide();
  };

  const previousGame = game;
  game = function(){
    previousGame();
    if(S.screen === 'game') drawGuide();
  };

  outcome = function(win){
    game();
    S.ui=[];
    fill(0,0,W,H,0,'rgba(238,244,240,.80)');
    const g = S.g;
    const medal = g?.medal || S.save.medals?.[g?.l?.id] || null;
    card(208,38,428,314);
    txt(win?'Level Complete':'Game Over',W/2,78,32,win?C.teal:C.red,'center',true);
    if(medal) txt(`${medal[0].toUpperCase()+medal.slice(1)} medal`,W/2,108,15,C.ink,'center',true);
    txt(`Level ${g.l.id}   Day ${g.day} / ${g.l.target}`,W/2,136,16,C.ink,'center',true);
    txt(`Score ${g.score}   Best ${S.save.best?.[g.l.id] || g.score}`,W/2,160,15,C.ink,'center');
    const delivered = settlementNodes().reduce((sum,n)=>sum+(n.totalDelivered||0),0);
    const late = settlementNodes().reduce((sum,n)=>sum+(n.totalLate||0),0);
    const sent = hubNodes().reduce((sum,h)=>sum+(h.totalSent||0),0);
    txt(`Delivered ${delivered} / Sent ${sent} / Late ${late}`,W/2,186,15,C.ink,'center',true);
    txt(`Cash £${g.cash}   Roads ${g.tiles}   Bridges ${g.bridges||0}`,W/2,210,14,C.ink,'center');
    wrap('Main read: '+mostLikelyCause(),W/2,240,350,14,win?C.teal:C.red);
    btn('retry','Retry',292,294,112,38,'teal',17);
    btn('levels','Levels',440,294,112,38,'dark',17);
  };
})();
