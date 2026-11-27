import {
  BRANCHES,
  ELEMENTS,
  SOLAR_TERMS_12,
  STAGE12_NAMES,
  STAGE12_START,
  STEMS,
} from './sajuData';
import type {
  BirthPlace,
  CalendarType,
  DaewoonItem,
  Gender,
  KasiCalendarInfo,
  PillarData,
  RelationItem,
  SajuPromptPayload,
  SajuResult,
  SewoonItem,
  SinsalItem,
} from '../types/saju';

export const mod = (n: number, m: number): number => ((n % m) + m) % m;

/**
 * Julian Date (UTC) from calendar date
 */
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

/**
 * Convert Julian Date (UTC) to formatted date string in target UTC offset
 */
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

/**
 * Jean Meeus apparent solar ecliptic longitude (degrees 0..360)
 */
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

/**
 * Newton-like iteration to pinpoint solar term crossing JD
 */
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

/**
 * IANA timezone UTC offset in hours on specific birth date (automatically reflects historical DST)
 */
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

/**
 * Equation of Time (minutes)
 */
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

export function getStage12(dayStemIdx: number, branchIdx: number): string {
  const rule = STAGE12_START[dayStemIdx];
  const offset =
    rule.dir === 1 ? mod(branchIdx - rule.br, 12) : mod(rule.br - branchIdx, 12);
  return STAGE12_NAMES[offset];
}

