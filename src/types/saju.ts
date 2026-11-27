export type Gender = 'M' | 'F';
export type CalendarType = 'solar' | 'lunar' | 'lunar_leap';

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
  stage12?: string;
  hiddenStems?: Array<{ stem: StemInfo; role: '여기' | '중기' | '정기' }>;
}

export interface RelationItem {
  category: '천간합' | '지지육합' | '삼합' | '반합' | '지지충' | '안정';
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
  elCount: number[];
  elWeight: number[];
  strengthRatio: number;
  strengthLabel: string;
  yongshinEls: number[];
  relations: RelationItem[];
  sinsal: SinsalItem[];
  gongmang: [number, number];
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
  gongmang: string[];
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
