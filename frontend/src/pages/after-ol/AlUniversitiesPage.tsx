import { useState, useMemo } from 'react';
import type { FC } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Landmark,
  MapPin,
  GraduationCap,
  Search,
  BookOpen,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Building2,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { AfterOlLayout } from '../../components/after-ol/AfterOlLayout';

interface UniversityCourseItem {
  name: string;
  degreeType: string;
  stream: 'physical-science' | 'biological-science' | 'commerce' | 'technology' | 'arts' | 'all';
  faculty: string;
  duration: string;
}

interface UniversityData {
  id: string;
  name: string;
  shortCode: string;
  location: string;
  province: string;
  established: string;
  faculties: string[];
  websiteUrl?: string;
  courses: UniversityCourseItem[];
}

const SRI_LANKAN_UNIVERSITIES: UniversityData[] = [
  {
    id: 'uom',
    name: 'University of Moratuwa',
    shortCode: 'UOM',
    location: 'Katubedda, Moratuwa',
    province: 'Western Province',
    established: '1972',
    faculties: ['Faculty of Engineering', 'Faculty of Information Technology', 'Faculty of Architecture', 'Faculty of Business', 'Faculty of Medicine'],
    websiteUrl: 'https://uom.lk',
    courses: [
      { name: 'BSc Eng (Hons) in Engineering (Civil, Elec, Mech, Chem, Computer, Mechatronics)', degreeType: 'BSc Eng (Hons)', stream: 'physical-science', faculty: 'Faculty of Engineering', duration: '4 Years' },
      { name: 'BSc (Hons) in Information Technology', degreeType: 'BSc (Hons) IT', stream: 'physical-science', faculty: 'Faculty of Information Technology', duration: '4 Years' },
      { name: 'BSc (Hons) in Artificial Intelligence', degreeType: 'BSc (Hons) AI', stream: 'physical-science', faculty: 'Faculty of Information Technology', duration: '4 Years' },
      { name: 'Bachelor of Architecture (B.Arch)', degreeType: 'B.Arch', stream: 'physical-science', faculty: 'Faculty of Architecture', duration: '5 Years' },
      { name: 'BSc (Hons) in Quantity Surveying', degreeType: 'BSc (Hons)', stream: 'physical-science', faculty: 'Faculty of Architecture', duration: '4 Years' },
      { name: 'Bachelor of Engineering Technology (BET Hons)', degreeType: 'BET (Hons)', stream: 'technology', faculty: 'Faculty of Engineering', duration: '4 Years' },
      { name: 'MBBS (Bachelor of Medicine & Bachelor of Surgery)', degreeType: 'MBBS', stream: 'biological-science', faculty: 'Faculty of Medicine', duration: '5 Years' },
    ],
  },
  {
    id: 'uoc',
    name: 'University of Colombo',
    shortCode: 'UOC / UCSC',
    location: 'Cumaratunga Munidasa Mawatha, Colombo 03',
    province: 'Western Province',
    established: '1921',
    faculties: ['School of Computing (UCSC)', 'Faculty of Medicine', 'Faculty of Science', 'Faculty of Law', 'Faculty of Management & Finance', 'Faculty of Arts', 'Faculty of Technology'],
    websiteUrl: 'https://cmb.ac.lk',
    courses: [
      { name: 'BSc (Hons) in Computer Science', degreeType: 'BSc (Hons) CS', stream: 'physical-science', faculty: 'School of Computing (UCSC)', duration: '4 Years' },
      { name: 'BSc in Information Systems', degreeType: 'BSc IS', stream: 'physical-science', faculty: 'School of Computing (UCSC)', duration: '3 - 4 Years' },
      { name: 'BSc in Physical Science / Mathematics & Statistics Special', degreeType: 'BSc (Hons)', stream: 'physical-science', faculty: 'Faculty of Science', duration: '4 Years' },
      { name: 'MBBS (Bachelor of Medicine and Bachelor of Surgery)', degreeType: 'MBBS', stream: 'biological-science', faculty: 'Faculty of Medicine', duration: '5 Years' },
      { name: 'BSc in Physiotherapy / Pharmacy', degreeType: 'BSc Special', stream: 'biological-science', faculty: 'Faculty of Medicine', duration: '4 Years' },
      { name: 'B.Com (Special) in Accounting & Finance', degreeType: 'B.Com / BBA', stream: 'commerce', faculty: 'Faculty of Management & Finance', duration: '4 Years' },
      { name: 'Bachelor of Laws (LL.B)', degreeType: 'LL.B', stream: 'arts', faculty: 'Faculty of Law', duration: '4 Years' },
      { name: 'BA (Hons) in International Relations / Economics', degreeType: 'BA (Hons)', stream: 'arts', faculty: 'Faculty of Arts', duration: '4 Years' },
      { name: 'Bachelor of Information & Communication Technology (BICT)', degreeType: 'BICT (Hons)', stream: 'technology', faculty: 'Faculty of Technology', duration: '4 Years' },
    ],
  },
  {
    id: 'uop',
    name: 'University of Peradeniya',
    shortCode: 'UOP',
    location: 'Peradeniya, Kandy',
    province: 'Central Province',
    established: '1942',
    faculties: ['Faculty of Engineering', 'Faculty of Medicine', 'Faculty of Dental Sciences', 'Faculty of Veterinary Medicine & Animal Science', 'Faculty of Agriculture', 'Faculty of Science', 'Faculty of Arts', 'Faculty of Management'],
    websiteUrl: 'https://pdn.ac.lk',
    courses: [
      { name: 'BSc Eng (Hons) in Civil / Electrical / Mechanical / Chemical / Computer', degreeType: 'BSc Eng (Hons)', stream: 'physical-science', faculty: 'Faculty of Engineering', duration: '4 Years' },
      { name: 'BSc in Physical Science / Statistics & Operations Research', degreeType: 'BSc (Hons)', stream: 'physical-science', faculty: 'Faculty of Science', duration: '4 Years' },
      { name: 'MBBS (Doctor of Medicine)', degreeType: 'MBBS', stream: 'biological-science', faculty: 'Faculty of Medicine', duration: '5 Years' },
      { name: 'Bachelor of Dental Surgery (BDS)', degreeType: 'BDS', stream: 'biological-science', faculty: 'Faculty of Dental Sciences', duration: '5 Years' },
      { name: 'Bachelor of Veterinary Science (BVSc)', degreeType: 'BVSc', stream: 'biological-science', faculty: 'Faculty of Veterinary Medicine', duration: '5 Years' },
      { name: 'BSc in Agricultural Technology & Management', degreeType: 'BSc (Hons)', stream: 'biological-science', faculty: 'Faculty of Agriculture', duration: '4 Years' },
      { name: 'BBA in Marketing / Accounting / Human Resource Management', degreeType: 'BBA (Hons)', stream: 'commerce', faculty: 'Faculty of Management', duration: '4 Years' },
      { name: 'BA in Economics / Political Science / English Literature', degreeType: 'BA (Hons)', stream: 'arts', faculty: 'Faculty of Arts', duration: '4 Years' },
    ],
  },
  {
    id: 'usj',
    name: 'University of Sri Jayewardenepura',
    shortCode: 'USJ',
    location: 'Gangodawila, Nugegoda',
    province: 'Western Province',
    established: '1958',
    faculties: ['Faculty of Management Studies & Commerce', 'Faculty of Applied Sciences', 'Faculty of Medical Sciences', 'Faculty of Technology', 'Faculty of Engineering', 'Faculty of Humanities & Social Sciences'],
    websiteUrl: 'https://sjp.ac.lk',
    courses: [
      { name: 'BSc (Hons) in Accounting & Financial Management', degreeType: 'BSc (Hons)', stream: 'commerce', faculty: 'Faculty of Management Studies & Commerce', duration: '4 Years' },
      { name: 'BSc (Hons) in Business Information Systems (BIS)', degreeType: 'BSc (Hons)', stream: 'commerce', faculty: 'Faculty of Management Studies & Commerce', duration: '4 Years' },
      { name: 'BSc (Hons) in Finance / Marketing / Human Resources', degreeType: 'BSc (Hons)', stream: 'commerce', faculty: 'Faculty of Management Studies & Commerce', duration: '4 Years' },
      { name: 'Bachelor of Engineering Technology (BET Hons)', degreeType: 'BET (Hons)', stream: 'technology', faculty: 'Faculty of Technology', duration: '4 Years' },
      { name: 'Bachelor of Information & Communication Technology (BICT Hons)', degreeType: 'BICT (Hons)', stream: 'technology', faculty: 'Faculty of Technology', duration: '4 Years' },
      { name: 'Bachelor of Bio-systems Technology (BBST Hons)', degreeType: 'BBST (Hons)', stream: 'technology', faculty: 'Faculty of Technology', duration: '4 Years' },
      { name: 'MBBS (Bachelor of Medicine & Surgery)', degreeType: 'MBBS', stream: 'biological-science', faculty: 'Faculty of Medical Sciences', duration: '5 Years' },
      { name: 'B.Pharm (Bachelor of Pharmacy)', degreeType: 'B.Pharm', stream: 'biological-science', faculty: 'Faculty of Medical Sciences', duration: '4 Years' },
      { name: 'BSc (Hons) in Computer Science', degreeType: 'BSc (Hons)', stream: 'physical-science', faculty: 'Faculty of Applied Sciences', duration: '4 Years' },
      { name: 'BSc Eng (Hons) in Civil / Mechanical / Electrical / Computer', degreeType: 'BSc Eng (Hons)', stream: 'physical-science', faculty: 'Faculty of Engineering', duration: '4 Years' },
    ],
  },
  {
    id: 'uok',
    name: 'University of Kelaniya',
    shortCode: 'UOK',
    location: 'Dalugama, Kelaniya',
    province: 'Western Province',
    established: '1959',
    faculties: ['Faculty of Science', 'Faculty of Medicine (Ragama)', 'Faculty of Commerce & Management Studies', 'Faculty of Computing & Technology', 'Faculty of Humanities', 'Faculty of Social Sciences'],
    websiteUrl: 'https://kln.ac.lk',
    courses: [
      { name: 'BSc (Hons) in Software Engineering', degreeType: 'BSc (Hons)', stream: 'physical-science', faculty: 'Faculty of Computing & Technology', duration: '4 Years' },
      { name: 'BSc (Hons) in Computer Science / Management & IT (MIT)', degreeType: 'BSc (Hons)', stream: 'physical-science', faculty: 'Faculty of Science', duration: '4 Years' },
      { name: 'MBBS (Faculty of Medicine - Ragama)', degreeType: 'MBBS', stream: 'biological-science', faculty: 'Faculty of Medicine', duration: '5 Years' },
      { name: 'BSc in Speech and Hearing Sciences', degreeType: 'BSc (Hons)', stream: 'biological-science', faculty: 'Faculty of Medicine', duration: '4 Years' },
      { name: 'B.Com (Special) in Accountancy & Finance', degreeType: 'B.Com (Special)', stream: 'commerce', faculty: 'Faculty of Commerce & Management Studies', duration: '4 Years' },
      { name: 'Bachelor of Information & Communication Technology (BICT)', degreeType: 'BICT (Hons)', stream: 'technology', faculty: 'Faculty of Computing & Technology', duration: '4 Years' },
      { name: 'Bachelor of Engineering Technology (BET)', degreeType: 'BET (Hons)', stream: 'technology', faculty: 'Faculty of Computing & Technology', duration: '4 Years' },
      { name: 'BA (Hons) in Mass Communication & Journalism', degreeType: 'BA (Hons)', stream: 'arts', faculty: 'Faculty of Social Sciences', duration: '4 Years' },
    ],
  },
  {
    id: 'uor',
    name: 'University of Ruhuna',
    shortCode: 'UOR',
    location: 'Wellamadama, Matara & Hapugala, Galle',
    province: 'Southern Province',
    established: '1978',
    faculties: ['Faculty of Engineering (Galle)', 'Faculty of Medicine (Karapitiya)', 'Faculty of Science', 'Faculty of Management & Finance', 'Faculty of Technology (Kamburupitiya)', 'Faculty of Agriculture', 'Faculty of Fisheries & Marine Science'],
    websiteUrl: 'https://ruh.ac.lk',
    courses: [
      { name: 'BSc Eng (Hons) in Civil & Environmental / Electrical & Information / Mechanical', degreeType: 'BSc Eng (Hons)', stream: 'physical-science', faculty: 'Faculty of Engineering (Hapugala)', duration: '4 Years' },
      { name: 'BSc in Computer Science / Physical Science', degreeType: 'BSc (Hons)', stream: 'physical-science', faculty: 'Faculty of Science', duration: '4 Years' },
      { name: 'MBBS (Bachelor of Medicine and Surgery)', degreeType: 'MBBS', stream: 'biological-science', faculty: 'Faculty of Medicine (Karapitiya)', duration: '5 Years' },
      { name: 'BSc in Fisheries & Marine Sciences', degreeType: 'BSc (Hons)', stream: 'biological-science', faculty: 'Faculty of Fisheries & Marine Science', duration: '4 Years' },
      { name: 'Bachelor of Engineering Technology (BET)', degreeType: 'BET (Hons)', stream: 'technology', faculty: 'Faculty of Technology', duration: '4 Years' },
      { name: 'Bachelor of Information & Communication Technology (BICT)', degreeType: 'BICT (Hons)', stream: 'technology', faculty: 'Faculty of Technology', duration: '4 Years' },
      { name: 'BBA in Marketing / Finance / Human Resources', degreeType: 'BBA (Hons)', stream: 'commerce', faculty: 'Faculty of Management & Finance', duration: '4 Years' },
    ],
  },
  {
    id: 'uoj',
    name: 'University of Jaffna',
    shortCode: 'UOJ',
    location: 'Thirunelvely, Jaffna & Kilinochchi',
    province: 'Northern Province',
    established: '1974',
    faculties: ['Faculty of Engineering (Kilinochchi)', 'Faculty of Medicine', 'Faculty of Science', 'Faculty of Management Studies & Commerce', 'Faculty of Technology (Kilinochchi)', 'Faculty of Arts', 'Faculty of Agriculture'],
    websiteUrl: 'https://jfn.ac.lk',
    courses: [
      { name: 'BSc Eng (Hons) in Civil / Electrical / Mechanical / Computer', degreeType: 'BSc Eng (Hons)', stream: 'physical-science', faculty: 'Faculty of Engineering (Kilinochchi)', duration: '4 Years' },
      { name: 'BSc in Computer Science', degreeType: 'BSc (Hons)', stream: 'physical-science', faculty: 'Faculty of Science', duration: '4 Years' },
      { name: 'MBBS (Bachelor of Medicine & Surgery)', degreeType: 'MBBS', stream: 'biological-science', faculty: 'Faculty of Medicine', duration: '5 Years' },
      { name: 'Bachelor of Engineering Technology (BET Hons)', degreeType: 'BET (Hons)', stream: 'technology', faculty: 'Faculty of Technology', duration: '4 Years' },
      { name: 'Bachelor of Bio-systems Technology (BBST Hons)', degreeType: 'BBST (Hons)', stream: 'technology', faculty: 'Faculty of Technology', duration: '4 Years' },
      { name: 'B.Com (Special) / BBA', degreeType: 'B.Com (Special)', stream: 'commerce', faculty: 'Faculty of Management Studies & Commerce', duration: '4 Years' },
      { name: 'Bachelor of Laws (LL.B)', degreeType: 'LL.B', stream: 'arts', faculty: 'Faculty of Arts', duration: '4 Years' },
    ],
  },
  {
    id: 'seusl',
    name: 'South Eastern University of Sri Lanka',
    shortCode: 'SEUSL',
    location: 'Oluvil & Sammanthurai',
    province: 'Eastern Province',
    established: '1995',
    faculties: ['Faculty of Engineering', 'Faculty of Technology', 'Faculty of Applied Sciences', 'Faculty of Management & Commerce', 'Faculty of Arts & Culture'],
    websiteUrl: 'https://seu.ac.lk',
    courses: [
      { name: 'BSc Eng (Hons) in Civil / Mechanical / Electrical', degreeType: 'BSc Eng (Hons)', stream: 'physical-science', faculty: 'Faculty of Engineering', duration: '4 Years' },
      { name: 'Bachelor of Information & Communication Technology (BICT)', degreeType: 'BICT (Hons)', stream: 'technology', faculty: 'Faculty of Technology', duration: '4 Years' },
      { name: 'Bachelor of Engineering Technology (BET)', degreeType: 'BET (Hons)', stream: 'technology', faculty: 'Faculty of Technology', duration: '4 Years' },
      { name: 'B.Com / BBA in Accountancy & Finance', degreeType: 'B.Com', stream: 'commerce', faculty: 'Faculty of Management & Commerce', duration: '4 Years' },
    ],
  },
  {
    id: 'rusl',
    name: 'Rajarata University of Sri Lanka',
    shortCode: 'RUSL',
    location: 'Mihintale & Saliyapura, Anuradhapura',
    province: 'North Central Province',
    established: '1995',
    faculties: ['Faculty of Medicine & Allied Sciences (Saliyapura)', 'Faculty of Technology', 'Faculty of Applied Sciences', 'Faculty of Management Studies', 'Faculty of Agriculture'],
    websiteUrl: 'https://rjt.ac.lk',
    courses: [
      { name: 'MBBS (Faculty of Medicine - Saliyapura)', degreeType: 'MBBS', stream: 'biological-science', faculty: 'Faculty of Medicine', duration: '5 Years' },
      { name: 'BSc in Agriculture', degreeType: 'BSc (Hons)', stream: 'biological-science', faculty: 'Faculty of Agriculture', duration: '4 Years' },
      { name: 'Bachelor of Information & Communication Technology (BICT)', degreeType: 'BICT (Hons)', stream: 'technology', faculty: 'Faculty of Technology', duration: '4 Years' },
      { name: 'BSc in Physical Science / Applied Sciences', degreeType: 'BSc', stream: 'physical-science', faculty: 'Faculty of Applied Sciences', duration: '3 - 4 Years' },
      { name: 'BSc in Business Management / Accountancy', degreeType: 'BSc (Hons)', stream: 'commerce', faculty: 'Faculty of Management Studies', duration: '4 Years' },
    ],
  },
  {
    id: 'wusl',
    name: 'Wayamba University of Sri Lanka',
    shortCode: 'WUSL',
    location: 'Kuliyapitiya & Makandura',
    province: 'North Western Province',
    established: '1999',
    faculties: ['Faculty of Medicine', 'Faculty of Technology', 'Faculty of Livestock, Fisheries & Nutrition', 'Faculty of Agriculture & Plantation Management', 'Faculty of Business Studies & Finance'],
    websiteUrl: 'https://wyb.ac.lk',
    courses: [
      { name: 'MBBS (Bachelor of Medicine & Surgery)', degreeType: 'MBBS', stream: 'biological-science', faculty: 'Faculty of Medicine', duration: '5 Years' },
      { name: 'BSc in Food Science & Nutrition', degreeType: 'BSc (Hons)', stream: 'biological-science', faculty: 'Faculty of Livestock, Fisheries & Nutrition', duration: '4 Years' },
      { name: 'Bachelor of Engineering Technology (BET Hons)', degreeType: 'BET (Hons)', stream: 'technology', faculty: 'Faculty of Technology', duration: '4 Years' },
      { name: 'Bachelor of Bio-systems Technology (BBST Hons)', degreeType: 'BBST (Hons)', stream: 'technology', faculty: 'Faculty of Technology', duration: '4 Years' },
      { name: 'BSc in Banking & Finance / Business Management', degreeType: 'BSc (Hons)', stream: 'commerce', faculty: 'Faculty of Business Studies & Finance', duration: '4 Years' },
    ],
  },
  {
    id: 'susl',
    name: 'Sabaragamuwa University of Sri Lanka',
    shortCode: 'SUSL',
    location: 'Pambahinna, Belihuloya',
    province: 'Sabaragamuwa Province',
    established: '1995',
    faculties: ['Faculty of Geomatics (Surveying Sciences)', 'Faculty of Medicine', 'Faculty of Applied Sciences', 'Faculty of Management Studies', 'Faculty of Agricultural Sciences', 'Faculty of Technology'],
    websiteUrl: 'https://sab.ac.lk',
    courses: [
      { name: 'BSc in Surveying Sciences (Surveying & Mapping, GIS, Hydrographic Surveying)', degreeType: 'BSc (Hons)', stream: 'physical-science', faculty: 'Faculty of Geomatics', duration: '4 Years' },
      { name: 'BSc in Computing & Information Systems', degreeType: 'BSc (Hons)', stream: 'physical-science', faculty: 'Faculty of Applied Sciences', duration: '4 Years' },
      { name: 'MBBS (Bachelor of Medicine & Surgery)', degreeType: 'MBBS', stream: 'biological-science', faculty: 'Faculty of Medicine', duration: '5 Years' },
      { name: 'Bachelor of Engineering Technology / Bio-systems Tech', degreeType: 'BET / BBST', stream: 'technology', faculty: 'Faculty of Technology', duration: '4 Years' },
      { name: 'BSc in Financial Management / Tourism Management', degreeType: 'BSc (Hons)', stream: 'commerce', faculty: 'Faculty of Management Studies', duration: '4 Years' },
    ],
  },
  {
    id: 'uwu',
    name: 'Uva Wellassa University',
    shortCode: 'UWU',
    location: 'Passara Road, Badulla',
    province: 'Uva Province',
    established: '2005',
    faculties: ['Faculty of Science & Technology', 'Faculty of Technological Studies', 'Faculty of Animal Science & Export Agriculture', 'Faculty of Management'],
    websiteUrl: 'https://uwu.ac.lk',
    courses: [
      { name: 'BSc in Computer Science & Technology (CST) / Industrial Information Tech', degreeType: 'BSc (Hons)', stream: 'physical-science', faculty: 'Faculty of Science & Technology', duration: '4 Years' },
      { name: 'Bachelor of Engineering Technology in Mechanical Manufacturing', degreeType: 'BET (Hons)', stream: 'technology', faculty: 'Faculty of Technological Studies', duration: '4 Years' },
      { name: 'Bachelor of Bio-systems Technology (BBST Hons)', degreeType: 'BBST (Hons)', stream: 'technology', faculty: 'Faculty of Technological Studies', duration: '4 Years' },
      { name: 'BSc in Animal Science / Aquatic Resources Tech', degreeType: 'BSc (Hons)', stream: 'biological-science', faculty: 'Faculty of Animal Science', duration: '4 Years' },
      { name: 'BBM in Entrepreneurship & Management', degreeType: 'BBM (Hons)', stream: 'commerce', faculty: 'Faculty of Management', duration: '4 Years' },
    ],
  },
  {
    id: 'ousl',
    name: 'The Open University of Sri Lanka',
    shortCode: 'OUSL',
    location: 'Nawala, Nugegoda (Island-wide Centers)',
    province: 'Western Province',
    established: '1980',
    faculties: ['Faculty of Engineering Technology', 'Faculty of Natural Sciences', 'Faculty of Humanities & Social Sciences', 'Faculty of Health Sciences', 'Faculty of Management Studies'],
    websiteUrl: 'https://ou.ac.lk',
    courses: [
      { name: 'Bachelor of Software Engineering (BSE Hons)', degreeType: 'BSE (Hons)', stream: 'physical-science', faculty: 'Faculty of Engineering Technology', duration: '4 Years' },
      { name: 'Bachelor of Technology in Engineering (Civil, Mech, Electrical)', degreeType: 'B.Tech (Hons)', stream: 'physical-science', faculty: 'Faculty of Engineering Technology', duration: '4 Years' },
      { name: 'Bachelor of Laws (LL.B - Open University)', degreeType: 'LL.B', stream: 'arts', faculty: 'Faculty of Humanities & Social Sciences', duration: '4 Years' },
      { name: 'BSc in Nursing / Pharmacy / Medical Lab Sciences', degreeType: 'BSc (Hons)', stream: 'biological-science', faculty: 'Faculty of Health Sciences', duration: '3 - 4 Years' },
      { name: 'Bachelor of Management Studies (BMS Special)', degreeType: 'BMS (Special)', stream: 'commerce', faculty: 'Faculty of Management Studies', duration: '4 Years' },
    ],
  },
];

