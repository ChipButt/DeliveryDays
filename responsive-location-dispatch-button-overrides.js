// Delivery Days responsive location dispatch button override.
// Makes the Start Loading / dispatch button larger, easier to hit, and gives it immediate press feedback.
(function(){
  let pressedDispatchUntil = 0;

  function capText(s){
    return String(s || 'Location').charAt(0).toUpperCase() + String(s || 'Location').slice(1);
  }

  function panelPosBeside(n,w,h){
    const sx = (n.x - S.cam.x) * S.cam.z;
    const sy = (n.y - S.cam.y) * S.cam.z;
    let x = sx + 46;
    let y = sy - h / 2;
    if(x + w > W - 10) x = sx - w - 46;
    x = Math.max(10, Math.min(W - w - 10, x));
    y = Math.max(54, Math.min(H - h - 12, y));
    return {x,y,w,h};
  }

  function drawBigDispatchButton(id,label,x,y,w,h,enabled){
    const now = performance.now();
    const pressed = now < pressedDispatchUntil;
    const ox = pressed ? 1 : 0;
    const oy = pressed ? 2 : 0;
    const style = enabled ? 'teal' : 'pale';

    if(enabled){
      fill(x + 4, y + 5, w, h, 16, 'rgba(35,45,50,.18)');
    }
    btn(id, label, x + ox, y + oy, w, h, style, 17);

    // Larger invisible hit area without changing the visible button too much.
    S.ui.push({ id, x:x - 14, y:y - 12, w:w + 28, h:h + 24 });
  }

  locPanel = function(n){
    const b = panelPosBeside(n,430,212);
    card(b.x,b.y,b.w,b.h);

    const a = activeReq(n);
    const waiting = a.filter(r => r.status === 'waiting').length;
    const loading = a.filter(r => r.status === 'loading').length;
    const enroute = a.filter(r => r.status === 'enroute').length;

    txt(n.name || 'Unnamed', b.x + b.w / 2, b.y + 26, 22, C.ink, 'center', true);
    txt(capText(n.type) + ' delivery point', b.x + b.w / 2, b.y + 52, 13, C.muted, 'center');
    txt(`Active: ${a.length}   Waiting: ${waiting}`, b.x + b.w / 2, b.y + 82, 15, a.length ? C.red : C.ink, 'center', true);
    txt(`Loading: ${loading}   En route: ${enroute}`, b.x + b.w / 2, b.y + 108, 13, C.ink, 'center');
    txt(reqDueText(n), b.x + b.w / 2, b.y + 134, 12, a.some(r => r.late || r.due <= 2) ? C.red : C.ink, 'center');

    const ok = waitingReq(n).some(r => !!bestHub(n,false,r.colour));
    const label = waiting > 0 ? (ok ? 'Start Loading' : 'No Available Driver / Road') : 'No Waiting Requests';
    drawBigDispatchButton('dispatch', label, b.x + 70, b.y + 158, 290, 42, waiting > 0 && ok);
  };

  const previousAction = action;
  action = function(id){
    if(id === 'dispatch') pressedDispatchUntil = performance.now() + 170;
    return previousAction(id);
  };
})();
