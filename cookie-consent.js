// ═══════════════════════════════════════════════════════════
//  PROMPTAHOLICS — Cookie Consent
//  One shared file, included on every page via:
//    <script src="cookie-consent.js"></script>
//  GA4 and AdSense do NOT load until the user actually accepts.
//  Deliberately built as one file, not copy-pasted per page — the
//  guest-email validation bug earlier this session existed on two
//  separate pages because it was duplicated instead of shared, and
//  one copy silently fell behind the other. Same lesson applies here,
//  and this is higher-stakes: every page needs identical behavior
//  for this to actually satisfy GDPR, not just "most" pages.
// ═══════════════════════════════════════════════════════════

(function(){
  var CONSENT_KEY = 'pa_cookie_consent';       // 'accepted' | 'rejected'
  var CONSENT_VERSION_KEY = 'pa_cookie_consent_v';
  var CURRENT_VERSION = '1';                    // bump to re-prompt everyone after a real policy change

  var GA4_ID = 'G-DRW8ZNX921';
  var ADSENSE_CLIENT = 'ca-pub-1731098620016005';

  function getConsent(){
    if(localStorage.getItem(CONSENT_VERSION_KEY) !== CURRENT_VERSION) return null;
    return localStorage.getItem(CONSENT_KEY);
  }

  function setConsent(value){
    localStorage.setItem(CONSENT_KEY, value);
    localStorage.setItem(CONSENT_VERSION_KEY, CURRENT_VERSION);
  }

  function loadGA4(){
    if(window._pa_ga4_loaded) return;
    window._pa_ga4_loaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA4_ID);
  }

  function loadAdsense(){
    if(window._pa_adsense_loaded) return;
    window._pa_adsense_loaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_CLIENT;
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  }

  function loadConsentedScripts(){
    loadGA4();
    loadAdsense();
  }

  function buildBanner(){
    var wrap = document.createElement('div');
    wrap.id = 'paCookieBanner';
    wrap.style.cssText =
      'position:fixed;left:0;right:0;bottom:0;z-index:99999;'
      + 'background:var(--bg,#07070a);color:var(--ink,#f0f0f8);'
      + 'border-top:1px solid var(--border2,rgba(255,255,255,.13));'
      + 'padding:18px 20px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;'
      + 'font-family:"Instrument Sans",sans-serif;font-size:13.5px;line-height:1.6;'
      + 'box-shadow:0 -8px 30px rgba(0,0,0,.3);';

    wrap.innerHTML =
      '<div style="flex:1;min-width:240px;color:var(--ink2,#7070a0);">'
      + 'We use cookies for analytics and ads. See our '
      + '<a href="privacy.html" style="color:var(--orange,#ff6224);text-decoration:underline;">Privacy Policy</a>.'
      + '</div>'
      + '<div style="display:flex;gap:10px;flex-shrink:0;">'
      + '<button id="paCookieReject" style="padding:9px 18px;background:var(--glass,rgba(255,255,255,.04));border:1px solid var(--border2,rgba(255,255,255,.13));color:var(--ink,#f0f0f8);border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">Reject</button>'
      + '<button id="paCookieAccept" style="padding:9px 18px;background:var(--orange,#ff6224);border:none;color:#fff;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">Accept</button>'
      + '</div>';

    document.body.appendChild(wrap);

    document.getElementById('paCookieAccept').onclick = function(){
      setConsent('accepted');
      loadConsentedScripts();
      wrap.remove();
    };
    document.getElementById('paCookieReject').onclick = function(){
      setConsent('rejected');
      wrap.remove();
    };
  }

  // Lets any page add a "Cookie Settings" link (e.g. in the footer)
  // that reopens the banner so people can change their mind later -
  // required for real GDPR compliance, not just a one-time prompt.
  window.reopenCookieSettings = function(){
    var existing = document.getElementById('paCookieBanner');
    if(existing) existing.remove();
    buildBanner();
  };

  function init(){
    var consent = getConsent();
    if(consent === 'accepted'){
      loadConsentedScripts();
    } else if(consent === 'rejected'){
      // Respect the choice - do nothing
    } else {
      // No decision yet (or policy changed since their last one) - ask
      if(document.body){
        buildBanner();
      } else {
        document.addEventListener('DOMContentLoaded', buildBanner);
      }
    }
  }

  init();
})();
