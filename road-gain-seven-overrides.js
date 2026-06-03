// Delivery Days weekly road gain override.
// Base game adds +5 roads every 7 days; this adds the missing +2 so the total weekly gain is +7.
(function(){
  const awardedExtraRoadDays = new Set();

  const previousStart = start;
  start = function(level){
    previousStart(level);
    awardedExtraRoadDays.clear();
  };

  const previousUpdate = update;
  update = function(dt){
    const beforeDay = S.g?.day;
    previousUpdate(dt);

    if(!S.g || S.screen !== 'game') return;
    if(beforeDay === S.g.day) return;

    if(S.g.day % 7 === 0 && !awardedExtraRoadDays.has(S.g.day)){
      awardedExtraRoadDays.add(S.g.day);
      S.g.tiles += 2;
    }
  };
})();
