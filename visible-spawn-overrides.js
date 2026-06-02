// Delivery Days visible spawn override.
// When the map expands, newly revealed locations are repositioned on-screen and only 1-2 tiles beyond the current outer settlement ring.
(function(){
  let knownNodeIds = new Set();

  function silence(){ S.msg=''; S.msgT=0; S.bottomAlert=null; S.newLocationFocus=null; }
  say = function(){ silence(); };

  function primaryHub(){ return S.g?.nodes.find(n=>n.type==='hub'&&n.colour==='yellow') || S.g?.nodes.find(n=>n.type==='hub'); }
  function dist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
  function viewBounds(){ return { left:S.cam.x, top:S.cam.y, right:S.cam.x + W/S.cam.z, bottom:S.cam.y + H/S.cam.z }; }
  function insideView(p, pad=GRID*1.5){ const v=viewBounds(); return p.x>v.left+pad && p.x<v.right-pad && p.y>v.top+pad && p.y<v.bottom-pad; }
  function segDist(p,a,b){ const l2=(b.x-a.x)**2+(b.y-a.y)**2; const t=l2?Math.max(0,Math.min(1,((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/l2)):0; return Math.hypot(p.x-(a.x+(b.x-a.x)*t),p.y-(a.y+(b.y-a.y)*t)); }
  function pointInWaterLocal(p){ const r=S.g?.l?.map?.river; if(!r) return false; for(let i=0;i<r.length-1;i++){ if(segDist(p,{x:r[i][0],y:r[i][1]},{x:r[i+1][0],y:r[i+1][1]})<42) return true; } return false; }

  function goodSpot(p){
    if(!insideView(p, GRID*1.25)) return false;
    if(p.x<90||p.x>WORLD_W-90||p.y<96||p.y>WORLD_H-96) return false;
    if(pointInWaterLocal(p)) return false;
    if(S.g.nodes.some(n=>n.type==='hub' && dist(n,p)<GRID*2.6)) return false;
    if(S.g.nodes.some(n=>knownNodeIds.has(n.id) && n.type!=='hub' && dist(n,p)<GRID*2.35)) return false;
    return true;
  }

  function currentOuterRadius(){
    const h=primaryHub(); if(!h) return GRID*5;
    let max=GRID*3;
    for(const n of S.g.nodes){ if(n.type!=='hub' && knownNodeIds.has(n.id)) max=Math.max(max, dist(h,n)); }
    return max;
  }

  function placeNewLocation(n, index, total){
    const h=primaryHub(); if(!h) return;
    const base=currentOuterRadius()+GRID*(1.2+Math.min(1,index)*0.65);
    const v=viewBounds();
    const centre={x:(v.left+v.right)/2,y:(v.top+v.bottom)/2};
    const preferred=Math.atan2(centre.y-h.y, centre.x-h.x);

    for(let tries=0; tries<180; tries++){
      const spread=(tries/180)*Math.PI*2;
      const side=(tries%2===0?1:-1);
      const ang=preferred + side*spread + (index-(total-1)/2)*0.45;
      const radius=base + Math.floor(tries/24)*GRID*0.35;
      const p=snapP(h.x+Math.cos(ang)*radius, h.y+Math.sin(ang)*radius);
      if(goodSpot(p)){ n.x=p.x; n.y=p.y; return; }
    }

    // Fallback: scan the visible area tile-by-tile so it never lands off-screen.
    const left=Math.ceil((v.left+GRID*1.5)/GRID)*GRID+GRID/2;
    const right=Math.floor((v.right-GRID*1.5)/GRID)*GRID+GRID/2;
    const top=Math.ceil((v.top+GRID*1.5)/GRID)*GRID+GRID/2;
    const bottom=Math.floor((v.bottom-GRID*1.5)/GRID)*GRID+GRID/2;
    let best=null, bestScore=-Infinity;
    for(let x=left;x<=right;x+=GRID){
      for(let y=top;y<=bottom;y+=GRID){
        const p={x,y};
        if(!goodSpot(p)) continue;
        const score=-Math.abs(dist(h,p)-base)+Math.random()*0.01;
        if(score>bestScore){best=p;bestScore=score;}
      }
    }
    if(best){ n.x=best.x; n.y=best.y; }
  }

  function markKnown(){ knownNodeIds = new Set((S.g?.nodes||[]).map(n=>n.id)); }

  const previousStart=start;
  start=function(level){ previousStart(level); markKnown(); silence(); };

  const previousUpdate=update;
  update=function(dt){
    const beforeIds=new Set((S.g?.nodes||[]).map(n=>n.id));
    previousUpdate(dt);
    if(S.g){
      const added=S.g.nodes.filter(n=>!beforeIds.has(n.id) && n.type!=='hub');
      if(added.length){
        added.forEach((n,i)=>placeNewLocation(n,i,added.length));
        markKnown();
      }
      silence();
    }
  };
})();
