import {
  BRANCHES,
  ELEMENTS,
  NAPEUM_30,
  SINSAL12_NAMES,
  SOLAR_TERMS_12,
  STAGE12_NAMES,
  STAGE12_START,
  STEMS,
  WOLRYEONG_SCHEDULE,
} from './sajuData';
import type {
  BirthPlace,
  BranchMatrixRow,
  CalendarType,
  DaewoonItem,
  Gender,
  GeokgukInfo,
  KasiCalendarInfo,
  NapeumInfo,
  PillarData,
  PillarSpecialStar,
  RelationItem,
  SajuPromptPayload,
  SajuResult,
  SewoonItem,
  SijinInfo,
  SinsalItem,
  StructureDiagnostic,
  TimeCorrectionMode,
  TransitAssessment,
  TransitInteraction,
  WolwoonItem,
  YongshinProfile,
  YongshinRoleItem,
} from '../types/saju';

export const mod = (n: number, m: number): number => ((n % m) + m) % m;

export function toJulianDate(year: number, month: number, day: number, hourUTC = 0): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    hourUTC / 24 +
    B -
    1524.5
  );
}

export function formatJDInOffset(jd: number, offsetHours: number): string {
  const unixMs = (jd - 2440587.5) * 86400000 + offsetHours * 3600000;
  const dt = new Date(unixMs);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  const hh = String(dt.getUTCHours()).padStart(2, '0');
  const mm = String(dt.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

export function getSolarLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const L0 = mod(280.46646 + 36000.76983 * T + 0.0003032 * T * T, 360);
  const M = mod(357.52911 + 35999.05029 * T - 0.0001537 * T * T, 360);
  const Mrad = (M * Math.PI) / 180;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad);
  const omega = ((125.04 - 1934.136 * T) * Math.PI) / 180;
  return mod(L0 + C - 0.00569 - 0.00478 * Math.sin(omega), 360);
}

export function findSolarTermJD(approxJD: number, targetDeg: number): number {
  let jd = approxJD;
  for (let i = 0; i < 10; i++) {
    const lon = getSolarLongitude(jd);
    const diff = mod(targetDeg - lon + 540, 360) - 180;
    jd += diff / 0.98564736;
    if (Math.abs(diff) < 1e-6) break;
  }
  return jd;
}

export function getTimezoneOffsetHours(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 12
): number {
  try {
    const probe = new Date(Date.UTC(year, month - 1, day, hour, 0));
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(probe);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    const localAsUTC = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour'),
      get('minute')
    );
    return (localAsUTC - probe.getTime()) / 3600000;
  } catch {
    return 9;
  }
}

export function getEquationOfTimeMinutes(year: number, month: number, day: number): number {
  const start = Date.UTC(year, 0, 0);
  const current = Date.UTC(year, month - 1, day);
  const dayOfYear = Math.floor((current - start) / 86400000);
  const B = (2 * Math.PI * (dayOfYear - 81)) / 365;
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

export function getTenGod(dayStemIdx: number, targetStemIdx: number): string {
  const day = STEMS[dayStemIdx];
  const tgt = STEMS[targetStemIdx];
  const diff = mod(tgt.el - day.el, 5);
  const samePol = day.pol === tgt.pol;
  return [
    samePol ? '비견' : '겁재',
    samePol ? '식신' : '상관',
    samePol ? '편재' : '정재',
    samePol ? '편관' : '정관',
    samePol ? '편인' : '정인',
  ][diff];
}

export function getElementTenGodGroup(dayEl: number, targetEl: number): string {
  const diff = mod(targetEl - dayEl, 5);
  return ['비겁(비견·겁재)', '식상(식신·상관)', '재성(편재·정재)', '관성(편관·정관)', '인성(편인·정인)'][
    diff
  ];
}

export function getStage12(stemIdx: number, branchIdx: number): string {
  const rule = STAGE12_START[stemIdx];
  const offset =
    rule.dir === 1 ? mod(branchIdx - rule.br, 12) : mod(rule.br - branchIdx, 12);
  return STAGE12_NAMES[offset];
}

export function getGongmang(stemIdx: number, branchIdx: number): [number, number] {
  const xunStart = mod(branchIdx - stemIdx, 12);
  return [mod(xunStart - 2, 12), mod(xunStart - 1, 12)];
}

export function getNapeum(stemIdx: number, branchIdx: number): NapeumInfo {
  const jiazi60 = mod(6 * stemIdx - 5 * branchIdx, 60);
  return NAPEUM_30[Math.floor(jiazi60 / 2)];
}

export function getCheoneulBranches(dayStemIdx: number): number[] {
  const map: Record<number, number[]> = {
    0: [7, 1], // 甲: 未 丑
    1: [8, 0], // 乙: 申 子
    2: [11, 9], // 丙: 亥 酉
    3: [11, 9], // 丁: 亥 酉
    4: [7, 1], // 戊: 未 丑
    5: [8, 0], // 己: 申 子
    6: [7, 1], // 庚: 未 丑
    7: [2, 6], // 辛: 寅 午
    8: [3, 5], // 壬: 卯 巳
    9: [3, 5], // 癸: 卯 巳
  };
  return map[dayStemIdx] ?? [];
}

/**
 * 삼합 국별 12신살 계산 (기준 지지 -> 대상 지지)
 */
export function getSingleSinsal12(baseBranch: number, targetBranch: number): string {
  let geopsalStart = 11; // 인오술 -> 해(11)
  if ([8, 0, 4].includes(baseBranch)) geopsalStart = 5; // 신자진 -> 사(5)
  else if ([5, 9, 1].includes(baseBranch)) geopsalStart = 2; // 사유축 -> 인(2)
  else if ([11, 3, 7].includes(baseBranch)) geopsalStart = 8; // 해묘미 -> 신(8)
  return SINSAL12_NAMES[mod(targetBranch - geopsalStart, 12)];
}

/**
 * 년지 + 일지 기준 12신살 (전통 2기준)
 */
export function getCombinedSinsal12(
  yearBranch: number,
  dayBranch: number,
  targetBranch: number
): string[] {
  const byYear = getSingleSinsal12(yearBranch, targetBranch);
  const byDay = getSingleSinsal12(dayBranch, targetBranch);
  return byYear === byDay ? [byYear] : [byYear, byDay];
}

/**
 * 년지 + 일지 + 월지 기준 12신살 (만세력 표준 3기준, 중복 제거)
 */
export function getCombinedSinsal12All(
  yearBranch: number,
  dayBranch: number,
  monthBranch: number,
  targetBranch: number
): string[] {
  const list: string[] = [];
  for (const base of [yearBranch, dayBranch, monthBranch]) {
    const name = getSingleSinsal12(base, targetBranch);
    if (!list.includes(name)) list.push(name);
  }
  return list;
}

/**
 * 절입 경과일 기준 월령(지장간 당령 천간) 산출
 */
export function getWolryeong(
  monthBranch: number,
  elapsedDays: number
): {
  stem: (typeof STEMS)[number];
  elapsedDays: number;
} {
  const sched = WOLRYEONG_SCHEDULE[monthBranch] || [];
  let acc = 0;
  let activeStemIdx = BRANCHES[monthBranch].mainStem;
  for (const seg of sched) {
    acc += seg.days;
    if (elapsedDays <= acc) {
      activeStemIdx = seg.stem;
      break;
    }
  }
  return {
    stem: STEMS[activeStemIdx],
    elapsedDays: Number(Math.max(0, elapsedDays).toFixed(1)),
  };
}

export function mapTenGodGroup(
  tg?: string
): '비겁' | '식상' | '재성' | '관성' | '인성' | null {
  if (!tg) return null;
  if (tg === '비견' || tg === '겁재') return '비겁';
  if (tg === '식신' || tg === '상관') return '식상';
  if (tg === '편재' || tg === '정재') return '재성';
  if (tg === '편관' || tg === '정관') return '관성';
  if (tg === '편인' || tg === '정인') return '인성';
  return null;
}

// ============================================================================
// 공통 합·충·형·파·해·원진 기준 테이블
// ============================================================================
const STEM_COMBOS: Array<[number, number, string, string]> = [
  [0, 5, '갑기합토(甲己合土)', '중정지합 — 신뢰와 포용으로 실리를 묶는 조화'],
  [1, 6, '을경합금(乙庚合金)', '인의지합 — 유연함과 결단력이 결합해 성과를 이루는 합'],
  [2, 7, '병신합수(丙辛合水)', '위제지합 — 열정과 섬세함이 만나 지혜로 승화되는 합'],
  [3, 8, '정임합목(丁壬合木)', '인수지합 — 깊은 감성과 넓은 시야가 어우러지는 합'],
  [4, 9, '무계합화(戊癸合火)', '무정지합 — 묵직한 현실감과 기지가 만나 새로운 활력을 빚는 합'],
];

const STEM_CLASHES: Array<[number, number, string, string]> = [
  [0, 6, '갑경충(甲庚沖)', '목·금 정면 대립 — 결단과 개혁의 강한 추진력 및 충돌'],
  [1, 7, '을신충(乙辛沖)', '유연함과 예리함의 긴장 — 섬세한 조율과 환경 변화'],
  [2, 8, '병임충(丙壬沖)', '태양과 큰 물의 교차 — 역동적 에너지와 급격한 변수'],
  [3, 9, '정계충(丁癸沖)', '내면 불꽃과 지혜의 긴장 — 예민한 통찰과 심리 변화'],
];

const SIJIN_RANGES: Array<{ solarRange: string; kstRange: string }> = [
  { solarRange: '23:00~01:00', kstRange: '23:30~01:30' }, // 子
  { solarRange: '01:00~03:00', kstRange: '01:30~03:30' }, // 丑
  { solarRange: '03:00~05:00', kstRange: '03:30~05:30' }, // 寅
  { solarRange: '05:00~07:00', kstRange: '05:30~07:30' }, // 卯
  { solarRange: '07:00~09:00', kstRange: '07:30~09:30' }, // 辰
  { solarRange: '09:00~11:00', kstRange: '09:30~11:30' }, // 巳
  { solarRange: '11:00~13:00', kstRange: '11:30~13:30' }, // 午
  { solarRange: '13:00~15:00', kstRange: '13:30~15:30' }, // 未
  { solarRange: '15:00~17:00', kstRange: '15:30~17:30' }, // 申
  { solarRange: '17:00~19:00', kstRange: '17:30~19:30' }, // 酉
  { solarRange: '19:00~21:00', kstRange: '19:30~21:30' }, // 戌
  { solarRange: '21:00~23:00', kstRange: '21:30~23:30' }, // 亥
];

export function getSijinInfo(branchIdx: number): SijinInfo {
  const br = BRANCHES[mod(branchIdx, 12)];
  const range = SIJIN_RANGES[mod(branchIdx, 12)];
  return {
    branchIdx: br.idx,
    name: `${br.kor}시`,
    hanja: `${br.hanja}時`,
    solarRange: range.solarRange,
    kstRange: range.kstRange,
  };
}

const STEM_CONFLICTS_KE: Array<[number, number, string, string]> = [
  [0, 4, '갑무충(甲戊沖)', '목극토 천간 상극·충 — 주체성과 현실 목표·재물 사이의 강한 긴장과 추진력'],
  [1, 5, '을기충(乙己沖)', '음목극음토 천간 상극·충 — 실무·재물 관리에서 세밀한 조율이 필요한 작용'],
  [2, 6, '병경충(丙庚沖)', '화극금 천간 상극·충 — 표현력과 규율·권위 사이의 역동적 마찰'],
  [3, 7, '정신충(丁辛沖)', '음화극음금 천간 상극·충 — 예민한 감성과 완벽주의가 부딪히는 작용'],
  [4, 8, '무임충(戊壬沖)', '토극수 천간 상극·충 — 현실 통제력과 확장 욕구 사이의 제동 작용'],
  [5, 9, '기계충(己癸沖)', '음토극음수 천간 상극·충 — 실리적 판단과 직관·사색 사이의 긴장'],
];

const BRANCH_SIX_COMBOS: Array<[number, number, string, string]> = [
  [0, 1, '자축합(子丑合)', '안정적으로 결속하여 기반을 굳히는 육합'],
  [2, 11, '인해합(寅亥合)', '생기 있는 목(木) 기운으로 성장 동력을 키우는 육합'],
  [3, 10, '묘술합(卯戌合)', '강하게 얽히며 열정·협력 또는 간섭이 동반되는 육합'],
  [4, 9, '진유합(辰酉合)', '결실과 실무 완성도를 높여주는 육합'],
  [5, 8, '사신합(巳申合)', '변화 속에서 기민하게 조율하는 합(형·파 동반 주의)'],
  [6, 7, '오미합(午未合)', '따뜻한 유대와 결집력을 높여주는 육합'],
];

const BRANCH_TRIADS: Array<{ arr: [number, number, number]; name: string; el: number }> = [
  { arr: [8, 0, 4], name: '신자진(申子辰) 수국', el: 4 },
  { arr: [11, 3, 7], name: '해묘미(亥卯未) 목국', el: 0 },
  { arr: [2, 6, 10], name: '인오술(寅午戌) 화국', el: 1 },
  { arr: [5, 9, 1], name: '사유축(巳酉丑) 금국', el: 3 },
];

const BRANCH_BANGHAPS: Array<{ arr: [number, number, number]; name: string; el: number }> = [
  { arr: [2, 3, 4], name: '인묘진(寅卯辰) 동방 목국', el: 0 },
  { arr: [5, 6, 7], name: '사오미(巳午未) 남방 화국', el: 1 },
  { arr: [8, 9, 10], name: '신유술(申酉戌) 서방 금국', el: 3 },
  { arr: [11, 0, 1], name: '해자축(亥子丑) 북방 수국', el: 4 },
];

const BRANCH_CLASHES: Array<[number, number, string, string]> = [
  [0, 6, '자오충(子午沖)', '수·화 정면 충돌 — 감정 기복·변동수·컨디션 저하 주의'],
  [1, 7, '축미충(丑未沖)', '토의 개고(開庫) — 기반 재정비와 새로운 전환의 계기'],
  [2, 8, '인신충(寅申沖)', '역마성 충돌(금목상쟁) — 이동·환경 격변·안전사고 주의'],
  [3, 9, '묘유충(卯酉沖)', '도화성 충돌 — 관계 재편·예민함·수술/건강 점검'],
  [4, 10, '진술충(辰戌沖)', '고지(庫地) 충돌 — 재물 창고 흔들림·독자 노선 개척'],
  [5, 11, '사해충(巳亥沖)', '역마·수화 충돌 — 분주한 대외 활동과 빠른 사고 전환'],
];

const BRANCH_HYEONG_GROUPS: Array<{
  arr: [number, number, number];
  name: string;
  detail: string;
}> = [
  {
    arr: [2, 5, 8],
    name: '인사신(寅巳申) 삼형',
    detail: '무은지형 — 강한 추진력과 전문성 속에 갈등·변동을 조율해야 하는 작용',
  },
  {
    arr: [1, 10, 7],
    name: '축술미(丑戌未) 삼형',
    detail: '지세지형 — 신념과 고집이 강해지며 실무·관계 내 조정력이 요구되는 작용',
  },
];

const BRANCH_PA_PAIRS: Array<[number, number, string]> = [
  [0, 9, '자유파(子酉破)'],
  [3, 6, '묘오파(卯午破)'],
  [4, 1, '진축파(辰丑破)'],
  [10, 7, '술미파(戌未破)'],
  [2, 11, '인해파(寅亥破)'],
  [5, 8, '사신파(巳申破)'],
];

const BRANCH_HAE_PAIRS: Array<[number, number, string]> = [
  [0, 7, '자미해(子未害)'],
  [1, 6, '축오해(丑午害)'],
  [2, 5, '인사해(寅巳害)'],
  [3, 4, '묘진해(卯辰害)'],
  [8, 11, '신해해(申亥害)'],
  [9, 10, '유술해(酉戌害)'],
];

const BRANCH_WONJIN_PAIRS: Array<[number, number, string]> = [
  [0, 7, '자미원진(子未怨嗔)'],
  [1, 6, '축오원진(丑午怨嗔)'],
  [2, 9, '인유원진(寅酉怨嗔)'],
  [3, 8, '묘신원진(卯申怨嗔)'],
  [4, 11, '진해원진(辰亥怨嗔)'],
  [5, 10, '사술원진(巳戌怨嗔)'],
];

// ============================================================================
// 격국(格局) 판별 엔진
// ============================================================================
function analyzeGeokguk(
  pillars: PillarData[],
  dayStem: number,
  monthBranch: number
): GeokgukInfo {
  const yanginMap: Record<number, number> = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 };
  const geonrokMap: Record<number, number> = {
    0: 2,
    1: 3,
    2: 5,
    3: 6,
    4: 5,
    5: 6,
    6: 8,
    7: 9,
    8: 11,
    9: 0,
  };

  const mb = BRANCHES[monthBranch];
  const exposedStems = pillars
    .filter((p) => !p.empty && p.key !== 'day' && p.stem !== null)
    .map((p) => ({ key: p.key, label: p.label, stem: p.stem as number }));

  // 1) 양인격 (양간이 월지에 양인을 둔 경우)
  if (yanginMap[dayStem] === monthBranch) {
    return {
      name: '양인격',
      hanja: '羊刃格',
      category: '외격(특수)',
      basis: `월지 ${mb.kor}(${mb.hanja})가 일간 ${STEMS[dayStem].kor}(${STEMS[dayStem].hanja})의 양인(제왕 겁재)에 해당`,
      summary:
        '극도로 강한 주체성·결단력·승부욕을 지닌 특수 격국입니다. 관성(제어)이나 식상(표출·통관)이 뚜렷하게 쓰일 때 독보적인 전문성과 리더십으로 대성합니다.',
    };
  }

  // 2) 건록격 (월지가 일간의 건록인 경우)
  if (geonrokMap[dayStem] === monthBranch) {
    return {
      name: '건록격',
      hanja: '建祿格',
      category: '외격(특수)',
      basis: `월지 ${mb.kor}(${mb.hanja})가 일간 ${STEMS[dayStem].kor}(${STEMS[dayStem].hanja})의 건록(비견)에 해당`,
      summary:
        '자수성가와 독립심이 강한 격국입니다. 스스로 기반을 일구는 힘이 탁월하며, 식상·재성·관성이 조화롭게 받쳐줄 때 안정적이고 큰 성취를 이룹니다.',
    };
  }

  // 3) 8정격 (월지 지장간 중 정기 -> 중기 -> 여기 순으로 천간 투간 여부 확인, 미투간 시 월지 본기 기준)
  const hiddenOrdered = [...mb.hidden].reverse(); // [정기, 중기?, 여기]
  let selectedStem = mb.mainStem;
  let basisDetail = `월지 ${mb.kor}(${mb.hanja}) 본기 ${STEMS[mb.mainStem].kor}(${STEMS[mb.mainStem].hanja}) 기준`;

  for (const hStem of hiddenOrdered) {
    const tg = getTenGod(dayStem, hStem);
    if (tg === '비견' || tg === '겁재') continue;
    const hit = exposedStems.find((es) => es.stem === hStem);
    if (hit) {
      selectedStem = hStem;
      basisDetail = `월지 ${mb.kor}(${mb.hanja}) 지장간 ${STEMS[hStem].kor}(${STEMS[hStem].hanja})이 ${hit.label} 천간에 투간`;
      break;
    }
  }

  const tgName = getTenGod(dayStem, selectedStem);
  const geokMap: Record<string, { name: string; hanja: string; summary: string }> = {
    정관: {
      name: '정관격',
      hanja: '正官格',
      summary:
        '원칙·책임감·사회적 신뢰를 중시하는 정통 관료·관리자형 격국으로, 체계적인 조직과 명예가 따르는 분야에서 안정적으로 성장합니다.',
    },
    편관: {
      name: '편관격(칠살격)',
      hanja: '偏官格',
      summary:
        '강한 카리스마와 위기 돌파력을 지닌 격국으로, 인성(살인상생)이나 식신(식신제살)이 조화를 이룰 때 권위와 큰 성취를 거머쥡니다.',
    },
    정재: {
      name: '정재격',
      hanja: '正財格',
      summary:
        '현실 감각과 성실한 자산 축적 능력이 뛰어난 격국으로, 리스크를 통제하며 안정적인 현금흐름과 실속을 쌓는 데 강점이 있습니다.',
    },
    편재: {
      name: '편재격',
      hanja: '偏財格',
      summary:
        '넓은 시야와 사업 감각, 빠른 실행력이 돋보이는 격국으로, 유통·투자·프로젝트·사업 등 큰 자금 흐름을 다루는 무대에 적합합니다.',
    },
    식신: {
      name: '식신격',
      hanja: '食神格',
      summary:
        '깊은 전문 기술, 연구·기획력, 꾸준한 생산성을 바탕으로 의식주 복과 지속 가능한 수익을 만들어내는 격국입니다.',
    },
    상관: {
      name: '상관격',
      hanja: '傷官格',
      summary:
        '기존 틀을 깨는 독창적 표현력, 언변, 예술·미디어·기획 감각이 탁월한 격국으로, 자유로운 전문 영역에서 빛을 발합니다.',
    },
    정인: {
      name: '정인격',
      hanja: '正印格',
      summary:
        '학문·문서·자격·지혜가 바탕이 되는 격국으로, 교육·연구·기획·전문 자격 분야에서 깊은 신뢰와 명망을 얻습니다.',
    },
    편인: {
      name: '편인격',
      hanja: '偏印格',
      summary:
        '독특한 통찰력, 직관, 특수 기술과 전략적 사고가 뛰어난 격국으로, IT·철학·기획·예술 등 비정형 전문 분야에서 두각을 나타냅니다.',
    },
    비견: {
      name: '건록격(월겁)',
      hanja: '建祿格',
      summary:
        '강한 자립심과 추진력으로 스스로 영역을 개척하는 격국입니다.',
    },
    겁재: {
      name: '월겁격',
      hanja: '月劫格',
      summary:
        '승부욕과 돌파력이 강하며 경쟁 속에서 자기 몫을 쟁취하는 에너지가 큰 격국입니다.',
    },
  };

  const matched = geokMap[tgName] ?? geokMap.정관;
  return {
    name: matched.name,
    hanja: matched.hanja,
    category: '정격(내격)',
    basis: basisDetail,
    summary: matched.summary,
  };
}

