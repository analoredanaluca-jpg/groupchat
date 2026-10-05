import type { Profile } from "@/lib/matching";

export type CnpDetails = { birthDate: string; gender: Profile["gender"] };

/** Validates the CNP checksum and decodes the available birth date and gender fields. */
export function parseCnp(input: string): CnpDetails | null {
  const cnp = input.trim();
  if (!/^\d{13}$/.test(cnp)) return null;

  const series = Number(cnp[0]);
  if (series < 1 || series > 8) return null;

  const weights = "279146358279";
  const sum = [...weights].reduce((total, weight, index) => total + Number(cnp[index]) * Number(weight), 0);
  const checkDigit = sum % 11;
  if (Number(cnp[12]) !== (checkDigit === 10 ? 1 : checkDigit)) return null;

  const yearPart = Number(cnp.slice(1, 3));
  const month = Number(cnp.slice(3, 5));
  const day = Number(cnp.slice(5, 7));
  const currentYear = new Date().getFullYear();
  let century: number;
  if (series === 1 || series === 2) century = 1900;
  else if (series === 3 || series === 4) century = 1800;
  else if (series === 5 || series === 6) century = 2000;
  else {
    // For resident CNPs (7/8), the century is not encoded. Use the most recent
    // non-future year; this is a best-effort estimate, not proof of birth date.
    century = yearPart <= currentYear % 100 ? 2000 : 1900;
  }

  const year = century + yearPart;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (date.getTime() > Date.now()) return null;

  const county = Number(cnp.slice(7, 9));
  if (!((county >= 1 && county <= 46) || county === 51 || county === 52 || county === 99)) return null;
  if (Number(cnp.slice(9, 12)) === 0) return null;

  return {
    birthDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    gender: series % 2 === 1 ? "masculin" : "feminin",
  };
}
