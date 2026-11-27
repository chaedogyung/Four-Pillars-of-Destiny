export type Gender = 'M' | 'F';
export type CalendarType = 'solar' | 'lunar' | 'lunar_leap';
export type ThemeMode = 'light' | 'dark';
export type CycleDirection = 'ltr' | 'rtl';

export interface PillarVisibility {
  tenGods: boolean;
  sinsal: boolean;
  stage12: boolean;
  relations: boolean;
}

export interface StemInfo {
  idx: number;
  hanja: string;
  kor: string;
  el: number; // 0:목, 1:화, 2:토, 3:금, 4:수
  pol: 0 | 1; // 1:양, 0:음
}

export interface BranchInfo {
  idx: number;
  hanja: string;
  kor: string;
  animal: string;
  el: number;
  mainStem: number;
  hidden: number[]; // [여기, 중기?, 정기]
}

export interface ElementInfo {
  idx: number;
  kor: string;
  hanja: string;
  color: string;
  dir: string;
  num: string;
  habit: string;
  organ: string;
}

export interface BirthPlace {
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface KasiCalendarInfo {
  solYear: string;
  solMonth: string;
  solDay: string;
  lunYear: string;
  lunMonth: string;
  lunDay: string;
  lunLeapmonth: string;
  lunIljin?: string;
  lunSecha?: string;
  lunWolgeon?: string;
}

export interface NapeumInfo {
  kor: string;
  hanja: string;
  el: number;
}

export interface PillarSpecialStar {
  name: string;
  tone: 'good' | 'warn' | 'neutral';
}

export interface PillarData {
  key: 'hour' | 'day' | 'month' | 'year';
  label: string;
  hanjaLabel: string;
  empty: boolean;
  stem: number | null;
  branch: number | null;
  stemObj?: StemInfo;
  branchObj?: BranchInfo;
  stemTenGod?: string;
  branchTenGod?: string;
  stage12?: string; // 봉법 (일간 기준)
  selfStage12?: string; // 거법/자좌 (각 주 천간 기준)
  napeum?: NapeumInfo;
  stemRelTags?: Array<{ label: string; type: 'good' | 'warn' }>;
  hiddenStems?: Array<{
    stem: StemInfo;
    role: '여기' | '중기' | '정기';
    tenGod: string;
  }>;
  gongmangLabels?: string[]; // ['[년]공망', '[일]공망']
  sinsal12?: string[]; // 년지·일지 기준 12신살
  specialStars?: PillarSpecialStar[]; // 길신·특수신살
}

export interface BranchMatrixRow {
  id: string;
  type: 'good' | 'warn' | 'neutral';
  cells: Record<'hour' | 'day' | 'month' | 'year', string>;
}

export interface RelationItem {
  category:
    | '천간합'
    | '천간충'
    | '지지육합'
    | '삼합'
    | '반합'
    | '방합'
    | '지지충'
    | '형'
    | '파'
    | '해'
    | '안정';
  type: 'good' | 'warn' | 'neutral';
  title: string;
  detail: string;
}

export interface SinsalItem {
  type: 'good' | 'warn' | 'neutral';
  name: string;
  hanja: string;
  detail: string;
}

export interface DaewoonItem {
  index: number;
  age: number;
  endAge: number;
  year: number;
  stem: StemInfo;
  branch: BranchInfo;
  stemTG: string;
  branchTG: string;
  stage12: string;
  sinsal12: string[];
}

export interface SewoonItem {
  year: number;
  age: number;
  isCurrent: boolean;
  stem: StemInfo;
  branch: BranchInfo;
  stemTG: string;
  branchTG: string;
  stage12: string;
  sinsal12: string[];
}

export interface WolwoonItem {
  month: number; // 1..12 (양력)
  year: number;
  isCurrentMonth: boolean;
  stem: StemInfo;
  branch: BranchInfo;
  stemTG: string;
  branchTG: string;
  stage12: string;
  sinsal12: string[];
}

export interface SajuFormInput {
  name: string;
  gender: Gender;
  calendarType: CalendarType;
  birthDate: string;
  birthTime: string;
  unknownTime: boolean;
  trueSolar: boolean;
  includeEoT: boolean;
  yajasi: boolean;
}

export interface SajuResult {
  input: {
    name: string;
    gender: Gender;
    solarDateStr: string;
    timeStr: string;
    unknownTime: boolean;
    trueSolar: boolean;
    includeEoT: boolean;
    yajasi: boolean;
    calendarType: CalendarType;
    originalInputDate: string;
  };
  place: BirthPlace;
  solarTimeDetail: {
    utcOffsetHours: number;
    lonCorrMin: number;
    eotCorrMin: number;
    totalCorrMin: number;
  };
  kasiInfo: KasiCalendarInfo | null;
  adjustedTimeStr: string;
  currentTermInfo: {
    deg: number;
    name: string;
    prevTermDateStr: string;
    nextTermName: string;
    nextTermDateStr: string;
    ipchunDateStr: string;
  };
  pillars: PillarData[];
  branchMatrixRows: BranchMatrixRow[];
  elCount: number[];
  elWeight: number[];
  strengthRatio: number;
  strengthLabel: string;
  yongshinEls: number[];
  relations: RelationItem[];
  sinsal: SinsalItem[];
  gongmang: [number, number]; // 일주 공망
  yearGongmang: [number, number]; // 연주 공망
  cheoneulBranches: number[]; // 천을귀인 지지
  wolryeong: {
    stem: StemInfo;
    elapsedDays: number;
  };
  daewoonMeta: {
    isForward: boolean;
    daewoonNum: number;
    daysToTerm: number;
  };
  daewoons: DaewoonItem[];
  sewoons: SewoonItem[];
  tenGodGroups: Record<'비겁' | '식상' | '재성' | '관성' | '인성', number>;
}

export interface SajuPromptPayload {
  basic: {
    name: string;
    gender: string;
    solarBirth: string;
    trueSolarBirth: string;
    birthPlace: string;
    solarTerm: string;
    wolryeong: string;
    unknownTime: boolean;
    yajasiApplied: boolean;
    lunarInfo?: string;
  };
  pillars: Array<{
    pillar: string;
    stem: string;
    branch: string;
    stemTenGod: string;
    branchTenGod: string;
    hiddenStems: string[];
    stage12: string;
    napeum: string;
    pillarSinsal: string[];
  }>;
  elements: Array<{
    element: string;
    count: number;
    weightedScore: number;
  }>;
  strength: {
    label: string;
    selfAndResourcePercent: number;
    yongshinCandidates: string[];
  };
  gongmang: {
    year: string[];
    day: string[];
  };
  relations: string[];
  sinsal: string[];
  daewoon: {
    direction: string;
    startAge: number;
    currentDaewoon: string | null;
    sequence: string[];
  };
  currentYearSewoon: string | null;
}
