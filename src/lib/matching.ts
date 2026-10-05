export type Profile = {
  id: string;
  account_type?: "member" | "staff";
  display_name: string;
  birth_date: string;
  city: string;
  district: string | null;
  university: string;
  study_field: string;
  gender: "masculin" | "feminin";
  preferred_roommate_gender: "masculin" | "feminin" | "oricare";
  accommodation_preference: "camin" | "chirie" | "deja_am_chirie" | "doar_coleg";
  budget_min: number;
  budget_max: number;
  sleep_schedule: "devreme" | "flexibil" | "tarziu";
  interests: string[];
  organization_level: "relaxat" | "echilibrat" | "organizat" | null;
  bio: string | null;
  avatar_url: string | null;
  is_verified: boolean;
};

export type Match = { profile: Profile; score: number; reasons: string[] };

function acceptsGender(preference: Profile["preferred_roommate_gender"], gender: Profile["gender"]) {
  return preference === "oricare" || preference === gender;
}

function age(birthDate: string) {
  const birth = new Date(birthDate);
  const now = new Date();
  let value = now.getFullYear() - birth.getFullYear();
  const birthdayPassed = now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!birthdayPassed) value -= 1;
  return value;
}

function budgetOverlap(first: Profile, second: Profile) {
  return Math.max(first.budget_min, second.budget_min) <= Math.min(first.budget_max, second.budget_max);
}

export function getMatches(current: Profile, candidates: Profile[]): Match[] {
  return candidates
    .filter((candidate) => candidate.id !== current.id)
    .filter((candidate) => candidate.account_type !== "staff")
    .filter((candidate) => acceptsGender(current.preferred_roommate_gender, candidate.gender))
    .filter((candidate) => acceptsGender(candidate.preferred_roommate_gender, current.gender))
    .filter((candidate) => budgetOverlap(current, candidate))
    .map((candidate) => {
      const reasons: string[] = [];
      let score = 0;
      if (candidate.city === current.city) { score += 25; reasons.push("același oraș"); }
      score += 25; reasons.push("buget compatibil");
      if (candidate.sleep_schedule === current.sleep_schedule) { score += 15; reasons.push("program de somn similar"); }
      if (candidate.university === current.university || candidate.study_field === current.study_field) { score += 10; reasons.push("studiați în același domeniu"); }
      const commonInterests = (candidate.interests ?? []).filter((interest) => (current.interests ?? []).includes(interest));
      score += Math.min(15, commonInterests.length * 5);
      if (commonInterests.length) reasons.push(`${commonInterests.length} interese comune`);
      if (candidate.organization_level && candidate.organization_level === current.organization_level) { score += 10; reasons.push("stil de organizare similar"); }
      return { profile: candidate, score, reasons: reasons.slice(0, 3) };
    })
    .sort((first, second) => second.score - first.score);
}

export function getAge(birthDate: string) { return age(birthDate); }
