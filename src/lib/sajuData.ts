import type { BirthPlace, BranchInfo, ElementInfo, NapeumInfo, StemInfo } from '../types/saju';

export const STEMS: StemInfo[] = [
  { idx: 0, hanja: '甲', kor: '갑', el: 0, pol: 1 },
  { idx: 1, hanja: '乙', kor: '을', el: 0, pol: 0 },
  { idx: 2, hanja: '丙', kor: '병', el: 1, pol: 1 },
  { idx: 3, hanja: '丁', kor: '정', el: 1, pol: 0 },
  { idx: 4, hanja: '戊', kor: '무', el: 2, pol: 1 },
  { idx: 5, hanja: '己', kor: '기', el: 2, pol: 0 },
  { idx: 6, hanja: '庚', kor: '경', el: 3, pol: 1 },
  { idx: 7, hanja: '辛', kor: '신', el: 3, pol: 0 },
  { idx: 8, hanja: '壬', kor: '임', el: 4, pol: 1 },
  { idx: 9, hanja: '癸', kor: '계', el: 4, pol: 0 },
];

export const BRANCHES: BranchInfo[] = [
  { idx: 0, hanja: '子', kor: '자', animal: '쥐', el: 4, mainStem: 9, hidden: [8, 9] },
  { idx: 1, hanja: '丑', kor: '축', animal: '소', el: 2, mainStem: 5, hidden: [9, 7, 5] },
  { idx: 2, hanja: '寅', kor: '인', animal: '호랑이', el: 0, mainStem: 0, hidden: [4, 2, 0] },
  { idx: 3, hanja: '卯', kor: '묘', animal: '토끼', el: 0, mainStem: 1, hidden: [0, 1] },
  { idx: 4, hanja: '辰', kor: '진', animal: '용', el: 2, mainStem: 4, hidden: [1, 9, 4] },
  { idx: 5, hanja: '巳', kor: '사', animal: '뱀', el: 1, mainStem: 2, hidden: [4, 6, 2] },
  { idx: 6, hanja: '午', kor: '오', animal: '말', el: 1, mainStem: 3, hidden: [2, 5, 3] },
  { idx: 7, hanja: '未', kor: '미', animal: '양', el: 2, mainStem: 5, hidden: [3, 1, 5] },
  { idx: 8, hanja: '申', kor: '신', animal: '원숭이', el: 3, mainStem: 6, hidden: [4, 8, 6] },
  { idx: 9, hanja: '酉', kor: '유', animal: '닭', el: 3, mainStem: 7, hidden: [6, 7] },
  { idx: 10, hanja: '戌', kor: '술', animal: '개', el: 2, mainStem: 4, hidden: [7, 3, 4] },
  { idx: 11, hanja: '亥', kor: '해', animal: '돼지', el: 4, mainStem: 8, hidden: [4, 0, 8] },
];

export const ELEMENTS: ElementInfo[] = [
  {
    idx: 0,
    kor: '목',
    hanja: '木',
    color: '청록·초록색',
    dir: '동쪽',
    num: '3, 8',
    habit: '아침 산책, 식물 가꾸기, 새로운 배움과 기획 활동',
    organ: '간·담·신경계',
  },
  {
    idx: 1,
    kor: '화',
    hanja: '火',
    color: '주홍·붉은색',
    dir: '남쪽',
    num: '2, 7',
    habit: '햇볕 쬐기, 유산소 운동, 발표·표현 및 적극적인 교류',
    organ: '심장·혈액순환·소장',
  },
  {
    idx: 2,
    kor: '토',
    hanja: '土',
    color: '황토·베이지색',
    dir: '중앙',
    num: '5, 0',
    habit: '규칙적인 식습관, 명상, 안정적인 저축 및 공간 정돈',
    organ: '위장·비장·소화기',
  },
  {
    idx: 3,
    kor: '금',
    hanja: '金',
    color: '백색·은회색',
    dir: '서쪽',
    num: '4, 9',
    habit: '정리정돈, 근력운동, 우선순위 결단과 절제된 루틴',
    organ: '폐·호흡기·대장',
  },
  {
    idx: 4,
    kor: '수',
    hanja: '水',
    color: '먹색·남색',
    dir: '북쪽',
    num: '1, 6',
    habit: '충분한 수분 섭취와 수면, 독서·사색, 물가 산책과 유연한 사고',
    organ: '신장·방광·내분비계',
  },
];

export const ELEMENT_STYLES: Record<
  number,
  { box: string; bar: string; text: string; subtle: string }
