// Delivery Days unique location name override.
// Keeps spawned location names unique within each level. Sparkle visuals are handled only by subtle-sparkle-and-tight-hud-overrides.js.
(function(){
  const usedNames = new Set();

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
    for(const candidate of pool){
      if(!usedNames.has(normalName(candidate))){ chosen = candidate; break; }
    }
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

  const previousStart = start;
  start = function(level){
    previousStart(level);
    rebuildUsedNames();
  };

  const previousUpdate = update;
  update = function(dt){
    const beforeIds = new Set((S.g?.nodes || []).map(n => n.id));
    previousUpdate(dt);
    if(!S.g) return;

    for(const n of S.g.nodes){
      if(n.type !== 'hub' && !beforeIds.has(n.id)) ensureUniqueName(n);
    }

    const seen = new Set();
    usedNames.clear();
    for(const n of S.g.nodes){
      if(n.type === 'hub') continue;
      const k = normalName(n.name);
      if(!k || seen.has(k)){
        n.name = '';
        ensureUniqueName(n);
        seen.add(normalName(n.name));
      } else {
        seen.add(k);
        usedNames.add(k);
      }
    }
  };
})();
