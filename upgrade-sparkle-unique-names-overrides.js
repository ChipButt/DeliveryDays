// Delivery Days upgrade sparkle and unique location name override.
// Hubs sparkle when a new affordable upgrade becomes available. Affordable upgrade buttons sparkle inside the hub panel.
// Spawned locations are forced to have unique names within each level.
(function(){
  const usedNames = new Set();
  const hubSeenUpgradeSignature = new Map();

  const namePools = {
    village: ['Hazel Wick','Brooklet','Pinewell','Moss End','Oakmere','Larch End','Greenfold','Willowby','Cedar Nook','Elm Hollow','Foxglade','Briar End','Millbrook','Ash Vale','Hillmere','Rowanstead'],
    town: ['Dockminster','Fernport','Stoneford','Ashford','Northmarket','Ridgewell','Westbridge','Kingsford','Port Amber','Elderbridge','South Carrow','Ironmere','Hawthorn Quay','Brindleton'],
    city: ['New Carrow','Eastport','Silverhaven','Crown City','Highgate','Grand Ashport','Northspire','Port Meridian','Cobalt City','Whitehaven']
  };

  function capText(s){ return String(s||'Location').charAt(0).toUpperCase()+String(s||'Location').slice(1); }
  function normalName(s){ return String(s||'').trim().toLowerCase(); }
  function ensureUniqueName(n){
    if(!n || n.type==='hub') return;
    if(n.name && !usedNames.has(normalName(n.name))){ usedNames.add(normalName(n.name)); return; }
    const pool = namePools[n.type] || namePools.village;
    let chosen = null;
    for(const candidate of pool){ if(!usedNames.has(normalName(candidate))){ chosen = candidate; break; } }
    if(!chosen){
      let i = 2;
      const base = capText(n.type);
      while(usedNames.has(normalName(`${base} ${i}`))) i++;
      chosen = `${base} ${i}`;
    }
    n.name = chosen;
    usedNames.add(normalName(chosen));
  }
  function rebuildUsedNames(){
    usedNames.clear();
    for(const n of S.g?.nodes || []) ensureUniqueName(n);
  }

  function affordableUpgrades(h){
    if(!S.g || !h || h.type!=='hub') return [];
    const g=S.g, cp=g.caps, out=[];
    if(h.drivers < cp.drivers && g.cash >= driverCost(h)) out.push('driver');
    if(h.loadLv < cp.load && g.cash >= loadCost(h)) out.push('load');
    if(h.speedLv < cp.speed && g.cash >= speedCost(h)) out.push('speed');
    if(h.packLv < cp.pack && g.cash >= packCost(h)) out.push('pack');
    if(!h.manager && g.cash >= managerCost(h)) out.push('manager');
    return out;
  }
  function upgradeSignature(h){ return affordableUpgrades(h).join('|'); }
  function shouldSparkleHub(h){
    const sig = upgradeSignature(h);
    if(!sig) return false;
    return hubSeenUpgradeSignature.get(h.id) !== sig;
  }
  function markHubSeen(h){
    if(h?.type==='hub') hubSeenUpgradeSignature.set(h.id, upgradeSignature(h));
  }

  function drawSparkle(cx,cy,tiny=false){
    const t = performance.now()/1000;
    const pulse = 0.65 + Math.sin(t*5 + cx*0.03 + cy*0.04)*0.35;
    ctx.save();
    ctx.globalAlpha = 0.45 + pulse*0.45;
    ctx.strokeStyle = '#f7fff0';
    ctx.fillStyle = '#39ff14';
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = tiny ? 8 : 14;
    const count = tiny ? 3 : 5;
    for(let i=0;i<count;i++){
      const a = t*1.4 + i*Math.PI*2/count;
      const r = (tiny?13:34) + Math.sin(t*2+i)*4;
      const x = cx + Math.cos(a)*r;
      const y = cy + Math.sin(a)*r*0.65;
      const s = tiny ? 4 : 6;
      ctx.beginPath();
      ctx.moveTo(x, y-s);
      ctx.lineTo(x+s*0.45, y-s*0.45);
      ctx.lineTo(x+s, y);
      ctx.lineTo(x+s*0.45, y+s*0.45);
      ctx.lineTo(x, y+s);
      ctx.lineTo(x-s*0.45, y+s*0.45);
      ctx.lineTo(x-s, y);
      ctx.lineTo(x-s*0.45, y-s*0.45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  const previousDrawNode = drawNode;
  drawNode = function(n){
    previousDrawNode(n);
    if(n.type==='hub' && shouldSparkleHub(n)) drawSparkle(n.x, n.y-4, false);
  };

  function panelPosBeside(n,w,h){
    const sx=(n.x-S.cam.x)*S.cam.z, sy=(n.y-S.cam.y)*S.cam.z;
    let x=sx+46, y=sy-h/2;
    if(x+w>W-10) x=sx-w-46;
    x=Math.max(10,Math.min(W-w-10,x));
    y=Math.max(60,Math.min(H-h-12,y));
    return {x,y,w,h};
  }
  function sparkleButtonIf(key,x,y,w,h,hb){ if(affordableUpgrades(hb).includes(key)) drawSparkle(x+w-18,y+h/2,true); }

  hubPanel=function(h){
    markHubSeen(h);
    const b=panelPosBeside(h,520,200);
    card(b.x,b.y,b.w,b.h);
    const g=S.g, cp=g.caps;
    txt(h.name,b.x+b.w/2,b.y+24,21,HUB[h.colour]||C.ink,'center',true);
    txt(`Drivers ${h.idle}/${h.drivers}   Loading ${h.loading.length}`,b.x+b.w/2,b.y+48,13,C.ink,'center');
    txt(`Load L${h.loadLv}/${cp.load} | Speed L${h.speedLv}/${cp.speed} | Cap ${h.packLv}/${cp.pack}`,b.x+b.w/2,b.y+70,12,C.ink,'center');
    txt(h.manager?'Manager hired':'Manual dispatch',b.x+b.w/2,b.y+92,13,h.manager?C.teal:C.red,'center',true);
    const c1=driverCost(h), c2=loadCost(h), c3=speedCost(h), c5=packCost(h), c4=managerCost(h);
    const buttons = [
      ['driver','buyDriver',h.drivers<cp.drivers?`Driver £${c1}`:'Drivers Max',b.x+22,b.y+112,150,25,h.drivers<cp.drivers&&g.cash>=c1?'teal':'pale'],
      ['load','buyLoad',h.loadLv<cp.load?`Loading £${c2}`:'Loading Max',b.x+185,b.y+112,150,25,h.loadLv<cp.load&&g.cash>=c2?'teal':'pale'],
      ['speed','buySpeed',h.speedLv<cp.speed?`Speed £${c3}`:'Speed Max',b.x+348,b.y+112,150,25,h.speedLv<cp.speed&&g.cash>=c3?'teal':'pale'],
      ['pack','buyPack',h.packLv<cp.pack?`Capacity +1 £${c5}`:'Capacity Max',b.x+104,b.y+148,150,25,h.packLv<cp.pack&&g.cash>=c5?'teal':'pale'],
      ['manager','buyManager',h.manager?'Manager Active':`Manager £${c4}`,b.x+267,b.y+148,150,25,!h.manager&&g.cash>=c4?'teal':'pale']
    ];
    for(const [key,id,label,x,y,w,hgt,style] of buttons){
      btn(id,label,x,y,w,hgt,style,12);
      sparkleButtonIf(key,x,y,w,hgt,h);
    }
  };

  const previousStart = start;
  start=function(level){
    previousStart(level);
    hubSeenUpgradeSignature.clear();
    rebuildUsedNames();
  };

  const previousUpdate = update;
  update=function(dt){
    const beforeIds = new Set((S.g?.nodes||[]).map(n=>n.id));
    previousUpdate(dt);
    if(S.g){
      for(const n of S.g.nodes){
        if(n.type!=='hub' && !beforeIds.has(n.id)) ensureUniqueName(n);
      }
      // Also catch duplicate names from saved games or earlier spawns.
      const seen = new Set();
      for(const n of S.g.nodes){
        if(n.type==='hub') continue;
        const k=normalName(n.name);
        if(!k || seen.has(k)){ n.name=''; ensureUniqueName(n); }
        else seen.add(k);
      }
    }
  };

  const previousAction = action;
  action=function(id){
    const currentHub = S.panel && S.panel.type==='hub' ? S.panel : null;
    const result = previousAction(id);
    if(currentHub && ['buyDriver','buyLoad','buySpeed','buyPack','buyManager'].includes(id)){
      // After purchase, do not keep the old sparkle. It can return only when another different upgrade becomes available.
      markHubSeen(currentHub);
    }
    if(S.panel?.type==='hub') markHubSeen(S.panel);
    return result;
  };
})();