> = {
  0: {
    box: 'bg-wood-bg text-wood-fg border-wood-bd',
    bar: 'bg-[#287a54] dark:bg-[#2fa36c]',
    text: 'text-wood-fg',
    subtle: 'bg-wood-bg/70 text-wood-fg',
  },
  1: {
    box: 'bg-fire-bg text-fire-fg border-fire-bd',
    bar: 'bg-[#c54135] dark:bg-[#df594e]',
    text: 'text-fire-fg',
    subtle: 'bg-fire-bg/70 text-fire-fg',
  },
  2: {
    box: 'bg-earth-bg text-earth-fg border-earth-bd',
    bar: 'bg-[#c28e22] dark:bg-[#dca634]',
    text: 'text-earth-fg',
    subtle: 'bg-earth-bg/70 text-earth-fg',
  },
  3: {
    box: 'bg-metal-bg text-metal-fg border-metal-bd',
    bar: 'bg-[#737e88] dark:bg-[#9aa5b1]',
    text: 'text-metal-fg',
    subtle: 'bg-metal-bg/70 text-metal-fg',
  },
  4: {
    box: 'bg-water-bg text-water-fg border-water-bd',
    bar: 'bg-[#244e85] dark:bg-[#4980cb]',
    text: 'text-water-fg',
    subtle: 'bg-water-bg/70 text-water-fg',
  },
};

export const STAGE12_NAMES = [
  '장생',
  '목욕',
  '관대',
  '건록',
  '제왕',
  '쇠',
  '병',
  '사',
  '묘',
  '절',
  '태',
  '양',
] as const;

export const STAGE12_START: Array<{ br: number; dir: 1 | -1 }> = [
  { br: 11, dir: 1 }, // 甲: 亥 순행
  { br: 6, dir: -1 }, // 乙: 午 역행
  { br: 2, dir: 1 }, // 丙: 寅 순행
  { br: 9, dir: -1 }, // 丁: 酉 역행
  { br: 2, dir: 1 }, // 戊: 寅 순행
  { br: 9, dir: -1 }, // 己: 酉 역행
  { br: 5, dir: 1 }, // 庚: 巳 순행
  { br: 0, dir: -1 }, // 辛: 子 역행
  { br: 8, dir: 1 }, // 壬: 申 순행
  { br: 3, dir: -1 }, // 癸: 卯 역행
];

export const SINSAL12_NAMES = [
  '겁살',
  '재살',
  '천살',
  '지살',
  '년살',
  '월살',
  '망신살',
  '장성살',
  '반안살',
  '역마살',
  '육해살',
  '화개살',
] as const;

/**
 * 60갑자 납음오행 30쌍 (갑자/을축 = 0 ... 임술/계해 = 29)
 */
export const NAPEUM_30: NapeumInfo[] = [
  { kor: '해중금', hanja: '海中金', el: 3 },
  { kor: '노중화', hanja: '爐中火', el: 1 },
  { kor: '대림목', hanja: '大林木', el: 0 },
  { kor: '노방토', hanja: '路傍土', el: 2 },
  { kor: '검봉금', hanja: '劍鋒金', el: 3 },
  { kor: '산두화', hanja: '山頭火', el: 1 },
  { kor: '간하수', hanja: '澗下水', el: 4 },
  { kor: '성두토', hanja: '城頭土', el: 2 },
  { kor: '백납금', hanja: '白蠟金', el: 3 },
  { kor: '양류목', hanja: '楊柳木', el: 0 },
  { kor: '천중수', hanja: '泉中水', el: 4 },
  { kor: '옥상토', hanja: '屋上土', el: 2 },
  { kor: '벽력화', hanja: '霹靂火', el: 1 },
  { kor: '송백목', hanja: '松柏木', el: 0 },
  { kor: '장류수', hanja: '長流水', el: 4 },
  { kor: '사중금', hanja: '沙中金', el: 3 },
  { kor: '산하화', hanja: '山下火', el: 1 },
  { kor: '평지목', hanja: '平地木', el: 0 },
  { kor: '벽상토', hanja: '壁上土', el: 2 },
  { kor: '금박금', hanja: '金箔金', el: 3 },
  { kor: '복등화', hanja: '覆燈火', el: 1 },
  { kor: '천하수', hanja: '天河水', el: 4 },
  { kor: '대역토', hanja: '大驛土', el: 2 },
  { kor: '차천금', hanja: '釵釧金', el: 3 },
  { kor: '상자목', hanja: '桑柘木', el: 0 },
  { kor: '대계수', hanja: '大溪水', el: 4 },
  { kor: '사중토', hanja: '沙中土', el: 2 },
  { kor: '천상화', hanja: '天上火', el: 1 },
  { kor: '석류목', hanja: '石榴木', el: 0 },
  { kor: '대해수', hanja: '大海水', el: 4 },
];

