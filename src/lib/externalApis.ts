import type { BirthPlace, KasiCalendarInfo } from '../types/saju';

interface OpenMeteoResult {
  id?: number;
  name: string;
  country?: string;
  country_code?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  population?: number;
  feature_code?: string;
}

/**
 * Open-Meteo(GeoNames)는 2글자 한글 질의에서 접두사 검색을 수행하지 않거나
 * '부산광역시', '제주시' 같은 행정단위 명칭으로 색인되어 있어 주요 국내·해외 도시를
 * 정식 영문/행정명과 병행 조회하도록 보강합니다.
 */
const KO_CITY_ALIASES: Record<string, string> = {
  서울: 'Seoul',
  부산: 'Busan',
  인천: 'Incheon',
  대구: 'Daegu',
  대전: 'Daejeon',
  광주: 'Gwangju',
  울산: 'Ulsan',
  세종: 'Sejong',
  제주: 'Jeju',
  서귀포: 'Seogwipo',
  수원: 'Suwon',
  용인: 'Yongin',
  고양: 'Goyang',
  성남: 'Seongnam',
  화성: 'Hwaseong',
  부천: 'Bucheon',
  남양주: 'Namyangju',
  안산: 'Ansan',
  평택: 'Pyeongtaek',
  안양: 'Anyang',
  시흥: 'Siheung',
  파주: 'Paju',
  김포: 'Gimpo',
  의정부: 'Uijeongbu',
  하남: 'Hanam',
  광명: 'Gwangmyeong',
  군포: 'Gunpo',
  오산: 'Osan',
  이천: 'Icheon',
  양주: 'Yangju',
  안성: 'Anseong',
  구리: 'Guri',
  포천: 'Pocheon',
  의왕: 'Uiwang',
  여주: 'Yeoju',
  과천: 'Gwacheon',
  동두천: 'Dongducheon',
  춘천: 'Chuncheon',
  원주: 'Wonju',
  강릉: 'Gangneung',
  속초: 'Sokcho',
  동해: 'Donghae',
  태백: 'Taebaek',
  삼척: 'Samcheok',
  청주: 'Cheongju',
  충주: 'Chungju',
  제천: 'Jecheon',
  천안: 'Cheonan',
  아산: 'Asan',
  서산: 'Seosan',
  당진: 'Dangjin',
  논산: 'Nonsan',
  공주: 'Gongju',
  보령: 'Boryeong',
  전주: 'Jeonju',
  익산: 'Iksan',
  군산: 'Gunsan',
  정읍: 'Jeongeup',
  남원: 'Namwon',
  김제: 'Gimje',
  여수: 'Yeosu',
  순천: 'Suncheon',
  목포: 'Mokpo',
  광양: 'Gwangyang',
  나주: 'Naju',
  포항: 'Pohang',
  구미: 'Gumi',
  경산: 'Gyeongsan',
  경주: 'Gyeongju',
  안동: 'Andong',
  김천: 'Gimcheon',
  영주: 'Yeongju',
  영천: 'Yeongcheon',
  상주: 'Sangju',
  문경: 'Mungyeong',
  창원: 'Changwon',
  김해: 'Gimhae',
  진주: 'Jinju',
  양산: 'Yangsan',
  거제: 'Geoje',
  통영: 'Tongyeong',
  사천: 'Sacheon',
  밀양: 'Miryang',
  도쿄: 'Tokyo',
  동경: 'Tokyo',
  오사카: 'Osaka',
  교토: 'Kyoto',
  후쿠오카: 'Fukuoka',
  삿포로: 'Sapporo',
  나고야: 'Nagoya',
  뉴욕: 'New York',
  로스앤젤레스: 'Los Angeles',
  엘에이: 'Los Angeles',
  시카고: 'Chicago',
  샌프란시스코: 'San Francisco',
  시애틀: 'Seattle',
  보스턴: 'Boston',
  워싱턴: 'Washington',
  애틀랜타: 'Atlanta',
  달라스: 'Dallas',
  휴스턴: 'Houston',
  하와이: 'Honolulu',
  호놀룰루: 'Honolulu',
  밴쿠버: 'Vancouver',
  토론토: 'Toronto',
  런던: 'London',
  파리: 'Paris',
  베를린: 'Berlin',
  프랑크푸르트: 'Frankfurt',
  로마: 'Rome',
  마드리드: 'Madrid',
  베이징: 'Beijing',
  북경: 'Beijing',
  상하이: 'Shanghai',
  상해: 'Shanghai',
  선전: 'Shenzhen',
  광저우: 'Guangzhou',
  칭다오: 'Qingdao',
  홍콩: 'Hong Kong',
  타이베이: 'Taipei',
  대만: 'Taipei',
  싱가포르: 'Singapore',
  방콕: 'Bangkok',
  하노이: 'Hanoi',
  호치민: 'Ho Chi Minh City',
  마닐라: 'Manila',
  시드니: 'Sydney',
  멜버른: 'Melbourne',
  오클랜드: 'Auckland',
};

const HAS_HANGUL = /[가-힣]/;

