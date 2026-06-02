// Delivery Days automatic bridge line override.
// Removes the separate bridge drawing tool. In normal Draw mode, a road stops at water unless a bridge is available.
// If a bridge is available, one bridge token carries the road across all contiguous water tiles in one straight 8-direction line.
(function(){
  const WATER_RADIUS = 38;

  function segDist(p,a,b){
    const l2=(b.x-a.x)**2+(b.y-a.y)**2;
    const t=l2?Math.max(0,Math.min(1,((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/l2)):0;
    return Math.hypot(p.x-(a.x+(b.x-a.x)*t),p.y-(a.y+(b.y-a.y)*t));
  }
  function river(){ return S.g?.l?.map?.river || null; }
  function pointInWater(p){
    const r=river();
    if(!r) return false;
    for(let i=0;i<r.length-1;i++){
      if(segDist(p,{x:r[i][0],y:r[i][1]},{x:r[i+1][0],y:r[i+1][1]}) < WATER_RADIUS) return true;
    }
    return false;
  }
  function needsBridge(a,b){
    if(!river()) return false;
    const steps=Math.max(2,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/10));
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      if(pointInWater({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t})) return true;
    }
    return false;
  }
  function dirFrom(a,b){
    const dx=Math.sign(Math.round((b.x-a.x)/GRID));
    const dy=Math.sign(Math.round((b.y-a.y)/GRID));
    if(dx===0&&dy===0) return null;
    return {dx,dy};
  }
  function step(p,dir){ return {x:p.x+dir.dx*GRID,y:p.y+dir.dy*GRID}; }
  function outOfWorld(p){ return p.x<GRID/2||p.x>WORLD_W-GRID/2||p.y<GRID/2||p.y>WORLD_H-GRID/2; }
  function roadExists(a,b){ return S.g.roads.some(r=>(eq(r.a,a)&&eq(r.b,b))||(eq(r.a,b)&&eq(r.b,a))); }

  function buildStraightBridgeSegments(start,next){
    const dir=dirFrom(start,next);
    if(!dir) return null;
    if(!needsBridge(start,next)) return {segments:[{a:start,b:next,bridge:false}],end:next,usesBridge:false};
    if((S.g.bridges||0)<=0) return null;

    const segments=[];
    let a=start;
    let b=next;
    let touchedWater=false;
    let guard=0;

    while(guard++<80){
      if(outOfWorld(b)) return null;
      const segWater=needsBridge(a,b) || pointInWater(a) || pointInWater(b);
      if(segWater) touchedWater=true;
      segments.push({a:{x:a.x,y:a.y},b:{x:b.x,y:b.y},bridge:segWater});
      a=b;
      if(touchedWater && !pointInWater(a)) break;
      b=step(a,dir);
    }

    if(!touchedWater) return {segments:[{a:start,b:next,bridge:false}],end:next,usesBridge:false};
    if(pointInWater(a)) return null;
    return {segments,end:a,usesBridge:true};
  }

  addRoad=function(a,b){
    if(!S.g) return;
    if(eq(a,b)) return;
    const built=buildStraightBridgeSegments(a,b);
    if(!built) return;

    let tileCost=0;
    for(const s of built.segments){ if(!roadExists(s.a,s.b)) tileCost++; }
    if(tileCost<=0) return;
    if(S.g.tiles<tileCost) return;

    S.g.tiles-=tileCost;
    if(built.usesBridge) S.g.bridges=Math.max(0,(S.g.bridges||0)-1);
    for(const s of built.segments){
      if(!roadExists(s.a,s.b)) S.g.roads.push({a:s.a,b:s.b,cost:1,bridge:!!s.bridge});
    }
  };

  drawRoadToward=function(target){
    if(!S.drag||!S.drag.last) return;
    let guard=0;
    while(!eq(S.drag.last,target)&&guard++<8){
      let dx=target.x-S.drag.last.x,dy=target.y-S.drag.last.y;
      if(Math.abs(dx)<GRID*.5&&Math.abs(dy)<GRID*.5) break;
      let stepX=Math.abs(dx)>=GRID*.5?Math.sign(dx)*GRID:0;
      let stepY=Math.abs(dy)>=GRID*.5?Math.sign(dy)*GRID:0;
      let n={x:S.drag.last.x+stepX,y:S.drag.last.y+stepY};
      n.x=Math.max(GRID/2,Math.min(WORLD_W-GRID/2,n.x));
      n.y=Math.max(GRID/2,Math.min(WORLD_H-GRID/2,n.y));
      if(eq(n,S.drag.last)) break;
      const beforeRoads=S.g.roads.length;
      addRoad(S.drag.last,n);
      if(S.g.roads.length===beforeRoads) break;
      // If bridge auto-extended over water, continue from the far land end.
      const lastSeg=S.g.roads[S.g.roads.length-1];
      S.drag.last={x:lastSeg.b.x,y:lastSeg.b.y};
    }
  };

  const previousBottom=bottom;
  bottom=function(){
    if(!S.edit) return previousBottom();
    fill(14,326,816,52,16,'rgba(251,250,244,.95)');
    btn('draw','Draw',30,336,78,32,S.tool==='draw'?'teal':'pale',15);
    btn('delete','Delete',120,336,86,32,S.tool==='delete'?'red':'pale',15);
    btn('pan','Pan Map',218,336,94,32,S.tool==='pan'?'dark':'pale',15);
    txt('Draw mode auto-uses 1 bridge to cross water in a straight line. Bridges: '+(S.g.bridges||0),334,352,13,C.muted,'left',true);
  };

  const previousAction=action;
  action=function(id){
    if(id==='bridge') return;
    if(id==='draw'){S.tool='draw';S.bridgeMode=false;return;}
    return previousAction(id);
  };
})();