/**
 * 월지별 지장간 사령(당령) 일수 분배표 (절입 경과일 기준)
 */
export const WOLRYEONG_SCHEDULE: Record<number, Array<{ stem: number; days: number }>> = {
  0: [
    { stem: 8, days: 10 },
    { stem: 9, days: 20 },
  ], // 子: 壬10 癸20
  1: [
    { stem: 9, days: 9 },
    { stem: 7, days: 3 },
    { stem: 5, days: 18 },
  ], // 丑: 癸9 辛3 己18
  2: [
    { stem: 4, days: 7 },
    { stem: 2, days: 7 },
    { stem: 0, days: 16 },
  ], // 寅: 戊7 丙7 甲16
  3: [
    { stem: 0, days: 10 },
    { stem: 1, days: 20 },
  ], // 卯: 甲10 乙20
  4: [
    { stem: 1, days: 9 },
    { stem: 9, days: 3 },
    { stem: 4, days: 18 },
  ], // 辰: 乙9 癸3 戊18
  5: [
    { stem: 4, days: 7 },
    { stem: 6, days: 7 },
    { stem: 2, days: 16 },
  ], // 巳: 戊7 庚7 丙16
  6: [
    { stem: 2, days: 10 },
    { stem: 5, days: 9 },
    { stem: 3, days: 11 },
  ], // 午: 丙10 己9 丁11
  7: [
    { stem: 3, days: 9 },
    { stem: 1, days: 3 },
    { stem: 5, days: 18 },
  ], // 未: 丁9 乙3 己18
  8: [
    { stem: 4, days: 7 },
    { stem: 8, days: 7 },
    { stem: 6, days: 16 },
  ], // 申: 戊7 壬7 庚16
  9: [
    { stem: 6, days: 10 },
    { stem: 7, days: 20 },
  ], // 酉: 庚10 辛20
  10: [
    { stem: 7, days: 9 },
    { stem: 3, days: 3 },
    { stem: 4, days: 18 },
  ], // 戌: 辛9 丁3 戊18
  11: [
    { stem: 4, days: 7 },
    { stem: 0, days: 7 },
    { stem: 8, days: 16 },
  ], // 亥: 戊7 甲7 壬16
};

export const SOLAR_TERMS_12 = [
  { deg: 315, name: '입춘(立春)' },
  { deg: 345, name: '경칩(驚蟄)' },
  { deg: 15, name: '청명(淸明)' },
  { deg: 45, name: '입하(立夏)' },
  { deg: 75, name: '망종(芒種)' },
  { deg: 105, name: '소서(小暑)' },
  { deg: 135, name: '입추(立秋)' },
  { deg: 165, name: '백로(白露)' },
  { deg: 195, name: '한로(寒露)' },
  { deg: 225, name: '입동(立冬)' },
  { deg: 255, name: '대설(大雪)' },
  { deg: 285, name: '소한(小寒)' },
] as const;

