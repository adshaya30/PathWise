import { useState, useMemo } from 'react';
import type { FC } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  GraduationCap,
  Landmark,
  AlertCircle,
  Search,
  BookOpen,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { AfterOlLayout } from '../../components/after-ol/AfterOlLayout';

export type StudyCategory = 'all' | 'ugc-state' | 'sliate' | 'external-ousl' | 'nvq-univotec' | 'professional';

interface CourseOption {
  id: string;
  title: string;
  code?: string;
  category: StudyCategory;
  categoryLabel: string;
  stream: 'physical-science' | 'biological-science' | 'commerce' | 'technology' | 'arts' | 'all';
  awardingBodies: string[];
  duration: string;
  degreeType: string;
  description: string;
  prerequisites: string[];
  requiredSubjectIds: string[]; // Subject IDs that must be present in selection for exact match
  careerDestinations: string[];
  intakeMethod: string;
  tuitionType: 'Free (Government Funded)' | 'Subsidized' | 'Affordable Course Fee' | 'Professional Exam Fee';
  highlightBadge?: string;
}

const ALL_STUDY_COURSES: CourseOption[] = [
  // ==========================================
  // Physical Science Stream Courses
  // ==========================================
  {
    id: 'bsc-eng-hons',
    title: 'BSc Eng (Hons) in Engineering',
    code: 'UGC-ENG',
    category: 'ugc-state',
    categoryLabel: 'UGC State University',
    stream: 'physical-science',
    awardingBodies: ['University of Moratuwa', 'University of Peradeniya', 'University of Ruhuna', 'University of Jaffna', 'South Eastern University'],
    duration: '4 Years (Full-Time)',
    degreeType: 'Bachelor of Science in Engineering (Honours)',
    description: 'Premier engineering degree accredited by the Institution of Engineers Sri Lanka (IESL) and the Washington Accord. Specializations include Civil, Electrical & Electronic, Mechanical, Chemical, Mechatronics, and Computer Engineering.',
    prerequisites: ['Combined Mathematics', 'Physics', 'Chemistry'],
    requiredSubjectIds: ['combined-maths', 'physics', 'chemistry'],
    careerDestinations: ['Chartered Engineer', 'Civil / Structural Engineer', 'Robotics Specialist', 'Project Consultant'],
    intakeMethod: 'UGC National Z-Score Merit & District Quota',
    tuitionType: 'Free (Government Funded)',
    highlightBadge: 'MOST SOUGHT AFTER',
  },
  {
    id: 'bsc-cs-ucsc',
    title: 'BSc (Hons) in Computer Science / Software Engineering',
    code: 'UGC-CS',
    category: 'ugc-state',
    categoryLabel: 'UGC State University',
    stream: 'physical-science',
    awardingBodies: ['University of Colombo School of Computing (UCSC)', 'University of Moratuwa', 'University of Kelaniya', 'University of Ruhuna'],
    duration: '4 Years (Honours) / 3 Years (General)',
    degreeType: 'Bachelor of Science (Hons) in Computer Science',
    description: 'Rigorous computer science curriculum covering algorithms, full-stack software development, cloud infrastructure, artificial intelligence, and operating systems.',
    prerequisites: ['Combined Mathematics', 'Physics', 'Chemistry OR ICT'],
    requiredSubjectIds: ['combined-maths', 'physics'],
    careerDestinations: ['Software Engineer', 'Cloud Architect', 'Full Stack Developer', 'AI / ML Engineer'],
    intakeMethod: 'UGC Z-Score Selection',
    tuitionType: 'Free (Government Funded)',
    highlightBadge: 'HIGH DEMAND',
  },
  {
    id: 'bsc-data-science',
    title: 'BSc (Hons) in Data Science & Artificial Intelligence',
    code: 'UGC-DS',
    category: 'ugc-state',
    categoryLabel: 'UGC State University',
    stream: 'physical-science',
    awardingBodies: ['University of Moratuwa (FIT)', 'University of Colombo', 'University of Kelaniya'],
    duration: '4 Years (Full-Time)',
    degreeType: 'BSc (Hons) in Data Science',
    description: 'Advanced mathematics, machine learning, statistical modeling, big data engineering, and data pipeline architecture for digital industries.',
    prerequisites: ['Combined Mathematics', 'Physics', 'ICT OR Chemistry'],
    requiredSubjectIds: ['combined-maths', 'physics'],
    careerDestinations: ['Data Scientist', 'Machine Learning Engineer', 'Quantitative Analyst', 'Business Intelligence Lead'],
    intakeMethod: 'UGC Z-Score Selection',
    tuitionType: 'Free (Government Funded)',
  },
  {
    id: 'b-arch',
    title: 'Bachelor of Architecture (B.Arch)',
    code: 'UGC-ARCH',
    category: 'ugc-state',
    categoryLabel: 'UGC State University',
    stream: 'physical-science',
    awardingBodies: ['University of Moratuwa'],
    duration: '5 Years (Professional Degree)',
    degreeType: 'B.Arch (Honours) - RIBA & SLIA Accredited',
    description: 'Professional architectural education combining structural design, spatial planning, urban heritage, and sustainable building environments.',
    prerequisites: ['Combined Mathematics OR Higher Maths', 'Physics OR Chemistry', 'Art / Secondary Approved Subject'],
    requiredSubjectIds: ['combined-maths'],
    careerDestinations: ['Chartered Architect', 'Urban Designer', 'Interior Design Director', 'Heritage Conservationist'],
    intakeMethod: 'UGC Z-Score + Architecture Aptitude Test',
    tuitionType: 'Free (Government Funded)',
  },
  {
    id: 'sliate-hndit',
    title: 'Higher National Diploma in Information Technology (HNDIT)',
    code: 'SLIATE-HNDIT',
    category: 'sliate',
    categoryLabel: 'SLIATE Advanced Technical Institute',
    stream: 'physical-science',
    awardingBodies: ['SLIATE (Labuduwa, Dehiwala, Kandy, Jaffna, Kurunegala, Mattakkuliya)'],
    duration: '2.5 Years (Full-Time with 6-Month Industry Internship)',
    degreeType: 'Higher National Diploma (NVQ Level 6 Equivalent)',
    description: 'Nationally recognized government IT diploma with high industry employment rate. Pathways allow direct lateral entry into final year BSc IT degree top-ups.',
    prerequisites: ['Pass in any 3 A/L subjects (Maths, Science, Commerce or Tech) + Credit in O/L English and Maths'],
    requiredSubjectIds: [],
    careerDestinations: ['Associate Software Engineer', 'IT Systems Administrator', 'Web Application Developer', 'QA Engineer'],
    intakeMethod: 'SLIATE Competitive Entry Exam / A/L Results',
    tuitionType: 'Free (Government Funded)',
    highlightBadge: 'EXCELLENT VOCATIONAL ROUTE',
  },
  {
    id: 'sliate-hnde',
    title: 'Higher National Diploma in Engineering (HNDE)',
    code: 'SLIATE-HNDE',
    category: 'sliate',
    categoryLabel: 'SLIATE Advanced Technical Institute',
    stream: 'physical-science',
    awardingBodies: ['SLIATE (Mattakkuliya, Labuduwa, Jaffna)'],
    duration: '3.5 Years (Full-Time with Industry Practicum)',
    degreeType: 'Higher National Diploma in Civil / Mechanical / Electrical Engineering',
    description: 'Renowned engineering diploma established to produce skilled field engineers and technical supervisors across state and private development sectors.',
    prerequisites: ['Combined Mathematics', 'Physics', 'Chemistry'],
    requiredSubjectIds: ['combined-maths', 'physics'],
    careerDestinations: ['Senior Engineering Assistant', 'Site Engineer', 'Maintenance Supervisor', 'Technical Officer'],
    intakeMethod: 'SLIATE Engineering Selection Test',
    tuitionType: 'Free (Government Funded)',
  },
  {
    id: 'bit-ucsc',
    title: 'Bachelor of Information Technology (BIT - UCSC External)',
    code: 'EXT-BIT',
    category: 'external-ousl',
    categoryLabel: 'External & Open University',
    stream: 'all',
    awardingBodies: ['University of Colombo School of Computing (UCSC)'],
    duration: '3 Years (Self-Paced / Flexible)',
    degreeType: 'Bachelor of Information Technology (BIT)',
    description: 'Prestigious external computing degree awarded directly by University of Colombo. Allows working students or concurrent A/L graduates to earn an authentic UCSC degree.',
    prerequisites: ['3 A/L passes in any stream + Credit in O/L Mathematics'],
    requiredSubjectIds: [],
    careerDestinations: ['Software Developer', 'Database Administrator', 'Network Engineer', 'IT Consultant'],
    intakeMethod: 'FIT (Foundation in IT) or Direct A/L 3 Passes',
    tuitionType: 'Affordable Course Fee',
    highlightBadge: 'FLEXIBLE DUAL DEGREE OPTION',
  },

  // ==========================================
  // Biological Science Stream Courses
  // ==========================================
  {
    id: 'mbbs-state',
    title: 'Bachelor of Medicine and Bachelor of Surgery (MBBS)',
    code: 'UGC-MBBS',
    category: 'ugc-state',
    categoryLabel: 'UGC State University',
    stream: 'biological-science',
    awardingBodies: ['Colombo, Peradeniya, Sri Jayewardenepura, Kelaniya, Ruhuna, Jaffna, Eastern, Rajarata, Wayamba, Sabaragamuwa, Moratuwa (11 State Faculties)'],
    duration: '5 Years + 1 Year Internship',
    degreeType: 'MBBS (Doctor of Medicine) - Sri Lanka Medical Council (SLMC) Accredited',
    description: 'The pinnacle state medical degree qualifying graduates to practice as medical doctors and surgeons throughout Sri Lanka and worldwide (GMC / WHO listed).',
    prerequisites: ['Biology', 'Chemistry', 'Physics'],
    requiredSubjectIds: ['biology', 'chemistry', 'physics'],
    careerDestinations: ['Medical Officer / Doctor', 'Surgeon', 'Consultant Physician', 'Medical Academic Researcher'],
    intakeMethod: 'UGC Medical Z-Score Quota',
    tuitionType: 'Free (Government Funded)',
    highlightBadge: 'PREMIER HEALTHCARE',
  },
  {
    id: 'bds-dental',
    title: 'Bachelor of Dental Surgery (BDS)',
    code: 'UGC-BDS',
    category: 'ugc-state',
    categoryLabel: 'UGC State University',
    stream: 'biological-science',
    awardingBodies: ['University of Peradeniya (Faculty of Dental Sciences)'],
    duration: '5 Years (Full-Time)',
    degreeType: 'Bachelor of Dental Surgery (BDS) - SLMC Accredited',
    description: 'Comprehensive dental surgery, oral pathology, orthodontics, maxillofacial surgery, and restorative dental medicine education.',
    prerequisites: ['Biology', 'Chemistry', 'Physics'],
    requiredSubjectIds: ['biology', 'chemistry', 'physics'],
    careerDestinations: ['Dental Surgeon', 'Orthodontist', 'Oral & Maxillofacial Specialist', 'Hospital Dental Consultant'],
    intakeMethod: 'UGC Z-Score Selection',
    tuitionType: 'Free (Government Funded)',
  },
  {
    id: 'b-pharm-state',
    title: 'Bachelor of Pharmacy (B.Pharm Special)',
    code: 'UGC-PHARM',
    category: 'ugc-state',
    categoryLabel: 'UGC State University',
    stream: 'biological-science',
    awardingBodies: ['University of Sri Jayewardenepura', 'University of Colombo', 'University of Peradeniya', 'University of Ruhuna'],
    duration: '4 Years (Honours)',
    degreeType: 'Bachelor of Pharmacy (Honours)',
    description: 'Clinical pharmacology, drug formulation, medicinal chemistry, toxicology, and pharmaceutical manufacturing technology.',
    prerequisites: ['Biology', 'Chemistry', 'Physics'],
    requiredSubjectIds: ['biology', 'chemistry'],
    careerDestinations: ['Registered Pharmacist', 'Pharmaceutical Production Manager', 'Clinical Pharmacologist', 'Drug Regulatory Officer'],
    intakeMethod: 'UGC Z-Score Selection',
    tuitionType: 'Free (Government Funded)',
  },
  {
    id: 'bsc-agriculture',
    title: 'BSc (Hons) in Agricultural Technology & Management',
    code: 'UGC-AGRI',
    category: 'ugc-state',
    categoryLabel: 'UGC State University',
    stream: 'biological-science',
    awardingBodies: ['University of Peradeniya', 'University of Ruhuna', 'Wayamba University', 'Eastern University', 'University of Jaffna'],
    duration: '4 Years (Full-Time)',
    degreeType: 'BSc (Hons) in Agriculture',
    description: 'Modern agronomy, soil science, agricultural biotechnology, crop breeding, smart greenhouse management, and agri-business economics.',
    prerequisites: ['Biology', 'Chemistry', 'Physics OR Agricultural Science'],
    requiredSubjectIds: ['biology', 'chemistry'],
    careerDestinations: ['Agricultural Officer', 'Agronomist', 'Plant Geneticist', 'Agri-Business Director'],
    intakeMethod: 'UGC Z-Score Selection',
    tuitionType: 'Free (Government Funded)',
  },
  {
    id: 'sliate-hnd-agri',
    title: 'Higher National Diploma in Agricultural Technology (HNDT Agri)',
    code: 'SLIATE-AGRI',
    category: 'sliate',
    categoryLabel: 'SLIATE Advanced Technical Institute',
    stream: 'biological-science',
    awardingBodies: ['SLIATE Hardy ATI (Ampara)'],
    duration: '3 Years (Full-Time)',
    degreeType: 'Higher National Diploma in Agriculture',
    description: 'Practical field training in commercial farming, animal husbandry, farm mechanization, food preservation, and plantation management.',
    prerequisites: ['3 A/L Bio Science passes including Chemistry or Agricultural Science'],
    requiredSubjectIds: [],
    careerDestinations: ['Farm Manager', 'Agricultural Field Executive', 'Plantation Assistant Superintendent', 'Agro-Chemical Advisor'],
    intakeMethod: 'SLIATE Selection Test',
    tuitionType: 'Free (Government Funded)',
  },

  // ==========================================
  // Commerce Stream Courses
  // ==========================================
  {
    id: 'bcom-accounting-usj',
    title: 'BSc (Hons) in Accounting & Financial Management',
    code: 'UGC-ACC',
    category: 'ugc-state',
    categoryLabel: 'UGC State University',
    stream: 'commerce',
    awardingBodies: ['University of Sri Jayewardenepura (FMSC)', 'University of Colombo', 'University of Kelaniya', 'University of Ruhuna'],
    duration: '4 Years (Honours)',
    degreeType: 'BSc (Hons) in Accounting',
    description: 'The top-tier business qualification in Sri Lanka, granting maximum exemptions for CA Sri Lanka, CIMA, ACCA, and CPA Australia.',
    prerequisites: ['Accounting', 'Business Studies OR Economics', 'Any Approved 3rd Commerce Subject'],
    requiredSubjectIds: ['accounting'],
    careerDestinations: ['Chief Financial Officer (CFO)', 'Chartered Accountant', 'Auditor & Tax Consultant', 'Investment Banker'],
    intakeMethod: 'UGC Commerce Z-Score Quota',
    tuitionType: 'Free (Government Funded)',
    highlightBadge: 'TOP MANAGEMENT ROUTE',
  },
  {
    id: 'bsc-bis-usj',
    title: 'BSc (Hons) in Business Information Systems (BIS / FinTech)',
    code: 'UGC-BIS',
    category: 'ugc-state',
    categoryLabel: 'UGC State University',
    stream: 'commerce',
    awardingBodies: ['University of Sri Jayewardenepura', 'University of Kelaniya'],
    duration: '4 Years (Honours)',
    degreeType: 'BSc (Hons) in Business Information Systems',
    description: 'Bridges commercial financial intelligence with database design, enterprise ERP systems (SAP), digital banking, and business analytics.',
    prerequisites: ['At least 2 Commerce subjects + ICT or Business Statistics'],
    requiredSubjectIds: [],
    careerDestinations: ['Business Analyst', 'ERP Consultant', 'FinTech Product Lead', 'Digital Transformation Specialist'],
    intakeMethod: 'UGC Commerce Z-Score Selection',
    tuitionType: 'Free (Government Funded)',
  },
  {
    id: 'sliate-hnda',
    title: 'Higher National Diploma in Accountancy (HNDA)',
    code: 'SLIATE-HNDA',
    category: 'sliate',
    categoryLabel: 'SLIATE Advanced Technical Institute',
    stream: 'commerce',
    awardingBodies: ['SLIATE ATI Centres Island-wide (Dehiwala, Kandy, Kurunegala, Galle, Jaffna, etc.)'],
    duration: '4 Years (Full-Time)',
    degreeType: 'Higher National Diploma in Accountancy (Recognized as B.Com Equivalent for State Service)',
    description: 'The premier public diploma in accountancy, officially recognized by the Sri Lankan Public Service Commission on par with a state Bachelor of Commerce degree.',
    prerequisites: ['3 A/L Passes in Commerce Stream (Accounting is compulsory)'],
    requiredSubjectIds: ['accounting'],
    careerDestinations: ['Accountant', 'Financial Executive', 'Government Audit Officer', 'Tax Specialist'],
    intakeMethod: 'SLIATE Admission Test',
    tuitionType: 'Free (Government Funded)',
    highlightBadge: 'PUBLIC SECTOR B.COM EQUIVALENT',
  },
  {
    id: 'ca-sri-lanka',
    title: 'Chartered Accountancy (CA Sri Lanka Qualification)',
    code: 'PROF-CA',
    category: 'professional',
    categoryLabel: 'Professional Institute',
    stream: 'all',
    awardingBodies: ['Institute of Chartered Accountants of Sri Lanka (CA Sri Lanka)'],
    duration: '3 - 4 Years (Executive, Business & Corporate Levels + Practical Training)',
    degreeType: 'Associate Chartered Accountant (ACA)',
    description: 'The highest professional accounting and financial leadership credential in Sri Lanka, granting global practice rights through reciprocal agreements with ICAEW & CA ANZ.',
    prerequisites: ['3 A/L Passes in any stream with minimum "S" grade'],
    requiredSubjectIds: [],
    careerDestinations: ['Chartered Accountant (ACA/FCA)', 'Managing Director', 'Partner in Audit Firms (Big 4)', 'Financial Controller'],
    intakeMethod: 'Direct Registration after A/L',
    tuitionType: 'Professional Exam Fee',
    highlightBadge: 'GLOBAL CHARTERED CREDENTIAL',
  },

  // ==========================================
  // Technology Stream Courses
  // ==========================================
  {
    id: 'bet-engineering-tech',
    title: 'Bachelor of Engineering Technology (BET Hons)',
    code: 'UGC-BET',
    category: 'ugc-state',
    categoryLabel: 'UGC State University',
    stream: 'technology',
    awardingBodies: ['University of Moratuwa', 'University of Sri Jayewardenepura', 'University of Kelaniya', 'University of Ruhuna', 'South Eastern University', 'University of Jaffna'],
    duration: '4 Years (Honours)',
    degreeType: 'Bachelor of Engineering Technology (BET Hons) - Sydney Accord Accredited',
    description: 'Practical high-tech engineering degree focusing on industrial mechatronics, automobile engineering, robotics, construction technology, and polymers.',
    prerequisites: ['Science for Technology (SFT)', 'Engineering Technology (ET)', 'ICT OR Approved 3rd Basket Subject'],
    requiredSubjectIds: ['sft', 'engineering-tech'],
    careerDestinations: ['Engineering Technologist', 'Mechatronics Engineer', 'Automation Specialist', 'Plant Operations Manager'],
    intakeMethod: 'UGC Technology Stream Z-Score',
    tuitionType: 'Free (Government Funded)',
    highlightBadge: 'HIGH EMPLOYABILITY',
  },
  {
    id: 'bict-computing-tech',
    title: 'Bachelor of Information and Communication Technology (BICT Hons)',
    code: 'UGC-BICT',
    category: 'ugc-state',
    categoryLabel: 'UGC State University',
    stream: 'technology',
    awardingBodies: ['University of Sri Jayewardenepura', 'University of Kelaniya', 'University of Ruhuna', 'Rajarata University', 'South Eastern University', 'University of Vavuniya'],
    duration: '4 Years (Honours)',
    degreeType: 'BICT (Honours) in Software Technology & Network Systems',
    description: 'Cutting-edge computing degree tailored for technology faculty undergraduates. Combines modern cloud computing, IoT hardware interfacing, full-stack programming, and network security.',
    prerequisites: ['Science for Technology (SFT)', 'Engineering Technology (ET) OR Bio-systems Technology (BST)', 'ICT (Highly Recommended)'],
    requiredSubjectIds: ['sft'],
    careerDestinations: ['Software Engineer', 'IoT Systems Architect', 'Network Security Engineer', 'Mobile App Developer'],
    intakeMethod: 'UGC Technology Stream Z-Score',
    tuitionType: 'Free (Government Funded)',
    highlightBadge: 'FASTEST GROWING TECH DEGREE',
  },
  {
    id: 'bbst-biosystems-tech',
    title: 'Bachelor of Bio-systems Technology (BBST Hons)',
    code: 'UGC-BBST',
    category: 'ugc-state',
    categoryLabel: 'UGC State University',
    stream: 'technology',
    awardingBodies: ['University of Sri Jayewardenepura', 'University of Kelaniya', 'University of Ruhuna', 'Wayamba University', 'University of Jaffna'],
    duration: '4 Years (Honours)',
    degreeType: 'Bachelor of Bio-systems Technology (BBST Hons)',
    description: 'Applied industrial biotechnology, food processing engineering, post-harvest robotics, biofuels, and commercial environmental engineering.',
    prerequisites: ['Science for Technology (SFT)', 'Bio-systems Technology (BST)', 'ICT OR Approved 3rd Basket Subject'],
    requiredSubjectIds: ['sft', 'biosystems-tech'],
    careerDestinations: ['Bio-Process Engineer', 'Food Technology Quality Manager', 'Agro-Robotics Specialist', 'Environmental Safety Lead'],
    intakeMethod: 'UGC Technology Stream Z-Score',
    tuitionType: 'Free (Government Funded)',
  },
  {
    id: 'nvq-univotec-btech',
    title: 'Bachelor of Technology (B.Tech - UNIVOTEC)',
    code: 'NVQ-UNIVOTEC',
    category: 'nvq-univotec',
    categoryLabel: 'NVQ & Technical Vocational',
    stream: 'technology',
    awardingBodies: ['University of Vocational Technology (UNIVOTEC - Ratmalana)'],
    duration: '3 - 4 Years (Full-Time / Industry Integrated)',
    degreeType: 'Bachelor of Technology (NVQ Level 7 Equivalent)',
    description: 'State vocational university degree open to A/L Technology graduates and NVQ Level 5 diploma holders in Mechatronics, Building Services, Network Tech, and Manufacturing.',
    prerequisites: ['3 A/L passes in Technology or Science Stream OR NVQ Level 5 Diploma'],
    requiredSubjectIds: [],
    careerDestinations: ['Industrial Technologist', 'Automobile Technical Director', 'Robotics Technician', 'Manufacturing Engineer'],
    intakeMethod: 'UNIVOTEC Aptitude Selection',
    tuitionType: 'Free (Government Funded)',
  },

  // ==========================================
  // Arts Stream Courses
  // ==========================================
  {
    id: 'llb-colombo-law',
    title: 'Bachelor of Laws (LL.B)',
    code: 'UGC-LLB',
    category: 'ugc-state',
    categoryLabel: 'UGC State University',
    stream: 'arts',
    awardingBodies: ['University of Colombo (Faculty of Law)', 'University of Jaffna', 'University of Peradeniya', 'Open University of Sri Lanka (OUSL)'],
    duration: '4 Years (Honours)',
    degreeType: 'Bachelor of Laws (LL.B)',
    description: 'The foremost state law program in Sri Lanka, offering direct fast-track exemption to the final year examination at Sri Lanka Law College.',
    prerequisites: ['Logic & Scientific Method', 'Political Science OR Economics', 'Any Approved 3rd Arts / Science / Commerce Subject + Credit in O/L English'],
    requiredSubjectIds: [],
    careerDestinations: ['Attorney-at-Law', 'Judge / Magistrate', 'Corporate Legal Counsel', 'Human Rights Advocate'],
    intakeMethod: 'UGC Arts / All-Stream Z-Score Selection',
    tuitionType: 'Free (Government Funded)',
    highlightBadge: 'PRESTIGIOUS LEGAL PATHWAY',
  },
  {
    id: 'ba-mass-comm',
    title: 'BA (Hons) in Communication & Media Studies',
    code: 'UGC-MEDIA',
    category: 'ugc-state',
    categoryLabel: 'UGC State University',
    stream: 'arts',
    awardingBodies: ['University of Kelaniya', 'Sri Palee Campus (Horana - UOC)', 'University of Sri Jayewardenepura'],
    duration: '4 Years (Honours)',
    degreeType: 'Bachelor of Arts (Hons) in Mass Communication',
    description: 'Broadcast television, audio journalism, investigative media, digital video direction, public relations, and social media production.',
    prerequisites: ['Communication & Media Studies OR Arts stream combination'],
    requiredSubjectIds: [],
    careerDestinations: ['Television Producer', 'Investigative Journalist', 'Public Relations Director', 'Digital Content Strategist'],
    intakeMethod: 'UGC Arts Z-Score + Aptitude Selection for Sri Palee',
    tuitionType: 'Free (Government Funded)',
  },
  {
    id: 'ousl-llb',
    title: 'Bachelor of Laws (LL.B - Open University OUSL)',
    code: 'OUSL-LLB',
    category: 'external-ousl',
    categoryLabel: 'External & Open University',
    stream: 'all',
    awardingBodies: ['The Open University of Sri Lanka (Nawala / Regional Centers)'],
    duration: '4 Years (Distance & Evening Classes)',
    degreeType: 'Bachelor of Laws (LL.B)',
    description: 'Highly respected state legal education permitting students from any A/L stream to qualify for Attorney-at-Law qualification while working.',
    prerequisites: ['3 A/L Passes in any stream + OUSL Law Entrance Test'],
    requiredSubjectIds: [],
    careerDestinations: ['Attorney-at-Law', 'Corporate Legal Officer', 'Public Notary', 'Policy Researcher'],
    intakeMethod: 'OUSL Law Entrance Examination & Interview',
    tuitionType: 'Affordable Course Fee',
  },
];

