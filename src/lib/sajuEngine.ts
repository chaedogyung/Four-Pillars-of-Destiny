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
  KasiCalendarInfo,
  NapeumInfo,
  PillarData,
  PillarSpecialStar,
  RelationItem,
  SajuPromptPayload,
  SajuResult,
  SewoonItem,
  SinsalItem,
  WolwoonItem,
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
 * 년지 기준 + 일지 기준 12신살 병기 (중복 제거)
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
 * 절입 경과일 기준 월령(지장간 당령 천간) 산출
 */
export function getWolryeong(monthBranch: number, elapsedDays: number): {
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

export function buildSewoonsForRange(
  startYear: number,
  count: number,
  birthYear: number,
  dayStem: number,
  yearBranch: number,
  dayBranch: number
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
      sinsal12: getCombinedSinsal12(yearBranch, dayBranch, b),
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
  dayBranch: number
): WolwoonItem[] {
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const currYearStem = mod(targetYear - 4, 10);
  const prevYearStem = mod(targetYear - 5, 10);

  const list: WolwoonItem[] = [];
  for (let m = 1; m <= 12; m++) {
    let s: number;
    let b: number;
    if (m === 1) {
      // 양력 1월은 소한~입춘 전이므로 전년 12월(축월, monthOrder=11)
      b = 1;
      s = mod((prevYearStem % 5) * 2 + 2 + 11, 10);
    } else {
      const monthOrder = m - 2; // 2월=0(인월) .. 12월=10(자월)
      b = mod(monthOrder + 2, 12);
      s = mod((currYearStem % 5) * 2 + 2 + monthOrder, 10);
    }
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
    });
  }
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

  // 천을귀인
  if (getCheoneulBranches(dayStem).includes(branch)) {
    push('천을귀인', 'good');
  }

  // 월덕귀인 (월지 삼합 -> 천간)
  const woldeokStem = [2, 6, 10].includes(monthBranch)
    ? 2
    : [8, 0, 4].includes(monthBranch)
      ? 8
      : [11, 3, 7].includes(monthBranch)
        ? 0
        : 6;
  if (stem === woldeokStem) push('월덕귀인', 'good');

  // 천덕귀인 (월지 -> 천간/지지)
  const cheondeokByStem: Record<number, number> = {
    2: 3, // 寅->丁
    4: 8, // 辰->壬
    5: 7, // 巳->辛
    7: 0, // 未->甲
    8: 9, // 申->癸
    10: 2, // 戌->丙
    11: 1, // 亥->乙
    1: 6, // 丑->庚
  };
  const cheondeokByBranch: Record<number, number> = {
    3: 8, // 卯->申
    6: 11, // 午->亥
    9: 2, // 酉->寅
    0: 5, // 子->巳
  };
  if (
    cheondeokByStem[monthBranch] === stem ||
    cheondeokByBranch[monthBranch] === branch
  ) {
    push('천덕귀인', 'good');
  }

  // 복성귀인 (일간 -> 지지)
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

  // 건록 (일간 -> 지지)
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

  // 양인살 (양간 -> 지지)
  const yanginMap: Record<number, number> = {
    0: 3,
    2: 6,
    4: 6,
    6: 9,
    8: 0,
  };
  if (yanginMap[dayStem] === branch) push('양인살', 'warn');

  // 금여 (일간 -> 지지)
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

  // 백호살 (7간지)
  const ganjiKey = `${STEMS[stem].kor}${BRANCHES[branch].kor}`;
  if (['갑진', '을미', '병술', '정축', '무진', '임술', '계축'].includes(ganjiKey)) {
    push('백호살', 'warn');
  }

  // 괴강살
  if (['경진', '경술', '임진', '임술', '무술'].includes(ganjiKey)) {
    push('괴강살', 'good');
  }

  // 현침살 (甲·辛 천간 또는 卯·午·申 지지)
  if ([0, 7].includes(stem) || [3, 6, 8].includes(branch)) {
    push('현침살', 'neutral');
  }

  // 귀문관살 (일지와 짝 이루는 지지)
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

  // 협록 (건록 지지 양옆 지지가 원국에 모두 존재할 때 해당 기둥에 표기)
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
  stemRelByKey: Record<'hour' | 'day' | 'month' | 'year', Array<{ label: string; type: 'good' | 'warn' }>>;
  branchMatrixRows: BranchMatrixRow[];
} {
  const active = pillars.filter((p) => !p.empty && p.stem !== null && p.branch !== null);
  const res: RelationItem[] = [];
  const stemRelByKey: Record<
    'hour' | 'day' | 'month' | 'year',
    Array<{ label: string; type: 'good' | 'warn' }>
  > = { hour: [], day: [], month: [], year: [] };
  const branchMatrixRows: BranchMatrixRow[] = [];

  const pushStemTag = (key: 'hour' | 'day' | 'month' | 'year', label: string, type: 'good' | 'warn') => {
    if (!stemRelByKey[key].some((t) => t.label === label)) {
      stemRelByKey[key].push({ label, type });
    }
  };

  const stems = active.map((p) => p.stem as number);
  const branches = active.map((p) => p.branch as number);

  // 1) 천간합
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
      active.forEach((p) => {
        if (p.stem === a || p.stem === b) pushStemTag(p.key, '합', 'good');
      });
    }
  });

  // 2) 천간충 (4충)
  const stemClashes: Array<[number, number, string, string]> = [
    [0, 6, '갑경충(甲庚沖)', '목·금 정면 대립 — 결단과 개혁의 강한 추진력'],
    [1, 7, '을신충(乙辛沖)', '유연함과 예리함의 긴장 — 섬세한 조율과 변화'],
    [2, 8, '병임충(丙壬沖)', '태양과 큰 물의 교차 — 역동적 에너지와 큰 스케일'],
    [3, 9, '정계충(丁癸沖)', '내면 불꽃과 지혜의 긴장 — 예민한 통찰과 심리 변화'],
  ];
  stemClashes.forEach(([a, b, title, detail]) => {
    if (stems.includes(a) && stems.includes(b)) {
      res.push({ category: '천간충', type: 'warn', title, detail });
      active.forEach((p) => {
        if (p.stem === a || p.stem === b) pushStemTag(p.key, '충', 'warn');
      });
    }
  });

  // 매트릭스 생성 도우미
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
  const branchSixCombos: Array<[number, number, string, string]> = [
    [0, 1, '자축합(子丑合)', '안정적으로 결속하여 기반을 굳히는 육합'],
    [2, 11, '인해합(寅亥合)', '생기 있는 목(木) 기운으로 성장 동력을 키우는 육합'],
    [3, 10, '묘술합(卯戌合)', '따뜻한 협력과 표현력을 살려주는 육합'],
    [4, 9, '진유합(辰酉合)', '결실과 실무 완성도를 높여주는 육합'],
    [5, 8, '사신합(巳申合)', '변화 속에서 기민하게 조율하는 합'],
    [6, 7, '오미합(午未合)', '따뜻한 유대와 온화한 결집력을 주는 육합'],
  ];
  branchSixCombos.forEach(([a, b, title, detail]) => {
    const keys = active.filter((p) => p.branch === a || p.branch === b).map((p) => p.key);
    if (branches.includes(a) && branches.includes(b)) {
      res.push({ category: '지지육합', type: 'good', title, detail });
      makeRow(`six-${a}-${b}`, 'good', keys, '육합');
    }
  });

  // 4) 삼합 / 반합
  const triads: Array<{ arr: [number, number, number]; name: string }> = [
    { arr: [8, 0, 4], name: '신자진(申子辰) 수국' },
    { arr: [11, 3, 7], name: '해묘미(亥卯未) 목국' },
    { arr: [2, 6, 10], name: '인오술(寅午戌) 화국' },
    { arr: [5, 9, 1], name: '사유축(巳酉丑) 금국' },
  ];
  triads.forEach((s) => {
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
    } else if (matched.length === 2 && (matched.includes(s.arr[1]) || (matched.includes(s.arr[0]) && matched.includes(s.arr[2])))) {
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

  // 5) 방합 (동방·남방·서방·북방)
  const banghaps: Array<{ arr: [number, number, number]; name: string }> = [
    { arr: [2, 3, 4], name: '인묘진(寅卯辰) 동방 목국' },
    { arr: [5, 6, 7], name: '사오미(巳午未) 남방 화국' },
    { arr: [8, 9, 10], name: '신유술(申酉戌) 서방 금국' },
    { arr: [11, 0, 1], name: '해자축(亥子丑) 북방 수국' },
  ];
  banghaps.forEach((bh) => {
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
      const keys = active.filter((p) => p.branch === a || p.branch === b).map((p) => p.key);
      res.push({ category: '지지충', type: 'warn', title, detail });
      makeRow(`clash-${a}-${b}`, 'warn', keys, '충');
    }
  });

  // 7) 지지 형(刑)
  const threeHyeong: Array<{ arr: [number, number, number]; name: string; detail: string }> = [
    {
      arr: [2, 5, 8],
      name: '인사신(寅巳申) 삼형',
      detail: '무은지형 — 강한 추진력과 전문성 속에 갈등·변동을 조율해야 하는 작용',
    },
    {
      arr: [1, 10, 7],
      name: '축술미(丑戌未) 삼형',
      detail: '지세지형 — 신념과 고집이 강해지며 실무·조직 내 조정력이 요구되는 작용',
    },
  ];
  threeHyeong.forEach((h) => {
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
  const paPairs: Array<[number, number, string]> = [
    [0, 9, '자유파(子酉破)'],
    [3, 6, '묘오파(卯午破)'],
    [4, 1, '진축파(辰丑破)'],
    [10, 7, '술미파(戌未破)'],
    [2, 11, '인해파(寅亥破)'],
    [5, 8, '사신파(巳申破)'],
  ];
  paPairs.forEach(([a, b, title]) => {
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
  const haePairs: Array<[number, number, string]> = [
    [0, 7, '자미해(子未害)'],
    [1, 6, '축오해(丑午害)'],
    [2, 5, '인사해(寅巳害)'],
    [3, 4, '묘진해(卯辰害)'],
    [8, 11, '신해해(申亥害)'],
    [9, 10, '유술해(酉戌害)'],
  ];
  haePairs.forEach(([a, b, title]) => {
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
      detail: '강한 에너지와 돌파력을 뜻하며 전문성으로 승화하면 큰 성취를 이룹니다.',
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
      detail: '예리한 분석력·정밀한 기술·의료·IT·디자인 등 세밀한 전문 분야에 적성이 높습니다.',
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

  const utcOffsetHours = getTimezoneOffsetHours(place.timezone, y, m, d, hh);
  const birthJD_UTC = toJulianDate(y, m, d, hh + mm / 60 - utcOffsetHours);

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
      sinsal12: getCombinedSinsal12(yearBranch, dayBranch, p.branch),
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

  // 확장 형충회합 & 천간 합충 태그 반영
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

  // 6) 신살 요약 & 십성 그룹 집계
  const sinsal = analyzeSinsalSummary(pillars, dayStem, yearBranch, dayBranch);

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

  // 7) 대운 (12신살 포함)
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
      sinsal12: getCombinedSinsal12(yearBranch, dayBranch, b),
    });
  }

  // 8) 기본 세운 (현재 연도 기준 -3 ~ +6년, 12신살 포함)
  const nowYear = new Date().getFullYear();
  const sewoons = buildSewoonsForRange(nowYear - 3, 10, y, dayStem, yearBranch, dayBranch);

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
    branchMatrixRows,
    elCount,
    elWeight,
    strengthRatio,
    strengthLabel,
    yongshinEls,
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
      wolryeong: `${result.wolryeong.stem.kor}(${result.wolryeong.stem.hanja})`,
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
    gongmang: {
      year: result.yearGongmang.map((b) => `${BRANCHES[b].kor}(${BRANCHES[b].hanja})`),
      day: result.gongmang.map((b) => `${BRANCHES[b].kor}(${BRANCHES[b].hanja})`),
    },
    relations: result.relations.map((r) => `${r.category}: ${r.title}`),
    sinsal: result.sinsal.map((s) => `${s.name}(${s.hanja})`),
    daewoon: {
      direction: result.daewoonMeta.isForward ? '순행' : '역행',
      startAge: result.daewoonMeta.daewoonNum,
      currentDaewoon: activeDw
        ? `${activeDw.age}~${activeDw.endAge}세 ${activeDw.stem.kor}${activeDw.branch.kor}(${activeDw.stem.hanja}${activeDw.branch.hanja}, ${activeDw.stemTG}/${activeDw.branchTG}, ${activeDw.stage12})`
        : null,
      sequence: result.daewoons.map(
        (dw) =>
          `${dw.age}세 ${dw.stem.hanja}${dw.branch.hanja}(${dw.stemTG}/${dw.branchTG})`
      ),
    },
    currentYearSewoon: currentSw
      ? `${currentSw.year}년 ${currentSw.stem.kor}${currentSw.branch.kor}(${currentSw.stem.hanja}${currentSw.branch.hanja}, ${currentSw.stemTG}/${currentSw.branchTG}, ${currentSw.stage12})`
      : null,
  };
}