export const AlUniversitiesPage: FC = () => {
  const [searchParams] = useSearchParams();

  const streamParam = searchParams.get('stream') || 'physical-science';
  const subjectsParam = searchParams.get('subjects') || '';
  const goalParam = searchParams.get('goal') || '';

  const [streamFilter, setStreamFilter] = useState<string>(streamParam);
  const [searchQuery, setSearchQuery] = useState('');
  const [provinceFilter, setProvinceFilter] = useState<string>('all');

  const provinces = useMemo(() => {
    const set = new Set(SRI_LANKAN_UNIVERSITIES.map((u) => u.province));
    return ['all', ...Array.from(set)];
  }, []);

  // Filter universities and their courses
  const filteredUniversities = useMemo(() => {
    return SRI_LANKAN_UNIVERSITIES.map((uni) => {
      // Filter the courses offered by this university for the selected stream
      const matchingCourses = uni.courses.filter((course) => {
        const matchesStream =
          streamFilter === 'all' || course.stream === 'all' || course.stream === streamFilter;

        const q = searchQuery.toLowerCase().trim();
        const matchesCourseSearch =
          !q ||
          course.name.toLowerCase().includes(q) ||
          course.faculty.toLowerCase().includes(q) ||
          course.degreeType.toLowerCase().includes(q) ||
          uni.name.toLowerCase().includes(q) ||
          uni.location.toLowerCase().includes(q);

        return matchesStream && matchesCourseSearch;
      });

      return {
        ...uni,
        matchingCourses,
      };
    }).filter((uni) => {
      const matchesProvince = provinceFilter === 'all' || uni.province === provinceFilter;
      const hasCoursesOrMatchesSearch =
        uni.matchingCourses.length > 0 ||
        (searchQuery &&
          (uni.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
            uni.location.toLowerCase().includes(searchQuery.toLowerCase().trim())));

      return matchesProvince && hasCoursesOrMatchesSearch;
    });
  }, [streamFilter, provinceFilter, searchQuery]);

  const totalMatchingCourses = useMemo(() => {
    return filteredUniversities.reduce((acc, curr) => acc + curr.matchingCourses.length, 0);
  }, [filteredUniversities]);

  return (
    <AfterOlLayout
      title="University Explorer (O/L Pathways)"
      subtitle="Explore Sri Lankan state universities and see the exact degree programs and faculties available for your stream."
    >
      <div className="space-y-8 max-w-6xl pb-12">
        {/* Top Header Banner */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#D6F0EB] text-[#0D645B] text-[11px] font-bold font-mono uppercase tracking-wider">
                STREAM: {streamFilter.toUpperCase().replace('-', ' ')}
              </span>
              {goalParam && (
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full capitalize">
                  Goal: {goalParam.replace(/-/g, ' ')}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
              State Universities & Offered Degrees
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              View faculties of Medicine, Engineering, Computing, Management, and Applied Sciences across 17+ state universities offering degree courses in your selected subject stream.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            <Link
              to={`/after-ol/subjects?stream=${streamFilter}${subjectsParam ? `&subjects=${subjectsParam}` : ''}${goalParam ? `&goal=${goalParam}` : ''}`}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#0D645B]" />
              <span>Change Subjects</span>
            </Link>
          </div>
        </div>

        {/* Filter Bar: Search, Stream Dropdown, and Province Selector */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search university name, degree title, or location (e.g. Moratuwa, UCSC, Peradeniya, Civil)..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D645B]/30 focus:bg-white transition-all"
              />
            </div>

            {/* Stream Filter */}
            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Stream:</span>
              <select
                value={streamFilter}
                onChange={(e) => setStreamFilter(e.target.value)}
                className="w-full md:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0D645B]/30 cursor-pointer"
              >
                <option value="all">All Streams</option>
                <option value="physical-science">Physical Science (Maths)</option>
                <option value="biological-science">Biological Science (Bio)</option>
                <option value="commerce">Commerce</option>
                <option value="technology">Technology</option>
                <option value="arts">Arts</option>
              </select>
            </div>

            {/* Province Filter */}
            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Province:</span>
              <select
                value={provinceFilter}
                onChange={(e) => setProvinceFilter(e.target.value)}
                className="w-full md:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0D645B]/30 cursor-pointer capitalize"
              >
                {provinces.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov === 'all' ? 'All Provinces' : prov}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>
            Found <strong className="text-[#0D645B] font-bold">{filteredUniversities.length}</strong> universities offering{' '}
            <strong className="text-[#0D645B] font-bold">{totalMatchingCourses}</strong> degree courses in this stream
          </span>
        </div>

        {/* University Cards Grid */}
        {filteredUniversities.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
              <Landmark className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-heading">No universities found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search query, switching to "All Provinces", or selecting another stream.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredUniversities.map((uni) => (
              <div
                key={uni.id}
                className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all space-y-6"
              >
                {/* University Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#D6F0EB] text-[#0D645B] flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-slate-900 font-heading">
                          {uni.name}
                        </h2>
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {uni.shortCode}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{uni.location} ({uni.province})</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Est. {uni.established}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {uni.websiteUrl && (
                    <a
                      href={uni.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#0D645B] hover:text-[#0A4E46] transition-colors self-start sm:self-center"
                    >
                      <span>Official Website</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Offered Courses Section for Selected Stream */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-[#0D645B]" />
                      <span>
                        Degree Courses Offered for {streamFilter === 'all' ? 'All Streams' : streamFilter.replace('-', ' ')}:
                      </span>
                    </span>
                    <span className="text-xs font-bold text-[#0D645B] bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                      {uni.matchingCourses.length} {uni.matchingCourses.length === 1 ? 'Course' : 'Courses'}
                    </span>
                  </div>

                  {uni.matchingCourses.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">
                      No direct degree programs offered by this university in the selected stream filter.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {uni.matchingCourses.map((course, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:border-[#0D645B]/40 hover:shadow-2xs transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                {course.name}
                              </h3>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 shrink-0">
                                {course.duration}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium block">
                              {course.faculty}
                            </span>
                          </div>

                          <div className="pt-2 mt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                            <span className="text-[#0D645B] font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{course.degreeType}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Faculties Tag Cloud */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-bold text-slate-600 text-[11px] mr-1">Faculties:</span>
                  {uni.faculties.map((fac, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px]"
                    >
                      {fac}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            to={`/after-ol/study-options?stream=${streamFilter}${subjectsParam ? `&subjects=${subjectsParam}` : ''}${goalParam ? `&goal=${goalParam}` : ''}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Back to Study Options</span>
          </Link>

          <Link
            to="/after-ol/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0D645B] hover:bg-[#0A4E46] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
          >
            <span>Back to Dashboard</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </AfterOlLayout>
  );
};