// ============================================================================
// 용신·희신·기신·구신 4분류 정밀 판별 엔진
// ============================================================================
function analyzeYongshinProfile(
  dayStem: number,
  monthBranch: number,
  elCount: number[],
  elWeight: number[],
  strengthRatio: number,
  tenGodGroups: Record<'비겁' | '식상' | '재성' | '관성' | '인성', number>
): YongshinProfile {
  const dayEl = STEMS[dayStem].el;
  const outputEl = mod(dayEl + 1, 5); // 식상
  const wealthEl = mod(dayEl + 2, 5); // 재성
  const officerEl = mod(dayEl + 3, 5); // 관성
  const resourceEl = mod(dayEl + 4, 5); // 인성

  const mk = (el: number, reason: string): YongshinRoleItem => ({
    el,
    tenGodGroup: getElementTenGodGroup(dayEl, el),
    reason,
  });

  // Case 1: 신강 / 극신강 (자아·인성 세력 >= 56%)
  if (strengthRatio >= 56) {
    // 1-A) 군비쟁재(비겁 >= 3 && 재성 >= 2) 또는 무관 신강 -> 식상 통관 1순위!
    if (tenGodGroups.비겁 >= 3 && tenGodGroups.재성 >= 2) {
      const hasOutput = elCount[outputEl] > 0;
      return {
        method: '통관(通關)',
        yongshin: [
          mk(
            outputEl,
            hasOutput
              ? `과다한 비겁(${ELEMENTS[dayEl].kor})의 기운을 설기해 재성(${ELEMENTS[wealthEl].kor})으로 연결하는 핵심 통관(생재) 생명줄입니다.`
              : `강한 비겁과 재성의 충돌(군비쟁재)을 중재해 재능을 성과로 바꾸는 최우선 통관 오행입니다.`
          ),
        ],
        heeshin: [
          mk(
            wealthEl,
            `용신 ${ELEMENTS[outputEl].kor}(식상)이 함께할 때 실질적 현금흐름과 안정적 결실로 이어집니다.`
          ),
          mk(
            officerEl,
            `천간에서 과도한 겁재를 제어하고 규율·직위를 세워주는 보조 길신입니다(단, 지지 대충은 경계).`
          ),
        ],
        gishin: [
          mk(
            dayEl,
            `비겁이 더욱 강해지면 군비쟁재(경쟁자 손재·고집·관계 충돌)가 심화됩니다.`
          ),
          mk(
            resourceEl,
            `인성이 강하게 들어오면 핵심 생명줄인 ${ELEMENTS[outputEl].kor}(식상)을 극하는 도식(倒食) 및 고립감이 발생하기 쉽습니다.`
          ),
        ],
        gushin: [
          mk(
            resourceEl,
            `기신인 비겁(${ELEMENTS[dayEl].kor})을 생조하여 편중을 가중시키는 구신 작용을 동반합니다.`
          ),
        ],
        rationale: `강한 비겁(${ELEMENTS[dayEl].kor} ${elCount[dayEl]}자)이 재성(${ELEMENTS[wealthEl].kor} ${elCount[wealthEl]}자)을 압박하는 군비쟁재 구조이므로, ${ELEMENTS[outputEl].kor}(식상)으로 기운을 소통시켜 재물로 전환하는 통관(通關) 용신이 최우선입니다.`,
      };
    }

    // 1-B) 인성 과다 신강 -> 재성으로 인성 제어(재극인) + 식상 설기
    if (tenGodGroups.인성 >= 3) {
      return {
        method: '억부(抑扶)',
        yongshin: [
          mk(
            wealthEl,
            `과다한 인성(${ELEMENTS[resourceEl].kor})을 적절히 제어(재극인)하고 현실 실행력을 살리는 핵심 용신입니다.`
          ),
        ],
        heeshin: [
          mk(
            outputEl,
            `뭉친 자아 에너지를 결과물과 표현력으로 자연스럽게 풀어내는 희신입니다.`
          ),
        ],
        gishin: [
          mk(
            resourceEl,
            `생각과 망설임이 과해지고 실행력·재물 흐름이 막히기 쉽습니다.`
          ),
        ],
        gushin: [
          mk(
            officerEl,
            `관성이 과다한 인성을 생조(관인 편중)해 균형을 무너뜨릴 수 있습니다.`
          ),
        ],
        rationale: `인성(${ELEMENTS[resourceEl].kor})과 비겁이 강한 신강 구조이므로, 재성(${ELEMENTS[wealthEl].kor})으로 인성의 과잉을 제어하고 식상(${ELEMENTS[outputEl].kor})으로 실행력을 열어주는 억부 용신을 취합니다.`,
      };
    }

    // 1-C) 일반 신강 -> 관성·식상·재성 중 원국 보완 우선순위
    const primaryEl = elCount[officerEl] > 0 ? officerEl : outputEl;
    const secondaryEl = primaryEl === officerEl ? wealthEl : wealthEl;
    const thirdEl = primaryEl === officerEl ? outputEl : officerEl;
    return {
      method: '억부(抑扶)',
      yongshin: [
        mk(
          primaryEl,
          `강한 일간(${ELEMENTS[dayEl].kor})의 에너지를 사회적 성취와 결과물로 다듬어 주는 핵심 용신입니다.`
        ),
      ],
      heeshin: [
        mk(secondaryEl, `용신을 생조하며 현실적 보상과 기반을 넓히는 희신입니다.`),
        mk(thirdEl, `에너지 순환을 돕는 보조 길신입니다.`),
      ],
      gishin: [
        mk(dayEl, `자아 과잉과 고집·경쟁 마찰을 키우는 기신입니다.`),
      ],
      gushin: [
        mk(resourceEl, `강한 일간을 과도하게 생조해 편중을 키우는 구신입니다.`),
      ],
      rationale: `월지 가중치 기준 자아 세력이 ${strengthRatio}%로 강하므로, 강한 기운을 제어·표출하는 ${ELEMENTS[primaryEl].kor}을 용신, ${ELEMENTS[secondaryEl].kor}을 희신으로 삼습니다.`,
    };
  }

  // Case 2: 신약 / 극신약 (자아·인성 세력 <= 42%)
  if (strengthRatio <= 42) {
    // 2-A) 관살(관성) 과다 신약 -> 인성 통관 (살인상생)
    if (tenGodGroups.관성 >= 3) {
      return {
        method: '통관(通關)',
        yongshin: [
          mk(
            resourceEl,
            `강한 관살(${ELEMENTS[officerEl].kor})의 압박을 받아들여 일간을 생하는 살인상생(殺印相生) 핵심 통관 용신입니다.`
          ),
        ],
        heeshin: [
          mk(dayEl, `일간의 주체성과 버티는 힘을 직접 보강하는 희신입니다.`),
        ],
        gishin: [
          mk(wealthEl, `재성이 인성을 극하고 관살을 키워 부담을 가중시키는 기신입니다.`),
        ],
        gushin: [
          mk(officerEl, `이미 강한 압박·책임 부담을 과중시키는 구신입니다.`),
        ],
        rationale: `관성(${ELEMENTS[officerEl].kor}) 압력이 강한 신약 구조이므로, 인성(${ELEMENTS[resourceEl].kor})으로 관살을 지혜와 자격으로 전환하는 살인상생 통관 용신이 핵심입니다.`,
      };
    }

    // 2-B) 재다신약 (재성 >= 3) -> 비겁 우선 + 인성 보조
    if (tenGodGroups.재성 >= 3) {
      return {
        method: '억부(抑扶)',
        yongshin: [
          mk(
            dayEl,
            `큰 재물(${ELEMENTS[wealthEl].kor})을 감당하고 지켜낼 수 있도록 일간의 힘을 키우는 비겁 용신입니다.`
          ),
        ],
        heeshin: [
          mk(resourceEl, `일간을 생조하며 전략·문서·체력을 보강하는 희신입니다.`),
        ],
        gishin: [
          mk(wealthEl, `감당하기 벅찬 지출·부채·과도한 목표가 일간을 소진시킵니다.`),
        ],
        gushin: [
          mk(outputEl, `약한 일간의 기운을 빼앗아 재성 부담을 키우는 구신입니다.`),
        ],
        rationale: `재성(${ELEMENTS[wealthEl].kor})이 강해 일간이 소진되는 재다신약 구조이므로, 비겁(${ELEMENTS[dayEl].kor})과 인성(${ELEMENTS[resourceEl].kor})으로 내실을 다져야 재물을 온전히 지킵니다.`,
      };
    }

    // 2-C) 식상 과다 신약 -> 인성 용신 + 비겁 희신
    return {
      method: '억부(抑扶)',
      yongshin: [
        mk(
          resourceEl,
          `소진되는 일간(${ELEMENTS[dayEl].kor})을 생조하고 과도한 발산을 수렴해 주는 인성 용신입니다.`
        ),
      ],
      heeshin: [
        mk(dayEl, `주체성과 실행 체력을 보강하는 비겁 희신입니다.`),
      ],
      gishin: [
        mk(outputEl, `에너지가 과도하게 빠져나가 피로·산만함을 부르는 기신입니다.`),
      ],
      gushin: [
        mk(wealthEl, `인성을 극하고 일간 부담을 키우는 구신입니다.`),
      ],
      rationale: `자아 세력이 ${strengthRatio}%로 약한 편이므로 인성(${ELEMENTS[resourceEl].kor})과 비겁(${ELEMENTS[dayEl].kor})으로 뿌리와 회복력을 채우는 억부 용신이 유리합니다.`,
    };
  }

  // Case 3: 중화 (43% ~ 55%) -> 조후(계절 온도 조절) 및 결핍 오행 보완
  const isColdSeason = [11, 0, 1].includes(monthBranch); // 해자축 겨울
  const isHotSeason = [5, 6, 7].includes(monthBranch); // 사오미 여름
  const minWeight = Math.min(...elWeight);
  const weakestEl = elWeight.findIndex((w) => w === minWeight);
  const maxWeight = Math.max(...elWeight);
  const strongestEl = elWeight.findIndex((w) => w === maxWeight);

  if (isColdSeason) {
    return {
      method: '조후(調候)',
      yongshin: [
        mk(1, `겨울철 차가운 원국에 온기와 활력·사회적 추진력을 불어넣는 조후 용신 화(火)입니다.`),
      ],
      heeshin: [
        mk(weakestEl === 1 ? 0 : weakestEl, `원국에서 가장 약한 오행을 보완해 순환을 돕는 희신입니다.`),
      ],
      gishin: [
        mk(4, `차가운 수(水) 기운이 과해지면 위축과 정체가 깊어집니다.`),
      ],
      gushin: [
        mk(3, `금생수로 냉기를 가중시킬 수 있는 구신입니다.`),
      ],
      rationale: `원국 강약은 중화(${strengthRatio}%)에 가까우나 겨울 월지(${BRANCHES[monthBranch].kor})의 한기를 녹이는 화(火) 조후 용신이 운을 크게 열어줍니다.`,
    };
  }

  if (isHotSeason) {
    return {
      method: '조후(調候)',
      yongshin: [
        mk(4, `여름철 뜨거운 열기를 식히고 냉철한 판단력과 지속력을 부여하는 조후 용신 수(水)입니다.`),
      ],
      heeshin: [
        mk(3, `수(水)의 수원을 열어주며 결실과 절제를 돕는 금(金) 희신입니다.`),
      ],
      gishin: [
        mk(1, `화(火) 열기가 과열되면 조급함과 체력 소진이 빨라집니다.`),
      ],
      gushin: [
        mk(0, `목생화로 열기를 돋우는 구신 작용을 주의해야 합니다.`),
      ],
      rationale: `원국 강약은 중화(${strengthRatio}%)권이나 여름 월지(${BRANCHES[monthBranch].kor})의 조열함을 식히는 수(水) 조후 용신이 핵심입니다.`,
    };
  }

  const helperEl = mod(weakestEl + 4, 5);
  return {
    method: '억부(抑扶)',
    yongshin: [
      mk(
        weakestEl,
        `원국 균형이 비교적 고른 가운데 가장 부족한 ${ELEMENTS[weakestEl].kor}(${ELEMENTS[weakestEl].hanja})을 보충하면 오행 순환이 완성됩니다.`
      ),
    ],
    heeshin: [
      mk(helperEl, `용신 ${ELEMENTS[weakestEl].kor}을 생조해 흐름을 부드럽게 잇는 희신입니다.`),
    ],
    gishin: [
      mk(
        strongestEl,
        `가장 비중이 높은 ${ELEMENTS[strongestEl].kor}이 과도해지면 균형이 한쪽으로 쏠립니다.`
      ),
    ],
    gushin: [
      mk(mod(strongestEl + 4, 5), `강한 ${ELEMENTS[strongestEl].kor}을 추가로 부추기는 구신입니다.`),
    ],
    rationale: `일간 강약이 중화(${strengthRatio}%) 범위이므로 가장 부족한 ${ELEMENTS[weakestEl].kor}(${ELEMENTS[weakestEl].hanja})을 보완해 순환을 여는 것이 가장 효과적입니다.`,
  };
}

