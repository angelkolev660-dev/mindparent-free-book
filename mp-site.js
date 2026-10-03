/* =====================================================================
   MindParent · броене за statistika.html
   Сложи този файл в главната папка на book.mindparent.com и добави ред
       <script src="mp-site.js" defer></script>
   точно преди </body> в index.html И в blagodarya.html.

   Какво брои (по веднъж на сесия, презареждане не брои втори път):
     visit      – човек е стоял поне 2 сек. на страницата (ботовете се отсяват)
     form_open  – отворил е прозореца с формата
     form_start – започнал е да пише във формата
     lead       – стигнал е до blagodarya.html (т.е. записал се е)
   Не праща име, имейл или телефон. Само събитието и откъде е дошъл човекът.
   ===================================================================== */
(function () {
  /* === НАСТРОЙКА: същите две стойности като в statistika.html === */
  var SUPABASE_URL = 'https://flrhlmqzbrxxryglopzx.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscmhsbXF6YnJ4eHJ5Z2xvcHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODU5NTksImV4cCI6MjA5NDM2MTk1OX0.6FgZBNcIVx4KlnznPl8fPrctcxM4c106Sft9KwUxdFo';
  /* ================================================================ */

  var VISIT_AFTER_MS = 2000;
  var THANKS_PAGE = /blagodarya/i;

  if (SUPABASE_URL.indexOf('YOUR-PROJECT') > -1 || SUPABASE_KEY.indexOf('YOUR_') === 0) return; // още не е настроено

  var ua = navigator.userAgent || '';
  var looksLikeBot = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|facebookexternalhit|adsbot|mediapartners|bingpreview|google-inspectiontool|python|curl|wget|httpclient|phantom|selenium|puppeteer|playwright/i.test(ua) &&
                     !/cubot/i.test(ua); // телефоните CUBOT не са ботове
  if (navigator.webdriver || looksLikeBot) return;

  /* --- памет за сесията (sessionStorage; ако е забранен – само в паметта на страницата) --- */
  var mem = {};
  var store = null;
  try { window.sessionStorage.setItem('mp_t', '1'); store = window.sessionStorage; } catch (e) {}
  function get(k) { if (store) { try { return store.getItem(k); } catch (e) {} } return mem[k] || null; }
  function set(k, v) { mem[k] = v; if (store) { try { store.setItem(k, v); } catch (e) {} } }

  function newId() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }
  function param(name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search);
    if (!m) return '';
    try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { return m[1]; }
  }

  var isThanks = THANKS_PAGE.test(location.pathname);
  var sid = get('mp_sid');

  if (!sid) {
    // Лийд се брои само ако човекът е минал през страницата с книгата в същия раздел.
    if (isThanks) return;
    sid = newId();
    set('mp_sid', sid);

    var ref = '';
    try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
    if (ref === location.hostname) ref = '';
    set('mp_src', (param('utm_source') || ref).slice(0, 100)); // празно = "директно" в статистиката
    set('mp_cmp', param('utm_campaign').slice(0, 150));
    set('mp_ad', param('utm_content').slice(0, 150));
  }

  function send(ev) {
    if (get('mp_ev_' + ev)) return;
    set('mp_ev_' + ev, '1');
    var headers = { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY };
    if (SUPABASE_KEY.indexOf('sb_') !== 0) headers['Authorization'] = 'Bearer ' + SUPABASE_KEY; // стар anon ключ
    try {
      fetch(SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/rpc/mp_event', {
        method: 'POST',
        keepalive: true,
        headers: headers,
        body: JSON.stringify({
          p_session: sid,
          p_event: ev,
          p_source: get('mp_src'),
          p_campaign: get('mp_cmp') || null,
          p_ad: get('mp_ad') || null
        })
      }).catch(function () {});
    } catch (e) {}
  }

  // Всяко действие първо гарантира, че посещението е записано.
  function track(ev) {
    if (ev !== 'visit') send('visit');
    send(ev);
  }

  if (isThanks) { track('lead'); return; }

  /* --- посещение: 2 секунди с видима страница --- */
  var timer = null;
  function arm() {
    if (timer || get('mp_ev_visit') || document.visibilityState === 'hidden') return;
    timer = setTimeout(function () { timer = null; track('visit'); }, VISIT_AFTER_MS);
  }
  function disarm() { if (timer) { clearTimeout(timer); timer = null; } }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') disarm(); else arm();
  });
  arm();

  /* --- отворена форма: прозорецът #modal става видим --- */
  var modal = document.getElementById('modal');
  if (modal && window.MutationObserver) {
    new MutationObserver(function () {
      if (!modal.hidden) track('form_open');
    }).observe(modal, { attributes: true, attributeFilter: ['hidden', 'style', 'class'] });
  } else {
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.js-open')) track('form_open');
    }, true);
  }

  /* --- започнал да пише във формата --- */
  document.addEventListener('input', function (e) {
    if (e.target && e.target.closest && e.target.closest('form')) {
      track('form_open');
      track('form_start');
    }
  }, true);
})();
