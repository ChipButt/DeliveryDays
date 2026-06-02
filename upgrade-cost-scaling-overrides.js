// Delivery Days upgrade cost scaling override.
// Makes hub upgrades ramp harder so cash cannot instantly buy every upgrade.
(function(){
  function levelPressure(){ return Math.max(1, S.g?.l?.id || 1); }
  function expoCost(base, level, mult, add=0){
    const lv = Math.max(1, level || 1);
    return Math.round((base + add) * Math.pow(mult, lv - 1) + lv * lv * 18 + levelPressure() * 12);
  }

  driverCost = function(h){
    return Math.round(115 * Math.pow(1.55, Math.max(0, h.drivers - 2)) + levelPressure() * 18);
  };

  loadCost = function(h){
    return expoCost(105, h.loadLv, 1.70, 10);
  };

  speedCost = function(h){
    return expoCost(120, h.speedLv, 1.75, 15);
  };

  packCost = function(h){
    return expoCost(170, h.packLv, 1.85, 25);
  };

  managerCost = function(h){
    return Math.round(325 + levelPressure() * 55 + (h.drivers + h.loadLv + h.speedLv + h.packLv) * 28);
  };
})();