// ============================================================================
// 원국 핵심 구조 패턴 자동 진단
// ============================================================================
function analyzeStructureDiagnostics(
  pillars: PillarData[],
  elCount: number[],
  strengthRatio: number,
  dayStem: number,
  dayBranch: number,
  relations: RelationItem[],
  yearGongmang: [number, number],
  dayGongmang: [number, number],
  tenGodGroups: Record<'비겁' | '식상' | '재성' | '관성' | '인성', number>
): StructureDiagnostic[] {
  const list: StructureDiagnostic[] = [];
  const dayEl = STEMS[dayStem].el;
  const outputEl = mod(dayEl + 1, 5);

  // 1) 군비쟁재
  if (tenGodGroups.비겁 >= 3 && tenGodGroups.재성 >= 2) {
    list.push({
      id: 'gunbi-jaengjae',
      title: '군비쟁재 구조',
      hanja: '群比爭財',
      tone: 'warn',
      detail:
        '비겁(주체성·경쟁자)과 재성(재물·현실 목표)이 동시에 강해, 돈이 모일 때 지인·동업·돌발 지출로 쪼개지기 쉽습니다. 철저한 개인 결과물 중심 수익화와 동업 금지가 핵심입니다.',
    });
  }

  // 2) 식신생재 / 상관생재
  if (tenGodGroups.식상 >= 1 && tenGodGroups.재성 >= 1) {
    const hasSiksin = pillars.some(
      (p) => !p.empty && (p.stemTenGod === '식신' || p.branchTenGod === '식신')
    );
    list.push({
      id: 'siksang-saengjae',
      title: hasSiksin ? '식신생재 통관 구조' : '상관생재 구조',
      hanja: hasSiksin ? '食神生財' : '傷官生財',
      tone: 'good',
      detail:
        '자신의 재능·표현력·콘텐츠·전문 기술(식상)을 통해 직접 재물(재성)을 만들어내는 생산형 구조입니다. 단순 노무보다 기획·제작·전문 결과물 수익화에서 가장 큰 성과가 납니다.',
    });
  }

  // 3) 관인상생 / 살인상생
  if (tenGodGroups.관성 >= 1 && tenGodGroups.인성 >= 1) {
    list.push({
      id: 'gwanin-sangsaeng',
      title: '관인상생 흐름',
      hanja: '官印相生',
      tone: 'good',
      detail:
        '사회적 책임과 직위(관성)가 문서·자격·지혜(인성)로 연결되어 조직 내 신뢰와 명예를 쌓기 유리한 안정 구조입니다.',
    });
  }

  // 4) 무관 / 무인성 / 무재 / 무식상 결핍 패턴
  if (tenGodGroups.관성 === 0) {
    list.push({
      id: 'mugwan',
      title: '무관 사주 (표면 관성 0)',
      hanja: '無官 四柱',
      tone: 'warn',
      detail:
        '겉글자에 관성(통제·규율·조직 상사)이 없어 자유롭고 독립적이나, 위계적 조직 적응이나 자기 제동 장치가 약해지기 쉽습니다. 스스로 규칙과 마감 시스템을 세우는 습관이 중요합니다.',
    });
  }
  if (tenGodGroups.인성 === 0) {
    list.push({
      id: 'muinsung',
      title: '무인성 사주 (표면 인성 0)',
      hanja: '無印星 四柱',
      tone: 'warn',
      detail:
        '겉글자에 인성(수용·문서 검토·휴식·인내)이 없어 직관적 실행력은 빠르나 계약서·세무 디테일을 놓치거나 브레이크 없이 달려 번아웃이 오기 쉽습니다.',
    });
  }
  if (tenGodGroups.재성 === 0) {
    list.push({
      id: 'mujae',
      title: '무재 사주 (표면 재성 0)',
      hanja: '無財 四柱',
      tone: 'neutral',
      detail:
        '겉글자에 재성이 드러나지 않아 돈보다 명예·가치·전문성에 집중하는 경향이 큽니다. 현실 정산과 자동 저축 구조를 시스템화하면 안정성이 크게 올라갑니다.',
    });
  }
  if (tenGodGroups.식상 === 0) {
    list.push({
      id: 'musiksang',
      title: '무식상 사주 (표면 식상 0)',
      hanja: '無食傷 四柱',
      tone: 'neutral',
      detail:
        '겉글자에 식상이 없어 속마음을 바로 표출하기보다 신중하게 쌓아두는 편입니다. 의도적인 글쓰기·발표·실행 루틴이 운의 순환을 트이게 합니다.',
    });
  }

  // 5) 조후 편중: 화토조열 / 수냉습탁
  if (elCount[4] === 0 && elCount[1] + elCount[2] >= 4) {
    list.push({
      id: 'hwato-joyeol',
      title: '화토조열 · 수분 결핍 경향',
      hanja: '火土燥熱',
      tone: 'warn',
      detail:
        '수(水) 오행이 0개이고 화·토 기운이 강해 사주가 건조·과열되기 쉽습니다. 수면 장애, 안구·피부 건조, 위장 과부하와 성급한 결정을 식혀줄 수분·휴식 루틴이 필수입니다.',
    });
  } else if (elCount[1] === 0 && elCount[4] + elCount[3] >= 4) {
    list.push({
      id: 'sunaeng',
      title: '한습(寒濕) · 화기 부족 경향',
      hanja: '寒濕偏重',
      tone: 'warn',
      detail:
        '화(火) 오행이 0개이고 수·금 기운이 강해 생각이 깊고 치밀하나, 심리적 위축·냉증·순환 저하가 오기 쉬워 온기와 활동적 교류가 개운의 열쇠입니다.',
    });
  }

  // 6) 일지(배우자궁) 동요 (충 + 합 / 공망)
  const dayP = pillars[1];
  const dayBrHanja = dayP.branchObj?.hanja ?? '';
  const dayHasClash = relations.some(
    (r) => r.category === '지지충' && r.title.includes(dayBrHanja)
  );
  const dayHasCombo = relations.some(
    (r) => r.category === '지지육합' && r.title.includes(dayBrHanja)
  );
  const dayInYearGm = yearGongmang.includes(dayBranch);
  if (dayHasClash && (dayHasCombo || dayInYearGm)) {
    list.push({
      id: 'spouse-palace-dynamic',
      title: '배우자궁(일지) 충·합·공망 중첩',
      hanja: '日支動搖',
      tone: 'warn',
      detail:
        '일지(안방·배우자 자리)가 원국에서 충과 합(또는 년공망)의 영향을 동시에 받아, 이른 정착보다 충분한 자기 기반 확립 후 독립적 존중을 전제로 한 만혼이 훨씬 안정적입니다.',
    });
  }

  // 7) 극신강 + 단일 식상 보호(도식 경계)
  if (strengthRatio >= 62 && elCount[outputEl] === 1 && elCount[mod(dayEl + 4, 5)] === 0) {
    list.push({
      id: 'single-output-lifeline',
      title: `단일 ${ELEMENTS[outputEl].kor}(식상) 생명줄 구조`,
      hanja: '一點食傷',
      tone: 'good',
      detail: `강한 원국 에너지를 바깥으로 표출해 주는 유일한 통로가 ${ELEMENTS[outputEl].kor}(식상) 한 글자입니다. 이 재능을 살리는 시기에 크게 열리며, 이를 극하는 인성(${ELEMENTS[mod(dayEl + 4, 5)].kor}) 대운·세운에서는 무리한 확장을 피해야 합니다.`,
    });
  }

  void dayGongmang;
  return list;
}

