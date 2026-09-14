export const SRI_LANKA_AL_STREAMS = [
  'Physical Science',
  'Biological Science',
  'Commerce',
  'Technology',
  'Arts',
] as const;

export type StreamName = (typeof SRI_LANKA_AL_STREAMS)[number];

export const STREAM_FILTER_OPTIONS = ['All', ...SRI_LANKA_AL_STREAMS];

export const STREAM_SUBJECTS_MAP: Record<StreamName | string, string[]> = {
  'Physical Science': [
    'Combined Mathematics',
    'Physics',
    'Chemistry',
    'Information & Communication Technology (ICT)',
    'Higher Mathematics',
  ],
  'Biological Science': [
    'Biology',
    'Chemistry',
    'Physics',
    'Agricultural Science',
  ],
  'Commerce': [
    'Accounting',
    'Business Studies',
    'Economics',
    'Business Statistics',
    'Information & Communication Technology (ICT)',
  ],
  'Technology': [
    'Engineering Technology',
    'Bio-systems Technology',
    'Science for Technology',
    'Information & Communication Technology (ICT)',
    'Agro Technology',
  ],
  'Arts': [
    'Sinhala',
    'Tamil',
    'English Literature',
    'Political Science',
    'Logic & Scientific Method',
    'Geography',
    'History',
    'Buddhist Civilization',
    'Media & Communication Studies',
    'Economics',
    'Business Statistics',
    'Information & Communication Technology (ICT)',
    'Art',
    'Drama & Theatre',
    'Music (Oriental)',
    'Music (Western)',
    'Dance (Indigenous)',
    'French',
    'Japanese',
    'German',
    'Arabic',
  ],
};

export const ALL_AL_SUBJECTS = Array.from(new Set(Object.values(STREAM_SUBJECTS_MAP).flat()));

export function getStreamForDegree(degreeName: string): string {
  if (!degreeName) return 'General';
  const lower = degreeName.toLowerCase();

  if (
    lower.includes('medicine') ||
    lower.includes('dental') ||
    lower.includes('veterinary') ||
    lower.includes('biological') ||
    lower.includes('agriculture') ||
    lower.includes('nursing') ||
    lower.includes('pharmacy') ||
    lower.includes('allied health') ||
    lower.includes('physiotherapy') ||
    lower.includes('biomedical') ||
    lower.includes('ayurveda') ||
    lower.includes('siddha') ||
    lower.includes('unani') ||
    lower.includes('food science') ||
    lower.includes('animal science') ||
    lower.includes('aquatic') ||
    lower.includes('botany') ||
    lower.includes('zoology')
  ) {
    return 'Biological Science';
  }

  if (
    lower.includes('engineering technology') ||
    lower.includes('bio-systems technology') ||
    lower.includes('biosystems') ||
    lower.includes('technology') ||
    lower.includes('ict') ||
    lower.includes('information technology') ||
    lower.includes('information systems') ||
    lower.includes('software')
  ) {
    return 'Technology';
  }

  if (
    lower.includes('engineering') ||
    lower.includes('physical science') ||
    lower.includes('computer science') ||
    lower.includes('data science') ||
    lower.includes('surveying') ||
    lower.includes('architecture') ||
    lower.includes('quantity surveying') ||
    lower.includes('mathematics') ||
    lower.includes('statistics') ||
    lower.includes('artificial intelligence') ||
    lower.includes('physics') ||
    lower.includes('electronics') ||
    lower.includes('transport') ||
    lower.includes('town & country')
  ) {
    return 'Physical Science';
  }

  if (
    lower.includes('management') ||
    lower.includes('commerce') ||
    lower.includes('business') ||
    lower.includes('accounting') ||
    lower.includes('finance') ||
    lower.includes('marketing') ||
    lower.includes('human resource') ||
    lower.includes('estate management') ||
    lower.includes('hospitality') ||
    lower.includes('banking') ||
    lower.includes('entrepreneurship')
  ) {
    return 'Commerce';
  }

  if (
    lower.includes('arts') ||
    lower.includes('law') ||
    lower.includes('music') ||
    lower.includes('dance') ||
    lower.includes('drama') ||
    lower.includes('visual') ||
    lower.includes('design') ||
    lower.includes('languages') ||
    lower.includes('mass media') ||
    lower.includes('communication') ||
    lower.includes('peace') ||
    lower.includes('social') ||
    lower.includes('sinhala') ||
    lower.includes('tamil') ||
    lower.includes('english') ||
    lower.includes('history') ||
    lower.includes('geography') ||
    lower.includes('political') ||
    lower.includes('buddhist')
  ) {
    return 'Arts';
  }

  return 'General';
}