export function getGongmang(stemIdx: number, branchIdx: number): [number, number] {
  const xunStart = mod(branchIdx - stemIdx, 12);
  return [mod(xunStart - 2, 12), mod(xunStart - 1, 12)];
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

export function buildSewoonsForRange(
  startYear: number,
  count: number,
  birthYear: number,
  dayStem: number
): SewoonItem[] {
  const nowYear = new Date().getFullYear();
  const list: SewoonItem[] = [];
  for (let i = 0; i < count; i++) {
    const yr = startYear + i;
    const s = mod(yr - 4, 10);
    const b = mod(yr - 4, 12);
    list.push({
      year: yr,
      age: yr - birthYear + 1,
      isCurrent: yr === nowYear,
      stem: STEMS[s],
      branch: BRANCHES[b],
      stemTG: getTenGod(dayStem, s),
      branchTG: getTenGod(dayStem, BRANCHES[b].mainStem),
      stage12: getStage12(dayStem, b),
    });
  }
  return list;
}

function analyzeRelations(pillars: PillarData[]): RelationItem[] {
  const active = pillars.filter((p) => !p.empty && p.stem !== null && p.branch !== null);
  const res: RelationItem[] = [];
  const stems = active.map((p) => p.stem as number);
  const branches = active.map((p) => p.branch as number);

  const stemCombos: Array<[number, number, string, string]> = [
    [0, 5, '갑기합토(甲己合土)', '중정지합 — 신뢰와 포용으로 실리를 묶는 조화'],
    [1, 6, '을경합금(乙庚合金)', '인의지합 — 유연함과 결단력이 결합해 성과를 이루는 합'],
    [2, 7, '병신합수(丙辛合水)', '위제지합 — 열정과 섬세함이 만나 지혜로 승화되는 합'],
    [3, 8, '정임합목(丁壬合木)', '인수지합 — 깊은 감성과 넓은 시야가 어우러지는 합'],
    [4, 9, '무계합화(戊癸合火)', '무정지합 — 묵직한 현실감과 기지가 만나 새로운 활력을 빚는 합'],
  ];
  stemCombos.forEach(([a, b, title, detail]) => {
    if (stems.includes(a) && stems.includes(b)) {
      res.push({ category: '천간합', type: 'good', title, detail });
    }
  });

  const branchSixCombos: Array<[number, number, string, string]> = [
    [0, 1, '자축합(子丑合)', '안정적으로 결속하여 기반을 굳히는 육합'],
    [2, 11, '인해합(寅亥合)', '생기 있는 목(木) 기운으로 성장 동력을 키우는 육합'],
    [3, 10, '묘술합(卯戌合)', '따뜻한 협력과 표현력을 살려주는 육합'],
    [4, 9, '진유합(辰酉合)', '결실과 실무 완성도를 높여주는 육합'],
    [5, 8, '사신합(巳申合)', '변화 속에서 기민하게 조율하는 합(형·합 병존)'],
    [6, 7, '오미합(午未合)', '따뜻한 유대와 온화한 결집력을 주는 육합'],
  ];
  branchSixCombos.forEach(([a, b, title, detail]) => {
    if (branches.includes(a) && branches.includes(b)) {
      res.push({ category: '지지육합', type: 'good', title, detail });
    }
  });

  const triads: Array<{ arr: [number, number, number]; name: string }> = [
    { arr: [8, 0, 4], name: '신자진(申子辰) 수국' },
    { arr: [11, 3, 7], name: '해묘미(亥卯未) 목국' },
    { arr: [2, 6, 10], name: '인오술(寅午戌) 화국' },
    { arr: [5, 9, 1], name: '사유축(巳酉丑) 금국' },
  ];
  triads.forEach((s) => {
    const matched = s.arr.filter((x) => branches.includes(x));
    if (matched.length === 3) {
      res.push({
        category: '삼합',
        type: 'good',
        title: s.name,
        detail: '세 지지가 온전히 모여 강력한 오행 국(局)을 형성합니다.',
      });
    } else if (matched.length === 2 && matched.includes(s.arr[1])) {
      res.push({
        category: '반합',
        type: 'good',
        title: s.name,
        detail: '왕지(중심 지지)를 포함해 두 지지가 강하게 결집하는 반합입니다.',
      });
    }
  });

  const clashes: Array<[number, number, string, string]> = [
    [0, 6, '자오충(子午沖)', '수·화 정면 충돌 — 감정 기복·변동수가 크나 강한 돌파력을 동반'],
    [1, 7, '축미충(丑未沖)', '토의 개고(開庫) — 기반 재정비와 새로운 전환의 계기'],
    [2, 8, '인신충(寅申沖)', '역마성 충돌 — 이동·출장·환경 변화가 잦고 활동성이 강함'],
    [3, 9, '묘유충(卯酉沖)', '도화성 충돌 — 관계·심리적 예민함과 날카로운 심미안'],
    [4, 10, '진술충(辰戌沖)', '고지(庫地) 충돌 — 큰 변화나 독자적 노선을 개척하는 힘'],
    [5, 11, '사해충(巳亥沖)', '역마·수화 충돌 — 분주한 대외 활동과 빠른 사고 전환'],
  ];
  clashes.forEach(([a, b, title, detail]) => {
    if (branches.includes(a) && branches.includes(b)) {
      res.push({ category: '지지충', type: 'warn', title, detail });
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
  return res;
}

function analyzeSinsal(
  pillars: PillarData[],
  dayStem: number,
  yearBranch: number,
  dayBranch: number
): SinsalItem[] {
  const activeBranches = pillars
    .filter((p) => !p.empty && p.branch !== null)
    .map((p) => p.branch as number);
  const list: SinsalItem[] = [];

  const gwiinMap: Record<number, number[]> = {
    0: [1, 7],
    4: [1, 7],
    6: [1, 7],
    1: [0, 8],
    5: [0, 8],
    2: [11, 9],
    3: [11, 9],
    7: [2, 6],
    8: [3, 5],
    9: [3, 5],
  };
  const gwiinHits = (gwiinMap[dayStem] || []).filter((b) => activeBranches.includes(b));
  if (gwiinHits.length > 0) {
    const chars = gwiinHits.map((b) => `${BRANCHES[b].kor}(${BRANCHES[b].hanja})`).join(', ');
    list.push({
      type: 'good',
      name: `천을귀인 · ${chars}`,
      hanja: '天乙貴人',
      detail: '명리학 최고의 길신으로, 어려운 고비마다 조력자와 귀인의 도움을 받습니다.',
    });
  }

  const checkTriad = (br: number) =>
    [2, 6, 10].includes(br)
      ? { dohwa: 3, yeokma: 8, hwagae: 10 }
      : [8, 0, 4].includes(br)
        ? { dohwa: 9, yeokma: 2, hwagae: 4 }
        : [5, 9, 1].includes(br)
          ? { dohwa: 6, yeokma: 11, hwagae: 1 }
          : { dohwa: 0, yeokma: 5, hwagae: 7 };

  const r1 = checkTriad(yearBranch);
  const r2 = checkTriad(dayBranch);
  const hasAny = (arr: number[]) => arr.some((t) => activeBranches.includes(t));

  if (hasAny([r1.dohwa, r2.dohwa])) {
    list.push({
      type: 'neutral',
      name: '도화살',
      hanja: '桃花殺',
      detail: '타인의 시선을 끄는 매력, 대중적 호감, 예술적 표현력과 감각이 돋보입니다.',
    });
  }
  if (hasAny([r1.yeokma, r2.yeokma])) {
    list.push({
      type: 'neutral',
      name: '역마살',
      hanja: '驛馬殺',
      detail: '이동수·해외 인연·변동성이 크며 넓게 움직일수록 기회와 성취가 커집니다.',
    });
  }
  if (hasAny([r1.hwagae, r2.hwagae])) {
    list.push({
      type: 'neutral',
      name: '화개살',
      hanja: '華蓋殺',
      detail: '깊은 사색과 철학·학문·예술적 재능을 지니며 내면의 성숙도가 높습니다.',
    });
  }

  const iljuKey = `${STEMS[dayStem].kor}${BRANCHES[dayBranch].kor}`;
  if (['경진', '경술', '임진', '임술', '무술'].includes(iljuKey)) {
    list.push({
      type: 'good',
      name: `괴강살 · ${iljuKey}일주`,
      hanja: '魁罡殺',
      detail: '총명하고 강인한 카리스마와 결단력으로 큰 성취를 이루는 대장부 기질입니다.',
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
  trueSolar: boolean;
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
    trueSolar,
    includeEoT,
    yajasi,
    place,
    kasiInfo,
  } = params;

  const [y, m, d] = solarDateStr.split('-').map(Number);
  let hh = 12;
  let mm = 0;
  if (!unknownTime && timeStr) {
    const parts = timeStr.split(':').map(Number);
    hh = parts[0] ?? 12;
    mm = parts[1] ?? 0;
  }

  // 출생지 시간대의 출생일 정확한 UTC 오프셋 계산 (과거 서머타임 자동 반영)
  const utcOffsetHours = getTimezoneOffsetHours(place.timezone, y, m, d, hh);
  const birthJD_UTC = toJulianDate(y, m, d, hh + mm / 60 - utcOffsetHours);

  // 출생지 경도 기반 진태양시 보정 계산
  const stdMeridian = utcOffsetHours * 15;
  const lonCorrMin = (place.longitude - stdMeridian) * 4;
  const eotCorrMin = includeEoT ? getEquationOfTimeMinutes(y, m, d) : 0;
  const totalCorrMin = !unknownTime && trueSolar ? lonCorrMin + eotCorrMin : 0;

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

  // 3) 일주 (율리우스 적일 JDN 기반 60갑자 + 조자시/야자시 분기)
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

  const pillars: PillarData[] = rawPillars.map((p) => {
    if (p.stem === null || p.branch === null) {
      return { ...p, empty: true };
    }
    const br = BRANCHES[p.branch];
    const hiddenRoles: Array<'여기' | '중기' | '정기'> =
      br.hidden.length === 2 ? ['여기', '정기'] : ['여기', '중기', '정기'];
    return {
      ...p,
      empty: false,
      stemObj: STEMS[p.stem],
      branchObj: br,
      stemTenGod: p.key === 'day' ? '일간(본원)' : getTenGod(dayStem, p.stem),
      branchTenGod: getTenGod(dayStem, br.mainStem),
      stage12: getStage12(dayStem, p.branch),
      hiddenStems: br.hidden.map((hIdx, idx) => ({
        stem: STEMS[hIdx],
        role: hiddenRoles[idx],
      })),
    };
  });

  // 5) 오행 분포 & 월지 가중치 기반 신강/신약 및 용신 후보
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
  let yongshinEls: number[] = [];
  if (strengthRatio >= 56) {
    strengthLabel = strengthRatio >= 68 ? '극신강(極身强)' : '신강(身强)';
    yongshinEls = [mod(dayEl + 1, 5), mod(dayEl + 2, 5), mod(dayEl + 3, 5)];
  } else if (strengthRatio <= 42) {
    strengthLabel = strengthRatio <= 30 ? '극신약(極身弱)' : '신약(身弱)';
    yongshinEls = [resourceEl, dayEl];
  } else {
    const minVal = Math.min(...elWeight);
    yongshinEls = elWeight
      .map((v, i) => ({ v, i }))
      .filter((x) => x.v === minVal)
      .map((x) => x.i);
  }

  // 6) 합·충, 신살, 공망, 십성 그룹 집계
  const relations = analyzeRelations(pillars);
  const sinsal = analyzeSinsal(pillars, dayStem, yearBranch, dayBranch);
  const gongmang = getGongmang(dayStem, dayBranch);

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

  // 7) 대운 (양남음녀 순행 / 음남양녀 역행, 절입일 3일=1년)
  const isYangYear = STEMS[yearStem].pol === 1;
  const isForward = (isYangYear && gender === 'M') || (!isYangYear && gender === 'F');
  const daysToTerm = Math.max(
    0,
    isForward ? nextTermJD - birthJD_UTC : birthJD_UTC - prevTermJD
  );
  const daewoonNum = Math.max(1, Math.min(10, Math.round(daysToTerm / 3)));

  const daewoons: DaewoonItem[] = [];
  for (let i = 1; i <= 9; i++) {
    const step = isForward ? i : -i;
    const s = mod(monthStem + step, 10);
    const b = mod(monthBranch + step, 12);
    const startAge = daewoonNum + (i - 1) * 10;
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
    });
  }

  // 8) 기본 세운 (현재 연도 기준 -2 ~ +7년)
  const nowYear = new Date().getFullYear();
  const sewoons = buildSewoonsForRange(nowYear - 2, 10, y, dayStem);

  return {
    input: {
      name: name.trim() || '명조',
      gender,
      solarDateStr,
      timeStr,
      unknownTime,
      trueSolar,
      includeEoT,
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
    },
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
    elCount,
    elWeight,
    strengthRatio,
    strengthLabel,
    yongshinEls,
    relations,
    sinsal,
    gongmang,
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
  const currentAge = new Date().getFullYear() - birthYear + 1;
  const activeDw =
    result.daewoons.find((dw) => currentAge >= dw.age && currentAge <= dw.endAge) ?? null;
  const currentSw = result.sewoons.find((sw) => sw.isCurrent) ?? null;

  return {
    basic: {
      name: result.input.name,
      gender: result.input.gender === 'M' ? '남성(건명)' : '여성(곤명)',
      solarBirth: `${result.input.solarDateStr} ${result.input.unknownTime ? '(시간 미상)' : result.input.timeStr}`,
      trueSolarBirth: result.adjustedTimeStr,
      birthPlace: `${result.place.name} (${result.place.longitude.toFixed(2)}°E, ${result.place.timezone})`,
      solarTerm: result.currentTermInfo.name,
      unknownTime: result.input.unknownTime,
      yajasiApplied: result.input.yajasi,
      lunarInfo: result.kasiInfo
        ? `${result.kasiInfo.lunYear}-${result.kasiInfo.lunMonth}-${result.kasiInfo.lunDay} (${result.kasiInfo.lunLeapmonth}달)`
        : undefined,
    },
    pillars: result.pillars.map((p) =>
      p.empty
        ? {
            pillar: `${p.label}(${p.hanjaLabel})`,
            stem: '미상',
            branch: '미상',
            stemTenGod: '-',
            branchTenGod: '-',
            hiddenStems: [],
            stage12: '-',
          }
        : {
            pillar: `${p.label}(${p.hanjaLabel})`,
            stem: `${p.stemObj!.kor}${p.stemObj!.hanja}(${ELEMENTS[p.stemObj!.el].kor}${p.stemObj!.pol ? '양' : '음'})`,
            branch: `${p.branchObj!.kor}${p.branchObj!.hanja}(${ELEMENTS[p.branchObj!.el].kor})`,
            stemTenGod: p.stemTenGod || '-',
            branchTenGod: p.branchTenGod || '-',
            hiddenStems: (p.hiddenStems || []).map(
              (h) => `${h.stem.kor}${h.stem.hanja}(${h.role})`
            ),
            stage12: p.stage12 || '-',
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
    gongmang: result.gongmang.map((b) => `${BRANCHES[b].kor}(${BRANCHES[b].hanja})`),
    relations: result.relations.map((r) => `${r.category}: ${r.title}`),
    sinsal: result.sinsal.map((s) => `${s.name}(${s.hanja})`),
    daewoon: {
      direction: result.daewoonMeta.isForward ? '순행' : '역행',
      startAge: result.daewoonMeta.daewoonNum,
      currentDaewoon: activeDw
        ? `${activeDw.age}~${activeDw.endAge}세 ${activeDw.stem.kor}${activeDw.branch.kor}(${activeDw.stem.hanja}${activeDw.branch.hanja}, ${activeDw.stemTG}/${activeDw.branchTG})`
        : null,
      sequence: result.daewoons.map(
        (dw) =>
          `${dw.age}세 ${dw.stem.hanja}${dw.branch.hanja}(${dw.stemTG}/${dw.branchTG})`
      ),
    },
    currentYearSewoon: currentSw
      ? `${currentSw.year}년 ${currentSw.stem.kor}${currentSw.branch.kor}(${currentSw.stem.hanja}${currentSw.branch.hanja}, ${currentSw.stemTG}/${currentSw.branchTG})`
      : null,
  };
}
