export const SRI_LANKA_UNIVERSITIES = [
  'University of Colombo',
  'University of Moratuwa',
  'University of Peradeniya',
  'University of Sri Jayewardenepura',
  'University of Kelaniya',
  'University of Ruhuna',
  'University of Jaffna',
  'Eastern University, Sri Lanka',
  'South Eastern University of Sri Lanka',
  'Rajarata University of Sri Lanka',
  'Wayamba University of Sri Lanka',
  'Sabaragamuwa University of Sri Lanka',
  'Uva Wellassa University of Sri Lanka',
  'Open University of Sri Lanka',
  'University of the Visual & Performing Arts',
  'Gampaha Wickramarachchi University of Indigenous Medicine',
  'Vavuniya University of Sri Lanka',
  'University of Colombo School of Computing (UCSC)',
] as const;

export type UniversityName = (typeof SRI_LANKA_UNIVERSITIES)[number];

export const UNIVERSITY_FILTER_OPTIONS = ['All', ...SRI_LANKA_UNIVERSITIES];

/**
 * Helper to ensure university names are always rendered as explicit full names
 * even if the input string contains degree prefix or parentheses.
 */
export const formatUniversityName = (name: string | undefined, fallbackDegree?: string): string => {
  if (!name && !fallbackDegree) return 'State University';

  let target = (name || '').trim();

  // If target equals the degree name (or doesn't have uni info), try extracting from fallbackDegree
  const cleanTarget = target.toLowerCase();
  const cleanFallback = (fallbackDegree || '').toLowerCase().trim();
  const isDuplicateCourseName = cleanFallback && (
    cleanTarget === cleanFallback ||
    cleanTarget.replace(/\s+/g, '') === cleanFallback.replace(/\s+/g, '')
  );

  // If target contains parentheses like "ACCOUNTING INFORMATION SYSTEMS (University of Kelaniya)", extract the inside
  const parenMatch = target.match(/\(([^)]+)\)$/);
  if (parenMatch && parenMatch[1]) {
    const candidate = parenMatch[1].trim();
    if (
      candidate.toLowerCase().includes('university') ||
      candidate.toLowerCase().includes('campus') ||
      candidate.toLowerCase().includes('school of computing') ||
      candidate.toLowerCase().includes('institute') ||
      ['UOC', 'UOM', 'UOP', 'USJ', 'UOK', 'RUH', 'JFN', 'SEUSL', 'EUSL', 'RUSL', 'WUSL', 'SUSL', 'UWU', 'OUSL', 'UVPA', 'GWUIM', 'VAV', 'UCSC'].includes(candidate.toUpperCase())
    ) {
      target = candidate;
    }
  }

  // If target still looks like a degree name and fallbackDegree has parentheses:
  if (fallbackDegree && (isDuplicateCourseName || !target || target.toLowerCase().includes('accounting') || target.toLowerCase().includes('engineering') || target.toLowerCase().includes('science') || target.toLowerCase().includes('technology'))) {
    const fbParenMatch = fallbackDegree.match(/\(([^)]+)\)$/);
    if (fbParenMatch && fbParenMatch[1]) {
      const candidate = fbParenMatch[1].trim();
      if (
        candidate.toLowerCase().includes('university') ||
        candidate.toLowerCase().includes('campus') ||
        candidate.toLowerCase().includes('school of computing') ||
        ['UOC', 'UOM', 'UOP', 'USJ', 'UOK', 'RUH', 'JFN', 'SEUSL', 'EUSL', 'RUSL', 'WUSL', 'SUSL', 'UWU', 'OUSL', 'UVPA', 'GWUIM', 'VAV', 'UCSC'].includes(candidate.toUpperCase())
      ) {
        target = candidate;
      }
    }
  }

  // If target is a UniCode like "019E", "006E", "013E", "023G"
  const uniCodeMatch = target.match(/^\d{3}([A-Za-z]+)$/);
  if (uniCodeMatch) {
    const codeSuffix = uniCodeMatch[1].toUpperCase();
    switch (codeSuffix) {
      case 'C': return 'University of Colombo';
      case 'M': return 'University of Moratuwa';
      case 'P': return 'University of Peradeniya';
      case 'S':
      case 'SJ': return 'University of Sri Jayewardenepura';
      case 'K': return 'University of Kelaniya';
      case 'R': return 'University of Ruhuna';
      case 'J': return 'University of Jaffna';
      case 'E': return 'Eastern University, Sri Lanka';
      case 'SE': return 'South Eastern University of Sri Lanka';
      case 'RA':
      case 'RS': return 'Rajarata University of Sri Lanka';
      case 'W': return 'Wayamba University of Sri Lanka';
      case 'SB':
      case 'SA': return 'Sabaragamuwa University of Sri Lanka';
      case 'UW':
      case 'U': return 'Uva Wellassa University of Sri Lanka';
      case 'V': return 'Vavuniya University of Sri Lanka';
      case 'GW': return 'Gampaha Wickramarachchi University of Indigenous Medicine';
      case 'UV': return 'University of the Visual & Performing Arts';
      case 'OU': return 'Open University of Sri Lanka';
      default: break;
    }
  }

  switch (target.toUpperCase()) {
    case 'UOC':
      return 'University of Colombo';
    case 'UOM':
      return 'University of Moratuwa';
    case 'UOP':
      return 'University of Peradeniya';
    case 'USJ':
      return 'University of Sri Jayewardenepura';
    case 'UOK':
      return 'University of Kelaniya';
    case 'RUH':
      return 'University of Ruhuna';
    case 'JFN':
      return 'University of Jaffna';
    case 'SEUSL':
      return 'South Eastern University of Sri Lanka';
    case 'EUSL':
      return 'Eastern University, Sri Lanka';
    case 'RUSL':
      return 'Rajarata University of Sri Lanka';
    case 'WUSL':
      return 'Wayamba University of Sri Lanka';
    case 'SUSL':
      return 'Sabaragamuwa University of Sri Lanka';
    case 'UWU':
      return 'Uva Wellassa University of Sri Lanka';
    case 'OUSL':
      return 'Open University of Sri Lanka';
    case 'UVPA':
      return 'University of the Visual & Performing Arts';
    case 'GWUIM':
      return 'Gampaha Wickramarachchi University of Indigenous Medicine';
    case 'VAV':
      return 'Vavuniya University of Sri Lanka';
    case 'UCSC':
      return 'University of Colombo School of Computing (UCSC)';
    default:
      break;
  }

  for (const uni of SRI_LANKA_UNIVERSITIES) {
    if (target.toLowerCase().includes(uni.toLowerCase())) {
      return uni;
    }
  }

  if (isDuplicateCourseName && !target.toLowerCase().includes('university') && !target.toLowerCase().includes('campus')) {
    return 'State University';
  }

  return target || 'State University';
};

/**
 * Helper to ensure degree names are rendered cleanly without attached university suffixes
 */
export const formatDegreeName = (degree: string | undefined): string => {
  if (!degree) return 'Undergraduate Degree';
  let clean = degree.trim();

  // Strip trailing university in parentheses e.g. "(Rajarata University of Sri Lanka)", "(University of Kelaniya)", "(UOK)", etc.
  clean = clean.replace(
    /\s*\([^)]*(?:University|Campus|Institute|School of Computing|Sri Lanka|UOC|UOM|UOP|USJ|UOK|RUH|JFN|SEUSL|EUSL|RUSL|WUSL|SUSL|UWU|OUSL|UVPA|GWUIM|VAV|UCSC)[^)]*\)\s*$/i,
    ''
  );

  return clean.trim();
};