// ============================================================================
// 대운·세운·월운 × 원국 실시간 동적 상호작용 계산 엔진
// ============================================================================
export function analyzeTransitInteractions(
  transitStem: number,
  transitBranch: number,
  pillars: PillarData[],
  dayStem: number,
  yongshinProfile: YongshinProfile,
  cheoneulBranches: number[],
  yearGongmang: [number, number],
  dayGongmang: [number, number],
  extraContexts: Array<{ label: string; stem: number; branch: number }> = []
): TransitAssessment {
  const interactions: TransitInteraction[] = [];
  const activePillars = pillars.filter(
    (p) => !p.empty && p.stem !== null && p.branch !== null
  );

  const targets: Array<{ label: string; stem: number; branch: number }> = [
    ...activePillars.map((p) => ({
      label: p.label,
      stem: p.stem as number,
      branch: p.branch as number,
    })),
    ...extraContexts,
  ];

  const pushUnique = (item: TransitInteraction) => {
    if (
      !interactions.some(
        (x) => x.label === item.label && x.target === item.target
      )
    ) {
      interactions.push(item);
    }
  };

  // 1) 천을귀인 발동 체크
  if (cheoneulBranches.includes(transitBranch)) {
    pushUnique({
      category: '귀인',
      label: `천을귀인(${BRANCHES[transitBranch].hanja}) 유입`,
      target: '일간',
      tone: 'good',
      detail: `일간 ${STEMS[dayStem].kor}의 최고 길신인 천을귀인 ${BRANCHES[transitBranch].kor}(${BRANCHES[transitBranch].hanja})가 작동해 조력자·실속 인연·위기 완화 힘이 강해집니다.`,
    });
  }

  // 2) 각 대상 기둥(원국 + 대운/세운)별 천충지충 / 천간합충 / 지지 육합·충·형·파·해·원진
  const tStemInfo = STEMS[transitStem];
  const tBrInfo = BRANCHES[transitBranch];

  for (const tgt of targets) {
    const tgtStemInfo = STEMS[tgt.stem];
    const tgtBrInfo = BRANCHES[tgt.branch];

    const stemClash = STEM_CLASHES.find(
      ([a, b]) =>
        (transitStem === a && tgt.stem === b) ||
        (transitStem === b && tgt.stem === a)
    );
    const branchClash = BRANCH_CLASHES.find(
      ([a, b]) =>
        (transitBranch === a && tgt.branch === b) ||
        (transitBranch === b && tgt.branch === a)
    );

    // 천충지충 우선 표기
    if (stemClash && branchClash) {
      pushUnique({
        category: '천충지충',
        label: `${tgtStemInfo.kor}${tgtBrInfo.kor}-${tStemInfo.kor}${tBrInfo.kor} 천충지충`,
        target: tgt.label,
        tone: 'warn',
        detail: `${tgt.label}(${tgtStemInfo.hanja}${tgtBrInfo.hanja})와 하늘·땅이 동시에 정면 충돌하여 환경·관계·일터의 근본적 재편이 강하게 일어납니다.`,
      });
    } else {
      if (stemClash) {
        pushUnique({
          category: '천간충',
          label: stemClash[2],
          target: tgt.label,
          tone: 'warn',
          detail: `${tgt.label} 천간(${tgtStemInfo.hanja})과 ${stemClash[2]} — ${stemClash[3]}`,
        });
      }
      if (branchClash) {
        pushUnique({
          category: '지지충',
          label: branchClash[2],
          target: tgt.label,
          tone: 'warn',
          detail: `${tgt.label} 지지(${tgtBrInfo.hanja})와 ${branchClash[2]} — ${branchClash[3]}`,
        });
      }
    }

    // 천간합
    const stemCombo = STEM_COMBOS.find(
      ([a, b]) =>
        (transitStem === a && tgt.stem === b) ||
        (transitStem === b && tgt.stem === a)
    );
    if (stemCombo) {
      pushUnique({
        category: '천간합',
        label: stemCombo[2],
        target: tgt.label,
        tone: 'good',
        detail: `${tgt.label} 천간(${tgtStemInfo.hanja})과 ${stemCombo[2]} — ${stemCombo[3]}`,
      });
    }

    // 지지 육합
    const sixCombo = BRANCH_SIX_COMBOS.find(
      ([a, b]) =>
        (transitBranch === a && tgt.branch === b) ||
        (transitBranch === b && tgt.branch === a)
    );
    if (sixCombo) {
      pushUnique({
        category: '지지육합',
        label: sixCombo[2],
        target: tgt.label,
        tone: 'good',
        detail: `${tgt.label} 지지(${tgtBrInfo.hanja})와 ${sixCombo[2]} — ${sixCombo[3]}`,
      });
    }

    // 지지 형 (삼형 부분형 / 자묘형 / 자형)
    for (const h of BRANCH_HYEONG_GROUPS) {
      if (
        h.arr.includes(transitBranch) &&
        h.arr.includes(tgt.branch) &&
        transitBranch !== tgt.branch
      ) {
        pushUnique({
          category: '형',
          label: `${tgtBrInfo.kor}${tBrInfo.kor}형 (${h.name.split(' ')[0]})`,
          target: tgt.label,
          tone: 'warn',
          detail: `${tgt.label} 지지(${tgtBrInfo.hanja})와 형(刑) 작용 — 조정·압박·건강·계약 디테일 점검이 필요합니다.`,
        });
      }
    }
    if (
      (transitBranch === 0 && tgt.branch === 3) ||
      (transitBranch === 3 && tgt.branch === 0)
    ) {
      pushUnique({
        category: '형',
        label: '자묘형(子卯刑)',
        target: tgt.label,
        tone: 'warn',
        detail: `${tgt.label} 지지와 자묘형 — 대인관계 언행과 감정 완급 조절이 필요합니다.`,
      });
    }
    if ([4, 6, 9, 11].includes(transitBranch) && transitBranch === tgt.branch) {
      pushUnique({
        category: '자형',
        label: `${tBrInfo.kor}${tBrInfo.kor}자형`,
        target: tgt.label,
        tone: 'warn',
        detail: `${tgt.label} 지지와 자형 — 자기 몰입과 내면 갈등이 깊어지기 쉽습니다.`,
      });
    }

    // 지지 해
    const hae = BRANCH_HAE_PAIRS.find(
      ([a, b]) =>
        (transitBranch === a && tgt.branch === b) ||
        (transitBranch === b && tgt.branch === a)
    );
    if (hae) {
      pushUnique({
        category: '해',
        label: hae[2],
        target: tgt.label,
        tone: 'warn',
        detail: `${tgt.label} 지지와 ${hae[2]} — 가까운 관계의 섭섭함이나 컨디션 저하를 유의하세요.`,
      });
    }

    // 원진살
    const wonjin = BRANCH_WONJIN_PAIRS.find(
      ([a, b]) =>
        (transitBranch === a && tgt.branch === b) ||
        (transitBranch === b && tgt.branch === a)
    );
    if (wonjin) {
      pushUnique({
        category: '원진',
        label: wonjin[2],
        target: tgt.label,
        tone: 'warn',
        detail: `${tgt.label} 지지와 ${wonjin[2]} — 사소한 감정 기복이나 심리적 예민함이 커지기 쉽습니다.`,
      });
    }
  }

  // 3) 원국+운 삼합 / 방합 완성 및 반합 체크
  const natalBranches = activePillars.map((p) => p.branch as number);
  const allBranchesWithExtra = [...natalBranches, ...extraContexts.map((e) => e.branch)];
  for (const tr of BRANCH_TRIADS) {
    if (!tr.arr.includes(transitBranch)) continue;
    const others = tr.arr.filter((b) => b !== transitBranch);
    const hasAllOthers = others.every((b) => allBranchesWithExtra.includes(b));
    if (hasAllOthers) {
      pushUnique({
        category: '삼합완성',
        label: `${tr.name} 삼합 완성`,
        target: '원국합국',
        tone: 'good',
        detail: `운의 ${tBrInfo.kor}(${tBrInfo.hanja})가 들어오며 ${tr.name}이 온전히 완성되어 ${ELEMENTS[tr.el].kor}(${ELEMENTS[tr.el].hanja}) 세력이 폭발적으로 작동합니다.`,
      });
    } else if (
      (transitBranch === tr.arr[1] && others.some((b) => natalBranches.includes(b))) ||
      (natalBranches.includes(tr.arr[1]) && others.includes(tr.arr[1]))
    ) {
      const partner = others.find((b) => natalBranches.includes(b));
      if (partner !== undefined) {
        pushUnique({
          category: '반합',
          label: `${BRANCHES[partner].kor}${tBrInfo.kor} 반합 (${tr.name.split(' ')[1]})`,
          target: '원국',
          tone: 'good',
          detail: `원국 ${BRANCHES[partner].kor}(${BRANCHES[partner].hanja})와 반합을 이루어 ${ELEMENTS[tr.el].kor}(${ELEMENTS[tr.el].hanja}) 기운으로 결집합니다.`,
        });
      }
    }
  }

  for (const bh of BRANCH_BANGHAPS) {
    if (!bh.arr.includes(transitBranch)) continue;
    const others = bh.arr.filter((b) => b !== transitBranch);
    if (others.every((b) => allBranchesWithExtra.includes(b))) {
      pushUnique({
        category: '방합완성',
        label: `${bh.name} 방합 완성`,
        target: '원국합국',
        tone: 'neutral',
        detail: `운의 ${tBrInfo.kor}(${tBrInfo.hanja})가 합세해 ${bh.name} 계절 세력이 극대화됩니다.`,
      });
    }
  }

  // 4) 공망 체크
  if (dayGongmang.includes(transitBranch) || yearGongmang.includes(transitBranch)) {
    const gmTags: string[] = [];
    if (yearGongmang.includes(transitBranch)) gmTags.push('년공망');
    if (dayGongmang.includes(transitBranch)) gmTags.push('일공망');
    pushUnique({
      category: '공망',
      label: `${gmTags.join('·')} 구간`,
      target: '공망',
      tone: 'neutral',
      detail: `운의 지지가 ${gmTags.join('/')}에 해당해 겉으로 보이는 기대치와 실제 체감 결과의 간극을 현실적으로 점검해야 합니다.`,
    });
  }

  // 5) 용신·희신·기신·구신 종합 판정
  const yongEls = yongshinProfile.yongshin.map((x) => x.el);
  const heeEls = yongshinProfile.heeshin.map((x) => x.el);
  const giEls = yongshinProfile.gishin.map((x) => x.el);
  const guEls = yongshinProfile.gushin.map((x) => x.el);

  const sEl = tStemInfo.el;
  const bEl = tBrInfo.el;
  const goodScore =
    (yongEls.includes(sEl) ? 2 : heeEls.includes(sEl) ? 1 : 0) +
    (yongEls.includes(bEl) ? 2.5 : heeEls.includes(bEl) ? 1.5 : 0);
  const badScore =
    (giEls.includes(sEl) ? 2 : guEls.includes(sEl) ? 1 : 0) +
    (giEls.includes(bEl) ? 2.5 : guEls.includes(bEl) ? 1.5 : 0);
  const hasSevereClash = interactions.some(
    (it) => it.category === '천충지충' || it.category === '지지충'
  );

  let verdict: TransitAssessment['verdict'] = '중립';
  let tone: TransitAssessment['tone'] = 'neutral';
  let summary = '';

  if (goodScore >= 2 && badScore === 0 && !hasSevereClash) {
    verdict = '길(용신·희신)';
    tone = 'good';
    summary = `용신·희신 오행(${ELEMENTS[sEl].kor}/${ELEMENTS[bEl].kor})이 유입되어 원국의 막힌 흐름이 트이고 성과가 현실화되기 유리한 구간입니다.`;
  } else if (goodScore >= 1.5 && (badScore > 0 || hasSevereClash)) {
    verdict = '혼합(길흉교차)';
    tone = 'neutral';
    summary = `용신·희신 기회와 충·형 변수가 동시에 작동하므로, 성과를 취하되 계약·건강·관계 리스크를 병행 관리해야 합니다.`;
  } else if (badScore >= 2 || hasSevereClash) {
    verdict = '주의(기신·구신)';
    tone = 'warn';
    summary = `기신 작용이나 강한 충·변동이 동반되는 시기입니다. 무리한 확장·동업·투자를 멈추고 기존 자산과 건강을 지키는 방어 전략이 안전합니다.`;
  } else {
    verdict = '중립';
    tone = 'neutral';
    summary = `큰 극단 없이 일상적 흐름을 유지하며 내실과 전문 역량을 다지기에 적합한 시기입니다.`;
  }

  return { verdict, tone, summary, interactions };
}

