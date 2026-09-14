export const SRI_LANKA_DISTRICTS = [
  'Ampara',
  'Anuradhapura',
  'Badulla',
  'Batticaloa',
  'Colombo',
  'Galle',
  'Gampaha',
  'Hambantota',
  'Jaffna',
  'Kalutara',
  'Kandy',
  'Kegalle',
  'Kilinochchi',
  'Kurunegala',
  'Mannar',
  'Matale',
  'Matara',
  'Monaragala',
  'Mullaitivu',
  'Nuwara Eliya',
  'Polonnaruwa',
  'Puttalam',
  'Ratnapura',
  'Trincomalee',
  'Vavuniya',
] as const;

export type DistrictName = (typeof SRI_LANKA_DISTRICTS)[number];

export const DISTRICT_FILTER_OPTIONS = ['All', ...SRI_LANKA_DISTRICTS];

export const DISTRICT_SELECT_OPTIONS = [
  { label: 'Select District', value: '' },
  ...SRI_LANKA_DISTRICTS.map((d) => ({ label: d, value: d })),
];