export const DAY_MASTER_PROFILES = [
  {
    title: '곧게 뻗어 나가는 거목, 갑목(甲木)',
    metaphor: '동량지목(棟樑之木)',
    core: '강한 추진력과 리더십, 개척 정신을 지닌 기질입니다. 자존심과 주관이 뚜렷하며 스스로 길을 열어갈 때 역량이 극대화됩니다.',
    advice: '강직함이 큰 장점이지만, 때로는 유연한 타협과 경청이 더 큰 성장을 돕습니다.',
  },
  {
    title: '유연하고 강인한 생명력, 을목(乙木)',
    metaphor: '화초지목(花草之木)',
    core: '섬세한 적응력과 친화력, 끈질긴 생존력을 갖춘 기질입니다. 어떤 환경에서도 뿌리를 내리고 현실적인 해법을 찾는 능력이 탁월합니다.',
    advice: '주변 상황에 흔들리지 않도록 자신만의 명확한 기준과 목표를 세우는 것이 중요합니다.',
  },
  {
    title: '세상을 비추는 태양, 병화(丙火)',
    metaphor: '태양지화(太陽之火)',
    core: '열정적이고 명랑하며 스케일이 큰 기질입니다. 솔직하고 존재감이 뚜렷해 주변에 활력을 불어넣으며, 직관력과 표현력이 뛰어납니다.',
    advice: '열정이 과하면 마무리가 약해질 수 있으므로 차분한 점검과 지속력을 기르면 완성도가 높아집니다.',
  },
  {
    title: '깊고 은은한 불꽃, 정화(丁火)',
    metaphor: '등촉지화(燈燭之火)',
    core: '따뜻한 배려심과 예리한 통찰력, 집중력을 겸비한 기질입니다. 겉으로는 온화해 보이지만 내면에 뜨거운 신념과 감수성을 품고 있습니다.',
    advice: '지나친 완벽주의로 스스로를 소진하지 않도록 마음의 여유와 휴식을 챙기세요.',
  },
  {
    title: '묵직하고 든든한 태산, 무토(戊土)',
    metaphor: '태산지토(泰山之土)',
    core: '신뢰감과 포용력이 크며 쉽게 흔들리지 않는 중후한 기질입니다. 책임감이 강하고 큰 판을 안정적으로 운영하는 힘이 있습니다.',
    advice: '변화에 다소 보수적일 수 있으니 새로운 흐름을 받아들이는 민첩함을 더하면 좋습니다.',
  },
  {
    title: '만물을 길러내는 비옥한 대지, 기토(己土)',
    metaphor: '전원지토(田園之土)',
    core: '실속 있고 꼼꼼하며 다재다능한 현실주의자 기질입니다. 타인의 마음을 잘 헤아리고 실무 처리와 중재 능력이 뛰어납니다.',
    advice: '생각이 많아 결정이 늦어질 수 있으므로 과감한 실행력을 보태면 크게 발전합니다.',
  },
  {
    title: '단단한 원석과 강철의 의지, 경금(庚金)',
    metaphor: '강철지금(鋼鐵之金)',
    core: '결단력, 의리, 공정함이 돋보이는 강인한 기질입니다. 어려운 과제를 돌파하고 비효율적인 시스템을 개혁하는 실행력이 탁월합니다.',
    advice: '직설적인 화법이 오해를 부를 수 있으니 부드러운 소통 기술을 익히면 인복이 배가됩니다.',
  },
  {
    title: '정교하게 다듬어진 보석, 신금(辛金)',
    metaphor: '주옥지금(珠玉之金)',
    core: '섬세한 심미안과 예리한 분석력, 깔끔한 자존심을 지닌 기질입니다. 디테일에 강하고 전문성으로 독보적 가치를 만들어냅니다.',
    advice: '예민함으로 스트레스를 받기 쉬우니 작은 실수에 너그러워지는 연습이 도움이 됩니다.',
  },
  {
    title: '거침없이 흐르는 큰 바다, 임수(壬水)',
    metaphor: '강해지수(江海之水)',
    core: '지혜롭고 스케일이 크며 유연한 사고를 지닌 전략가 기질입니다. 변화에 능하고 인맥과 정보를 흡수하는 힘이 강합니다.',
    advice: '방향성이 분산되면 산만해질 수 있으므로 핵심 목표 하나에 집중하는 안정감이 중요합니다.',
  },
  {
    title: '만물을 적시는 지혜의 단비, 계수(癸水)',
    metaphor: '우로지수(雨露之水)',
    core: '총명하고 직관력이 뛰어나며 섬세한 감성을 지닌 기질입니다. 기획·연구·상담·창작 분야에서 뛰어난 재능을 발휘합니다.',
    advice: '내면의 염려를 줄이고 아이디어를 현실 행동으로 옮기는 습관이 운을 크게 열어줍니다.',
  },
] as const;

export const DEFAULT_PLACE: BirthPlace = {
  name: '서울',
  country: '대한민국',
  admin1: '서울특별시',
  latitude: 37.5665,
  longitude: 126.978,
  timezone: 'Asia/Seoul',
};

export const PRESET_PLACES: BirthPlace[] = [
  DEFAULT_PLACE,
  { name: '부산', country: '대한민국', admin1: '부산광역시', latitude: 35.1796, longitude: 129.0756, timezone: 'Asia/Seoul' },
  { name: '대구', country: '대한민국', admin1: '대구광역시', latitude: 35.8714, longitude: 128.6014, timezone: 'Asia/Seoul' },
  { name: '광주', country: '대한민국', admin1: '광주광역시', latitude: 35.1595, longitude: 126.8526, timezone: 'Asia/Seoul' },
  { name: '제주', country: '대한민국', admin1: '제주특별자치도', latitude: 33.4996, longitude: 126.5312, timezone: 'Asia/Seoul' },
  { name: '도쿄', country: '일본', admin1: '도쿄도', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' },
  { name: '뉴욕', country: '미국', admin1: '뉴욕주', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' },
];
