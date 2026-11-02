/* 비움(BIUM) 인라인 SVG 선 아이콘
   - 24×24 뷰박스, stroke 1.75px, round cap/join, currentColor
   - 사용: ICON.camera, ICON.scan ... (문자열), 또는 icon('camera', 20)
*/
(function (global) {
  'use strict';

  var ATTR = 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';

  var PATHS = {
    camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.2-2h6l1.2 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.25"/>',
    scan: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8"/><path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8"/><path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16"/><path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M7 12h10"/>',
    pin: '<path d="M12 21s-6.5-5.4-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.6 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.25"/>',
    map: '<path d="M3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2-6-2z"/><path d="M9 4.5v13"/><path d="M15 6.5v13"/>',
    wallet: '<path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h13a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 18 19H5a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M15 11h4.5v4H15a2 2 0 0 1 0-4z"/><path d="M3.5 7.5V6a1.5 1.5 0 0 1 1.5-1.5h10"/>',
    store: '<path d="M4 9.5 5.2 5h13.6L20 9.5"/><path d="M4 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0"/><path d="M5.5 12v7.5h13V12"/><path d="M10 19.5v-5h4v5"/>',
    user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5"/>',
    home: '<path d="M4.5 10.5 12 4.5l7.5 6v8a1 1 0 0 1-1 1h-4.5v-5h-4v5H5.5a1 1 0 0 1-1-1z"/>',
    trash: '<path d="M5 7h14"/><path d="M9.5 7V5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7"/><path d="M6.5 7l.8 11.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7"/><path d="M10 11v5"/><path d="M14 11v5"/>',
    recycle: '<path d="m7.5 13.5-2.4 4.1a1.2 1.2 0 0 0 1 1.9H9.5"/><path d="m16.5 13.5 2.4 4.1a1.2 1.2 0 0 1-1 1.9H14.5"/><path d="m9.3 9.3 2.4-4.2a1.2 1.2 0 0 1 2.1 0L15 7.5"/><path d="M9.5 19.5 7.5 17.5l2-2"/><path d="m17.3 10.5-1.6-2.8-2.8 1.6"/><path d="m5.5 10.7 1.6-2.8 2.8 1.6"/>',
    bell: '<path d="M6.5 16.5v-5a5.5 5.5 0 0 1 11 0v5l1.5 1.5H5z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    arrowLeft: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    chevronRight: '<path d="m9.5 6 6 6-6 6"/>',
    chevronDown: '<path d="m6 9.5 6 6 6-6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    warning: '<path d="M12 4.5 20.5 19h-17z"/><path d="M12 10v4"/><path d="M12 16.75h.01"/>',
    close: '<path d="m6 6 12 12"/><path d="m18 6-12 12"/>',
    list: '<path d="M8 6.5h12"/><path d="M8 12h12"/><path d="M8 17.5h12"/><path d="M4 6.5h.01"/><path d="M4 12h.01"/><path d="M4 17.5h.01"/>',
    keyboard: '<rect x="3.5" y="6.5" width="17" height="11" rx="1.5"/><path d="M7 10h.01"/><path d="M10.5 10h.01"/><path d="M14 10h.01"/><path d="M17 10h.01"/><path d="M8 14h8"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 1.5"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    gift: '<path d="M4.5 11h15v8.5h-15z"/><path d="M3.5 7.5h17V11h-17z"/><path d="M12 7.5v12"/><path d="M12 7.5c-1.5-3-5-3.5-5-1.5s3 1.5 5 1.5c2 0 5 .5 5-1.5s-3.5-1.5-5 1.5z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6"/>',
    cup: '<path d="M6 8h10v7.5a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4z"/><path d="M16 10h1.5a2.25 2.25 0 0 1 0 4.5H16"/><path d="M8 4.5v2M11 4.5v2M14 4.5v2"/>',
    bag: '<path d="M6 8.5h12l-1 11H7z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
    leaf: '<path d="M19 5c-7 0-13 3-13 10a5 5 0 0 0 5 5c7 0 8-7 8-15z"/><path d="M6 20c2-5 5-8 9-10"/>',
    castle: '<path d="M4.5 20V9l2-1.5V5h2v2.5h2V5h2v2.5h2V5h2v2.5l2 1.5v11z"/><path d="M10 20v-4.5a2 2 0 0 1 4 0V20"/>',
    book: '<path d="M4.5 5.5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2h-6z"/><path d="M19.5 5.5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>',
    tag: '<path d="M4.5 4.5h7l8 8-7 7-8-8z"/><path d="M8.25 8.25h.01"/>',
    soap: '<rect x="4" y="9" width="16" height="10" rx="3"/><path d="M8 6.5c1-1.5 3-1.5 4 0s3 1.5 4 0"/>',
    hanky: '<path d="M5 5h14v14H5z"/><path d="M5 5l14 14M5 12h14M12 5v14"/>',
    bottle: '<path d="M10 3.5h4v3l1.5 2.5v9.5a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5V9L10 6.5z"/><path d="M8.5 12h7"/>',
    train: '<rect x="5" y="4" width="14" height="13" rx="2.5"/><path d="M5 11h14"/><path d="M8.5 14h.01"/><path d="M15.5 14h.01"/><path d="m7.5 20 1.5-3"/><path d="m16.5 20-1.5-3"/>'
  };

  var ICON = {};
  Object.keys(PATHS).forEach(function (name) {
    ICON[name] = '<svg class="ic" viewBox="0 0 24 24" width="24" height="24" ' + ATTR + ' aria-hidden="true">' + PATHS[name] + '</svg>';
  });

  function icon(name, size) {
    var s = size || 24;
    return '<svg class="ic" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" ' + ATTR + ' aria-hidden="true">' + (PATHS[name] || '') + '</svg>';
  }

  global.ICON = ICON;
  global.icon = icon;
})(window);
