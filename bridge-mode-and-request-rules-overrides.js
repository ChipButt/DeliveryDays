// Delivery Days bridge mode and bridge-gated request rules.
// Fixes Bridge mode drawing and prevents requests from using a hub that would require a bridge before bridges unlock on day 14.
(function(){
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
      if(segDist(p,{x:r[i][0],y:r[i][1]},{x:r[i+1][0],y:r[i+1][1]}) < 38) return true;
    }
    return false;
  }
  function lineNeedsBridge(a,b){
    if(!river()) return false;
    const steps=Math.max(2,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/10));
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      if(pointInWater({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t})) return true;
    }
    return false;
  }
  function visibleHubs(){
    if(!S.g) return [];
    return S.g.nodes.filter(n=>n.type==='hub');
  }
  function coloursAllowedForLocation(n){
    const allowed=[];
    for(const h of visibleHubs()){
      const needsBridge=lineNeedsBridge(h,n);
      if(needsBridge && S.g.day < 14) continue;
      if(!allowed.includes(h.colour||'yellow')) allowed.push(h.colour||'yellow');
    }
    return allowed.length ? allowed : ['yellow'];
  }
  function chooseRequestColourFor(n){
    const allowed=coloursAllowedForLocation(n);
    if(allowed.includes('blue') && allowed.includes('yellow')) return Math.random()<0.42 ? 'blue' : 'yellow';
    return allowed[0];
  }

  addRequest=function(n, colour=null){
    const due=deliveryWindow(n.type,S.g.day,S.g.l);
    n.requests.push({
      id:uid(),
      due,
      originalDue:due,
      status:'waiting',
      late:false,
      colour:colour || chooseRequestColourFor(n),
      baseValue:0,
      distanceTiles:0
    });
  };

  const previousAddRoad=addRoad;
  addRoad=function(a,b){
    if(!S.g) return;
    if(eq(a,b)||S.g.roads.some(r=>(eq(r.a,a)&&eq(r.b,b))||(eq(r.a,b)&&eq(r.b,a)))) return;
    const bridge=lineNeedsBridge(a,b);
    if(bridge && !S.bridgeMode) return;
    if(bridge && (S.g.bridges||0)<=0) return;
    if(!bridge && pointInWater(a)) return;
    if(!bridge && pointInWater(b)) return;
    if(S.g.tiles<1) return;
    S.g.tiles--;
    if(bridge) S.g.bridges--;
    S.g.roads.push({a:{x:a.x,y:a.y},b:{x:b.x,y:b.y},cost:1,bridge});
  };

  const previousAction=action;
  action=function(id){
    if(id==='bridge'){
      S.bridgeMode=true;
      S.tool='draw';
      return;
    }
    if(id==='draw'){
      S.bridgeMode=false;
      S.tool='draw';
      return;
    }
    if(id==='delete'||id==='pan') S.bridgeMode=false;
    const result=previousAction(id);
    if(id==='edit' && S.edit) S.bridgeMode=false;
    return result;
  };

  const previousBottom=bottom;
  bottom=function(){
    if(!S.edit) return previousBottom();
    fill(14,326,816,52,16,'rgba(251,250,244,.95)');
    btn('draw','Draw',30,336,78,32,(S.tool==='draw'&&!S.bridgeMode)?'teal':'pale',15);
    btn('bridge','Bridge',120,336,86,32,S.bridgeMode?'teal':'pale',15);
    btn('delete','Delete',218,336,86,32,S.tool==='delete'?'red':'pale',15);
    btn('pan','Pan Map',316,336,94,32,S.tool==='pan'?'dark':'pale',15);
    txt('Bridge mode crosses water. Bridges: '+(S.g.bridges||0),426,352,13,C.muted,'left',true);
  };
})();
