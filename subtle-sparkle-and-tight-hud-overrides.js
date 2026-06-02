// Delivery Days subtle sparkle + tight HUD override.
// Tightens the left-side stat bubbles so they wrap the text, and replaces garish sparkle with light white pixel flicker.
(function(){
  const seenUpgradeSig = new Map();

  function measurePill(label,value){
    ctx.save();
    ctx.font='700 10px Arial';
    const lw=ctx.measureText(label).width;
    ctx.font='700 15px Arial';
    const vw=ctx.measureText(String(value)).width;
    ctx.restore();
    return Math.ceil(Math.max(lw,vw)+24);
  }

  function tightStat(label,value,x,y){
    const w=Math.max(58,measurePill(label,value));
    fill(x,y,w,38,12,'rgba(251,250,244,.92)');
    txt(label,x+12,y+12,10,C.muted,'left',true);
    txt(String(value),x+12,y+28,15,C.ink,'left',true);
    return w;
  }

  function circleBtn(id,label,x,y,r,k='pale',s=18){
    const col=k==='dark'?C.ink:k==='red'?C.red:k==='teal'?C.teal:C.cream;
    ctx.fillStyle=col;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=k==='pale'?'#c9d8d4':'rgba(255,255,255,.8)';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
    txt(label,x,y,s,k==='pale'?C.ink:'white','center',true);
    S.ui.push({id,x:x-r,y:y-r,w:r*2,h:r*2});
  }

  hud=function(){
    const g=S.g;
    drawDayClock(62,50);
    tightStat('TARGET',`${g.l.target} Days`,12,86);
    tightStat('ROADS',String(g.tiles),12,130);
    tightStat('LATE',`${g.late}/${g.l.fail}`,12,174);
    tightStat('CASH',`£${g.cash}`,12,218);
    if(g.l?.map?.river) tightStat('BRIDGES',String(g.bridges||0),12,262);
    circleBtn('menu','≡',600,46,24,'pale',24);
    circleBtn('pause',S.paused?'▶':'Ⅱ',656,46,24,S.paused?'teal':'pale',20);
    circleBtn('speed',S.speed===2?'2×':'1×',712,46,24,S.speed===2?'red':'pale',16);
    circleBtn('edit',S.edit?'✓':'✎',768,46,24,S.edit?'red':'pale',20);
  };

  function affordable(h){
    if(!S.g||!h||h.type!=='hub') return [];
    const g=S.g,cp=g.caps,out=[];
    if(h.drivers<cp.drivers&&g.cash>=driverCost(h)) out.push('driver');
    if(h.loadLv<cp.load&&g.cash>=loadCost(h)) out.push('load');
    if(h.speedLv<cp.speed&&g.cash>=speedCost(h)) out.push('speed');
    if(h.packLv<cp.pack&&g.cash>=packCost(h)) out.push('pack');
    if(!h.manager&&g.cash>=managerCost(h)) out.push('manager');
    return out;
  }
  function sig(h){ return affordable(h).join('|'); }
  function shouldFlash(h){ const s=sig(h); return !!s && seenUpgradeSig.get(h.id)!==s; }
  function markSeen(h){ if(h?.type==='hub') seenUpgradeSig.set(h.id,sig(h)); }

  function softWhitePixels(cx,cy,w,h,spread,count,seed){
    const t=performance.now()/1000;
    ctx.save();
    ctx.fillStyle='rgba(255,255,255,.88)';
    ctx.shadowColor='rgba(255,255,255,.8)';
    ctx.shadowBlur=2;
    for(let i=0;i<count;i++){
      const phase=Math.sin(t*7+i*2.37+seed)*0.5+0.5;
      if(phase<0.58) continue;
      const side=(i+Math.floor(t*3))%4;
      const u=((i*37)%100)/100;
      let x,y;
      if(side===0){x=cx-w/2+u*w;y=cy-h/2-spread*Math.random();}
      else if(side===1){x=cx+w/2+spread*Math.random();y=cy-h/2+u*h;}
      else if(side===2){x=cx-w/2+u*w;y=cy+h/2+spread*Math.random();}
      else{x=cx-w/2-spread*Math.random();y=cy-h/2+u*h;}
      ctx.globalAlpha=0.25+phase*0.55;
      ctx.fillRect(Math.round(x),Math.round(y),1.5,1.5);
    }
    ctx.restore();
  }

  const prevDrawNode=drawNode;
  drawNode=function(n){
    prevDrawNode(n);
    if(n.type==='hub'&&shouldFlash(n)){
      softWhitePixels(n.x,n.y,GRID*2,GRID*2,10,18,n.x+n.y);
    }
  };

  function panelPosBeside(n,w,h){
    const sx=(n.x-S.cam.x)*S.cam.z,sy=(n.y-S.cam.y)*S.cam.z;
    let x=sx+46,y=sy-h/2;
    if(x+w>W-10)x=sx-w-46;
    x=Math.max(10,Math.min(W-w-10,x));
    y=Math.max(60,Math.min(H-h-12,y));
    return{x,y,w,h};
  }

  hubPanel=function(h){
    markSeen(h);
    const b=panelPosBeside(h,520,200),g=S.g,cp=g.caps;
    card(b.x,b.y,b.w,b.h);
    txt(h.name,b.x+b.w/2,b.y+24,21,HUB[h.colour]||C.ink,'center',true);
    txt(`Drivers ${h.idle}/${h.drivers}   Loading ${h.loading.length}`,b.x+b.w/2,b.y+48,13,C.ink,'center');
    txt(`Load L${h.loadLv}/${cp.load} | Speed L${h.speedLv}/${cp.speed} | Cap ${h.packLv}/${cp.pack}`,b.x+b.w/2,b.y+70,12,C.ink,'center');
    txt(h.manager?'Manager hired':'Manual dispatch',b.x+b.w/2,b.y+92,13,h.manager?C.teal:C.red,'center',true);
    const buttons=[
      ['driver','buyDriver',h.drivers<cp.drivers?`Driver £${driverCost(h)}`:'Drivers Max',b.x+22,b.y+112,150,25,h.drivers<cp.drivers&&g.cash>=driverCost(h)?'teal':'pale'],
      ['load','buyLoad',h.loadLv<cp.load?`Loading £${loadCost(h)}`:'Loading Max',b.x+185,b.y+112,150,25,h.loadLv<cp.load&&g.cash>=loadCost(h)?'teal':'pale'],
      ['speed','buySpeed',h.speedLv<cp.speed?`Speed £${speedCost(h)}`:'Speed Max',b.x+348,b.y+112,150,25,h.speedLv<cp.speed&&g.cash>=speedCost(h)?'teal':'pale'],
      ['pack','buyPack',h.packLv<cp.pack?`Capacity +1 £${packCost(h)}`:'Capacity Max',b.x+104,b.y+148,150,25,h.packLv<cp.pack&&g.cash>=packCost(h)?'teal':'pale'],
      ['manager','buyManager',h.manager?'Manager Active':`Manager £${managerCost(h)}`,b.x+267,b.y+148,150,25,!h.manager&&g.cash>=managerCost(h)?'teal':'pale']
    ];
    const aff=affordable(h);
    for(const [key,id,label,x,y,w,hgt,style] of buttons){
      btn(id,label,x,y,w,hgt,style,12);
      if(aff.includes(key)) softWhitePixels(x+w/2,y+hgt/2,w,hgt,5,9,x+y);
    }
  };

  const prevStart=start;
  start=function(level){prevStart(level);seenUpgradeSig.clear();};

  const prevAction=action;
  action=function(id){
    const activeHub=S.panel&&S.panel.type==='hub'?S.panel:null;
    const out=prevAction(id);
    if(activeHub&&['buyDriver','buyLoad','buySpeed','buyPack','buyManager'].includes(id)) markSeen(activeHub);
    if(S.panel?.type==='hub') markSeen(S.panel);
    return out;
  };
})();
