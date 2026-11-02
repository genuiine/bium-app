/* 비움(BIUM) 앱 — 해시 라우터 · 상태 · 화면 렌더 · 스캔 상태 머신
   의존: data.js(BIUM_DATA), icons.js(ICON, icon)
*/
(function () {
  'use strict';

  var D = window.BIUM_DATA;
  var BINS = D.BINS;
  var PRODUCTS = D.PRODUCTS;
  var KEY = 'bium.';

  /* ---------------------------------------------------------------------
     유틸
  --------------------------------------------------------------------- */
  var $app = document.getElementById('app');
  var $device = document.getElementById('device');
  var $tabbar = document.getElementById('tabbar');
  var $clock = document.getElementById('clock');

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmt(n) { return Number(n || 0).toLocaleString('ko-KR'); }
  function won(n) { return fmt(n) + '원'; }
  function pts(n) { return fmt(n) + 'P'; }
  function pad(n) { return D.pad(n); }
  function todayDate() { return new Date(); }
  function todayISO() { return D.isoDate(todayDate()); }
  var WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  function nowTime() { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function dateLabel(iso) {
    var p = iso.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    var t = todayISO();
    var y = D.isoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
    var prefix = iso === t ? '오늘 · ' : (y === t ? '어제 · ' : '');
    return prefix + (p[1]) + '월 ' + p[2] + '일 ' + WEEKDAYS[d.getDay()] + '요일';
  }
  function longDate(d) {
    return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + WEEKDAYS[d.getDay()] + '요일';
  }
  function binById(id) { for (var i = 0; i < BINS.length; i++) if (BINS[i].id === id) return BINS[i]; return null; }
  function productById(id) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i]; return null; }
  function fillStatus(fill) { return fill >= 75 ? 'full' : (fill >= 40 ? 'mid' : 'ok'); }
  function fillLabel(fill) { var s = fillStatus(fill); return s === 'full' ? '가득' : (s === 'mid' ? '보통' : '여유'); }
  function collectedLabel(b) { return (b.lastCollected.day === 'today' ? '오늘 ' : '어제 ') + b.lastCollected.time; }
  function greeting() {
    var h = new Date().getHours();
    if (h < 5) return '늦은 밤이에요';
    if (h < 11) return '좋은 아침이에요';
    if (h < 14) return '점심 맛있게 드셨어요?';
    if (h < 18) return '오후도 가볍게 비워요';
    return '오늘 하루도 수고했어요';
  }

  /* ---------------------------------------------------------------------
     미리보기 모드 (?state=...) — overview.html에서 iframe으로 열 때 사용
     저장소에 쓰지 않고 시드 데이터 위에서만 동작한다.
  --------------------------------------------------------------------- */
  var PREVIEW = (function () {
    var m = /[?&]state=([^&]+)/.exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  })();

  /* ---------------------------------------------------------------------
     상태
  --------------------------------------------------------------------- */
  var S = null;

  function seedState() {
    var tx = D.buildTransactions(todayDate());
    return {
      nickname: D.DEFAULTS.nickname,
      joinedAt: D.DEFAULTS.joinedAt,
      wallet: D.DEFAULTS.wallet,
      points: D.DEFAULTS.points,
      notify: D.DEFAULTS.notify,
      onboarded: false,
      transactions: tx,
      exchanges: D.buildExchanges(tx),
      reports: 6
    };
  }
  function load() {
    if (PREVIEW) { S = seedState(); S.onboarded = true; return; }
    try {
      var raw = localStorage.getItem(KEY + 'state');
      S = raw ? JSON.parse(raw) : seedState();
    } catch (e) { S = seedState(); }
    if (!S || !S.transactions) S = seedState();
  }
  function save() {
    if (PREVIEW) return;
    try { localStorage.setItem(KEY + 'state', JSON.stringify(S)); } catch (e) { /* 저장 불가 환경 */ }
  }
  function resetAll() {
    try {
      Object.keys(localStorage).forEach(function (k) { if (k.indexOf(KEY) === 0) localStorage.removeItem(k); });
    } catch (e) { /* 무시 */ }
    S = seedState();
    save();
  }

  function addTx(tx) {
    tx.id = 'T' + Date.now() + Math.floor(Math.random() * 100);
    tx.date = todayISO();
    tx.time = nowTime();
    S.transactions.push(tx);
    return tx;
  }
  function refundsOn(iso) { return S.transactions.filter(function (t) { return t.type === 'refund' && t.date === iso; }).length; }
  function monthStats() {
    var ym = todayISO().slice(0, 7);
    var r = { count: 0, refund: 0, exchange: 0 };
    S.transactions.forEach(function (t) {
      if (t.date.slice(0, 7) !== ym) return;
      if (t.type === 'refund') { r.count++; r.refund += t.points; }
      if (t.type === 'exchange') r.exchange += t.points;
    });
    return r;
  }
  function weekSeries() {
    var out = [];
    var t = todayDate();
    for (var i = 6; i >= 0; i--) {
      var d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - i);
      var iso = D.isoDate(d);
      out.push({ iso: iso, label: WEEKDAYS[d.getDay()], count: refundsOn(iso), today: i === 0 });
    }
    return out;
  }

  /* ---------------------------------------------------------------------
     토스트 · 시트 · 스켈레톤
  --------------------------------------------------------------------- */
  var toastTimer = null;
  function toast(msg, iconName) {
    var old = document.querySelector('.toast');
    if (old) old.remove();
    clearTimeout(toastTimer);
    var el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.innerHTML = window.icon(iconName || 'check', 20) + '<span>' + msg + '</span>';
    $device.appendChild(el);
    toastTimer = setTimeout(function () {
      el.classList.add('hide');
      setTimeout(function () { el.remove(); }, 200);
    }, 2600);
  }

  function openSheet(html, onMount) {
    closeSheet();
    var bd = document.createElement('div');
    bd.className = 'sheet-backdrop';
    bd.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><div class="handle"></div>' + html + '</div>';
    bd.addEventListener('click', function (e) { if (e.target === bd) closeSheet(); });
    $device.appendChild(bd);
    if (onMount) onMount(bd.querySelector('.sheet'));
    var first = bd.querySelector('button, input, [tabindex]');
    if (first) first.focus();
  }
  function closeSheet() {
    var bd = document.querySelector('.sheet-backdrop');
    if (bd) bd.remove();
  }

  var seen = {};
  function withSkeleton(key, skeletonHtml, renderFn) {
    if (seen[key] || PREVIEW) { renderFn(); return; }
    seen[key] = true;
    $app.innerHTML = skeletonHtml;
    setTimeout(function () { if (route().name === key) renderFn(); }, 420);
  }

  /* ---------------------------------------------------------------------
     라우터
  --------------------------------------------------------------------- */
  var TAB_ROUTES = ['home', 'map', 'store', 'me'];

  function route() {
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('/');
    return { name: parts[0] || 'home', sub: parts[1] || '', raw: h };
  }
  function go(hash) {
    if (location.hash === '#/' + hash) render(); else location.hash = '#/' + hash;
  }

  function renderTabbar(active) {
    var show = TAB_ROUTES.indexOf(active) !== -1;
    $tabbar.hidden = !show;
    if (!show) return;
    var tabs = [
      ['home', 'home', '홈'], ['map', 'map', '지도'], null, ['store', 'store', '스토어'], ['me', 'user', '내정보']
    ];
    $tabbar.innerHTML = tabs.map(function (t) {
      if (!t) return '<div class="tab-scan"><a class="fab" href="#/scan" aria-label="QR 스캔">' + ICON.scan + '</a><span>QR 스캔</span></div>';
      return '<a class="tab' + (active === t[0] ? ' on' : '') + '" href="#/' + t[0] + '"' + (active === t[0] ? ' aria-current="page"' : '') + '>' + ICON[t[1]] + '<span>' + t[2] + '</span></a>';
    }).join('');
  }

  function render() {
    closeSheet();
    var r = route();
    if (!S.onboarded && r.name !== 'onboarding') { location.hash = '#/onboarding/1'; return; }
    // 스캔 화면을 벗어나면 플로우를 초기화한다(충전하러 간 경우는 유지).
    if (r.name !== 'scan' && !scan.resume) scanReset();
    renderTabbar(r.name);
    var fn = SCREENS[r.name] || SCREENS.home;
    fn(r);
    $device.classList.toggle('dark-top', r.name === 'scan' && scan.step === 'camera');
    var scr = $app.querySelector('.screen');
    if (scr) scr.scrollTop = 0;
  }

  function setScreen(html, cls) {
    $app.innerHTML = '<div class="screen ' + (cls || '') + '">' + html + '</div>';
  }
  function topbar(title, back, right) {
    return '<div class="topbar">' +
      (back ? '<a class="ghost" href="#/' + back + '" aria-label="뒤로">' + ICON.arrowLeft + '</a>' : '') +
      '<h1>' + title + '</h1>' + (right || '') + '</div>';
  }

  /* ---------------------------------------------------------------------
     화면: 온보딩
  --------------------------------------------------------------------- */
  function onboarding(r) {
    var step = Math.min(3, Math.max(1, parseInt(r.sub, 10) || 1));
    var dots = '<div class="onb-dots">' + [1, 2, 3].map(function (i) { return '<i class="' + (i === step ? 'on' : '') + '"></i>'; }).join('') + '</div>';
    var skip = '<button class="link plain" id="onb-skip">건너뛰기</button>';
    var body = '';
    var foot = '';

    if (step === 1) {
      body = dots +
        '<p class="kicker">수원역 로데오거리의 문제</p>' +
        '<h1>쓰레기통은 없고,<br>비는 시간은 16시간이에요</h1>' +
        '<p class="lede">수거는 아침에 끝나고 배출은 밤에만 허용돼요. 그 사이 거리에는 버릴 곳이 없어요.</p>' +
        '<div class="timeline">' +
          '<div class="bar"><div class="seg-collect">수거 05~13시</div><div class="seg-gap">공백 16시간</div><div class="seg-out">배출 20~05시</div></div>' +
          '<div class="ticks"><span>05시</span><span>13시</span><span>20시</span><span>05시</span></div>' +
          '<ul class="legend">' +
            '<li><i style="background:#D9E8DD"></i><span>05~13시 구청 수거 차량이 돌아요</span></li>' +
            '<li><i style="background:#F6E2DC"></i><span>13~20시 사람은 가장 많고 쓰레기통은 없어요. 쓰레기가 거리에 쌓여요</span></li>' +
            '<li><i style="background:#E8E4DB"></i><span>20~05시 상점 앞 배출만 허용돼요</span></li>' +
          '</ul>' +
        '</div>';
      foot = '<a class="btn" href="#/onboarding/2">다음</a>';
    } else if (step === 2) {
      body = dots +
        '<p class="kicker">비움이 하는 일</p>' +
        '<h1>스캔하고, 300원 내고,<br>300P로 돌려받아요</h1>' +
        '<ol class="steps">' +
          '<li><span class="n">1</span><div><div class="t">쓰레기통의 QR을 스캔해요</div><div class="d">로데오거리 8곳에 QR 쓰레기통이 있어요</div></div></li>' +
          '<li><span class="n">2</span><div><div class="t">선불 지갑에서 300원이 결제돼요</div><div class="d">투입구가 30초 동안 열려요</div></div></li>' +
          '<li><span class="n">3</span><div><div class="t">300P가 바로 돌아와요</div><div class="d">굿즈와 로데오거리 상점 쿠폰으로 바꿔요</div></div></li>' +
        '</ol>' +
        '<div class="why"><h3>왜 돈을 받고 돌려주나요?</h3><ul>' +
          '<li>돈을 내는 순간 "내가 버린 쓰레기"가 돼요. 아무 데나 버리는 일이 줄어요.</li>' +
          '<li>전액 환급이라 손해는 0원이에요.</li>' +
          '<li>어디에 얼마나 버려졌는지 기록돼요. 수거 동선을 데이터로 짜요.</li>' +
        '</ul></div>';
      foot = '<a class="btn" href="#/onboarding/3">다음</a>';
    } else {
      body = dots +
        '<p class="kicker">마지막이에요</p>' +
        '<h1>어떻게 불러 드릴까요?</h1>' +
        '<p class="lede">홈 화면 인사와 교환함에 쓰여요. 나중에 내정보에서 바꿀 수 있어요.</p>' +
        '<label class="field" style="margin-top:28px"><span>닉네임</span><input class="input" id="onb-name" maxlength="10" value="' + esc(S.nickname) + '" autocomplete="nickname"></label>' +
        '<div class="note" style="margin-top:20px">' + window.icon('wallet', 20) + '<span>시작 지갑 잔액 ' + won(D.DEFAULTS.wallet) + ', 마일리지 ' + pts(D.DEFAULTS.points) + '으로 시작해요. 발표 시연용 초기값이에요.</span></div>';
      foot = '<button class="btn" id="onb-start">시작하기</button>';
    }

    setScreen('<div class="onb"><div class="onb-top">' + (step < 3 ? skip : '') + '</div><div class="onb-body">' + body + '</div><div class="onb-foot">' + foot + '</div>' +
      '<p class="footnote">수원시 팔달구 × 수원역 로데오거리 상인회 시범사업</p></div>', 'no-tab');

    var sk = document.getElementById('onb-skip');
    if (sk) sk.addEventListener('click', function () { finishOnboarding(S.nickname); });
    var st = document.getElementById('onb-start');
    if (st) st.addEventListener('click', function () {
      var v = (document.getElementById('onb-name').value || '').trim() || D.DEFAULTS.nickname;
      finishOnboarding(v);
    });
    var inp = document.getElementById('onb-name');
    if (inp) inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') st.click(); });
  }
  function finishOnboarding(name) {
    S.nickname = name;
    S.onboarded = true;
    save();
    go('home');
    setTimeout(function () { toast(esc(name) + '님, 반가워요. 가까운 쓰레기통부터 확인해 봐요.'); }, 250);
  }

  /* ---------------------------------------------------------------------
     화면: 홈
  --------------------------------------------------------------------- */
  function binCard(b) {
    var st = fillStatus(b.fill);
    return '<button class="bin-card" data-bin="' + b.id + '">' +
      '<span class="id">' + b.id + '</span>' +
      '<span class="grow"><span class="row between"><span class="name">' + esc(b.name) + '</span><span class="badge ' + st + '">' + fillLabel(b.fill) + '</span></span>' +
      '<span class="meta num">' + b.distance + 'm · 적재율 ' + b.fill + '% · ' + (b.recycle ? '일반·재활용' : '일반만') + '</span>' +
      '<span class="gauge ' + st + '"><i style="width:' + b.fill + '%"></i></span></span>' +
      '</button>';
  }
  function home() {
    withSkeleton('home',
      '<div class="screen"><div class="home-greet"><div class="sk line w40"></div><div class="sk line w80" style="height:28px;margin-top:10px"></div></div>' +
      '<div class="sk block" style="margin-top:20px;height:150px"></div>' +
      '<div class="sk line w40" style="margin-top:28px"></div><div class="sk row" style="margin-top:12px"></div><div class="sk row" style="margin-top:10px"></div><div class="sk row" style="margin-top:10px"></div></div>',
      function () {
        var near = BINS.slice().sort(function (a, b) { return a.distance - b.distance; }).slice(0, 3);
        var week = weekSeries();
        var max = Math.max(1, Math.max.apply(null, week.map(function (w) { return w.count; })));
        var c = D.CAMPAIGN;
        var html =
          '<div class="home-greet"><div class="date">' + longDate(todayDate()) + '</div><h1>' + greeting() + ', ' + esc(S.nickname) + '님</h1></div>' +
          '<div class="points-card">' +
            '<div class="label">환경마일리지</div>' +
            '<div class="big">' + fmt(S.points) + '<small>P</small></div>' +
            '<div class="wallet-line"><span>선불 지갑 <b>' + won(S.wallet) + '</b></span><a href="#/wallet">충전하기 ' + window.icon('chevronRight', 16) + '</a></div>' +
          '</div>' +
          '<div class="section"><div class="section-head"><h2>가까운 쓰레기통</h2><a class="link small" href="#/map">지도 보기</a></div>' + near.map(binCard).join('') + '</div>' +
          '<div class="section"><div class="section-head"><h2>이번 주 나의 비움</h2><span class="tiny num">최근 7일 ' + week.reduce(function (a, w) { return a + w.count; }, 0) + '회</span></div>' +
            '<div class="card pad-sm"><div class="week">' + week.map(function (w) {
              return '<div class="col' + (w.today ? ' today' : '') + '"><span class="v">' + (w.count || '') + '</span><div class="b" style="height:' + Math.max(4, Math.round(w.count / max * 64)) + 'px"></div><span class="l">' + w.label + '</span></div>';
            }).join('') + '</div></div></div>' +
          '<div class="banner">' + ICON.trash + '<div class="grow"><div class="t num">이번 달 로데오거리 비움 ' + fmt(c.count) + '회</div><div class="d num">목표 ' + fmt(c.goal) + '회까지 ' + fmt(c.goal - c.count) + '회 남았어요</div><div class="prog"><i style="width:' + Math.round(c.count / c.goal * 100) + '%"></i></div></div></div>' +
          '<p class="footnote">수원시 팔달구 × 수원역 로데오거리 상인회 시범사업</p>';
        setScreen(html);
        bindBinCards();
      });
  }
  function bindBinCards() {
    $app.querySelectorAll('[data-bin]').forEach(function (el) {
      el.addEventListener('click', function () { openBinSheet(el.getAttribute('data-bin')); });
    });
  }

  /* ---------------------------------------------------------------------
     화면: 지도
  --------------------------------------------------------------------- */
  var mapUI = { filter: 'all', view: 'map' };
  var PIN_COLOR = { ok: '#1E5A3C', mid: '#C9A227', full: '#C8553D' };

  function mapFilterPass(b) {
    if (mapUI.filter === 'free') return fillStatus(b.fill) === 'ok';
    if (mapUI.filter === 'recycle') return b.recycle;
    return true;
  }

  function mapSvg() {
    var road = '#FFFFFF', walk = '#E4EFE7', block = '#E1DDD3', blockLine = '#D2CDC2';
    var s = '<svg class="map-svg" viewBox="0 0 390 560" role="img" aria-label="수원역 로데오거리 지도">';
    // 역전시장 접근로, 매산로
    s += '<rect x="232" y="100" width="18" height="24" fill="' + road + '"/>';
    s += '<rect x="0" y="120" width="390" height="34" fill="' + road + '"/>';
    s += '<line x1="0" y1="137" x2="390" y2="137" stroke="#D9D4CA" stroke-width="1" stroke-dasharray="8 8"/>';
    s += '<text x="12" y="141" font-size="12" font-weight="600" fill="#5B6660">매산로</text>';
    // 역전시장 블록
    s += '<rect x="258" y="26" width="112" height="74" rx="6" fill="' + block + '" stroke="' + blockLine + '"/>';
    s += '<text x="270" y="52" font-size="13" font-weight="700" fill="#17201B">역전시장</text>';
    s += '<text x="270" y="70" font-size="11" fill="#5B6660">먹자골목 · 청과</text>';
    // 작은 블록(북서)
    s += '<rect x="20" y="26" width="120" height="74" rx="6" fill="' + block + '" stroke="' + blockLine + '"/>';
    s += '<text x="32" y="52" font-size="12" font-weight="600" fill="#5B6660">매산로1가</text>';
    s += '<rect x="160" y="26" width="76" height="74" rx="6" fill="' + block + '" stroke="' + blockLine + '"/>';
    // 수원역 · AK플라자
    s += '<rect x="16" y="172" width="104" height="250" rx="8" fill="#D6D1C6" stroke="' + blockLine + '"/>';
    s += '<g transform="translate(52 214)" fill="none" stroke="#17201B" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="0" y="0" width="28" height="26" rx="5"/><path d="M0 14h28"/><path d="M7 20h.01"/><path d="M21 20h.01"/><path d="m5 32 3-6"/><path d="m23 32-3-6"/></g>';
    s += '<text x="30" y="272" font-size="14" font-weight="700" fill="#17201B">수원역</text>';
    s += '<text x="30" y="290" font-size="11" fill="#5B6660">1호선 · 분당선</text>';
    s += '<text x="30" y="334" font-size="13" font-weight="700" fill="#17201B">AK플라자</text>';
    s += '<text x="30" y="350" font-size="11" fill="#5B6660">백화점</text>';
    // 4번 출구 표시(역 블록 안쪽 모서리)
    s += '<rect x="94" y="178" width="22" height="22" rx="4" fill="#17201B"/><text x="105" y="193" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">4</text>';
    // 로데오거리 보행로(남북) + 광장 + 동서 보행로 + AK 연결로
    s += '<rect x="178" y="154" width="40" height="370" fill="' + walk + '"/>';
    s += '<rect x="120" y="318" width="230" height="26" fill="' + walk + '"/>';
    s += '<rect x="150" y="300" width="96" height="62" rx="12" fill="' + walk + '"/>';
    s += '<rect x="120" y="390" width="58" height="22" fill="' + walk + '"/>';
    s += '<text x="192" y="184" font-size="11" fill="#1E5A3C" font-weight="600" transform="rotate(90 192 184)">로데오거리 보행로</text>';
    s += '<text x="150" y="294" font-size="11" fill="#1E5A3C" font-weight="600">중앙 광장</text>';
    // 상점 블록(보행로 양쪽)
    var shops = [
      [140, 160, 32, 60, ''], [140, 232, 32, 56, ''],
      [224, 160, 56, 24, ''], [240, 190, 90, 70, 'CGV 수원'], [224, 264, 100, 30, ''],
      [140, 362, 32, 22, ''], [224, 352, 100, 60, '상인회'], [140, 420, 32, 90, ''], [224, 420, 100, 90, ''],
      [336, 190, 42, 220, ''], [336, 420, 42, 90, '']
    ];
    shops.forEach(function (b) {
      s += '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '" rx="4" fill="' + block + '" stroke="' + blockLine + '"/>';
      if (b[4]) s += '<text x="' + (b[0] + 10) + '" y="' + (b[1] + 22) + '" font-size="12" font-weight="700" fill="#17201B">' + b[4] + '</text>';
    });
    // 버스정류장
    s += '<rect x="290" y="154" width="40" height="8" rx="2" fill="#17201B"/>';
    s += '<text x="288" y="178" font-size="10" fill="#5B6660">버스정류장</text>';
    // 주차장(남측)
    s += '<rect x="178" y="524" width="40" height="30" fill="#D6D1C6"/>';
    s += '<text x="186" y="544" font-size="10" fill="#5B6660">주차장</text>';
    // 핀
    BINS.forEach(function (b) {
      var st = fillStatus(b.fill);
      var pass = mapFilterPass(b);
      s += '<g class="pin' + (pass ? '' : ' dim') + '" tabindex="0" role="button" aria-label="' + b.id + ' ' + esc(b.name) + ' 적재율 ' + b.fill + '%" data-pin="' + b.id + '" transform="translate(' + b.map.x + ' ' + b.map.y + ')">' +
        '<circle class="halo" r="22"/>' +
        '<path d="M0 10c-6-6-9-10-9-15a9 9 0 0 1 18 0c0 5-3 9-9 15z" fill="' + PIN_COLOR[st] + '" stroke="#fff" stroke-width="2" transform="translate(0 -4)"/>' +
        '<text y="-5" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">' + b.id.slice(3) + '</text>' +
        '</g>';
    });
    s += '</svg>';
    return s;
  }

  function map() {
    withSkeleton('map',
      '<div class="screen flush"><div style="padding:0 20px"><div class="topbar"><div class="sk line w40" style="height:22px"></div></div><div class="sk row" style="height:40px;margin:12px 0"></div></div><div class="sk" style="height:460px;border-radius:0"></div></div>',
      function () {
        var html =
          '<div style="padding:0 20px">' + topbar('지도') +
          '<div class="map-toolbar"><div class="chips scroll">' +
            [['all', '전체'], ['free', '여유만'], ['recycle', '재활용 가능']].map(function (f) {
              return '<button class="chip' + (mapUI.filter === f[0] ? ' on' : '') + '" data-filter="' + f[0] + '">' + f[1] + '</button>';
            }).join('') + '</div>' +
            '<div class="seg"><button data-view="map" class="' + (mapUI.view === 'map' ? 'on' : '') + '" aria-label="지도 보기">' + window.icon('map', 20) + '</button><button data-view="list" class="' + (mapUI.view === 'list' ? 'on' : '') + '" aria-label="목록 보기">' + window.icon('list', 20) + '</button></div>' +
          '</div></div>';
        if (mapUI.view === 'map') {
          html += '<div class="map-wrap">' + mapSvg() + '</div>' +
            '<div style="padding:0 20px"><div class="map-legend"><span><i style="background:#1E5A3C"></i>여유 40% 미만</span><span><i style="background:#C9A227"></i>보통</span><span><i style="background:#C8553D"></i>가득 75% 이상</span></div>' +
            '<p class="tiny" style="margin-top:8px">핀을 누르면 상세가 열려요. 현재 위치는 수원역 4번 출구 기준이에요.</p></div>';
        } else {
          var list = BINS.filter(mapFilterPass).sort(function (a, b) { return a.distance - b.distance; });
          html += '<div style="padding:0 20px">' + (list.length ? list.map(binCard).join('') :
            '<div class="empty">' + window.icon('pin', 28) + '<h3>조건에 맞는 쓰레기통이 없어요</h3><p>필터를 바꾸거나 전체 보기로 돌아가 보세요.</p></div>') + '</div>';
        }
        setScreen(html, 'flush');
        $app.querySelectorAll('[data-filter]').forEach(function (el) {
          el.addEventListener('click', function () { mapUI.filter = el.getAttribute('data-filter'); render(); });
        });
        $app.querySelectorAll('[data-view]').forEach(function (el) {
          el.addEventListener('click', function () { mapUI.view = el.getAttribute('data-view'); render(); });
        });
        $app.querySelectorAll('[data-pin]').forEach(function (el) {
          var open = function () { openBinSheet(el.getAttribute('data-pin')); };
          el.addEventListener('click', open);
          el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
        });
        bindBinCards();
      });
  }

  function openBinSheet(id) {
    var b = binById(id);
    if (!b) return;
    var st = fillStatus(b.fill);
    openSheet(
      '<div class="row between"><h2>' + b.id + '</h2><span class="badge ' + st + '">' + fillLabel(b.fill) + ' ' + b.fill + '%</span></div>' +
      '<p style="margin-top:4px;font-weight:600">' + esc(b.name) + '</p>' +
      '<p class="small muted">' + esc(b.detail) + ' · ' + b.distance + 'm</p>' +
      '<div class="gauge ' + st + '" style="margin-top:16px"><i style="width:' + b.fill + '%"></i></div>' +
      '<div class="row between small" style="margin-top:8px"><span class="muted">적재율 ' + b.fill + '%</span><span class="muted">마지막 수거 ' + collectedLabel(b) + '</span></div>' +
      '<div class="divider"></div>' +
      '<div class="row top" style="gap:16px">' +
        '<div class="grow"><div class="tiny">투입 가능</div><div class="small" style="margin-top:4px;font-weight:600">일반쓰레기(소형)' + (b.recycle ? '<br>재활용(캔·페트·컵)' : '') + '</div></div>' +
        '<div class="grow"><div class="tiny">투입 불가</div><div class="small" style="margin-top:4px">음식물 · 대형 · 담배꽁초<br><span class="tiny">꽁초는 옆 꽁초함에 넣어 주세요</span></div></div>' +
      '</div>' +
      '<div class="btn-row" style="margin-top:20px"><button class="btn secondary" id="sheet-nav">여기로 안내</button><a class="btn" href="#/scan" id="sheet-scan">QR 스캔</a></div>',
      function (sheet) {
        sheet.querySelector('#sheet-nav').addEventListener('click', function () {
          closeSheet();
          toast(b.id + ' ' + esc(b.name) + '까지 도보 ' + Math.max(1, Math.round(b.distance / 70)) + '분이에요. 길 안내는 시범 운영 후 연결돼요.', 'pin');
        });
        sheet.querySelector('#sheet-scan').addEventListener('click', function () { scanReset(); });
      }
    );
  }

  /* ---------------------------------------------------------------------
     화면: QR 스캔 플로우 (상태 머신)
     camera → result → pay → open → done   (pay에서 잔액 부족 시 wallet/topup)
  --------------------------------------------------------------------- */
  var scan = { step: 'camera', bin: null, kind: null, remaining: 0, timer: null, resume: false, found: false, doneAt: null };

  function scanReset() {
    stopScanTimer();
    scan = { step: 'camera', bin: null, kind: null, remaining: 0, timer: null, resume: false, found: false, doneAt: null };
  }
  function stopScanTimer() { if (scan.timer) { clearInterval(scan.timer); scan.timer = null; } }
  function scanGo(step) { scan.step = step; render(); }

  function scanScreen() {
    if (PREVIEW && PREVIEW.indexOf('scan-') === 0 && !scan._previewApplied) {
      scan._previewApplied = true;
      var sub = PREVIEW.slice(5);
      scan.bin = binById('RD-02');
      scan.kind = 'recycle';
      if (sub === 'result') scan.step = 'result';
      if (sub === 'pay') scan.step = 'pay';
      if (sub === 'pay-short') { scan.step = 'pay'; S.wallet = 200; }
      if (sub === 'open') { scan.step = 'open'; startCountdown(); }
      if (sub === 'done') { scan.step = 'done'; scan.doneAt = { points: S.points + 300, nth: refundsOn(todayISO()) + 1 }; }
    }
    var step = scan.step;
    if (step === 'camera') return scanCamera();
    if (step === 'result') return scanResult();
    if (step === 'pay') return scanPay();
    if (step === 'open') return scanOpen();
    return scanDone();
  }

  function scanCamera() {
    setScreen(
      '<div class="topbar"><a class="ghost" href="#/home" aria-label="닫기" id="scan-close">' + ICON.close + '</a><h1>QR 스캔</h1></div>' +
      '<div class="scan-cam" id="cam"><div class="frame"><i></i><i></i><i></i><i></i><div class="beam"></div></div>' +
        '<p class="hint" id="cam-hint">쓰레기통의 QR을 프레임 안에 맞춰 주세요</p></div>' +
      '<div class="scan-foot stack">' +
        '<button class="btn light" id="sim">QR 인식 시뮬레이션</button>' +
        '<div class="row" style="justify-content:space-between"><button class="link" id="manual">' + window.icon('keyboard', 20) + ' 코드 직접 입력</button><span class="tiny" style="color:rgba(255,255,255,.55)">프로토타입이라 카메라는 꺼져 있어요</span></div>' +
      '</div>', 'dark no-tab');
    document.getElementById('scan-close').addEventListener('click', function () { scanReset(); });
    document.getElementById('sim').addEventListener('click', function () {
      var btn = this;
      btn.disabled = true;
      btn.textContent = '인식 중…';
      document.getElementById('cam').classList.add('found');
      document.getElementById('cam-hint').textContent = 'RD-02 인식했어요';
      setTimeout(function () {
        scan.bin = binById('RD-02');
        scanGo('result');
      }, 650);
    });
    document.getElementById('manual').addEventListener('click', function () {
      openSheet(
        '<h2>코드 직접 입력</h2><p class="small muted" style="margin-top:4px">쓰레기통 QR 아래 적힌 코드를 입력해요. 예: RD-04</p>' +
        '<input class="input" id="code" style="margin-top:16px" placeholder="RD-01 ~ RD-08" autocapitalize="characters">' +
        '<p class="tiny" id="code-err" style="margin-top:8px;color:#C8553D;min-height:20px"></p>' +
        '<button class="btn" id="code-ok" style="margin-top:8px">확인</button>',
        function (sheet) {
          var inp = sheet.querySelector('#code');
          var ok = function () {
            var v = inp.value.trim().toUpperCase().replace(/^RD\s*-?\s*/, '');
            if (/^\d$/.test(v)) v = '0' + v;
            v = 'RD-' + v;
            var b = binById(v);
            if (!b) { sheet.querySelector('#code-err').textContent = '없는 코드예요. RD-01부터 RD-08까지만 있어요.'; inp.focus(); return; }
            closeSheet();
            scan.bin = b;
            scanGo('result');
          };
          sheet.querySelector('#code-ok').addEventListener('click', ok);
          inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok(); });
          inp.focus();
        }
      );
    });
  }

  function scanResult() {
    var b = scan.bin;
    var st = fillStatus(b.fill);
    setScreen(
      topbar('인식 결과', null, '<button class="ghost" id="scan-back" aria-label="다시 스캔">' + ICON.close + '</button>') +
      '<div class="card">' +
        '<div class="result-head"><span class="id">' + b.id + '</span><span class="badge ' + st + '">' + fillLabel(b.fill) + ' ' + b.fill + '%</span></div>' +
        '<h2 style="margin-top:12px">' + esc(b.name) + '</h2>' +
        '<p class="small muted" style="margin-top:2px">' + esc(b.detail) + '</p>' +
        '<div class="gauge ' + st + '" style="margin-top:14px"><i style="width:' + b.fill + '%"></i></div>' +
        '<p class="tiny" style="margin-top:6px">마지막 수거 ' + collectedLabel(b) + '</p>' +
      '</div>' +
      '<h2 style="margin-top:28px">무엇을 버리나요?</h2>' +
      '<div class="kind-grid">' +
        '<button class="kind-btn" data-kind="general">' + ICON.trash + '<span><span class="t">일반쓰레기</span><br><span class="d">소형 생활쓰레기</span></span></button>' +
        '<button class="kind-btn" data-kind="recycle"' + (b.recycle ? '' : ' disabled') + '>' + ICON.recycle + '<span><span class="t">재활용</span><br><span class="d">' + (b.recycle ? '캔 · 페트 · 컵' : '이 통은 일반만 받아요') + '</span></span></button>' +
      '</div>' +
      '<div class="note" style="margin-top:16px">' + window.icon('warning', 20) + '<span>음식물 · 대형 · 담배꽁초는 넣을 수 없어요. 꽁초는 쓰레기통 옆 꽁초함에 넣어 주세요.</span></div>',
      'no-tab');
    document.getElementById('scan-back').addEventListener('click', function () { scanReset(); render(); });
    $app.querySelectorAll('[data-kind]').forEach(function (el) {
      el.addEventListener('click', function () {
        scan.kind = el.getAttribute('data-kind');
        el.classList.add('on');
        setTimeout(function () { scanGo('pay'); }, 120);
      });
    });
  }

  function scanPay() {
    var b = scan.bin;
    var fee = D.SCAN_FEE;
    var short = S.wallet < fee;
    scan.resume = false;
    setScreen(
      topbar('결제 확인', null, '<button class="ghost" id="scan-back" aria-label="이전">' + ICON.close + '</button>') +
      '<div class="card pad-sm"><div class="row"><span class="badge plain">' + b.id + '</span><span class="grow" style="font-weight:600">' + esc(b.name) + '</span><span class="small muted">' + (scan.kind === 'recycle' ? '재활용' : '일반') + '</span></div></div>' +
      '<div class="pay-table">' +
        '<div class="r total"><span>1회 투입 요금</span><b class="num">' + won(fee) + '</b></div>' +
        '<div class="r"><span>선불 지갑 잔액</span><b class="num' + (short ? '" style="color:#C8553D' : '') + '">' + won(S.wallet) + '</b></div>' +
        '<div class="r"><span>결제 후 잔액</span><b class="num">' + (short ? '-' : won(S.wallet - fee)) + '</b></div>' +
        '<div class="r refund"><span>환급 예정 마일리지</span><b class="num">+' + pts(D.SCAN_REFUND) + '</b></div>' +
      '</div>' +
      (short
        ? '<div class="note warn" style="margin-top:16px">' + window.icon('warning', 20) + '<span>잔액이 ' + won(fee - S.wallet) + ' 부족해요. 충전하면 이 화면으로 돌아와요.</span></div>' +
          '<a class="btn" href="#/wallet/topup" id="go-topup" style="margin-top:16px">' + ICON.wallet + ' 지갑 충전하기</a>'
        : '<p class="small muted" style="margin-top:16px">결제하면 투입구가 ' + D.OPEN_SECONDS + '초 동안 열려요. 투입이 끝나면 ' + pts(D.SCAN_REFUND) + '가 바로 돌아와요.</p>' +
          '<button class="btn" id="pay" style="margin-top:16px">' + won(fee) + ' 결제하고 열기</button>'),
      'no-tab');
    document.getElementById('scan-back').addEventListener('click', function () { scanGo('result'); });
    var topupLink = document.getElementById('go-topup');
    if (topupLink) topupLink.addEventListener('click', function () { scan.resume = true; });
    var payBtn = document.getElementById('pay');
    if (payBtn) payBtn.addEventListener('click', function () {
      payBtn.disabled = true;
      payBtn.textContent = '결제 중…';
      setTimeout(function () {
        S.wallet -= fee;
        addTx({ type: 'pay', amount: fee, bin: b.id, kind: scan.kind });
        save();
        startCountdown();
        scanGo('open');
      }, 600);
    });
  }

  function startCountdown() {
    stopScanTimer();
    scan.remaining = D.OPEN_SECONDS;
    scan.timer = setInterval(function () {
      scan.remaining -= 1;
      if (scan.remaining <= 0) { finishDrop(); return; }
      updateRing();
    }, 1000);
  }
  function updateRing() {
    var ring = document.getElementById('ring');
    if (!ring) return;
    var total = D.OPEN_SECONDS;
    var C = 2 * Math.PI * 108;
    ring.querySelector('.prog').style.strokeDashoffset = (C * (1 - scan.remaining / total)).toFixed(1);
    ring.querySelector('.sec').textContent = scan.remaining;
    var ending = scan.remaining <= 7;
    ring.classList.toggle('ending', ending);
    var st = document.getElementById('open-status');
    st.classList.toggle('ending', ending);
    st.querySelector('h2').textContent = ending ? '곧 닫혀요' : '투입구가 열렸어요';
    st.querySelector('p').textContent = ending ? '손을 넣지 마세요. ' + scan.remaining + '초 뒤 닫혀요' : '쓰레기를 넣어 주세요. 다 넣었으면 아래 버튼을 눌러요';
  }
  function finishDrop() {
    stopScanTimer();
    var nth = refundsOn(todayISO()) + 1;
    S.points += D.SCAN_REFUND;
    addTx({ type: 'refund', points: D.SCAN_REFUND, bin: scan.bin.id });
    save();
    scan.doneAt = { points: S.points, nth: nth };
    scanGo('done');
  }

  function scanOpen() {
    var C = 2 * Math.PI * 108;
    setScreen(
      topbar('투입구 열림') +
      '<div class="open-wrap">' +
        '<div class="ring" id="ring"><svg viewBox="0 0 240 240"><circle class="track" cx="120" cy="120" r="108"/><circle class="prog" cx="120" cy="120" r="108" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="0"/></svg>' +
          '<div class="center"><div class="sec">' + scan.remaining + '</div><div class="unit">초 남았어요</div></div></div>' +
        '<div class="open-status" id="open-status"><h2>투입구가 열렸어요</h2><p>쓰레기를 넣어 주세요. 다 넣었으면 아래 버튼을 눌러요</p></div>' +
      '</div>' +
      '<div class="card pad-sm" style="margin-top:28px"><div class="row"><span class="badge plain">' + scan.bin.id + '</span><span class="grow small" style="font-weight:600">' + esc(scan.bin.name) + '</span><span class="small muted">' + (scan.kind === 'recycle' ? '재활용' : '일반') + '</span></div></div>' +
      '<button class="btn" id="done" style="margin-top:16px">' + ICON.check + ' 다 버렸어요</button>' +
      '<p class="tiny" style="margin-top:12px">투입구는 시간이 끝나면 자동으로 닫혀요. 닫힌 뒤에는 다시 스캔해야 열려요.</p>',
      'no-tab');
    updateRing();
    document.getElementById('done').addEventListener('click', function () { this.disabled = true; finishDrop(); });
  }

  function scanDone() {
    var info = scan.doneAt || { points: S.points, nth: refundsOn(todayISO()) };
    setScreen(
      topbar('비움 완료') +
      '<div class="done-mark">' + ICON.check + '</div>' +
      '<h1 style="margin-top:20px">300P가 돌아왔어요</h1>' +
      '<p class="muted" style="margin-top:8px">' + scan.bin.id + ' ' + esc(scan.bin.name) + '에 ' + (scan.kind === 'recycle' ? '재활용' : '일반쓰레기') + '를 버렸어요. 300원 결제가 전액 마일리지로 환급됐어요.</p>' +
      '<div class="done-stats">' +
        '<div class="card"><div class="label">누적 마일리지</div><div class="mid-num">' + pts(info.points) + '</div></div>' +
        '<div class="card"><div class="label">오늘의 비움</div><div class="mid-num">' + info.nth + '번째</div></div>' +
      '</div>' +
      '<div class="stack" style="margin-top:28px"><a class="btn" href="#/store" id="done-store">' + ICON.store + ' 스토어 구경하기</a><a class="btn outline" href="#/home" id="done-home">홈으로</a></div>',
      'no-tab');
    var reset = function () { scanReset(); };
    document.getElementById('done-store').addEventListener('click', reset);
    document.getElementById('done-home').addEventListener('click', reset);
  }

  /* ---------------------------------------------------------------------
     화면: 지갑 · 충전
  --------------------------------------------------------------------- */
  var topupUI = { amount: 5000, method: '카카오페이' };

  function txLabel(t) {
    var b = t.bin ? binById(t.bin) : null;
    var p = t.product ? productById(t.product) : null;
    if (t.type === 'pay') return { t: '투입 결제 · ' + (b ? b.id : ''), s: (b ? b.name : '') + ' · ' + (t.kind === 'recycle' ? '재활용' : '일반'), amt: '-' + won(t.amount), cls: 'minus', ic: 'trash' };
    if (t.type === 'refund') return { t: '마일리지 환급', s: '결제액 전액 환급', amt: '+' + pts(t.points), cls: 'plus', ic: 'check' };
    if (t.type === 'topup') return { t: '지갑 충전', s: t.method, amt: '+' + won(t.amount), cls: 'plus', ic: 'wallet' };
    return { t: '스토어 교환', s: p ? (p.type === 'coupon' ? p.brand + ' ' + p.name : p.name) : '', amt: '-' + pts(t.points), cls: 'minus', ic: 'gift' };
  }
  function txRow(t) {
    var l = txLabel(t);
    return '<div class="tx"><span class="lead ' + t.type + '">' + window.icon(l.ic, 20) + '</span><div class="grow"><div class="t">' + esc(l.t) + '</div><div class="s">' + esc(l.s) + ' · ' + t.time + '</div></div><span class="amt ' + l.cls + '">' + l.amt + '</span></div>';
  }
  function txHistory() {
    // 날짜별 그룹, 최신순. 결제/환급은 한 묶음(tx-pair)으로 표시.
    var byDate = {};
    S.transactions.forEach(function (t) { (byDate[t.date] = byDate[t.date] || []).push(t); });
    var dates = Object.keys(byDate).sort().reverse();
    return dates.map(function (d) {
      var list = byDate[d].slice().reverse();
      var html = '<div class="tx-day">' + dateLabel(d) + '</div>';
      var i = 0;
      while (i < list.length) {
        var t = list[i];
        if (t.type === 'refund' && list[i + 1] && list[i + 1].type === 'pay' && list[i + 1].time === t.time) {
          html += '<div class="tx-pair">' + txRow(list[i + 1]) + txRow(t) + '</div>';
          i += 2;
        } else {
          html += '<div class="tx-pair">' + txRow(t) + '</div>';
          i += 1;
        }
      }
      return html;
    }).join('');
  }

  function wallet(r) {
    if (r.sub === 'topup') return topup();
    setScreen(
      topbar('지갑', 'home') +
      '<div class="wallet-card"><div class="small muted">선불 잔액</div><div class="big">' + fmt(S.wallet) + '<small>원</small></div>' +
        '<div class="row between" style="margin-top:12px"><span class="small muted num">1회 300원 · 약 ' + Math.floor(S.wallet / D.SCAN_FEE) + '회 투입 가능</span><a class="btn sm" href="#/wallet/topup">' + window.icon('plus', 18) + ' 충전</a></div></div>' +
      '<div class="section"><div class="section-head"><h2>거래 내역</h2><span class="tiny">최근 ' + S.transactions.length + '건</span></div>' +
        (S.transactions.length ? txHistory() : '<div class="empty">' + window.icon('wallet', 28) + '<h3>아직 거래가 없어요</h3><p>첫 비움을 하면 결제와 환급이 여기에 쌍으로 쌓여요.</p></div>') +
      '</div>', 'no-tab');
  }

  function topup() {
    var back = scan.resume ? 'scan' : 'wallet';
    setScreen(
      topbar('지갑 충전', back) +
      (scan.resume ? '<div class="note warn" style="margin-bottom:16px">' + window.icon('warning', 20) + '<span>투입 결제에 ' + won(D.SCAN_FEE - S.wallet) + '이 부족해요. 충전하면 결제 화면으로 돌아가요.</span></div>' : '') +
      '<div class="card"><div class="small muted">현재 잔액</div><div class="mid-num">' + won(S.wallet) + '</div></div>' +
      '<div class="section"><h3 style="margin-bottom:12px">충전 금액</h3><div class="amount-chips">' +
        [3000, 5000, 10000].map(function (a) { return '<button class="chip' + (topupUI.amount === a ? ' on' : '') + '" data-amt="' + a + '">' + won(a) + '</button>'; }).join('') +
      '</div></div>' +
      '<div class="section"><h3 style="margin-bottom:12px">결제수단</h3><div class="methods">' +
        ['카카오페이', '네이버페이', '토스', '신용·체크카드'].map(function (m) { return '<button class="method' + (topupUI.method === m ? ' on' : '') + '" data-method="' + m + '"><span>' + m + '</span>' + window.icon('check', 20) + '</button>'; }).join('') +
      '</div></div>' +
      '<div class="section"><div class="pay-table" style="margin-top:0"><div class="r"><span>충전 후 잔액</span><b class="num" id="after">' + won(S.wallet + topupUI.amount) + '</b></div></div>' +
      '<button class="btn" id="topup-go" style="margin-top:16px">' + won(topupUI.amount) + ' 충전하기</button>' +
      '<p class="tiny" style="margin-top:12px">프로토타입이라 실제 결제는 일어나지 않아요. 잔액은 이 기기에만 저장돼요.</p></div>',
      'no-tab');
    $app.querySelectorAll('[data-amt]').forEach(function (el) {
      el.addEventListener('click', function () { topupUI.amount = parseInt(el.getAttribute('data-amt'), 10); render(); });
    });
    $app.querySelectorAll('[data-method]').forEach(function (el) {
      el.addEventListener('click', function () { topupUI.method = el.getAttribute('data-method'); render(); });
    });
    document.getElementById('topup-go').addEventListener('click', function () {
      var btn = this;
      btn.disabled = true;
      btn.textContent = topupUI.method + ' 결제 중…';
      setTimeout(function () {
        S.wallet += topupUI.amount;
        addTx({ type: 'topup', amount: topupUI.amount, method: topupUI.method });
        save();
        if (scan.resume) { scan.resume = false; scan.step = 'pay'; go('scan'); }
        else go('wallet');
        setTimeout(function () { toast(won(topupUI.amount) + ' 충전됐어요. 잔액 ' + won(S.wallet), 'wallet'); }, 200);
      }, 700);
    });
  }

  /* ---------------------------------------------------------------------
     화면: 스토어
  --------------------------------------------------------------------- */
  var storeUI = { tab: 'goods' };
  var GOODS_ICON = { 'G-01': 'cup', 'G-02': 'leaf', 'G-03': 'soap', 'G-04': 'bag', 'G-05': 'recycle', 'G-06': 'wallet', 'S-01': 'tag', 'S-02': 'book', 'S-03': 'bag', 'S-04': 'cup', 'S-05': 'hanky', 'S-06': 'castle' };

  function store(r) {
    if (r.sub === 'coupons') storeUI.tab = 'coupon';
    else if (r.sub === 'suwon') storeUI.tab = 'suwon';
    else if (r.sub === 'goods') storeUI.tab = 'goods';
    withSkeleton('store',
      '<div class="screen"><div class="topbar"><div class="sk line w40" style="height:22px"></div></div><div class="sk row" style="height:48px"></div><div class="goods-grid"><div class="sk block" style="height:200px"></div><div class="sk block" style="height:200px"></div><div class="sk block" style="height:200px"></div><div class="sk block" style="height:200px"></div></div></div>',
      function () {
        var items = PRODUCTS.filter(function (p) { return p.type === storeUI.tab; });
        var html = topbar('스토어') +
          '<div class="tabs tabs-3"><button data-tab="goods" class="' + (storeUI.tab === 'goods' ? 'on' : '') + '">친환경 굿즈</button><button data-tab="suwon" class="' + (storeUI.tab === 'suwon' ? 'on' : '') + '">수원 굿즈</button><button data-tab="coupon" class="' + (storeUI.tab === 'coupon' ? 'on' : '') + '">로데오 쿠폰</button></div>' +
          '<div class="points-bar"><span class="small muted">내 마일리지</span><b class="num">' + pts(S.points) + '</b></div>';
        if (storeUI.tab !== 'coupon') {
          html += '<div class="goods-grid">' + items.map(function (p) {
            return '<button class="goods' + (p.price > S.points ? ' short' : '') + '" data-product="' + p.id + '"><span class="thumb">' + window.icon(GOODS_ICON[p.id] || 'gift', 34) + '</span><span class="n">' + esc(p.name) + '</span><span class="p num">' + pts(p.price) + (p.price > S.points ? '<small>부족</small>' : '') + '</span></button>';
          }).join('') + '</div>';
        } else {
          html += '<div class="list" style="margin-top:12px">' + items.map(function (p) {
            return '<button class="list-item coupon-item" data-product="' + p.id + '"><span class="lead">' + window.icon('store', 20) + '</span><span class="grow"><span class="brand">' + esc(p.brand) + '</span><br><span class="title">' + esc(p.name) + '</span></span><span class="trail"><span class="p num">' + pts(p.price) + '</span>' + (p.price > S.points ? '<br><span class="tiny">부족</span>' : '') + '</span></button>';
          }).join('') + '</div>';
        }
        html += '<p class="footnote">' + (storeUI.tab === 'coupon' ? '쿠폰은 매장에서 바코드를 보여 주면 돼요.' : storeUI.tab === 'suwon' ? '수원 굿즈는 수원시 공식 기념품이에요. 수령 장소는 상품마다 달라요.' : '굿즈는 로데오거리 상인회 사무실에서 받아요.') + '</p>';
        setScreen(html);
        $app.querySelectorAll('[data-tab]').forEach(function (el) {
          el.addEventListener('click', function () {
            storeUI.tab = el.getAttribute('data-tab');
            go(storeUI.tab === 'coupon' ? 'store/coupons' : storeUI.tab === 'suwon' ? 'store/suwon' : 'store/goods');
          });
        });
        $app.querySelectorAll('[data-product]').forEach(function (el) {
          el.addEventListener('click', function () { openProductSheet(el.getAttribute('data-product')); });
        });
      });
  }

  function openProductSheet(id) {
    var p = productById(id);
    if (!p) return;
    var short = p.price > S.points;
    var isCoupon = p.type === 'coupon';
    openSheet(
      '<div class="thumb-lg">' + window.icon(isCoupon ? 'store' : (GOODS_ICON[p.id] || 'gift'), 48) + '</div>' +
      '<p class="small muted">' + esc(isCoupon ? p.brand : p.brand) + '</p>' +
      '<h2 style="margin-top:2px">' + esc(p.name) + '</h2>' +
      '<p class="small" style="margin-top:10px;color:#5B6660">' + esc(p.desc) + '</p>' +
      '<p class="tiny" style="margin-top:8px">' + esc(isCoupon ? '유효기간 ' + p.expiry + ' · ' + p.address : p.pickup) + '</p>' +
      '<div class="price-row"><span class="small muted">필요 마일리지</span><span class="mid-num">' + pts(p.price) + '</span></div>' +
      '<div class="row between small" style="margin-top:12px"><span class="muted">내 마일리지</span><b class="num">' + pts(S.points) + '</b></div>' +
      '<div class="row between small" style="margin-top:4px"><span class="muted">교환 후</span><b class="num"' + (short ? ' style="color:#C8553D"' : '') + '>' + (short ? pts(p.price - S.points) + ' 부족' : pts(S.points - p.price)) + '</b></div>' +
      (short ? '<div class="note warn" style="margin-top:16px">' + window.icon('warning', 20) + '<span>' + pts(p.price - S.points) + '가 부족해요. 비움 ' + Math.ceil((p.price - S.points) / D.SCAN_REFUND) + '번이면 모을 수 있어요.</span></div>' : '') +
      '<div class="foot">' + (short
        ? '<a class="btn secondary" href="#/scan" id="x-scan">QR 스캔하러 가기</a>'
        : '<button class="btn" id="x-go">' + pts(p.price) + '로 교환하기</button>') + '</div>',
      function (sheet) {
        var sc = sheet.querySelector('#x-scan');
        if (sc) sc.addEventListener('click', function () { scanReset(); closeSheet(); });
        var btn = sheet.querySelector('#x-go');
        if (btn) btn.addEventListener('click', function () {
          btn.disabled = true;
          btn.textContent = '교환 중…';
          setTimeout(function () {
            S.points -= p.price;
            var tx = addTx({ type: 'exchange', points: p.price, product: p.id });
            S.exchanges.push({ id: 'X' + Date.now(), product: p.id, date: tx.date, time: tx.time, code: '8809 ' + (1000 + Math.floor(Math.random() * 9000)) + ' ' + (1000 + Math.floor(Math.random() * 9000)), used: false });
            save();
            closeSheet();
            render();
            toast('교환 완료. 내정보 > 교환함에서 확인할 수 있어요.', 'gift');
          }, 600);
        });
      }
    );
  }

  /* ---------------------------------------------------------------------
     화면: 내정보 · 교환함 · 신고 · 설정
  --------------------------------------------------------------------- */
  function barcode(seed) {
    // CSS로 그리는 가짜 바코드. seed 문자열로 막대 폭을 결정해 쿠폰마다 다르게 보이게 한다.
    var bars = '';
    var n = 0;
    for (var i = 0; i < seed.length; i++) n = (Math.imul(n, 31) + seed.charCodeAt(i)) >>> 0;
    for (var k = 0; k < 44; k++) {
      n = (Math.imul(n, 1103515245) + 12345) >>> 0;
      var w = 1 + (n >>> 16) % 3;
      var gap = 1 + (n >>> 8) % 3;
      bars += '<i style="width:' + w + 'px;margin-right:' + gap + 'px"></i>';
    }
    return bars;
  }
  function exchangeCard(x) {
    var p = productById(x.product);
    if (!p) return '';
    var isCoupon = p.type === 'coupon';
    return '<div class="coupon-card' + (x.used ? ' used' : '') + '">' +
      '<div class="row between"><div><div class="brand">' + esc(isCoupon ? p.brand : '친환경 굿즈') + '</div><div class="n">' + esc(p.name) + '</div></div>' +
      (x.used ? '<span class="badge plain">사용 완료</span>' : '<button class="btn sm secondary" data-use="' + x.id + '">' + (isCoupon ? '사용하기' : '수령 확인') + '</button>') + '</div>' +
      '<div class="barcode"><div class="bars">' + barcode(x.code) + '</div><div class="code">' + x.code + '</div></div>' +
      '<p class="tiny" style="margin-top:8px">' + (isCoupon ? '교환 ' + dateLabel(x.date) + ' · 유효기간 ' + p.expiry : p.pickup) + '</p>' +
      '</div>';
  }

  function me(r) {
    if (r.sub === 'report') return report();
    if (r.sub === 'settings') return settings();
    if (PREVIEW === 'me-empty') S.exchanges = [];
    var m = monthStats();
    var j = S.joinedAt.split('-');
    var exchanges = S.exchanges.slice().reverse();
    setScreen(
      topbar('내정보') +
      '<div class="profile"><div class="avatar">' + esc(S.nickname.charAt(0)) + '</div><div><h2>' + esc(S.nickname) + '</h2><div class="small muted num">' + j[0] + '년 ' + parseInt(j[1], 10) + '월 ' + parseInt(j[2], 10) + '일 가입 · 수원역 이용자</div></div></div>' +
      '<div class="stat3">' +
        '<div class="card"><div class="label">이번 달 비움</div><div class="mid-num">' + m.count + '회</div></div>' +
        '<div class="card"><div class="label">환급 받은</div><div class="mid-num">' + fmt(m.refund) + 'P</div></div>' +
        '<div class="card"><div class="label">교환에 쓴</div><div class="mid-num">' + fmt(m.exchange) + 'P</div></div>' +
      '</div>' +
      '<div class="section"><div class="section-head"><h2>교환함</h2><span class="tiny num">' + exchanges.length + '개</span></div>' +
        (exchanges.length ? exchanges.map(exchangeCard).join('') :
          '<div class="empty">' + window.icon('gift', 28) + '<h3>교환함이 비어 있어요</h3><p>마일리지로 굿즈나 로데오거리 쿠폰을 교환하면 여기에 바코드가 생겨요.</p><a class="btn secondary" href="#/store">스토어 보기</a></div>') +
      '</div>' +
      '<div class="section menu"><div class="list">' +
        '<a class="list-item" href="#/me/report">' + ICON.warning + '<span class="grow"><span class="title">쓰레기통 신고</span><span class="sub" style="display:block">가득 참 · 파손 · 악취</span></span><span class="trail">' + ICON.chevronRight + '</span></a>' +
        '<a class="list-item" href="#/wallet">' + ICON.wallet + '<span class="grow"><span class="title">지갑 · 거래 내역</span><span class="sub num" style="display:block">잔액 ' + won(S.wallet) + '</span></span><span class="trail">' + ICON.chevronRight + '</span></a>' +
        '<a class="list-item" href="#/me/settings">' + ICON.settings + '<span class="grow"><span class="title">설정</span><span class="sub" style="display:block">알림 · 닉네임 · 데이터 초기화</span></span><span class="trail">' + ICON.chevronRight + '</span></a>' +
      '</div></div>' +
      '<div class="operator-link"><a href="#/admin">운영자 모드</a></div>' +
      '<p class="footnote" style="margin-top:0">수원시 팔달구 × 수원역 로데오거리 상인회 시범사업</p>');
    $app.querySelectorAll('[data-use]').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-use');
        var x = S.exchanges.filter(function (e) { return e.id === id; })[0];
        if (!x) return;
        var p = productById(x.product);
        openSheet(
          '<h2>' + esc(p.name) + '</h2><p class="small muted" style="margin-top:4px">' + esc(p.type === 'coupon' ? p.brand + ' 직원에게 이 화면을 보여 주세요' : '상인회 사무실에서 이 화면을 보여 주세요') + '</p>' +
          '<div class="barcode" style="margin-top:16px;padding:18px 12px"><div class="bars" style="height:72px">' + barcode(x.code) + '</div><div class="code" style="font-size:14px">' + x.code + '</div></div>' +
          '<p class="note" style="margin-top:16px">' + window.icon('warning', 20) + '<span>직원이 확인한 뒤 아래 버튼을 눌러요. 한 번 누르면 되돌릴 수 없어요.</span></p>' +
          '<button class="btn" id="use-ok" style="margin-top:16px">' + (p.type === 'coupon' ? '사용 완료 처리' : '수령 완료 처리') + '</button>',
          function (sheet) {
            sheet.querySelector('#use-ok').addEventListener('click', function () {
              x.used = true; save(); closeSheet(); render();
              toast(esc(p.name) + ' ' + (p.type === 'coupon' ? '사용' : '수령') + ' 처리됐어요.');
            });
          }
        );
      });
    });
  }

  var reportUI = { bin: 'RD-01', type: 'full' };
  function report() {
    setScreen(
      topbar('쓰레기통 신고', 'me') +
      '<p class="muted">신고하면 상인회 순찰 담당자에게 바로 전달돼요. 가득 참 신고가 3건 쌓이면 긴급 수거가 잡혀요.</p>' +
      '<div class="section"><h3 style="margin-bottom:12px">어느 쓰레기통인가요?</h3><div class="chips scroll">' +
        BINS.map(function (b) { return '<button class="chip' + (reportUI.bin === b.id ? ' on' : '') + '" data-rbin="' + b.id + '">' + b.id + ' ' + esc(b.name) + '</button>'; }).join('') +
      '</div></div>' +
      '<div class="section"><h3>무슨 문제인가요?</h3><div class="report-opts">' +
        [['full', '가득 참'], ['broken', '파손'], ['smell', '악취']].map(function (t) { return '<button class="chip' + (reportUI.type === t[0] ? ' on' : '') + '" data-rtype="' + t[0] + '">' + t[1] + '</button>'; }).join('') +
      '</div></div>' +
      '<div class="section"><label class="field"><span>메모 (선택)</span><textarea class="input" id="r-memo" placeholder="예: 투입구 옆에 봉투가 쌓여 있어요"></textarea></label></div>' +
      '<button class="btn" id="r-go" style="margin-top:24px">신고 접수</button>', 'no-tab');
    $app.querySelectorAll('[data-rbin]').forEach(function (el) { el.addEventListener('click', function () { reportUI.bin = el.getAttribute('data-rbin'); render(); }); });
    $app.querySelectorAll('[data-rtype]').forEach(function (el) { el.addEventListener('click', function () { reportUI.type = el.getAttribute('data-rtype'); render(); }); });
    document.getElementById('r-go').addEventListener('click', function () {
      var btn = this;
      btn.disabled = true;
      btn.textContent = '접수 중…';
      setTimeout(function () {
        S.reports = (S.reports || 0) + 1;
        save();
        var no = 'R-' + todayISO().replace(/-/g, '') + '-' + pad(S.reports);
        go('me');
        setTimeout(function () { toast('접수번호 ' + no + '로 접수됐어요. ' + reportUI.bin + ' 담당자가 확인해요.', 'check'); }, 200);
      }, 600);
    });
  }

  function settings() {
    setScreen(
      topbar('설정', 'me') +
      '<div class="list">' +
        '<div class="setting-row"><div><div class="t">투입구 닫힘 알림</div><div class="s">닫히기 5초 전에 진동으로 알려요</div></div><button class="toggle" id="t-notify" role="switch" aria-checked="' + (S.notify ? 'true' : 'false') + '" aria-label="투입구 닫힘 알림"></button></div>' +
        '<div class="setting-row"><div><div class="t">닉네임</div><div class="s">' + esc(S.nickname) + '</div></div><button class="btn sm outline" id="t-name">바꾸기</button></div>' +
      '</div>' +
      '<div class="section"><div class="list">' +
        '<div class="setting-row"><div><div class="t">데이터 초기화</div><div class="s">거래 내역·마일리지·교환함을 처음 상태로 되돌려요</div></div><button class="btn sm danger" id="t-reset">초기화</button></div>' +
      '</div></div>' +
      '<p class="footnote">비움 프로토타입 0.3 · 아이시스 1조 · 데이터는 이 브라우저에만 저장돼요</p>', 'no-tab');
    document.getElementById('t-notify').addEventListener('click', function () {
      S.notify = !S.notify; save();
      this.setAttribute('aria-checked', S.notify ? 'true' : 'false');
      toast(S.notify ? '닫힘 알림을 켰어요.' : '닫힘 알림을 껐어요.', 'bell');
    });
    document.getElementById('t-name').addEventListener('click', function () {
      openSheet('<h2>닉네임 바꾸기</h2><input class="input" id="nn" style="margin-top:16px" maxlength="10" value="' + esc(S.nickname) + '"><button class="btn" id="nn-ok" style="margin-top:12px">저장</button>',
        function (sheet) {
          var inp = sheet.querySelector('#nn');
          var ok = function () { var v = inp.value.trim(); if (!v) { inp.focus(); return; } S.nickname = v; save(); closeSheet(); render(); toast('닉네임을 ' + esc(v) + '(으)로 바꿨어요.'); };
          sheet.querySelector('#nn-ok').addEventListener('click', ok);
          inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok(); });
          inp.focus(); inp.select();
        });
    });
    document.getElementById('t-reset').addEventListener('click', function () {
      openSheet('<h2>정말 초기화할까요?</h2><p class="muted" style="margin-top:8px">거래 내역 20건, 마일리지 ' + pts(D.DEFAULTS.points) + ', 지갑 ' + won(D.DEFAULTS.wallet) + '의 시연용 초기 상태로 돌아가요. 온보딩도 다시 보여요.</p>' +
        '<div class="btn-row" style="margin-top:20px"><button class="btn outline" id="rs-no">취소</button><button class="btn danger" id="rs-ok">초기화</button></div>',
        function (sheet) {
          sheet.querySelector('#rs-no').addEventListener('click', closeSheet);
          sheet.querySelector('#rs-ok').addEventListener('click', function () {
            resetAll(); scanReset(); closeSheet();
            location.hash = '#/onboarding/1';
            setTimeout(function () { toast('초기화했어요. 처음부터 다시 시작해요.'); }, 250);
          });
        });
    });
  }

  /* ---------------------------------------------------------------------
     화면: 운영자 보기
  --------------------------------------------------------------------- */
  function hourlyChart() {
    var H = D.HOURLY;
    var W = 330, Hh = 150, padL = 4, padB = 20, top = 8;
    var max = Math.max.apply(null, H);
    var bw = (W - padL * 2) / 24;
    var s = '<svg viewBox="0 0 ' + W + ' ' + (Hh + padB + top) + '" role="img" aria-label="시간대별 투입 건수">';
    // 13~20시 공백 구간 띠
    s += '<rect class="band" x="' + (padL + 13 * bw) + '" y="0" width="' + (7 * bw) + '" height="' + (Hh + top) + '" rx="4"/>';
    H.forEach(function (v, i) {
      var h = Math.round(v / max * Hh);
      var x = padL + i * bw + 2;
      s += '<rect class="bar' + (i >= 13 && i < 20 ? ' peak' : '') + '" x="' + x.toFixed(1) + '" y="' + (Hh + top - h) + '" width="' + (bw - 4).toFixed(1) + '" height="' + h + '" rx="2"/>';
      if (i % 3 === 0) s += '<text x="' + (x + (bw - 4) / 2).toFixed(1) + '" y="' + (Hh + top + 14) + '" text-anchor="middle">' + i + '시</text>';
    });
    s += '</svg>';
    return s;
  }

  function admin() {
    var total = D.HOURLY.reduce(function (a, b) { return a + b; }, 0);
    var peak = D.HOURLY.slice(13, 20).reduce(function (a, b) { return a + b; }, 0);
    var sorted = BINS.slice().sort(function (a, b) { return b.fill - a.fill; });
    var avg = Math.round(BINS.reduce(function (a, b) { return a + b.fill; }, 0) / BINS.length);
    var full = BINS.filter(function (b) { return b.fill >= 75; }).length;
    setScreen(
      topbar('운영자 보기', 'me') +
      '<p class="small muted">' + longDate(todayDate()) + ' · 팔달구 청소행정과 · 상인회 순찰조 공용</p>' +
      '<div class="op-kpis">' +
        '<div class="card"><div class="label">오늘 투입 건수</div><div class="mid-num">' + fmt(total) + '건</div></div>' +
        '<div class="card"><div class="label">13~20시 비중</div><div class="mid-num">' + Math.round(peak / total * 100) + '%</div></div>' +
        '<div class="card"><div class="label">평균 적재율</div><div class="mid-num">' + avg + '%</div></div>' +
        '<div class="card"><div class="label">가득 찬 통</div><div class="mid-num"' + (full ? ' style="color:#C8553D"' : '') + '>' + full + '개</div></div>' +
      '</div>' +
      '<div class="section"><div class="section-head"><h2>시간대별 투입</h2><span class="tiny">오늘 · 8개 통 합계</span></div>' +
        '<div class="hours">' + hourlyChart() + '<p class="hours-caption">색이 진한 13~20시는 수거가 끝나고 배출이 시작되기 전 공백 시간이에요. 이 시간에 비움 투입이 몰려요.</p></div></div>' +
      '<div class="section"><div class="section-head"><h2>수거 권장 순서</h2><span class="tiny">적재율 높은 순</span></div><ol class="route">' +
        sorted.slice(0, 5).map(function (b, i) { return '<li><span class="n">' + (i + 1) + '</span><span class="grow"><span style="font-weight:600">' + b.id + '</span> <span class="small muted">' + esc(b.name) + '</span></span><span class="f' + (b.fill >= 75 ? '" style="color:#C8553D' : '') + '">' + b.fill + '%</span></li>'; }).join('') +
      '</ol></div>' +
      '<div class="section"><div class="section-head"><h2>쓰레기통 적재율</h2><span class="tiny">총 8개</span></div><div class="table-wrap"><table class="table">' +
        '<thead><tr><th>ID</th><th>위치</th><th class="num">적재율</th><th>마지막 수거</th></tr></thead><tbody>' +
        BINS.map(function (b) {
          var st = fillStatus(b.fill);
          return '<tr><td class="id">' + b.id + '</td><td>' + esc(b.name) + (b.recycle ? '' : '<br><span class="tiny">일반만</span>') + '</td><td class="num"><span class="badge ' + st + '">' + b.fill + '%</span></td><td class="num small">' + collectedLabel(b) + '</td></tr>';
        }).join('') +
      '</tbody></table></div></div>' +
      '<p class="footnote">적재율은 투입구 센서 기준 추정값이에요. 수거 차량은 05시 역전시장 삼거리에서 출발해요.</p>', 'no-tab');
  }

  /* ---------------------------------------------------------------------
     라우트 표
  --------------------------------------------------------------------- */
  var SCREENS = {
    onboarding: onboarding,
    home: home,
    map: map,
    scan: scanScreen,
    wallet: wallet,
    store: store,
    me: me,
    admin: admin
  };

  /* ---------------------------------------------------------------------
     상태바 시계 · 시작
  --------------------------------------------------------------------- */
  function tickClock() { if ($clock) $clock.textContent = nowTime(); }
  tickClock();
  setInterval(tickClock, 30000);

  function applyPreviewRoute() {
    if (!PREVIEW) return;
    var map = {
      'onboard1': 'onboarding/1', 'onboard2': 'onboarding/2', 'onboard3': 'onboarding/3',
      'home': 'home', 'map': 'map', 'map-list': 'map', 'map-sheet': 'map',
      'scan-camera': 'scan', 'scan-result': 'scan', 'scan-pay': 'scan', 'scan-pay-short': 'scan', 'scan-open': 'scan', 'scan-done': 'scan',
      'wallet': 'wallet', 'wallet-topup': 'wallet/topup',
      'store': 'store', 'store-coupons': 'store/coupons', 'store-suwon': 'store/suwon', 'store-sheet': 'store',
      'me': 'me', 'me-empty': 'me', 'report': 'me/report', 'settings': 'me/settings', 'admin': 'admin'
    };
    if (PREVIEW.indexOf('onboard') === 0) S.onboarded = false;
    if (PREVIEW === 'map-list') mapUI.view = 'list';
    var target = map[PREVIEW] || 'home';
    location.hash = '#/' + target;
    setTimeout(function () {
      if (PREVIEW === 'map-sheet') openBinSheet('RD-04');
      if (PREVIEW === 'store-sheet') openProductSheet('G-01');
    }, 80);
  }

  load();
  window.addEventListener('hashchange', render);
  applyPreviewRoute();
  render();

  // 디버그용 최소 노출
  window.BIUM = { state: function () { return S; }, reset: resetAll };
})();
