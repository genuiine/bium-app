/* 비움(BIUM) 목데이터
   - 쓰레기통 8개, 상품 12개(굿즈 6·쿠폰 6), 거래 20건, 시간대별 투입 24개 값
   - 거래 날짜는 "오늘"을 기준으로 역산해 생성 (오늘이 2026-11-03이면 10/24~11/02)
*/
(function (global) {
  'use strict';

  var BINS = [
    {
      id: 'RD-01', name: '로데오거리 입구(매산로1가)', detail: '로데오거리 아치 간판 오른쪽 기둥 옆',
      distance: 120, fill: 82, recycle: true,
      lastCollected: { day: 'today', time: '11:40' },
      map: { x: 198, y: 160 }
    },
    {
      id: 'RD-02', name: '수원역 4번 출구', detail: '4번 출구 계단 내려와서 왼쪽 가로수 옆',
      distance: 40, fill: 45, recycle: true,
      lastCollected: { day: 'today', time: '10:15' },
      map: { x: 128, y: 196 }
    },
    {
      id: 'RD-03', name: '역전시장 삼거리', detail: '시장 입구 횡단보도 건너 보도 끝',
      distance: 280, fill: 68, recycle: false,
      lastCollected: { day: 'today', time: '09:30' },
      map: { x: 241, y: 114 }
    },
    {
      id: 'RD-04', name: '로데오 중앙 광장', detail: '광장 분수대 남쪽 벤치 뒤',
      distance: 260, fill: 91, recycle: true,
      lastCollected: { day: 'yesterday', time: '12:20' },
      map: { x: 198, y: 330 }
    },
    {
      id: 'RD-05', name: 'CGV 앞 보행로', detail: '영화관 매표소 출입구 왼쪽',
      distance: 210, fill: 23, recycle: false,
      lastCollected: { day: 'today', time: '12:05' },
      map: { x: 228, y: 226 }
    },
    {
      id: 'RD-06', name: '매산로 버스정류장', detail: '정류장 쉘터 뒤편(13-3, 7-2번 승차)',
      distance: 310, fill: 57, recycle: true,
      lastCollected: { day: 'today', time: '08:50' },
      map: { x: 322, y: 160 }
    },
    {
      id: 'RD-07', name: '로데오거리 남측 끝', detail: '보행로 끝 주차장 진입로 앞',
      distance: 420, fill: 12, recycle: false,
      lastCollected: { day: 'today', time: '12:40' },
      map: { x: 198, y: 505 }
    },
    {
      id: 'RD-08', name: 'AK플라자 방면 보행로', detail: '백화점 연결 통로 자동문 바깥',
      distance: 150, fill: 38, recycle: true,
      lastCollected: { day: 'today', time: '10:50' },
      map: { x: 138, y: 400 }
    }
  ];

  var PRODUCTS = [
    // 친환경 굿즈
    { id: 'G-01', type: 'goods', name: '스테인리스 텀블러', brand: '비움 기본 굿즈', price: 4500, desc: '350ml, 이중 진공. 로데오거리 제휴 카페에서 텀블러 할인과 함께 쓸 수 있어요.', pickup: '로데오거리 상인회 사무실(중앙 광장 2층)에서 수령' },
    { id: 'G-02', type: 'goods', name: '대나무 칫솔 세트', brand: '비움 기본 굿즈', price: 1200, desc: '대나무 손잡이 칫솔 2개. 손잡이는 일반쓰레기로 버리지 말고 퇴비화할 수 있어요.', pickup: '로데오거리 상인회 사무실(중앙 광장 2층)에서 수령' },
    { id: 'G-03', type: 'goods', name: '고체 샴푸바', brand: '비움 기본 굿즈', price: 2800, desc: '60g, 플라스틱 용기 없이 종이 포장. 약 40회 사용 분량이에요.', pickup: '로데오거리 상인회 사무실(중앙 광장 2층)에서 수령' },
    { id: 'G-04', type: 'goods', name: '접이식 장바구니', brand: '비움 기본 굿즈', price: 1500, desc: '접으면 손바닥 크기. 역전시장 장보기에 맞춘 넉넉한 20L 크기예요.', pickup: '역전시장 고객센터에서 수령' },
    { id: 'G-05', type: 'goods', name: '실리콘 빨대 세트', brand: '비움 기본 굿즈', price: 900, desc: '빨대 2개와 세척 솔, 파우치. 식기세척기 사용이 가능해요.', pickup: '로데오거리 상인회 사무실(중앙 광장 2층)에서 수령' },
    { id: 'G-06', type: 'goods', name: '업사이클 카드지갑', brand: '비움 기본 굿즈', price: 3900, desc: '수원역 폐현수막으로 만든 카드지갑. 무늬는 하나하나 달라요.', pickup: '로데오거리 상인회 사무실(중앙 광장 2층)에서 수령' },
    // 수원 굿즈 — 수원시 「수원굿즈 디자인인증제」 인증 상품(2026-04 1차 10종) 중심. 가격은 확정 전 추정치(공개 판매가 없음).
    { id: 'S-01', type: 'suwon', name: '수원이 열쇠고리', brand: '로컬러 · 수원시 캐릭터', price: 6000, desc: '우비 차림, 나뭇잎 우산 등 행궁동 로컬러가 만든 수원이 키링. 디자인은 랜덤이에요.', pickup: '행궁동 지구인의 놀이터(수원굿즈 거점 1호) 또는 수원역 관광안내소에서 수령' },
    { id: 'S-02', type: 'suwon', name: '수원담은 책갈피', brand: '이상공작소 · 수원굿즈 인증', price: 3000, desc: '수원화성 성곽선을 새긴 금속 책갈피. 수원굿즈 디자인인증 1호 상품 중 하나예요.', pickup: '행궁동 지구인의 놀이터(수원굿즈 거점 1호)에서 수령' },
    { id: 'S-03', type: 'suwon', name: '기와파우치', brand: '탐색 · 수원굿즈 인증', price: 10000, desc: '화홍문 기와장 모양을 본뜬 파우치. 카드와 이어폰이 들어가요.', pickup: '행궁동 지구인의 놀이터(수원굿즈 거점 1호)에서 수령' },
    { id: 'S-04', type: 'suwon', name: '커피 드립백 1개', brand: '정지영커피로스터즈 · 수원굿즈 인증', price: 1500, desc: '행궁본점 로스팅 원두 드립백. 비움 3회면 한 잔이에요.', pickup: '정지영커피로스터즈 행궁본점(신풍로 42)에서 수령' },
    { id: 'S-05', type: 'suwon', name: '수원화성 아토얼 수건', brand: '아토얼 · 수원굿즈 인증', price: 12000, desc: '수원화성 성곽 비율을 담은 면 수건. 세탁할수록 부드러워져요.', pickup: '행궁동 지구인의 놀이터(수원굿즈 거점 1호)에서 수령' },
    { id: 'S-06', type: 'suwon', name: '구름향기 모빌', brand: '스튜디오 수 · 수원굿즈 인증', price: 15000, desc: '수원화성을 담은 종이 모빌. 50회 비움의 기념품으로 좋아요.', pickup: '행궁동 지구인의 놀이터(수원굿즈 거점 1호)에서 수령' },
    // 로데오거리 쿠폰
    { id: 'C-01', type: 'coupon', name: '아메리카노 500원 할인', brand: '커피볶는집 매산로점', price: 300, desc: '아메리카노(HOT/ICE) 1잔 500원 할인. 다른 할인과 중복은 안 돼요.', expiry: '교환일로부터 30일', address: '매산로1가 11-3, 로데오거리 입구 바로 안쪽' },
    { id: 'C-02', type: 'coupon', name: '1,000원 할인', brand: '로데오분식', price: 600, desc: '5,000원 이상 주문 시 1,000원 할인. 포장 주문도 돼요.', expiry: '교환일로부터 30일', address: '로데오 중앙 광장 서쪽 골목' },
    { id: 'C-03', type: 'coupon', name: '도서 10% 할인', brand: '역전책방', price: 400, desc: '1만 원 이상 도서 구매 시 10% 할인. 잡지·문구는 제외예요.', expiry: '교환일로부터 30일', address: '역전시장 삼거리 2층' },
    { id: 'C-04', type: 'coupon', name: '2,000원 할인', brand: '수원왕돈까스', price: 1000, desc: '돈까스 정식 주문 시 2,000원 할인. 1인 1매까지 쓸 수 있어요.', expiry: '교환일로부터 30일', address: 'CGV 앞 보행로 맞은편' },
    { id: 'C-05', type: 'coupon', name: '빙수 1,500원 할인', brand: '달빛빙수', price: 800, desc: '빙수 전 메뉴 1,500원 할인. 겨울에는 따뜻한 단팥죽에도 적용돼요.', expiry: '교환일로부터 30일', address: '로데오거리 남측 끝 코너' },
    { id: 'C-06', type: 'coupon', name: '문구 10% 할인', brand: '로데오문구', price: 300, desc: '전 품목 10% 할인. 5,000원 이상 구매 시 적용돼요.', expiry: '교환일로부터 30일', address: '매산로 버스정류장 뒤편 1층' }
  ];

  // 거래 20건. dayOffset은 "오늘"에서 며칠 전인지.
  var TX_SEED = [
    { dayOffset: 10, time: '09:12', type: 'topup', amount: 5000, method: '카카오페이' },
    { dayOffset: 10, time: '18:05', type: 'pay', amount: 300, bin: 'RD-02', kind: 'recycle' },
    { dayOffset: 10, time: '18:05', type: 'refund', points: 300, bin: 'RD-02' },
    { dayOffset: 9, time: '13:40', type: 'pay', amount: 300, bin: 'RD-04', kind: 'general' },
    { dayOffset: 9, time: '13:40', type: 'refund', points: 300, bin: 'RD-04' },
    { dayOffset: 7, time: '08:50', type: 'pay', amount: 300, bin: 'RD-01', kind: 'general' },
    { dayOffset: 7, time: '08:50', type: 'refund', points: 300, bin: 'RD-01' },
    { dayOffset: 7, time: '19:22', type: 'pay', amount: 300, bin: 'RD-05', kind: 'general' },
    { dayOffset: 7, time: '19:22', type: 'refund', points: 300, bin: 'RD-05' },
    { dayOffset: 6, time: '12:10', type: 'exchange', points: 900, product: 'G-05' },
    { dayOffset: 5, time: '17:48', type: 'pay', amount: 300, bin: 'RD-04', kind: 'recycle' },
    { dayOffset: 5, time: '17:48', type: 'refund', points: 300, bin: 'RD-04' },
    { dayOffset: 4, time: '18:30', type: 'pay', amount: 300, bin: 'RD-06', kind: 'recycle' },
    { dayOffset: 4, time: '18:30', type: 'refund', points: 300, bin: 'RD-06' },
    { dayOffset: 4, time: '18:41', type: 'exchange', points: 600, product: 'C-02' },
    { dayOffset: 3, time: '14:05', type: 'pay', amount: 300, bin: 'RD-03', kind: 'general' },
    { dayOffset: 3, time: '14:05', type: 'refund', points: 300, bin: 'RD-03' },
    { dayOffset: 2, time: '11:20', type: 'topup', amount: 3000, method: '토스' },
    { dayOffset: 1, time: '18:10', type: 'pay', amount: 300, bin: 'RD-01', kind: 'general' },
    { dayOffset: 1, time: '18:10', type: 'refund', points: 300, bin: 'RD-01' }
  ];

  // 시간대별 투입 건수(0시~23시). 수거 종료(13시) 이후~배출 시작(20시) 사이가 가장 높음.
  var HOURLY = [2, 1, 0, 0, 0, 1, 3, 6, 14, 11, 9, 12, 18, 31, 36, 34, 40, 47, 52, 44, 28, 17, 9, 4];

  var CAMPAIGN = { month: 11, count: 1284, goal: 3000 };

  var DEFAULTS = {
    nickname: '태희',
    joinedAt: '2026-09-14',
    wallet: 4700,
    points: 6420,
    notify: true
  };

  var SCAN_FEE = 300;
  var SCAN_REFUND = 300;
  var OPEN_SECONDS = 30;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  // 오늘 기준으로 거래 날짜를 확정하고 id를 붙인다.
  function buildTransactions(today) {
    var base = today || new Date();
    return TX_SEED.map(function (t, i) {
      var d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - t.dayOffset);
      var tx = {};
      for (var k in t) if (t.hasOwnProperty(k) && k !== 'dayOffset') tx[k] = t[k];
      tx.id = 'T' + (1000 + i);
      tx.date = isoDate(d);
      return tx;
    });
  }

  // 교환함 초기값: 거래 내역의 exchange에서 생성
  function buildExchanges(transactions) {
    return transactions.filter(function (t) { return t.type === 'exchange'; }).map(function (t, i) {
      return {
        id: 'X' + (200 + i),
        product: t.product,
        date: t.date,
        time: t.time,
        code: '8809 ' + (4120 + i * 37) + ' ' + (7731 + i * 11),
        used: false
      };
    });
  }

  global.BIUM_DATA = {
    BINS: BINS,
    PRODUCTS: PRODUCTS,
    HOURLY: HOURLY,
    CAMPAIGN: CAMPAIGN,
    DEFAULTS: DEFAULTS,
    SCAN_FEE: SCAN_FEE,
    SCAN_REFUND: SCAN_REFUND,
    OPEN_SECONDS: OPEN_SECONDS,
    buildTransactions: buildTransactions,
    buildExchanges: buildExchanges,
    isoDate: isoDate,
    pad: pad
  };
})(window);