export function buildSewoonsForRange(
  startYear: number,
  count: number,
  birthYear: number,
  dayStem: number,
  yearBranch: number,
  dayBranch: number,
  monthBranch: number,
  pillars?: PillarData[],
  yongshinProfile?: YongshinProfile,
  cheoneulBranches?: number[],
  yearGongmang?: [number, number],
  dayGongmang?: [number, number],
  daewoons?: DaewoonItem[]
): SewoonItem[] {
  const nowYear = new Date().getFullYear();
  const list: SewoonItem[] = [];
  for (let i = 0; i < count; i++) {
    const yr = startYear + i;
    const age = yr - birthYear + 1;
    const s = mod(yr - 4, 10);
    const b = mod(yr - 4, 12);

    const matchingDw = daewoons?.find((dw) => age >= dw.age && age <= dw.endAge);
    const extraContexts = matchingDw
      ? [{ label: `${matchingDw.age}세 대운`, stem: matchingDw.stem.idx, branch: matchingDw.branch.idx }]
      : [];

    const assessment: TransitAssessment =
      pillars && yongshinProfile && cheoneulBranches && yearGongmang && dayGongmang
        ? analyzeTransitInteractions(
            s,
            b,
            pillars,
            dayStem,
            yongshinProfile,
            cheoneulBranches,
            yearGongmang,
            dayGongmang,
            extraContexts
          )
        : { verdict: '중립', tone: 'neutral', summary: '', interactions: [] };

    list.push({
      year: yr,
      age,
      isCurrent: yr === nowYear,
      stem: STEMS[s],
      branch: BRANCHES[b],
      stemTG: getTenGod(dayStem, s),
      branchTG: getTenGod(dayStem, BRANCHES[b].mainStem),
      stage12: getStage12(dayStem, b),
      sinsal12: getCombinedSinsal12All(yearBranch, dayBranch, monthBranch, b),
      sinsal12YearDay: getCombinedSinsal12(yearBranch, dayBranch, b),
      assessment,
    });
  }
  return list;
}

/**
 * 선택 연도의 양력 1~12월 월운 생성 (전통 만세력 기준: 양력 1월=전년 丑월, 2월=해당년 寅월~12월=子월)
 */
export function buildWolwoonsForYear(
  targetYear: number,
  dayStem: number,
  yearBranch: number,
  dayBranch: number,
  monthBranch: number,
  pillars?: PillarData[],
  yongshinProfile?: YongshinProfile,
  cheoneulBranches?: number[],
  yearGongmang?: [number, number],
  dayGongmang?: [number, number],
  activeDaewoon?: DaewoonItem | null
): WolwoonItem[] {
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const currYearStem = mod(targetYear - 4, 10);
  const currYearBranch = mod(targetYear - 4, 12);
  const prevYearStem = mod(targetYear - 5, 10);

  const extraContexts: Array<{ label: string; stem: number; branch: number }> = [
    { label: `${targetYear}년 세운`, stem: currYearStem, branch: currYearBranch },
  ];
  if (activeDaewoon) {
    extraContexts.push({
      label: `${activeDaewoon.age}세 대운`,
      stem: activeDaewoon.stem.idx,
      branch: activeDaewoon.branch.idx,
    });
  }

  const list: WolwoonItem[] = [];
  for (let m = 1; m <= 12; m++) {
    let s: number;
    let b: number;
    if (m === 1) {
      b = 1;
      s = mod((prevYearStem % 5) * 2 + 2 + 11, 10);
    } else {
      const monthOrder = m - 2;
      b = mod(monthOrder + 2, 12);
      s = mod((currYearStem % 5) * 2 + 2 + monthOrder, 10);
    }

    const assessment: TransitAssessment =
      pillars && yongshinProfile && cheoneulBranches && yearGongmang && dayGongmang
        ? analyzeTransitInteractions(
            s,
            b,
            pillars,
            dayStem,
            yongshinProfile,
            cheoneulBranches,
            yearGongmang,
            dayGongmang,
            extraContexts
          )
        : { verdict: '중립', tone: 'neutral', summary: '', interactions: [] };

    list.push({
      month: m,
      year: targetYear,
      isCurrentMonth: targetYear === nowYear && m === nowMonth,
      stem: STEMS[s],
      branch: BRANCHES[b],
      stemTG: getTenGod(dayStem, s),
      branchTG: getTenGod(dayStem, BRANCHES[b].mainStem),
      stage12: getStage12(dayStem, b),
      sinsal12: getCombinedSinsal12(yearBranch, dayBranch, b),
      sinsal12YearDay: getCombinedSinsal12(yearBranch, dayBranch, b),
      assessment,
    });
  }
  void monthBranch;
  return list;
}

function getPillarSpecialStars(
  pillarKey: 'hour' | 'day' | 'month' | 'year',
  stem: number,
  branch: number,
  dayStem: number,
  monthBranch: number,
  dayBranch: number,
  allBranches: number[]
): PillarSpecialStar[] {
  const stars: PillarSpecialStar[] = [];
  const push = (name: string, tone: 'good' | 'warn' | 'neutral') => {
    if (!stars.some((s) => s.name === name)) stars.push({ name, tone });
  };

  if (getCheoneulBranches(dayStem).includes(branch)) {
    push('천을귀인', 'good');
  }

  const woldeokStem = [2, 6, 10].includes(monthBranch)
    ? 2
    : [8, 0, 4].includes(monthBranch)
      ? 8
      : [11, 3, 7].includes(monthBranch)
        ? 0
        : 6;
  if (stem === woldeokStem) push('월덕귀인', 'good');

  const cheondeokByStem: Record<number, number> = {
    2: 3,
    4: 8,
    5: 7,
    7: 0,
    8: 9,
    10: 2,
    11: 1,
    1: 6,
  };
  const cheondeokByBranch: Record<number, number> = {
    3: 8,
    6: 11,
    9: 2,
    0: 5,
  };
  if (
    cheondeokByStem[monthBranch] === stem ||
    cheondeokByBranch[monthBranch] === branch
  ) {
    push('천덕귀인', 'good');
  }

  const bokseongMap: Record<number, number> = {
    0: 2,
    1: 1,
    2: 0,
    3: 9,
    4: 8,
    5: 7,
    6: 6,
    7: 5,
    8: 4,
    9: 3,
  };
  if (bokseongMap[dayStem] === branch) push('복성귀인', 'good');

  const geonrokMap: Record<number, number> = {
    0: 2,
    1: 3,
    2: 5,
    3: 6,
    4: 5,
    5: 6,
    6: 8,
    7: 9,
    8: 11,
    9: 0,
  };
  if (geonrokMap[dayStem] === branch) push('건록', 'good');

  const yanginMap: Record<number, number> = {
    0: 3,
    2: 6,
    4: 6,
    6: 9,
    8: 0,
  };
  if (yanginMap[dayStem] === branch) push('양인살', 'warn');

  const geumyeoMap: Record<number, number> = {
    0: 4,
    1: 5,
    2: 7,
    3: 8,
    4: 7,
    5: 8,
    6: 10,
    7: 11,
    8: 1,
    9: 2,
  };
  if (geumyeoMap[dayStem] === branch) push('금여', 'good');

  const ganjiKey = `${STEMS[stem].kor}${BRANCHES[branch].kor}`;
  if (['갑진', '을미', '병술', '정축', '무진', '임술', '계축'].includes(ganjiKey)) {
    push('백호살', 'warn');
  }

  if (['경진', '경술', '임진', '임술', '무술'].includes(ganjiKey)) {
    push('괴강살', 'good');
  }

  if ([0, 7].includes(stem) || [3, 6, 8].includes(branch)) {
    push('현침살', 'neutral');
  }

  const gwimunPairs: Array<[number, number]> = [
    [0, 9],
    [1, 6],
    [2, 7],
    [3, 8],
    [4, 11],
    [5, 10],
  ];
  if (
    pillarKey !== 'day' &&
    gwimunPairs.some(
      ([a, b]) => (dayBranch === a && branch === b) || (dayBranch === b && branch === a)
    )
  ) {
    push('귀문관살', 'neutral');
  }

  const rokBr = geonrokMap[dayStem];
  const prevBr = mod(rokBr - 1, 12);
  const nextBr = mod(rokBr + 1, 12);
  if (
    (branch === prevBr || branch === nextBr) &&
    allBranches.includes(prevBr) &&
    allBranches.includes(nextBr)
  ) {
    push('협록', 'good');
  }

  return stars;
}

