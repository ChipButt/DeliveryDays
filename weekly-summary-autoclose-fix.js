// Delivery Days weekly summary autoclose fix.
// Day 7 was freezing because the weekly summary modal could pause gameplay without visibly completing.
// This keeps the existing rewards but immediately clears the modal state so the day loop continues.
(function(){
  const previousUpdate = update;
  update = function(dt){
    previousUpdate(dt);
    if(S.screen === 'game' && S.weeklySummary){
      S.weeklySummary = null;
      S.paused = false;
      if(typeof say === 'function') say('Weekly rewards collected.');
    }
  };
})();
