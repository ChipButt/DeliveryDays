// Delivery Days GitHub update checker.
// Checks whether the main branch has a newer commit and shows a closable hard-refresh message.
(function(){
  const REPO_API = 'https://api.github.com/repos/ChipButt/DeliveryDays/commits/main';
  const LAST_SEEN_KEY = 'deliveryDaysLastSeenRemoteCommit';
  const DISMISSED_KEY = 'deliveryDaysDismissedUpdateCommit';

  function showUpdatePopup(latestSha){
    if(document.getElementById('deliveryDaysUpdatePopup')) return;

    const overlay = document.createElement('div');
    overlay.id = 'deliveryDaysUpdatePopup';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:999999',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:rgba(20,28,32,.35)',
      'font-family:Arial,sans-serif',
      'padding:18px',
      'box-sizing:border-box'
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'width:min(360px,92vw)',
      'background:#fbfaf4',
      'color:#30373d',
      'border:3px solid #30373d',
      'border-radius:18px',
      'box-shadow:0 14px 32px rgba(0,0,0,.28)',
      'padding:22px 20px 18px',
      'text-align:center',
      'position:relative'
    ].join(';');

    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label','Close update notice');
    close.textContent = '×';
    close.style.cssText = [
      'position:absolute',
      'right:10px',
      'top:8px',
      'width:32px',
      'height:32px',
      'border:0',
      'border-radius:50%',
      'background:transparent',
      'color:#30373d',
      'font-size:28px',
      'line-height:28px',
      'font-weight:700'
    ].join(';');

    const title = document.createElement('div');
    title.textContent = 'Update Available';
    title.style.cssText = 'font-size:22px;font-weight:800;margin-bottom:12px;';

    const msg = document.createElement('div');
    msg.textContent = 'A new update is available. Hard refresh your page to update.';
    msg.style.cssText = 'font-size:16px;line-height:1.35;margin:0 12px 18px;';

    const ok = document.createElement('button');
    ok.type = 'button';
    ok.textContent = 'Got It';
    ok.style.cssText = [
      'border:2px solid #30373d',
      'border-radius:14px',
      'background:#23c9ff',
      'color:#111',
      'font-weight:800',
      'font-size:15px',
      'padding:10px 22px'
    ].join(';');

    function dismiss(){
      try { localStorage.setItem(DISMISSED_KEY, latestSha); } catch(_) {}
      overlay.remove();
    }

    close.addEventListener('click', dismiss);
    ok.addEventListener('click', dismiss);
    overlay.addEventListener('click', function(e){ if(e.target === overlay) dismiss(); });

    card.appendChild(close);
    card.appendChild(title);
    card.appendChild(msg);
    card.appendChild(ok);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  async function checkForUpdate(){
    try{
      const response = await fetch(REPO_API + '?_=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Accept': 'application/vnd.github+json' }
      });
      if(!response.ok) return;
      const data = await response.json();
      const latestSha = data && data.sha;
      if(!latestSha) return;

      const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
      const dismissed = localStorage.getItem(DISMISSED_KEY);

      // First run on this device/browser: store the current remote commit without showing a popup.
      if(!lastSeen){
        localStorage.setItem(LAST_SEEN_KEY, latestSha);
        return;
      }

      if(lastSeen !== latestSha && dismissed !== latestSha){
        showUpdatePopup(latestSha);
      }

      // Track the latest remote seen so the next future commit can be detected.
      localStorage.setItem(LAST_SEEN_KEY, latestSha);
    }catch(err){
      // Fail silently: the game should never be blocked by update checking.
      console.warn('Delivery Days update check failed', err);
    }
  }

  window.addEventListener('load', function(){
    setTimeout(checkForUpdate, 1200);
  });
})();