function analyzeExtendedRelations(pillars: PillarData[]): {
  relations: RelationItem[];
  stemRelByKey: Record<
    'hour' | 'day' | 'month' | 'year',
    Array<{ label: string; type: 'good' | 'warn' | 'neutral' }>
  >;
  branchMatrixRows: BranchMatrixRow[];
} {
  const active = pillars.filter((p) => !p.empty && p.stem !== null && p.branch !== null);
  const res: RelationItem[] = [];
  const stemRelByKey: Record<
    'hour' | 'day' | 'month' | 'year',
    Array<{ label: string; type: 'good' | 'warn' | 'neutral' }>
  > = { hour: [], day: [], month: [], year: [] };
  const branchMatrixRows: BranchMatrixRow[] = [];

  const pushStemTag = (
    key: 'hour' | 'day' | 'month' | 'year',
    label: string,
    type: 'good' | 'warn' | 'neutral'
  ) => {
    if (!stemRelByKey[key].some((t) => t.label === label)) {
      stemRelByKey[key].push({ label, type });
    }
  };

  const stems = active.map((p) => p.stem as number);
  const branches = active.map((p) => p.branch as number);

  // 1) 천간합
  STEM_COMBOS.forEach(([a, b, title, detail]) => {
    if (stems.includes(a) && stems.includes(b)) {
      res.push({ category: '천간합', type: 'good', title, detail });
      active.forEach((p) => {
        if (p.stem === a || p.stem === b) pushStemTag(p.key, '합', 'good');
      });
    }
  });

  // 2) 천간충 (정통 4충)
  STEM_CLASHES.forEach(([a, b, title, detail]) => {
    if (stems.includes(a) && stems.includes(b)) {
      res.push({ category: '천간충', type: 'warn', title, detail });
      active.forEach((p) => {
        if (p.stem === a || p.stem === b) pushStemTag(p.key, '충', 'warn');
      });
    }
  });

  // 2-b) 천간 동성 상극 (갑무·을기·병경·정신·무임·기계 — 만세력 표준 '충' 통일 표기)
  STEM_CONFLICTS_KE.forEach(([a, b, title, detail]) => {
    if (stems.includes(a) && stems.includes(b)) {
      res.push({ category: '천간충', type: 'warn', title, detail });
      active.forEach((p) => {
        if (p.stem === a || p.stem === b) pushStemTag(p.key, '충', 'warn');
      });
    }
  });

  const makeRow = (
    id: string,
    type: 'good' | 'warn' | 'neutral',
    matchedKeys: Array<'hour' | 'day' | 'month' | 'year'>,
    label: string,
    anchorKey?: 'hour' | 'day' | 'month' | 'year'
  ) => {
    const cells: Record<'hour' | 'day' | 'month' | 'year', string> = {
      hour: '',
      day: '',
      month: '',
      year: '',
    };
    const anchor = anchorKey ?? matchedKeys[0];
    matchedKeys.forEach((k) => {
      if (k === anchor && matchedKeys.length >= 2) {
        const pObj = active.find((p) => p.key === k);
        cells[k] = pObj?.branchObj ? `(${pObj.branchObj.hanja}) ${label}` : label;
      } else {
        cells[k] = label;
      }
    });
    branchMatrixRows.push({ id, type, cells });
  };

  // 3) 지지 육합
  BRANCH_SIX_COMBOS.forEach(([a, b, title, detail]) => {
    const keys = active.filter((p) => p.branch === a || p.branch === b).map((p) => p.key);
    if (branches.includes(a) && branches.includes(b)) {
      res.push({ category: '지지육합', type: 'good', title, detail });
      makeRow(`six-${a}-${b}`, 'good', keys, '육합');
    }
  });

  // 4) 삼합 / 반합
  BRANCH_TRIADS.forEach((s) => {
    const matched = s.arr.filter((x) => branches.includes(x));
    const keys = active.filter((p) => s.arr.includes(p.branch as number)).map((p) => p.key);
    if (matched.length === 3) {
      res.push({
        category: '삼합',
        type: 'good',
        title: s.name,
        detail: '세 지지가 온전히 모여 강력한 오행 국(局)을 형성합니다.',
      });
      makeRow(`triad-${s.arr.join('-')}`, 'good', keys, '삼합');
    } else if (
      matched.length === 2 &&
      (matched.includes(s.arr[1]) ||
        (matched.includes(s.arr[0]) && matched.includes(s.arr[2])))
    ) {
      const isWangji = matched.includes(s.arr[1]);
      res.push({
        category: '반합',
        type: 'good',
        title: `${s.name} ${isWangji ? '반합' : '가합'}`,
        detail: isWangji
          ? '왕지(중심 지지)를 포함해 두 지지가 강하게 결집하는 반합입니다.'
          : '생지와 고지가 만나 삼합의 기운을 암시하는 가합입니다.',
      });
      makeRow(`half-${s.arr.join('-')}`, 'good', keys, isWangji ? '반합' : '삼합');
    }
  });

  // 5) 방합
  BRANCH_BANGHAPS.forEach((bh) => {
    const matched = bh.arr.filter((x) => branches.includes(x));
    const keys = active.filter((p) => bh.arr.includes(p.branch as number)).map((p) => p.key);
    if (matched.length === 3) {
      res.push({
        category: '방합',
        type: 'good',
        title: `${bh.name} 방합`,
        detail: '같은 계절의 세 지지가 모두 모여 압도적인 계절 세력을 이룹니다.',
      });
      makeRow(`bang-${bh.arr.join('-')}`, 'good', keys, '방합');
    } else if (matched.length === 2 && matched.includes(bh.arr[1])) {
      res.push({
        category: '방합',
        type: 'good',
        title: `${bh.name} 반방합`,
        detail: '계절의 왕지를 중심으로 같은 방위의 기운이 결집합니다.',
      });
      makeRow(`bang-half-${bh.arr.join('-')}`, 'good', keys, '방합');
    }
  });

  // 6) 지지 육충
  BRANCH_CLASHES.forEach(([a, b, title, detail]) => {
    if (branches.includes(a) && branches.includes(b)) {
      const keys = active.filter((p) => p.branch === a || p.branch === b).map((p) => p.key);
      res.push({ category: '지지충', type: 'warn', title, detail });
      makeRow(`clash-${a}-${b}`, 'warn', keys, '충');
    }
  });

  // 7) 지지 형(刑)
  BRANCH_HYEONG_GROUPS.forEach((h) => {
    const matched = h.arr.filter((x) => branches.includes(x));
    if (matched.length >= 2) {
      const keys = active.filter((p) => h.arr.includes(p.branch as number)).map((p) => p.key);
      res.push({
        category: '형',
        type: 'warn',
        title: matched.length === 3 ? h.name : `${h.name} (부분형)`,
        detail: h.detail,
      });
      makeRow(`hyeong-${h.arr.join('-')}`, 'warn', keys, '형');
    }
  });
  if (branches.includes(0) && branches.includes(3)) {
    const keys = active.filter((p) => p.branch === 0 || p.branch === 3).map((p) => p.key);
    res.push({
      category: '형',
      type: 'warn',
      title: '자묘형(子卯刑)',
      detail: '무례지형 — 솔직하고 개성이 뚜렷하나 대인관계에서 완급 조절이 필요',
    });
    makeRow('hyeong-0-3', 'warn', keys, '형');
  }
  const selfHyeongList: Array<[number, string]> = [
    [4, '진진자형(辰辰自刑)'],
    [6, '오오자형(午午自刑)'],
    [9, '유유자형(酉酉自刑)'],
    [11, '해해자형(亥亥自刑)'],
  ];
  selfHyeongList.forEach(([br, title]) => {
    const keys = active.filter((p) => p.branch === br).map((p) => p.key);
    if (keys.length >= 2) {
      res.push({
        category: '형',
        type: 'warn',
        title,
        detail: '같은 지지가 겹쳐 내면의 몰입과 자기 성찰이 강하게 작용합니다.',
      });
      makeRow(`self-hyeong-${br}`, 'warn', keys, '자형');
    }
  });

  // 8) 지지 파(破)
  BRANCH_PA_PAIRS.forEach(([a, b, title]) => {
    if (branches.includes(a) && branches.includes(b)) {
      const keys = active.filter((p) => p.branch === a || p.branch === b).map((p) => p.key);
      res.push({
        category: '파',
        type: 'neutral',
        title,
        detail: '기존 틀을 깨고 재구성하려는 세밀한 변화·수정 작용이 따릅니다.',
      });
      makeRow(`pa-${a}-${b}`, 'neutral', keys, '파');
    }
  });

  // 9) 지지 해(害)
  BRANCH_HAE_PAIRS.forEach(([a, b, title]) => {
    if (branches.includes(a) && branches.includes(b)) {
      const keys = active.filter((p) => p.branch === a || p.branch === b).map((p) => p.key);
      res.push({
        category: '해',
        type: 'warn',
        title,
        detail: '가까운 관계나 협업에서 오해·섭섭함이 쌓이지 않도록 소통이 중요합니다.',
      });
      makeRow(`hae-${a}-${b}`, 'warn', keys, '해');
    }
  });

  // 10) 지지 원진(怨嗔)
  BRANCH_WONJIN_PAIRS.forEach(([a, b, title]) => {
    if (branches.includes(a) && branches.includes(b)) {
      const keys = active.filter((p) => p.branch === a || p.branch === b).map((p) => p.key);
      res.push({
        category: '원진',
        type: 'warn',
        title,
        detail: '서로 끌리면서도 사소한 일로 예민해지거나 거리감을 느끼기 쉬운 심리 작용입니다.',
      });
      makeRow(`wonjin-${a}-${b}`, 'warn', keys, '원진');
    }
  });

  if (res.length === 0) {
    res.push({
      category: '안정',
      type: 'neutral',
      title: '원국 내 합·충 부재',
      detail: '뚜렷한 합이나 충 없이 각 기둥이 고유의 역할을 안정적으로 유지하는 구조입니다.',
    });
  }

  return { relations: res, stemRelByKey, branchMatrixRows };
}

function analyzeSinsalSummary(
  pillars: PillarData[],
  dayStem: number,
  yearBranch: number,
  dayBranch: number
): SinsalItem[] {
  const activeBranches = pillars
    .filter((p) => !p.empty && p.branch !== null)
    .map((p) => p.branch as number);
  const list: SinsalItem[] = [];

  const gwiinHits = getCheoneulBranches(dayStem).filter((b) => activeBranches.includes(b));
  if (gwiinHits.length > 0) {
    const chars = gwiinHits.map((b) => `${BRANCHES[b].kor}(${BRANCHES[b].hanja})`).join(', ');
    list.push({
      type: 'good',
      name: `천을귀인 · ${chars}`,
      hanja: '天乙貴人',
      detail: '명리학 최고의 길신으로, 어려운 고비마다 조력자와 귀인의 도움을 받습니다.',
    });
  }

  const allStars = new Set(
    pillars.flatMap((p) => (p.specialStars || []).map((s) => s.name))
  );
  const all12 = new Set(pillars.flatMap((p) => p.sinsal12 || []));

  if (allStars.has('월덕귀인') || allStars.has('천덕귀인')) {
    const names = ['천덕귀인', '월덕귀인'].filter((n) => allStars.has(n)).join(' · ');
    list.push({
      type: 'good',
      name: names,
      hanja: '天月德貴人',
      detail: '덕망과 온화한 인품을 갖추며 예기치 않은 액운을 자연스레 완화하는 길신입니다.',
    });
  }
  if (allStars.has('복성귀인') || allStars.has('금여')) {
    const names = ['복성귀인', '금여'].filter((n) => allStars.has(n)).join(' · ');
    list.push({
      type: 'good',
      name: names,
      hanja: '福星·金與',
      detail: '의식주와 배우자·가족 복이 안정적으로 따르며 품위 있는 생활 기반을 돕습니다.',
    });
  }
  if (all12.has('년살')) {
    list.push({
      type: 'neutral',
      name: '도화살(년살)',
      hanja: '桃花殺',
      detail: '타인의 시선을 끄는 매력, 대중적 호감, 예술적 표현력과 감각이 돋보입니다.',
    });
  }
  if (all12.has('역마살')) {
    list.push({
      type: 'neutral',
      name: '역마살',
      hanja: '驛馬殺',
      detail: '이동수·해외 인연·변동성이 크며 넓게 움직일수록 기회와 성취가 커집니다.',
    });
  }
  if (all12.has('화개살')) {
    list.push({
      type: 'neutral',
      name: '화개살',
      hanja: '華蓋殺',
      detail: '깊은 사색과 철학·학문·예술적 재능을 지니며 내면의 성숙도가 높습니다.',
    });
  }
  if (allStars.has('양인살')) {
    list.push({
      type: 'warn',
      name: '양인살',
      hanja: '羊刃殺',
      detail: '강렬한 결단력과 승부욕을 지니며 전문 기술·의료·법조·리더 분야에서 강점을 보입니다.',
    });
  }
  if (allStars.has('백호살')) {
    list.push({
      type: 'warn',
      name: '백호살',
      hanja: '白虎殺',
      detail: '강한 에너지와 돌파력을 뜻하며 전문성으로 승화하면 큰 성취를 이룹니다(외상·사고 주의).',
    });
  }
  if (allStars.has('괴강살')) {
    const iljuKey = `${STEMS[dayStem].kor}${BRANCHES[dayBranch].kor}`;
    list.push({
      type: 'good',
      name: `괴강살 · ${iljuKey}`,
      hanja: '魁罡殺',
      detail: '총명하고 강인한 카리스마와 결단력으로 큰 성취를 이루는 기질입니다.',
    });
  }
  if (allStars.has('현침살')) {
    list.push({
      type: 'neutral',
      name: '현침살',
      hanja: '懸針殺',
      detail: '예리한 분석력·정밀한 기술·의료·IT·패션·디자인·영상 편집 등 세밀한 전문 분야에 적성이 높습니다.',
    });
  }

  if (list.length === 0) {
    list.push({
      type: 'neutral',
      name: '담백한 명식',
      hanja: '平和',
      detail: '과도한 흉살의 치우침 없이 순탄하고 균형 잡힌 흐름을 지닌 명식입니다.',
    });
  }
  void yearBranch;
  return list;
}

export interface CalculateSajuParams {
  name: string;
  gender: Gender;
  calendarType: CalendarType;
  originalInputDate: string;
  solarDateStr: string;
  timeStr: string;
  unknownTime: boolean;
  timeCorrectionMode?: TimeCorrectionMode;
  trueSolar?: boolean;
  includeEoT: boolean;
  yajasi: boolean;
  place: BirthPlace;
  kasiInfo: KasiCalendarInfo | null;
}

