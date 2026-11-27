import type { BirthPlace, KasiCalendarInfo } from '../types/saju';

interface OpenMeteoResult {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

/**
 * [외부 API 1] Open-Meteo Geocoding API (무료, 인증키 불필요, CORS 지원)
 */
export async function searchBirthPlaceAPI(query: string): Promise<BirthPlace[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=6&language=ko&format=json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo 도시 검색 응답 오류 (${res.status})`);
  }
  const json = (await res.json()) as { results?: OpenMeteoResult[] };
  return (json.results || []).map((r) => ({
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
