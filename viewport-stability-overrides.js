// Delivery Days viewport stability override.
// Keeps the canvas locked to the visible landscape viewport on mobile Safari so edit mode cannot get shoved upward.
(function(){
  function applyViewportSize(){
    const vw = Math.round((window.visualViewport && window.visualViewport.width) || window.innerWidth || document.documentElement.clientWidth || 844);
    const vh = Math.round((window.visualViewport && window.visualViewport.height) || window.innerHeight || document.documentElement.clientHeight || 390);
    const shell = document.getElementById('appShell');
    const canvas = document.getElementById('game');

    document.documentElement.style.setProperty('--delivery-vw', vw + 'px');
    document.documentElement.style.setProperty('--delivery-vh', vh + 'px');

    document.documentElement.style.width = vw + 'px';
    document.documentElement.style.height = vh + 'px';
    document.body.style.width = vw + 'px';
    document.body.style.height = vh + 'px';
    document.body.style.position = 'fixed';
    document.body.style.left = '0';
    document.body.style.top = '0';
    document.body.style.right = '0';
    document.body.style.bottom = '0';
    document.body.style.overflow = 'hidden';

    if(shell){
      shell.style.position = 'fixed';
      shell.style.left = '0';
      shell.style.top = '0';
      shell.style.width = vw + 'px';
      shell.style.height = vh + 'px';
      shell.style.minHeight = vh + 'px';
      shell.style.maxHeight = vh + 'px';
      shell.style.overflow = 'hidden';
      shell.style.display = 'flex';
      shell.style.alignItems = 'stretch';
      shell.style.justifyContent = 'stretch';
    }

    if(canvas){
      canvas.style.position = 'fixed';
      canvas.style.left = '0';
      canvas.style.top = '0';
      canvas.style.width = vw + 'px';
      canvas.style.height = vh + 'px';
      canvas.style.minHeight = vh + 'px';
      canvas.style.maxHeight = vh + 'px';
      canvas.style.objectFit = 'fill';
      canvas.style.transform = 'translateZ(0)';
    }

    try { window.scrollTo(0,0); } catch(_) {}
  }

  let raf = 0;
  function scheduleApply(){
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(applyViewportSize);
    setTimeout(applyViewportSize, 80);
    setTimeout(applyViewportSize, 250);
  }

  window.addEventListener('load', scheduleApply, {passive:true});
  window.addEventListener('resize', scheduleApply, {passive:true});
  window.addEventListener('orientationchange', scheduleApply, {passive:true});
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize', scheduleApply, {passive:true});
    window.visualViewport.addEventListener('scroll', scheduleApply, {passive:true});
  }

  const previousAction = action;
  action = function(id){
    const result = previousAction(id);
    if(id === 'edit') scheduleApply();
    return result;
  };

  const previousGame = game;
  game = function(){
    if(S.edit) applyViewportSize();
    previousGame();
  };
})();