export const AlStudyOptionsPage: FC = () => {
  const [searchParams] = useSearchParams();

  const streamParam = searchParams.get('stream') || 'physical-science';
  const subjectsParam = searchParams.get('subjects') || '';
  const goalParam = searchParams.get('goal') || '';

  const userSubjectIds = useMemo(() => {
    return subjectsParam ? subjectsParam.split(',').filter(Boolean) : [];
  }, [subjectsParam]);

  const [searchQuery, setSearchQuery] = useState('');
  const [streamFilter, setStreamFilter] = useState<string>(streamParam);

  // Filter courses based on active stream and search query
  const filteredCourses = useMemo(() => {
    return ALL_STUDY_COURSES.filter((course) => {
      // Stream Match: match if course is for current stream or open to 'all'
      const matchesStream =
        streamFilter === 'all' || course.stream === 'all' || course.stream === streamFilter;

      // Search Query Match
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        course.title.toLowerCase().includes(q) ||
        course.description.toLowerCase().includes(q) ||
        course.degreeType.toLowerCase().includes(q) ||
        course.careerDestinations.some((c) => c.toLowerCase().includes(q)) ||
        course.awardingBodies.some((b) => b.toLowerCase().includes(q));

      return matchesStream && matchesSearch;
    });
  }, [streamFilter, searchQuery]);

  return (
    <AfterOlLayout
      title="Study Options & Available Courses"
      subtitle="Discover state university degrees, SLIATE HNDs, and professional qualifications matching your stream and subjects."
    >
      <div className="space-y-8 max-w-6xl pb-12">
        {/* Top Context & Selected Subject Banner */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#D6F0EB] text-[#0D645B] text-[11px] font-bold font-mono uppercase tracking-wider">
                ACTIVE STREAM: {streamFilter.toUpperCase().replace('-', ' ')}
              </span>
              {goalParam && (
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full capitalize">
                  Goal: {goalParam.replace(/-/g, ' ')}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
              Available Courses & Degree Pathways
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              Based on your stream selection, explore Sri Lankan UGC State University quotas, SLIATE Higher National Diplomas, external computing degrees, and professional certifications.
            </p>

            {userSubjectIds.length > 0 && (
              <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                <span className="font-bold text-slate-700">Your Chosen Subjects:</span>
                <div className="flex flex-wrap gap-1.5">
                  {userSubjectIds.map((id, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-[#0D645B] font-bold text-[11px] capitalize"
                    >
                      {id.replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            <Link
              to={`/after-ol/subjects?stream=${streamFilter}${goalParam ? `&goal=${goalParam}` : ''}`}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#0D645B]" />
              <span>Change Subjects</span>
            </Link>
          </div>
        </div>

        {/* Search & Stream Filter Row */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search degree, university, career or keyword (e.g. Software, Civil, Medicine, SLIATE)..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D645B]/30 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Stream:</span>
            <select
              value={streamFilter}
              onChange={(e) => setStreamFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0D645B]/30 cursor-pointer"
            >
              <option value="all">All Streams</option>
              <option value="physical-science">Physical Science (Maths)</option>
              <option value="biological-science">Biological Science (Bio)</option>
              <option value="commerce">Commerce</option>
              <option value="technology">Technology</option>
              <option value="arts">Arts</option>
            </select>
          </div>
        </div>

        {/* Results Header Count */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">
            Showing <strong className="text-[#0D645B]">{filteredCourses.length}</strong> available courses & pathways
          </span>
        </div>

        {/* Course Cards Grid */}
        {filteredCourses.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-heading">No courses match your criteria</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search query or selecting a different stream.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStreamFilter('all');
              }}
              className="px-4 py-2 bg-[#0D645B] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#0A4E46] transition-all cursor-pointer inline-block mt-2"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredCourses.map((course) => {
              return (
                <div
                  key={course.id}
                  className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Course Title & Degree Type */}
                    <div>
                      <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight font-heading hover:text-[#0D645B] transition-colors">
                        {course.title}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <GraduationCap className="w-3.5 h-3.5 text-[#0D645B] shrink-0" />
                        <span className="font-medium truncate">{course.degreeType}</span>
                      </div>
                    </div>

                    {/* Awarding Bodies / Universities */}
                    <div className="space-y-1.5 text-xs pt-1">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-slate-400" />
                        <span>Offered at:</span>
                      </span>
                      <p className="text-xs text-slate-500 leading-relaxed pl-5">
                        {course.awardingBodies.join(' • ')}
                      </p>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono text-slate-500">
                      Intake: <strong className="text-slate-700 font-sans">{course.intakeMethod}</strong>
                    </span>
                    <Link
                      to={`/after-ol/universities?stream=${streamFilter}${subjectsParam ? `&subjects=${subjectsParam}` : ''}${goalParam ? `&goal=${goalParam}` : ''}`}
                      className="inline-flex items-center gap-1 font-bold text-[#0D645B] hover:text-[#0A4E46] transition-colors"
                    >
                      <span>Explore Universities</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            to={`/after-ol/subjects?stream=${streamFilter}${subjectsParam ? `&subjects=${subjectsParam}` : ''}${goalParam ? `&goal=${goalParam}` : ''}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Back to Subject Combinations</span>
          </Link>

          <Link
            to={`/after-ol/universities?stream=${streamFilter}${subjectsParam ? `&subjects=${subjectsParam}` : ''}${goalParam ? `&goal=${goalParam}` : ''}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0D645B] hover:bg-[#0A4E46] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
          >
            <span>Proceed to University Explorer</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </AfterOlLayout>
  );
};