export function calculateSaju(params: CalculateSajuParams): SajuResult {
  const {
    name,
    gender,
    calendarType,
    originalInputDate,
    solarDateStr,
    timeStr,
    unknownTime,
    includeEoT,
    yajasi,
    place,
    kasiInfo,
  } = params;

  const timeCorrectionMode: TimeCorrectionMode =
    params.timeCorrectionMode ?? (params.trueSolar === false ? 'none' : 'korea_std');

  const [y, m, d] = solarDateStr.split('-').map(Number);
  let hh = 12;
  let mm = 0;
  if (!unknownTime && timeStr) {
    const parts = timeStr.split(':').map(Number);
    hh = parts[0] ?? 12;
    mm = parts[1] ?? 0;
  }

  const utcOffsetHours = getTimezoneOffsetHours(place.timezone, y, m, d, hh);
  const birthJD_UTC = toJulianDate(y, m, d, hh + mm / 60 - utcOffsetHours);

  const stdMeridian = utcOffsetHours * 15;
  const lonCorrMin = (place.longitude - stdMeridian) * 4;
  const eotCorrMin =
    timeCorrectionMode === 'true_solar' && includeEoT
      ? getEquationOfTimeMinutes(y, m, d)
      : 0;

  let totalCorrMin = 0;
  let correctionLabel = '보정 미적용';
  if (unknownTime) {
    totalCorrMin = 0;
    correctionLabel = '시간 미상';
  } else if (timeCorrectionMode === 'korea_std') {
    totalCorrMin = -30;
    correctionLabel = '한국 표준 -30분';
  } else if (timeCorrectionMode === 'true_solar') {
    totalCorrMin = lonCorrMin + eotCorrMin;
    correctionLabel = includeEoT
      ? `출생지 경도 ${lonCorrMin >= 0 ? '+' : ''}${lonCorrMin.toFixed(1)}분 · 균시차 ${eotCorrMin >= 0 ? '+' : ''}${eotCorrMin.toFixed(1)}분`
      : `출생지 경도 ${lonCorrMin >= 0 ? '+' : ''}${lonCorrMin.toFixed(1)}분`;
  }

  const localDate = new Date(
    Date.UTC(y, m - 1, d, hh, mm) + Math.round(totalCorrMin * 60000)
  );
  const adjY = localDate.getUTCFullYear();
  const adjM = localDate.getUTCMonth() + 1;
  const adjD = localDate.getUTCDate();
  const adjH = localDate.getUTCHours();
  const adjMin = localDate.getUTCMinutes();

  // 1) 연주 (입춘 315° 기준)
  const ipchunJD = findSolarTermJD(toJulianDate(y, 2, 4, 0), 315);
  const sajuYear = birthJD_UTC < ipchunJD ? y - 1 : y;
  const yearStem = mod(sajuYear - 4, 10);
  const yearBranch = mod(sajuYear - 4, 12);

  // 2) 월주 (12절입일 기준 + 오호둔법)
  const sunLon = getSolarLongitude(birthJD_UTC);
  const monthOrder = Math.floor(mod(sunLon - 315, 360) / 30);
  const monthBranch = mod(monthOrder + 2, 12);
  const monthStem = mod((yearStem % 5) * 2 + 2 + monthOrder, 10);
  const currentTerm = SOLAR_TERMS_12[monthOrder];
  const nextTerm = SOLAR_TERMS_12[mod(monthOrder + 1, 12)];

  const currTermDeg = mod(monthOrder * 30 + 315, 360);
  const nextTermDeg = mod(currTermDeg + 30, 360);
  const prevTermJD = findSolarTermJD(
    birthJD_UTC - mod(sunLon - currTermDeg, 360) / 0.9856,
    currTermDeg
  );
  const nextTermJD = findSolarTermJD(
    birthJD_UTC + (mod(nextTermDeg - sunLon, 360) || 30) / 0.9856,
    nextTermDeg
  );

  // 3) 일주 (JDN 기반 60갑자 + 조자시/야자시 분기)
  let dayCalcDate = new Date(Date.UTC(adjY, adjM - 1, adjD));
  let hourStemBaseDate = new Date(Date.UTC(adjY, adjM - 1, adjD));
  if (!unknownTime && adjH >= 23) {
    hourStemBaseDate = new Date(dayCalcDate.getTime() + 86400000);
    if (!yajasi) {
      dayCalcDate = new Date(dayCalcDate.getTime() + 86400000);
    }
  }
  const dayJDN = Math.floor(
    toJulianDate(
      dayCalcDate.getUTCFullYear(),
      dayCalcDate.getUTCMonth() + 1,
      dayCalcDate.getUTCDate(),
      12
    ) + 0.5
  );
  const day60 = mod(dayJDN - 11, 60);
  const dayStem = day60 % 10;
  const dayBranch = day60 % 12;

  // 4) 시주 (오서둔법)
  let hourStem: number | null = null;
  let hourBranch: number | null = null;
  if (!unknownTime) {
    hourBranch = Math.floor(mod(adjH + 1, 24) / 2);
    const hBaseJDN = Math.floor(
      toJulianDate(
        hourStemBaseDate.getUTCFullYear(),
        hourStemBaseDate.getUTCMonth() + 1,
        hourStemBaseDate.getUTCDate(),
        12
      ) + 0.5
    );
    const hBaseStem = mod(hBaseJDN - 11, 60) % 10;
    hourStem = mod((hBaseStem % 5) * 2 + hourBranch, 10);
  }

  const gongmang = getGongmang(dayStem, dayBranch);
  const yearGongmang = getGongmang(yearStem, yearBranch);
  const cheoneulBranches = getCheoneulBranches(dayStem);
  const wolryeong = getWolryeong(monthBranch, birthJD_UTC - prevTermJD);

  const rawPillars: Array<{
    key: 'hour' | 'day' | 'month' | 'year';
    label: string;
    hanjaLabel: string;
    stem: number | null;
    branch: number | null;
  }> = [
    { key: 'hour', label: '시주', hanjaLabel: '時柱', stem: hourStem, branch: hourBranch },
    { key: 'day', label: '일주', hanjaLabel: '日柱', stem: dayStem, branch: dayBranch },
    { key: 'month', label: '월주', hanjaLabel: '月柱', stem: monthStem, branch: monthBranch },
    { key: 'year', label: '연주', hanjaLabel: '年柱', stem: yearStem, branch: yearBranch },
  ];

  const allActiveBranches = rawPillars
    .filter((p) => p.branch !== null)
    .map((p) => p.branch as number);

  const pillars: PillarData[] = rawPillars.map((p) => {
    if (p.stem === null || p.branch === null) {
      return { ...p, empty: true };
    }
    const br = BRANCHES[p.branch];
    const hiddenRoles: Array<'여기' | '중기' | '정기'> =
      br.hidden.length === 2 ? ['여기', '정기'] : ['여기', '중기', '정기'];

    const gongmangLabels: string[] = [];
    if (p.key !== 'year' && yearGongmang.includes(p.branch)) gongmangLabels.push('[년]공망');
    if (p.key !== 'day' && gongmang.includes(p.branch)) gongmangLabels.push('[일]공망');

    return {
      ...p,
      empty: false,
      stemObj: STEMS[p.stem],
      branchObj: br,
      stemTenGod: p.key === 'day' ? '일간(나)' : getTenGod(dayStem, p.stem),
      branchTenGod: getTenGod(dayStem, br.mainStem),
      stage12: getStage12(dayStem, p.branch),
      selfStage12: getStage12(p.stem, p.branch),
      napeum: getNapeum(p.stem, p.branch),
      hiddenStems: br.hidden.map((hIdx, idx) => ({
        stem: STEMS[hIdx],
        role: hiddenRoles[idx],
        tenGod: getTenGod(dayStem, hIdx),
      })),
      gongmangLabels,
      sinsal12: getCombinedSinsal12All(yearBranch, dayBranch, monthBranch, p.branch),
      sinsal12YearDay: getCombinedSinsal12(yearBranch, dayBranch, p.branch),
      specialStars: getPillarSpecialStars(
        p.key,
        p.stem,
        p.branch,
        dayStem,
        monthBranch,
        dayBranch,
        allActiveBranches
      ),
    };
  });

  // 확장 형충회합(원진·천간극 포함) & 천간 태그 반영
  const { relations, stemRelByKey, branchMatrixRows } = analyzeExtendedRelations(pillars);
  pillars.forEach((p) => {
    if (!p.empty) {
      p.stemRelTags = stemRelByKey[p.key];
    }
  });

  // 5) 오행 분포 & 신강/신약
  const elCount = [0, 0, 0, 0, 0];
  const elWeight = [0, 0, 0, 0, 0];
  pillars.forEach((p) => {
    if (p.empty || !p.stemObj || !p.branchObj) return;
    elCount[p.stemObj.el] += 1;
    elCount[p.branchObj.el] += 1;
    elWeight[p.stemObj.el] += 10;
    elWeight[p.branchObj.el] += p.key === 'month' ? 28 : p.key === 'day' ? 14 : 10;
  });

  const dayEl = STEMS[dayStem].el;
  const resourceEl = mod(dayEl - 1, 5);
  const totalW = elWeight.reduce((a, b) => a + b, 0);
  const strengthRatio = Math.round(((elWeight[dayEl] + elWeight[resourceEl]) / totalW) * 100);

  let strengthLabel = '중화(中和)';
  if (strengthRatio >= 56) {
    strengthLabel = strengthRatio >= 68 ? '극신강(極身强)' : '신강(身强)';
  } else if (strengthRatio <= 42) {
    strengthLabel = strengthRatio <= 30 ? '극신약(極身弱)' : '신약(身弱)';
  }

  // 6) 십성 그룹 집계, 격국, 용신·희신·기신·구신, 구조 진단, 신살 요약
  const tenGodGroups: Record<'비겁' | '식상' | '재성' | '관성' | '인성', number> = {
    비겁: 0,
    식상: 0,
    재성: 0,
    관성: 0,
    인성: 0,
  };
  pillars.forEach((p) => {
    if (p.empty) return;
    const g1 = mapTenGodGroup(p.stemTenGod);
    const g2 = mapTenGodGroup(p.branchTenGod);
    if (g1) tenGodGroups[g1] += 1;
    if (g2) tenGodGroups[g2] += 1;
  });

  const geokguk = analyzeGeokguk(pillars, dayStem, monthBranch);
  const yongshinProfile = analyzeYongshinProfile(
    dayStem,
    monthBranch,
    elCount,
    elWeight,
    strengthRatio,
    tenGodGroups
  );
  const yongshinEls = Array.from(
    new Set([
      ...yongshinProfile.yongshin.map((x) => x.el),
      ...yongshinProfile.heeshin.map((x) => x.el),
    ])
  );
  const structureDiagnostics = analyzeStructureDiagnostics(
    pillars,
    elCount,
    strengthRatio,
    dayStem,
    dayBranch,
    relations,
    yearGongmang,
    gongmang,
    tenGodGroups
  );
  const sinsal = analyzeSinsalSummary(pillars, dayStem, yearBranch, dayBranch);

  // 7) 대운 (3기준 12신살 + 원국 동적 상호작용 포함)
  const isYangYear = STEMS[yearStem].pol === 1;
  const isForward = (isYangYear && gender === 'M') || (!isYangYear && gender === 'F');
  const daysToTerm = Math.max(
    0,
    isForward ? nextTermJD - birthJD_UTC : birthJD_UTC - prevTermJD
  );
  const daewoonNum = Math.max(1, Math.min(10, Math.round(daysToTerm / 3)));

  const daewoons: DaewoonItem[] = [];
  for (let i = 1; i <= 10; i++) {
    const step = isForward ? i : -i;
    const s = mod(monthStem + step, 10);
    const b = mod(monthBranch + step, 12);
    const startAge = daewoonNum + (i - 1) * 10;
    const assessment = analyzeTransitInteractions(
      s,
      b,
      pillars,
      dayStem,
      yongshinProfile,
      cheoneulBranches,
      yearGongmang,
      gongmang
    );
    daewoons.push({
      index: i - 1,
      age: startAge,
      endAge: startAge + 9,
      year: y + startAge - 1,
      stem: STEMS[s],
      branch: BRANCHES[b],
      stemTG: getTenGod(dayStem, s),
      branchTG: getTenGod(dayStem, BRANCHES[b].mainStem),
      stage12: getStage12(dayStem, b),
      sinsal12: getCombinedSinsal12All(yearBranch, dayBranch, monthBranch, b),
      sinsal12YearDay: getCombinedSinsal12(yearBranch, dayBranch, b),
      assessment,
    });
  }

  // 8) 기본 세운 (현재 연도 기준 -3 ~ +6년, 원국·현재 대운 동적 상호작용 포함)
  const nowYear = new Date().getFullYear();
  const sewoons = buildSewoonsForRange(
    nowYear - 3,
    10,
    y,
    dayStem,
    yearBranch,
    dayBranch,
    monthBranch,
    pillars,
    yongshinProfile,
    cheoneulBranches,
    yearGongmang,
    gongmang,
    daewoons
  );

  const sijin = !unknownTime && hourBranch !== null ? getSijinInfo(hourBranch) : null;

  return {
    input: {
      name: name.trim() || '명조',
      gender,
      solarDateStr,
      timeStr,
      unknownTime,
      timeCorrectionMode,
      trueSolar: timeCorrectionMode !== 'none',
      includeEoT: timeCorrectionMode === 'true_solar' && includeEoT,
      yajasi,
      calendarType,
      originalInputDate,
    },
    place,
    solarTimeDetail: {
      utcOffsetHours,
      lonCorrMin,
      eotCorrMin,
      totalCorrMin,
      correctionLabel,
    },
    sijin,
    kasiInfo,
    adjustedTimeStr: unknownTime
      ? '시간 미상'
      : `${adjY}-${String(adjM).padStart(2, '0')}-${String(adjD).padStart(2, '0')} ${String(adjH).padStart(2, '0')}:${String(adjMin).padStart(2, '0')}`,
    currentTermInfo: {
      deg: currentTerm.deg,
      name: currentTerm.name,
      prevTermDateStr: formatJDInOffset(prevTermJD, utcOffsetHours),
      nextTermName: nextTerm.name,
      nextTermDateStr: formatJDInOffset(nextTermJD, utcOffsetHours),
      ipchunDateStr: formatJDInOffset(ipchunJD, utcOffsetHours),
    },
    pillars,
    branchMatrixRows,
    elCount,
    elWeight,
    strengthRatio,
    strengthLabel,
    yongshinEls,
    geokguk,
    yongshinProfile,
    structureDiagnostics,
    relations,
    sinsal,
    gongmang,
    yearGongmang,
    cheoneulBranches,
    wolryeong,
    daewoonMeta: {
      isForward,
      daewoonNum,
      daysToTerm: Number(daysToTerm.toFixed(1)),
    },
    daewoons,
    sewoons,
    tenGodGroups,
  };
}

