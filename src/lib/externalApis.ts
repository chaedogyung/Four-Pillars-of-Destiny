import type { BirthPlace, KasiCalendarInfo } from '../types/saju';

const KASI_STORAGE_KEY = 'cheongmyeong_kasi_api_key';

export function getKasiKey(): string {
  try {
    return (localStorage.getItem(KASI_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function setKasiKey(key: string): void {
  localStorage.setItem(KASI_STORAGE_KEY, key.trim());
}

export function clearKasiKey(): void {
  localStorage.removeItem(KASI_STORAGE_KEY);
}

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
 * [외부 API 2] 한국천문연구원(KASI) 음양력 정보 API (서버 프록시를 통해 CORS 없이 조회)
 */
export async function fetchKasiLunarFromSolar(
  year: number,
  month: number,
  day: number
): Promise<KasiCalendarInfo | null> {
  const key = getKasiKey();
  if (!key) return null;

  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
    day: String(day),
  });
  const res = await fetch(`/api/kasi/lunar-from-solar?${params.toString()}`, {
    headers: { 'X-Kasi-Service-Key': key },
  });
  const data = (await res.json()) as { item?: KasiCalendarInfo; error?: string };
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
  const key = getKasiKey();
  if (!key) {
    throw new Error(
      '음력 변환을 사용하려면 좌측 상단의 KASI 음양력 API 설정에서 무료 인증키를 등록해 주세요.'
    );
  }

  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
    day: String(day),
    isLeap: isLeapMonth ? '1' : '0',
  });
  const res = await fetch(`/api/kasi/solar-from-lunar?${params.toString()}`, {
    headers: { 'X-Kasi-Service-Key': key },
  });
  const data = (await res.json()) as { item?: KasiCalendarInfo; error?: string };
  if (!res.ok || !data.item) {
    throw new Error(data.error || `KASI 음력 변환 오류 (${res.status})`);
  }
  return data.item;
}
