export const ACADEMIC_YEAR_OPTIONS = [
  '2025/26',
  '2024/25',
] as const;

export type AcademicYearOption = (typeof ACADEMIC_YEAR_OPTIONS)[number];