async function fetchOpenMeteoQuery(name: string, count = 6): Promise<OpenMeteoResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=${count}&language=ko&format=json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo 도시 검색 응답 오류 (${res.status})`);
  }
  const json = (await res.json()) as { results?: OpenMeteoResult[] };
  return json.results || [];
}

/**
 * [외부 API 1] Open-Meteo Geocoding API (무료, 인증키 불필요, CORS 지원)
 * - 2글자 한글 지명(예: 제주, 부산, 수원, 평창)도 행정단위 접미사 및 영문 별칭을
 *   병렬 조회·인구순 정렬하여 정확한 한국/해외 도시 경도와 시간대를 반환합니다.
 */
export async function searchBirthPlaceAPI(query: string): Promise<BirthPlace[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const isKorean = HAS_HANGUL.test(trimmed);
  const queries = new Set<string>();

  const strippedSuffix = trimmed.replace(/(특별자치도|특별자치시|특별시|광역시|자치시|시|군|구)$/, '');
  const alias = KO_CITY_ALIASES[trimmed] || KO_CITY_ALIASES[strippedSuffix];

  if (alias) {
    queries.add(alias);
  }

  queries.add(trimmed);

  // 한글 입력이면서 행정단위 접미사가 없으면 '시' / '군' 접미사도 병행 조회
  if (isKorean && !/(시|군|구|도)$/.test(trimmed) && trimmed.length <= 4) {
    queries.add(`${trimmed}시`);
    queries.add(`${trimmed}군`);
  }

  const settled = await Promise.allSettled(
    Array.from(queries).map((q) => fetchOpenMeteoQuery(q, 6))
  );

  const combined: OpenMeteoResult[] = [];
  let firstError: Error | null = null;

  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      combined.push(...outcome.value);
    } else if (!firstError) {
      firstError =
        outcome.reason instanceof Error
          ? outcome.reason
          : new Error('도시 검색 요청에 실패했습니다.');
    }
  }

  if (combined.length === 0 && firstError) {
    throw firstError;
  }

  // ID 또는 좌표 기준 중복 제거
  const uniqueMap = new Map<string, OpenMeteoResult>();
  for (const item of combined) {
    const key = item.id
      ? String(item.id)
      : `${item.latitude.toFixed(3)},${item.longitude.toFixed(3)}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    }
  }

  const deduped = Array.from(uniqueMap.values());

  // 도시/행정구역 우선, 한글 검색 시 국내(KR) 우선, 인구순 정렬
  const scoreItem = (item: OpenMeteoResult): number => {
    let score = item.population ? Math.log10(item.population + 10) * 10 : 0;
    const fc = item.feature_code || '';
    if (fc.startsWith('PPL')) score += 40;
    else if (fc.startsWith('ADM')) score += 25;
    else if (fc === 'MT' || fc === 'HLL') score -= 30;

    if (isKorean && item.country_code === 'KR') {
      // 해외 도시 별칭(도쿄, 뉴욕 등)이 아닌 경우 국내 도시 우선
      const isOverseasAlias = alias && !['Seoul','Busan','Incheon','Daegu','Daejeon','Gwangju','Ulsan','Sejong','Jeju','Seogwipo','Suwon','Yongin','Goyang','Seongnam','Hwaseong','Bucheon','Namyangju','Ansan','Pyeongtaek','Anyang','Siheung','Paju','Gimpo','Uijeongbu','Hanam','Gwangmyeong','Gunpo','Osan','Icheon','Yangju','Anseong','Guri','Pocheon','Uiwang','Yeoju','Gwacheon','Dongducheon','Chuncheon','Wonju','Gangneung','Sokcho','Donghae','Taebaek','Samcheok','Cheongju','Chungju','Jecheon','Cheonan','Asan','Seosan','Dangjin','Nonsan','Gongju','Boryeong','Jeonju','Iksan','Gunsan','Jeongeup','Namwon','Gimje','Yeosu','Suncheon','Mokpo','Gwangyang','Naju','Pohang','Gumi','Gyeongsan','Gyeongju','Andong','Gimcheon','Yeongju','Yeongcheon','Sangju','Mungyeong','Changwon','Gimhae','Jinju','Yangsan','Geoje','Tongyeong','Sacheon','Miryang'].includes(alias);
      if (!isOverseasAlias) score += 35;
    }
    if (item.name === trimmed || item.name === `${trimmed}시` || item.name === `${trimmed}군`) {
      score += 20;
    }
    return score;
  };

  deduped.sort((a, b) => scoreItem(b) - scoreItem(a));

  return deduped.slice(0, 6).map((r) => ({
    name: r.name,
    country: r.country || '',
    admin1: r.admin1,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone || 'Asia/Seoul',
  }));
}

/**
 * [외부 API 2] 한국천문연구원(KASI) 음양력 정보 API (서버 환경변수 인증키 자동 적용)
 */
export async function fetchKasiLunarFromSolar(
  year: number,
  month: number,
  day: number
): Promise<KasiCalendarInfo | null> {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
    day: String(day),
  });
  const res = await fetch(`/api/kasi/lunar-from-solar?${params.toString()}`);
  const data = (await res.json()) as {
    item?: KasiCalendarInfo | null;
    configured?: boolean;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `KASI API 호출 오류 (${res.status})`);
  }
  return data.item ?? null;
}

export async function fetchKasiSolarFromLunar(
  year: number,
  month: number,
  day: number,
  isLeapMonth: boolean
): Promise<KasiCalendarInfo> {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
    day: String(day),
    isLeap: isLeapMonth ? '1' : '0',
  });
  const res = await fetch(`/api/kasi/solar-from-lunar?${params.toString()}`);
  const data = (await res.json()) as { item?: KasiCalendarInfo; error?: string };
  if (!res.ok || !data.item) {
    throw new Error(data.error || `KASI 음력 변환 오류 (${res.status})`);
  }
  return data.item;
}
