// Delivery Days road gain animation override.
// Shows a neon +N flash beside the Roads UI, then absorbs it into the road count.
(function(){
  const ROAD_VALUE_POS = { x: 24, y: 158 };
  const ROAD_PLUS_START = { x: 118, y: 158 };
  const ROAD_PILL_COVER = { x: 18, y: 144, w: 96, h: 22 };
  let roadGainAnim = null;

  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
  function lerp(a,b,t){ return a + (b - a) * t; }

  function triggerRoadGain(from, to){
    const amount = to - from;
    if(amount <= 0) return;
    roadGainAnim = {
      from,
      to,
      amount,
      t: 0,
      duration: 1.45,
      finalFlash: 0.42
    };
  }

  function drawRoadGainAnim(){
    if(!roadGainAnim || !S.g) return;

    const a = roadGainAnim;
    const p = Math.min(1, a.t / a.duration);
    const holdUntil = 0.28;
    const moveP = Math.max(0, (p - holdUntil) / (1 - holdUntil));
    const eased = easeOutCubic(moveP);
    const x = lerp(ROAD_PLUS_START.x, ROAD_VALUE_POS.x + 30, eased);
    const y = lerp(ROAD_PLUS_START.y, ROAD_VALUE_POS.y, eased);
    const alpha = p < 0.72 ? 1 : Math.max(0, 1 - (p - 0.72) / 0.28);
    const scale = p < 0.18 ? 1 + Math.sin(p / 0.18 * Math.PI) * 0.24 : 1;
    const displayRoads = p < 0.93 ? a.from : a.to;

    // Cover only the existing road number area so the old/new number can be controlled during the animation.
    fill(ROAD_PILL_COVER.x, ROAD_PILL_COVER.y, ROAD_PILL_COVER.w, ROAD_PILL_COVER.h, 8, 'rgba(251,250,244,.96)');
    txt(String(displayRoads), ROAD_VALUE_POS.x, ROAD_VALUE_POS.y, 15, C.ink, 'left', true);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 12 + Math.sin(a.t * 22) * 5;
    txt('+ ' + a.amount, 0, 0, 18, '#39ff14', 'center', true);
    ctx.restore();

    // Final flash on the absorbed total.
    if(p >= 0.93){
      const fp = (p - 0.93) / 0.07;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - fp);
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = 16;
      txt(String(a.to), ROAD_VALUE_POS.x, ROAD_VALUE_POS.y, 17, '#39ff14', 'left', true);
      ctx.restore();
    }
  }

  const previousUpdate = update;
  update = function(dt){
    const beforeTiles = S.g && S.screen === 'game' ? S.g.tiles : null;
    const wasEdit = !!S.edit;

    previousUpdate(dt);

    if(roadGainAnim){
      roadGainAnim.t += dt;
      if(roadGainAnim.t >= roadGainAnim.duration) roadGainAnim = null;
    }

    if(S.g && S.screen === 'game' && beforeTiles !== null){
      const afterTiles = S.g.tiles;
      if(afterTiles > beforeTiles && !wasEdit && !S.edit){
        triggerRoadGain(beforeTiles, afterTiles);
      }
    }
  };

  const previousHud = hud;
  hud = function(){
    previousHud();
    drawRoadGainAnim();
  };
})();
