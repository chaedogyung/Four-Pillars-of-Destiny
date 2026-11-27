import type {
  BirthPlace,
  SajuFormInput,
  SajuResult,
  SavedProfileSummary,
  SavedSajuProfile,
} from '../types/saju';

const SAVED_PROFILES_STORAGE_KEY = 'cheongmyeong_saved_profiles_v1';
const MAX_SAVED_PROFILES = 50;

export function buildProfileKey(form: SajuFormInput): string {
  const normalizedName = (form.name || '').trim().replace(/\s+/g, ' ').toLowerCase() || '무명';
  const timePart = form.unknownTime ? 'unknown' : (form.birthTime || '12:00').trim();
  return `${normalizedName}|${form.gender}|${form.calendarType}|${form.birthDate.trim()}|${timePart}`;
}

export function buildProfileSummary(result: SajuResult): SavedProfileSummary {
  const pillarByKey = new Map(result.pillars.map((p) => [p.key, p]));
  const orderedKeys: Array<'year' | 'month' | 'day' | 'hour'> = ['year', 'month', 'day', 'hour'];

  const ganjiParts = orderedKeys.map((key) => {
    const p = pillarByKey.get(key);
    if (!p || p.empty || !p.stemObj || !p.branchObj) {
      return key === 'hour' ? '시미상' : '-';
    }
    return `${p.stemObj.kor}${p.branchObj.kor}`;
  });

  const dayPillar = pillarByKey.get('day');
  const dayPillarLabel =
    dayPillar?.stemObj && dayPillar?.branchObj
      ? `${dayPillar.stemObj.kor}${dayPillar.branchObj.kor}일주`
      : '명식';

  return {
    dayPillarLabel,
    ganjiLine: ganjiParts.join(' · '),
    sijinName: result.sijin?.name,
  };
}

function isValidProfile(item: unknown): item is SavedSajuProfile {
  if (!item || typeof item !== 'object') return false;
  const p = item as Partial<SavedSajuProfile>;
  return (
    typeof p.id === 'string' &&
    p.id.length > 0 &&
    typeof p.updatedAt === 'number' &&
    !!p.form &&
    typeof p.form.birthDate === 'string' &&
    (p.form.gender === 'M' || p.form.gender === 'F') &&
    !!p.place &&
    typeof p.place.name === 'string' &&
    typeof p.place.longitude === 'number' &&
    !!p.summary &&
    typeof p.summary.dayPillarLabel === 'string'
  );
}

export function loadSavedProfiles(): SavedSajuProfile[] {
  try {
    const raw = localStorage.getItem(SAVED_PROFILES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isValidProfile)
      .map((item) => ({
        ...item,
        form: {
          ...item.form,
          timeCorrectionMode: item.form.timeCorrectionMode ?? 'korea_std',
          includeEoT: Boolean(item.form.includeEoT),
          yajasi: Boolean(item.form.yajasi),
          unknownTime: Boolean(item.form.unknownTime),
        },
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_SAVED_PROFILES);
  } catch {
    return [];
  }
}

export function persistSavedProfiles(profiles: SavedSajuProfile[]): void {
  try {
    localStorage.setItem(SAVED_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    // ignore storage quota or private-mode restriction
  }
}

export function upsertSavedProfile(
  existing: SavedSajuProfile[],
  form: SajuFormInput,
  place: BirthPlace,
  result: SajuResult
): {
  profiles: SavedSajuProfile[];
  saved: SavedSajuProfile;
  wasUpdated: boolean;
} {
  const id = buildProfileKey(form);
  const wasUpdated = existing.some((item) => item.id === id);

  const saved: SavedSajuProfile = {
    id,
    form: {
      ...form,
      name: form.name.trim(),
    },
    place: { ...place },
    summary: buildProfileSummary(result),
    updatedAt: Date.now(),
  };

  const next = [saved, ...existing.filter((item) => item.id !== id)].slice(0, MAX_SAVED_PROFILES);
  persistSavedProfiles(next);

  return {
    profiles: next,
    saved,
    wasUpdated,
  };
}

export function deleteSavedProfile(
  existing: SavedSajuProfile[],
  id: string
): SavedSajuProfile[] {
  const next = existing.filter((item) => item.id !== id);
  persistSavedProfiles(next);
  return next;
}
