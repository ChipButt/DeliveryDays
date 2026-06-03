// Delivery Days day 7 weekly-summary safety fix.
// Ensures the weekly summary can always be collected and cannot leave the game permanently paused.
(function(){
  const previousAction = action;
  action = function(id){
    if(id === 'weeklyCollect' && S.weeklySummary){
      S.weeklySummary.phase = 'merge';
      S.weeklySummary.t = 0;
      return;
    }
    return previousAction(id);
  };

  const previousUpdate = update;
  update = function(dt){
    previousUpdate(dt);
    if(S.weeklySummary && S.weeklySummary.phase === 'merge' && S.weeklySummary.t > 1.1){
      S.weeklySummary = null;
      S.paused = false;
    }
    if(!S.weeklySummary && S.screen === 'game' && S.paused && S.firstRunGuideStep == null && !S.edit){
      // Safety valve: no modal/guide/edit mode is active, so gameplay should not remain stuck paused.
      S.paused = false;
    }
  };
})();