export function buildSajuPromptPayload(result: SajuResult): SajuPromptPayload {
  const birthYear = Number(result.input.solarDateStr.slice(0, 4));
  const nowYear = new Date().getFullYear();
  const currentAge = nowYear - birthYear + 1;
  const activeDw =
    result.daewoons.find((dw) => currentAge >= dw.age && currentAge <= dw.endAge) ?? null;
  const currentSw = result.sewoons.find((sw) => sw.isCurrent) ?? null;

  const dayStem = result.pillars[1].stem ?? 0;
  const dayBranch = result.pillars[1].branch ?? 0;
  const monthBranch = result.pillars[2].branch ?? 0;
  const yearBranch = result.pillars[3].branch ?? 0;

  // 현재 대운 10년 구간이 있으면 해당 10년, 없으면 최근 -3~+6년 세운 전체
  const windowStart = activeDw ? activeDw.year : nowYear - 3;
  const sewoonWindowRaw = buildSewoonsForRange(
    windowStart,
    10,
    birthYear,
    dayStem,
    yearBranch,
    dayBranch,
    monthBranch,
    result.pillars,
    result.yongshinProfile,
    result.cheoneulBranches,
    result.yearGongmang,
    result.gongmang,
    result.daewoons
  );

  const threeYearSewoons = buildSewoonsForRange(
    nowYear,
    3,
    birthYear,
    dayStem,
    yearBranch,
    dayBranch,
    monthBranch,
    result.pillars,
    result.yongshinProfile,
    result.cheoneulBranches,
    result.yearGongmang,
    result.gongmang,
    result.daewoons
  ).map(
    (sw) =>
      `${sw.year}년(${sw.age}세) ${sw.stem.kor}${sw.branch.kor}(${sw.stem.hanja}${sw.branch.hanja}, 천간:${sw.stemTG}/지지:${sw.branchTG}, 12운성:${sw.stage12}, 12신살:${sw.sinsal12.join('·')}, 판정:${sw.assessment.verdict}${
        sw.assessment.interactions.length > 0
          ? `, 상호작용:${sw.assessment.interactions.map((x) => x.label).join(', ')}`
          : ''
      })`
  );

  const currentYearWolwoons = buildWolwoonsForYear(
    nowYear,
    dayStem,
    yearBranch,
    dayBranch,
    monthBranch,
    result.pillars,
    result.yongshinProfile,
    result.cheoneulBranches,
    result.yearGongmang,
    result.gongmang,
    activeDw
  );

  // 정순(연주 -> 월주 -> 일주 -> 시주) 확정 간지 요약 생성
  const orderedPillars = [
    result.pillars[3],
    result.pillars[2],
    result.pillars[1],
    result.pillars[0],
  ];
  const canonicalGanji = orderedPillars
    .map((p) => {
      const unit =
        p.key === 'year' ? '년' : p.key === 'month' ? '월' : p.key === 'day' ? '일' : '시';
      if (p.empty || !p.stemObj || !p.branchObj) return `${unit} 미상`;
      return `${p.stemObj.kor}${p.branchObj.kor}${unit}(${p.stemObj.hanja}${p.branchObj.hanja})`;
    })
    .join(' ');
  const sijinSummary = result.sijin
    ? `${result.sijin.name}(${result.sijin.hanja}) · 태양시 ${result.sijin.solarRange}`
    : '출생 시간 미상';

  const confirmed: string[] = [
    `확정 사주 8글자 (연·월·일·시): ${canonicalGanji}`,
    `출생 시진: ${sijinSummary}`,
    `성별: ${result.input.gender === 'M' ? '남성(건명)' : '여성(곤명)'}`,
    `양력 생년월일: ${result.input.solarDateStr} (절기: ${result.currentTermInfo.name}, 월령: ${result.wolryeong.stem.hanja})`,
    `출생지 경도: ${result.place.name} (${result.place.longitude.toFixed(2)}°E, UTC${result.solarTimeDetail.utcOffsetHours >= 0 ? '+' : ''}${result.solarTimeDetail.utcOffsetHours})`,
  ];
  const uncertainOrMissing: string[] = [];

  if (result.input.unknownTime) {
    uncertainOrMissing.push('출생 시각 미상 — 시주(말년·자식·결과물 궁)를 제외한 삼주 기준 분석이며, 시주 관련 판단은 확신도 낮음/중간으로 구분 필요');
  } else {
    confirmed.push(
      `출생 시각: ${result.input.timeStr} → 보정 시각 ${result.adjustedTimeStr} (${result.solarTimeDetail.correctionLabel}, ${result.input.yajasi ? '야자시 적용' : '조자시 기준'})`
    );
  }
  if (result.kasiInfo) {
    confirmed.push(
      `한국천문연구원(KASI) 확정 음력: ${result.kasiInfo.lunYear}-${result.kasiInfo.lunMonth}-${result.kasiInfo.lunDay} (${result.kasiInfo.lunLeapmonth}달)`
    );
  } else {
    uncertainOrMissing.push('KASI 음력 교차 데이터 미연동 (자체 천문 태양황경·JDN 60갑자 계산 기준)');
  }

  return {
    basic: {
      name: result.input.name,
      gender: result.input.gender === 'M' ? '남성(건명)' : '여성(곤명)',
      currentYear: nowYear,
      currentKoreanAge: currentAge,
      canonicalGanji,
      sijin: sijinSummary,
      correctionApplied: result.solarTimeDetail.correctionLabel,
      solarBirth: `${result.input.solarDateStr} ${result.input.unknownTime ? '(시간 미상)' : result.input.timeStr}`,
      trueSolarBirth: result.adjustedTimeStr,
      birthPlace: `${result.place.name} (${result.place.longitude.toFixed(2)}°E, ${result.place.timezone})`,
      solarTerm: result.currentTermInfo.name,
      wolryeong: `${result.wolryeong.stem.kor}(${result.wolryeong.stem.hanja})`,
      unknownTime: result.input.unknownTime,
      yajasiApplied: result.input.yajasi,
      lunarInfo: result.kasiInfo
        ? `${result.kasiInfo.lunYear}-${result.kasiInfo.lunMonth}-${result.kasiInfo.lunDay} (${result.kasiInfo.lunLeapmonth}달)`
        : undefined,
    },
    dataQuality: {
      confirmed,
      uncertainOrMissing,
    },
    pillars: orderedPillars.map((p) =>
      p.empty
        ? {
            pillar: `${p.label}(${p.hanjaLabel})`,
            stem: '미상',
            branch: '미상',
            stemTenGod: '-',
            branchTenGod: '-',
            hiddenStems: [],
            stage12: '-',
            napeum: '-',
            pillarSinsal: [],
          }
        : {
            pillar: `${p.label}(${p.hanjaLabel})`,
            stem: `${p.stemObj!.kor}${p.stemObj!.hanja}(${ELEMENTS[p.stemObj!.el].kor}${p.stemObj!.pol ? '양' : '음'})`,
            branch: `${p.branchObj!.kor}${p.branchObj!.hanja}(${ELEMENTS[p.branchObj!.el].kor})`,
            stemTenGod: p.stemTenGod || '-',
            branchTenGod: p.branchTenGod || '-',
            hiddenStems: (p.hiddenStems || []).map(
              (h) => `${h.stem.kor}${h.stem.hanja}(${h.tenGod})`
            ),
            stage12: `${p.stage12}(${p.selfStage12})`,
            napeum: p.napeum ? `${p.napeum.kor}(${p.napeum.hanja})` : '-',
            pillarSinsal: [
              ...(p.gongmangLabels || []),
              ...(p.sinsal12 || []),
              ...(p.specialStars || []).map((s) => s.name),
            ],
          }
    ),
    elements: ELEMENTS.map((el) => ({
      element: `${el.kor}(${el.hanja})`,
      count: result.elCount[el.idx],
      weightedScore: result.elWeight[el.idx],
    })),
    strength: {
      label: result.strengthLabel,
      selfAndResourcePercent: result.strengthRatio,
      yongshinCandidates: result.yongshinEls.map(
        (i) => `${ELEMENTS[i].kor}(${ELEMENTS[i].hanja})`
      ),
    },
    geokguk: {
      name: `${result.geokguk.name}(${result.geokguk.hanja})`,
      basis: result.geokguk.basis,
      summary: result.geokguk.summary,
    },
    yongshinProfile: {
      method: result.yongshinProfile.method,
      yongshin: result.yongshinProfile.yongshin.map(
        (x) => `${ELEMENTS[x.el].kor}(${ELEMENTS[x.el].hanja}, ${x.tenGodGroup}) — ${x.reason}`
      ),
      heeshin: result.yongshinProfile.heeshin.map(
        (x) => `${ELEMENTS[x.el].kor}(${ELEMENTS[x.el].hanja}, ${x.tenGodGroup}) — ${x.reason}`
      ),
      gishin: result.yongshinProfile.gishin.map(
        (x) => `${ELEMENTS[x.el].kor}(${ELEMENTS[x.el].hanja}, ${x.tenGodGroup}) — ${x.reason}`
      ),
      gushin: result.yongshinProfile.gushin.map(
        (x) => `${ELEMENTS[x.el].kor}(${ELEMENTS[x.el].hanja}, ${x.tenGodGroup}) — ${x.reason}`
      ),
      rationale: result.yongshinProfile.rationale,
    },
    structureDiagnostics: result.structureDiagnostics.map(
      (d) => `${d.title}${d.hanja ? `(${d.hanja})` : ''}: ${d.detail}`
    ),
    gongmang: {
      year: result.yearGongmang.map((b) => `${BRANCHES[b].kor}(${BRANCHES[b].hanja})`),
      day: result.gongmang.map((b) => `${BRANCHES[b].kor}(${BRANCHES[b].hanja})`),
    },
    cheoneulBranches: result.cheoneulBranches.map(
      (b) => `${BRANCHES[b].kor}(${BRANCHES[b].hanja}·${BRANCHES[b].animal}띠)`
    ),
    relations: result.relations.map((r) => `${r.category}: ${r.title}`),
    sinsal: result.sinsal.map((s) => `${s.name}(${s.hanja})`),
    daewoon: {
      direction: result.daewoonMeta.isForward ? '순행' : '역행',
      startAge: result.daewoonMeta.daewoonNum,
      currentDaewoon: activeDw
        ? `${activeDw.age}~${activeDw.endAge}세(${activeDw.year}~${activeDw.year + 9}년) ${activeDw.stem.kor}${activeDw.branch.kor}(${activeDw.stem.hanja}${activeDw.branch.hanja}, ${activeDw.stemTG}/${activeDw.branchTG}, ${activeDw.stage12}, 판정:${activeDw.assessment.verdict})`
        : null,
      sequence: result.daewoons.map((dw) => ({
        period: `${dw.age}~${dw.endAge}세 (${dw.year}~${dw.year + 9}년)`,
        ganji: `${dw.stem.kor}${dw.branch.kor}(${dw.stem.hanja}${dw.branch.hanja})`,
        tenGods: `${dw.stemTG}/${dw.branchTG}`,
        stage12: dw.stage12,
        sinsal12: dw.sinsal12,
        verdict: dw.assessment.verdict,
        interactions: dw.assessment.interactions.map((it) => `${it.label}[${it.target}]`),
      })),
    },
    currentYearSewoon: currentSw
      ? `${currentSw.year}년(${currentSw.age}세) ${currentSw.stem.kor}${currentSw.branch.kor}(${currentSw.stem.hanja}${currentSw.branch.hanja}, ${currentSw.stemTG}/${currentSw.branchTG}, ${currentSw.stage12}, 판정:${currentSw.assessment.verdict})`
      : null,
    nextThreeYearsSewoon: threeYearSewoons,
    sewoonWindow: sewoonWindowRaw.map((sw) => ({
      year: sw.year,
      age: sw.age,
      ganji: `${sw.stem.kor}${sw.branch.kor}(${sw.stem.hanja}${sw.branch.hanja})`,
      tenGods: `${sw.stemTG}/${sw.branchTG}`,
      stage12: sw.stage12,
      sinsal12: sw.sinsal12,
      verdict: sw.assessment.verdict,
      interactions: sw.assessment.interactions.map((it) => `${it.label}[${it.target}]`),
    })),
    currentYearWolwoon: currentYearWolwoons.map((mw) => ({
      month: mw.month,
      ganji: `${mw.stem.kor}${mw.branch.kor}(${mw.stem.hanja}${mw.branch.hanja})`,
      tenGods: `${mw.stemTG}/${mw.branchTG}`,
      verdict: mw.assessment.verdict,
      keyInteractions: mw.assessment.interactions
        .filter((it) => it.category !== '공망')
        .map((it) => `${it.label}[${it.target}]`),
    })),
  };
}
