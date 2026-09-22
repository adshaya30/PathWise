import { useState, useMemo } from 'react';
import type { FC } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Check,
  Compass,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AfterOlLayout } from '../../components/after-ol/AfterOlLayout';

export type StreamKey = 'physical-science' | 'biological-science' | 'commerce' | 'technology' | 'arts';

interface SubjectInfo {
  id: string;
  name: string;
  category: 'compulsory' | 'elective' | 'basket1' | 'basket2' | 'basket3';
  description: string;
  olPrerequisite: string;
  difficulty: 'Moderate' | 'Challenging' | 'Advanced';
  unlockedFields: string[];
  keyTopics: string[];
}

interface RecommendedCombo {
  id: string;
  name: string;
  tagline: string;
  subjects: string[];
  keyDegrees: string[];
  bestFor: string;
  badge?: string;
}

interface StreamData {
  id: StreamKey;
  name: string;
  shortName: string;
  badge: string;
  tagline: string;
  howToChooseRules: {
    ruleTitle: string;
    description: string;
    steps: string[];
    importantNote?: string;
  };
  subjects: SubjectInfo[];
  recommendedCombos: RecommendedCombo[];
  validateCombination: (selectedSubjectIds: string[]) => {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    unlockedDegrees: string[];
  };
}

const STREAMS_DATA: Record<StreamKey, StreamData> = {
  'physical-science': {
    id: 'physical-science',
    name: 'Physical Science (Maths Stream)',
    shortName: 'Physical Science',
    badge: 'ENGINEERING & COMPUTING',
    tagline: 'Ideal for Engineering, Computer Science, Data Science, Physical Sciences & Architecture.',
    howToChooseRules: {
      ruleTitle: 'How to Choose Physical Science Subjects',
      description: 'You must select exactly 3 subjects. 2 are compulsory, and you pick 1 elective.',
      steps: [
        'Compulsory 1: Combined Mathematics (Calculus, Algebra, Trigonometry, Statics & Dynamics)',
        'Compulsory 2: Physics (Mechanics, Waves, Thermodynamics, Fields & Electronics)',
        'Elective 3 (Choose 1): Chemistry (required for BSc Engineering), ICT (ideal for Computing/IT), or Higher Mathematics',
      ],
      importantNote: 'To apply for Moratuwa / Peradeniya Engineering faculties, Chemistry is mandatory. If you choose ICT instead of Chemistry, you qualify for Computer Science, Software Engineering, Architecture, and Applied Sciences.',
    },
    subjects: [
      {
        id: 'combined-maths',
        name: 'Combined Mathematics',
        category: 'compulsory',
        description: 'Covers Pure Mathematics (Calculus, Trigonometry, Complex Numbers) and Applied Mathematics (Mechanics, Dynamics, Vectors).',
        olPrerequisite: 'Minimum "B" or "A" in O/L Mathematics recommended.',
        difficulty: 'Advanced',
        unlockedFields: ['Engineering', 'Computer Science', 'Data Science', 'Actuarial Science'],
        keyTopics: ['Differentiation & Integration', 'Statics & Dynamics', 'Matrices & Vectors', 'Coordinate Geometry'],
      },
      {
        id: 'physics',
        name: 'Physics',
        category: 'compulsory',
        description: 'Study of matter, energy, mechanics, fields, electronics, and waves with laboratory practicals.',
        olPrerequisite: 'Minimum "B" in O/L Science and Mathematics.',
        difficulty: 'Advanced',
        unlockedFields: ['All Engineering Disciplines', 'Physics Special', 'Nanotechnology', 'Robotics'],
        keyTopics: ['Mechanics', 'Waves & Oscillations', 'Electric & Magnetic Fields', 'Electronics & Modern Physics'],
      },
      {
        id: 'chemistry',
        name: 'Chemistry',
        category: 'elective',
        description: 'Inorganic, Organic, and Physical chemistry. Mandatory requirement for State University Engineering admission.',
        olPrerequisite: 'Minimum "C" or "B" in O/L Science.',
        difficulty: 'Advanced',
        unlockedFields: ['Chemical Engineering', 'Material Science', 'Petroleum Engineering', 'Civil/Mech Eng'],
        keyTopics: ['Organic Chemistry', 'Physical Equilibrium & Energetics', 'Inorganic Chemistry', 'Electrochemistry'],
      },
      {
        id: 'ict',
        name: 'Information & Communication Technology (ICT)',
        category: 'elective',
        description: 'Programming (Python), Database Systems, Computer Networks, System Analysis, and Web Development.',
        olPrerequisite: 'Basic computer literacy or O/L ICT with "C" or above.',
        difficulty: 'Moderate',
        unlockedFields: ['Software Engineering', 'Computer Science', 'Cybersecurity', 'Artificial Intelligence'],
        keyTopics: ['Python Programming', 'Database & SQL', 'Computer Networks & Security', 'Data Structures & Algorithms'],
      },
      {
        id: 'higher-maths',
        name: 'Higher Mathematics',
        category: 'elective',
        description: 'Advanced pure and applied mathematical concepts for theoretical mathematics enthusiasts.',
        olPrerequisite: 'Exceptional grade "A" in O/L Mathematics.',
        difficulty: 'Advanced',
        unlockedFields: ['Theoretical Physics', 'Pure Mathematics', 'Quantitative Economics'],
        keyTopics: ['Advanced Analysis', 'Abstract Algebra', 'Differential Equations', 'Numerical Methods'],
      },
    ],
    recommendedCombos: [
      {
        id: 'ps-combo-1',
        name: 'Standard Engineering Route',
        tagline: 'The official prerequisite for all State University Engineering faculties',
        subjects: ['Combined Mathematics', 'Physics', 'Chemistry'],
        keyDegrees: ['BSc Eng (Hons) in Civil / Electrical / Mechanical / Electronic / Computer', 'BSc in Physical Science'],
        bestFor: 'Students aspiring to become Chartered Engineers across Moratuwa, Peradeniya, Ruhuna, and Jaffna.',
        badge: 'MOST POPULAR',
      },
      {
        id: 'ps-combo-2',
        name: 'Computing & Software Engineering Route',
        tagline: 'Modern tech-focused combination replacing Chemistry with ICT',
        subjects: ['Combined Mathematics', 'Physics', 'ICT'],
        keyDegrees: ['BSc (Hons) in Software Engineering', 'BSc in Computer Science (UOC/UOK)', 'BSc in Data Science'],
        bestFor: 'Students aiming for high-growth tech careers in Software Engineering, AI, and Cloud Architecture.',
        badge: 'TECH FOCUSED',
      },
      {
        id: 'ps-combo-3',
        name: 'Advanced Pure Mathematics Route',
        tagline: 'Rigorous analytical pathway for mathematical research and academia',
        subjects: ['Combined Mathematics', 'Higher Mathematics', 'Physics'],
        keyDegrees: ['BSc (Hons) in Mathematics', 'BSc in Theoretical Physics & Astronomy'],
        bestFor: 'Students interested in deep mathematical research, quantitative finance, and astrophysics.',
      },
    ],
    validateCombination: (selected) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const degrees: string[] = [];

      const hasMaths = selected.includes('combined-maths');
      const hasPhysics = selected.includes('physics');
      const hasChem = selected.includes('chemistry');
      const hasIct = selected.includes('ict');
      const hasHigherMath = selected.includes('higher-maths');

      if (!hasMaths) errors.push('Combined Mathematics is compulsory for the Physical Science stream.');
      if (!hasPhysics) errors.push('Physics is compulsory for the Physical Science stream.');

      if (selected.length === 3) {
        if (hasMaths && hasPhysics && hasChem) {
          degrees.push('BSc Eng (Hons) - All Disciplines (Moratuwa, Peradeniya, Ruhuna, Jaffna, SEUSL)');
          degrees.push('BSc (Hons) in Computer Science (UOC, UOK, UOR, UOJ)');
          degrees.push('BSc (Hons) in Software Engineering');
          degrees.push('BSc (Hons) in Data Science & Artificial Intelligence');
          degrees.push('B.Arch Architecture & Surveying Sciences');
        } else if (hasMaths && hasPhysics && hasIct) {
          degrees.push('BSc (Hons) in Computer Science (Colombo School of Computing - UCSC)');
          degrees.push('BSc (Hons) in Software Engineering (Kelaniya / Ruhuna / Open University)');
          degrees.push('BSc (Hons) in Data Science & Statistics');
          degrees.push('BSc in Physical Science / Applied Sciences');
          degrees.push('B.Arch in Architecture (Moratuwa - with aptitude test)');
          warnings.push('Chemistry is missing: You will not be eligible for traditional Engineering Faculties (Civil/Mech/Elec) at Moratuwa or Peradeniya.');
        } else if (hasMaths && hasPhysics && hasHigherMath) {
          degrees.push('BSc (Hons) in Mathematics & Statistics');
          degrees.push('BSc in Physical Science');
          degrees.push('BSc in Computer Science');
        }
      }

      return {
        isValid: errors.length === 0 && selected.length === 3,
        errors,
        warnings,
        unlockedDegrees: degrees,
      };
    },
  },

  'biological-science': {
    id: 'biological-science',
    name: 'Biological Science (Bio Stream)',
    shortName: 'Biological Science',
    badge: 'MEDICINE & LIFE SCIENCES',
    tagline: 'Gateway to Medicine (MBBS), Dentistry (BDS), Veterinary Science, Pharmacy, and Bio-Tech.',
    howToChooseRules: {
      ruleTitle: 'How to Choose Biological Science Subjects',
      description: 'You must select exactly 3 subjects. Biology and Chemistry are compulsory.',
      steps: [
        'Compulsory 1: Biology (Cell Biology, Genetics, Plant & Animal Physiology, Ecology, Applied Biology)',
        'Compulsory 2: Chemistry (Organic, Inorganic, Physical Chemistry with lab practicals)',
        'Elective 3 (Choose 1): Physics (compulsory for MBBS/BDS), Agricultural Science, or ICT',
      ],
      importantNote: 'To qualify for MBBS (Medical Doctor), BDS (Dentistry), and BVSc (Veterinary), you MUST choose Physics as your 3rd subject. Agricultural Science opens Agriculture, Forestry, and Food Science degrees.',
    },
    subjects: [
      {
        id: 'biology',
        name: 'Biology',
        category: 'compulsory',
        description: 'Comprehensive study of living organisms, human physiology, genetics, evolution, and biotechnology.',
        olPrerequisite: 'Minimum "B" in O/L Science.',
        difficulty: 'Advanced',
        unlockedFields: ['Medicine (MBBS)', 'Dentistry (BDS)', 'Pharmacy', 'Biomedical Science'],
        keyTopics: ['Human Physiology & Health', 'Genetics & Molecular Biology', 'Plant Diversity & Reproduction', 'Ecology'],
      },
      {
        id: 'chemistry',
        name: 'Chemistry',
        category: 'compulsory',
        description: 'Physical, inorganic, and organic chemistry principles essential for biochemistry and medicine.',
        olPrerequisite: 'Minimum "B" in O/L Science.',
        difficulty: 'Advanced',
        unlockedFields: ['Pharmacology', 'Biochemistry', 'Food Science', 'Chemical Pathology'],
        keyTopics: ['Organic Synthesis', 'Chemical Thermodynamics', 'Equilibrium & Kinetics', 'Bio-molecules'],
      },
      {
        id: 'physics',
        name: 'Physics',
        category: 'elective',
        description: 'Physics fundamentals mandatory for Medical, Dental, and Veterinary state faculty intake.',
        olPrerequisite: 'Minimum "B" in O/L Science and Mathematics.',
        difficulty: 'Advanced',
        unlockedFields: ['MBBS Medical Faculty', 'BDS Dental Surgery', 'BVSc Veterinary Science', 'Radiography'],
        keyTopics: ['Radiation & Medical Physics', 'Mechanics', 'Fluids & Pressure', 'Thermodynamics'],
      },
      {
        id: 'agricultural-science',
        name: 'Agricultural Science',
        category: 'elective',
        description: 'Plant science, soil management, agronomy, animal husbandry, and agricultural biotechnology.',
        olPrerequisite: 'Minimum "C" in O/L Science.',
        difficulty: 'Moderate',
        unlockedFields: ['BSc in Agriculture', 'Food Science & Technology', 'Agri-Business', 'Forestry'],
        keyTopics: ['Crop Production & Soil Science', 'Animal Husbandry', 'Post-Harvest Technology', 'Agri-Economics'],
      },
      {
        id: 'ict',
        name: 'Information & Communication Technology (ICT)',
        category: 'elective',
        description: 'Computational biology, programming, data management, and bioinformatics fundamentals.',
        olPrerequisite: 'Basic computer literacy or O/L ICT.',
        difficulty: 'Moderate',
        unlockedFields: ['Bio-informatics', 'Computational Biology', 'Health Informatics'],
        keyTopics: ['Python Programming', 'Database Systems', 'Data Analysis', 'Web Systems'],
      },
    ],
    recommendedCombos: [
      {
        id: 'bio-combo-1',
        name: 'Standard Medical & Healthcare Route',
        tagline: 'The compulsory combination for MBBS Medical and BDS Dental admission',
        subjects: ['Biology', 'Chemistry', 'Physics'],
        keyDegrees: ['MBBS (Doctor of Medicine)', 'BDS (Dental Surgery)', 'BVSc (Veterinary Science)', 'BSc in Pharmacy / Nursing / Physiotherapy'],
        bestFor: 'Students dedicated to becoming Medical Doctors, Dentists, Pharmacists, and Healthcare professionals.',
        badge: 'MANDATORY FOR MBBS',
      },
      {
        id: 'bio-combo-2',
        name: 'Agriculture & Food Technology Route',
        tagline: 'Practical combination for agricultural sustainability and food industries',
        subjects: ['Biology', 'Chemistry', 'Agricultural Science'],
        keyDegrees: ['BSc (Hons) in Agricultural Technology', 'BSc in Food Science & Nutrition', 'BSc in Fisheries & Marine Science'],
        bestFor: 'Students passionate about sustainable food production, agronomy, and agro-industries.',
      },
      {
        id: 'bio-combo-3',
        name: 'Bioinformatics & Computational Life Sciences',
        tagline: 'Modern blend of biological research and computational analytics',
        subjects: ['Biology', 'Chemistry', 'ICT'],
        keyDegrees: ['BSc in Bioinformatics', 'BSc in Applied Biology & Computing', 'BSc in Molecular Biology'],
        bestFor: 'Students interested in genetics data, pharmaceutical modeling, and health tech innovations.',
      },
    ],
    validateCombination: (selected) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const degrees: string[] = [];

      const hasBio = selected.includes('biology');
      const hasChem = selected.includes('chemistry');
      const hasPhysics = selected.includes('physics');
      const hasAgri = selected.includes('agricultural-science');
      const hasIct = selected.includes('ict');

      if (!hasBio) errors.push('Biology is compulsory for the Biological Science stream.');
      if (!hasChem) errors.push('Chemistry is compulsory for the Biological Science stream.');

      if (selected.length === 3) {
        if (hasBio && hasChem && hasPhysics) {
          degrees.push('MBBS (Bachelor of Medicine & Bachelor of Surgery) - All 11 Medical Faculties');
          degrees.push('BDS (Bachelor of Dental Surgery - Peradeniya)');
          degrees.push('BVSc (Bachelor of Veterinary Science - Peradeniya)');
          degrees.push('B.Pharm (Pharmacy Special)');
          degrees.push('BSc in Allied Health Sciences (Nursing, Physiotherapy, Medical Lab Science)');
          degrees.push('BSc in Biological Science / Molecular Biology / Biochemistry');
        } else if (hasBio && hasChem && hasAgri) {
          degrees.push('BSc in Agriculture (Peradeniya, Ruhuna, Wayamba, Jaffna, Eastern)');
          degrees.push('BSc in Food Science & Nutrition');
          degrees.push('BSc in Animal Science & Fisheries');
          degrees.push('BSc in Biological Science & Environmental Science');
          warnings.push('Physics is not selected: You will NOT be eligible for MBBS (Medicine), BDS (Dentistry), or BVSc (Veterinary Science).');
        } else if (hasBio && hasChem && hasIct) {
          degrees.push('BSc in Bioinformatics & Applied Biology');
          degrees.push('BSc in Biological Science & Health Informatics');
          warnings.push('Physics is not selected: You will NOT be eligible for MBBS Medicine or Dental Surgery.');
        }
      }

      return {
        isValid: errors.length === 0 && selected.length === 3,
        errors,
        warnings,
        unlockedDegrees: degrees,
      };
    },
  },

  'commerce': {
    id: 'commerce',
    name: 'Commerce Stream',
    shortName: 'Commerce',
    badge: 'BUSINESS, FINANCE & MANAGEMENT',
    tagline: 'Ideal for Accounting, Banking, Finance, Marketing, Economics, and Business Analytics.',
    howToChooseRules: {
      ruleTitle: 'How to Choose Commerce Subjects',
      description: 'You must select 3 subjects in total following the UGC Commerce Basket rules.',
      steps: [
        'Main Basket (Choose at least 2): Accounting, Business Studies, Economics',
        '3rd Subject (Choose 1): The remaining subject from the Main Basket, OR an approved elective: Business Statistics, ICT, Geography, Political Science, Logic, or English',
      ],
      importantNote: 'Choosing Accounting + Business Studies + Economics provides maximum versatility across all university Management and Commerce faculties (USJ, Colombo, Kelaniya, Ruhuna). Adding ICT opens FinTech and Business Information Systems.',
    },
    subjects: [
      {
        id: 'accounting',
        name: 'Accounting',
        category: 'basket1',
        description: 'Financial accounting, cost accounting, auditing, budgeting, and corporate reporting standards.',
        olPrerequisite: 'Minimum "C" in O/L Mathematics and Commerce (if taken).',
        difficulty: 'Challenging',
        unlockedFields: ['Chartered Accountancy (CA)', 'BSc Accounting', 'CIMA / ACCA', 'Auditing'],
        keyTopics: ['Financial Statements & Ratios', 'Cost & Management Accounting', 'Partnership & Company Accounts', 'Auditing Basics'],
      },
      {
        id: 'business-studies',
        name: 'Business Studies',
        category: 'basket1',
        description: 'Management principles, marketing, human resource management, operations, and entrepreneurship.',
        olPrerequisite: 'Pass in O/L English and Commerce.',
        difficulty: 'Moderate',
        unlockedFields: ['BBA / Business Administration', 'Marketing Special', 'HR Management', 'Supply Chain'],
        keyTopics: ['Principles of Management', 'Marketing Management', 'Human Resource Management', 'Business Environment & Law'],
      },
      {
        id: 'economics',
        name: 'Economics',
        category: 'basket1',
        description: 'Microeconomics, macroeconomics, monetary policy, international trade, and Sri Lankan economy.',
        olPrerequisite: 'Good analytical skills and O/L Mathematics pass.',
        difficulty: 'Challenging',
        unlockedFields: ['BSc in Economics', 'Banking & Finance', 'Public Policy', 'Central Banking'],
        keyTopics: ['Demand, Supply & Elasticity', 'National Income Accounting', 'Fiscal & Monetary Policy', 'International Trade'],
      },
      {
        id: 'business-statistics',
        name: 'Business Statistics',
        category: 'basket2',
        description: 'Probability, data collection, regression, time series analysis, and statistical business decision-making.',
        olPrerequisite: 'Credit pass in O/L Mathematics.',
        difficulty: 'Challenging',
        unlockedFields: ['Actuarial Science', 'Business Analytics', 'Market Research', 'Financial Econometrics'],
        keyTopics: ['Probability Distributions', 'Index Numbers & Time Series', 'Hypothesis Testing', 'Correlation & Regression'],
      },
      {
        id: 'ict',
        name: 'Information & Communication Technology (ICT)',
        category: 'basket2',
        description: 'Database design, e-commerce systems, programming, and enterprise information systems.',
        olPrerequisite: 'Basic computer skills.',
        difficulty: 'Moderate',
        unlockedFields: ['FinTech', 'Business Information Systems (BIS)', 'E-Commerce Management'],
        keyTopics: ['Enterprise Systems', 'Database Management', 'Python / Web Basics', 'Information Systems in Business'],
      },
    ],
    recommendedCombos: [
      {
        id: 'com-combo-1',
        name: 'Classic Commerce & Management Core',
        tagline: 'The most established and recognized combination across all State Management Faculties',
        subjects: ['Accounting', 'Business Studies', 'Economics'],
        keyDegrees: ['B.Com (Special)', 'BSc in Accounting (USJ / Colombo / Kelaniya)', 'BSc in Finance', 'BBA in Marketing / HRM'],
        bestFor: 'Students planning careers as Chartered Accountants, Corporate Leaders, CFOs, and Investment Bankers.',
        badge: 'MOST POPULAR',
      },
      {
        id: 'com-combo-2',
        name: 'FinTech & Business Information Systems',
        tagline: 'Combines financial acumen with tech skills for modern digital banking',
        subjects: ['Accounting', 'Business Studies', 'ICT'],
        keyDegrees: ['BSc in Business Information Systems (BIS)', 'BSc in Financial Technology (FinTech)', 'BBA in E-Commerce'],
        bestFor: 'Students aiming for the intersection of technology and finance (Digital Banking, ERP Consulting).',
        badge: 'HIGH DEMAND',
      },
      {
        id: 'com-combo-3',
        name: 'Quantitative Finance & Actuarial Route',
        tagline: 'Heavy analytical foundation for banking, insurance, and policy planning',
        subjects: ['Accounting', 'Economics', 'Business Statistics'],
        keyDegrees: ['BSc in Finance & Banking', 'BSc in Business Economics', 'Actuarial Science & Risk Management'],
        bestFor: 'Students with high mathematical flair aiming for Central Bank, Investment Funds, and Risk Analysis.',
      },
    ],
    validateCombination: (selected) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const degrees: string[] = [];

      const mainBasket = ['accounting', 'business-studies', 'economics'];
      const selectedMainCount = selected.filter((s) => mainBasket.includes(s)).length;

      if (selectedMainCount < 2) {
        errors.push('You must choose at least 2 main commerce subjects (Accounting, Business Studies, Economics).');
      }

      if (selected.length === 3 && errors.length === 0) {
        degrees.push('B.Com (Special) - Sri Jayewardenepura, Colombo, Kelaniya, Ruhuna, Jaffna');
        degrees.push('BSc in Accounting & Financial Management');
        degrees.push('BSc in Finance / Banking & Insurance');
        degrees.push('BBA in Marketing, HRM, Operations & International Business');
        if (selected.includes('ict')) {
          degrees.push('BSc in Business Information Systems (BIS - USJ/UOK)');
        }
        if (selected.includes('business-statistics')) {
          degrees.push('BSc in Business Analytics & Statistics');
        }
      }

      return {
        isValid: errors.length === 0 && selected.length === 3,
        errors,
        warnings,
        unlockedDegrees: degrees,
      };
    },
  },

  'technology': {
    id: 'technology',
    name: 'Technology Stream',
    shortName: 'Technology',
    badge: 'ENGINEERING TECH & BIO-TECH',
    tagline: 'Hands-on practical stream leading to BET, BICT, and BBST engineering & computing degrees.',
    howToChooseRules: {
      ruleTitle: 'How to Choose Technology Subjects',
      description: 'You must select exactly 3 subjects structured into 3 specific roles.',
      steps: [
        'Subject 1 (Compulsory for all): Science for Technology (SFT) - Covers Applied Physics, Chemistry, Biology, Math & IT',
        'Subject 2 (Hard Tech - Choose 1): Engineering Technology (ET) OR Bio-systems Technology (BST)',
        'Subject 3 (Enabling / Basket Subject - Choose 1): ICT (recommended), Geography, Economics, Accounting, Home Economics, Art, Agriculture, or English',
      ],
      importantNote: 'ET + SFT + ICT is the premier combination for Bachelor of Engineering Technology (BET) and Bachelor of ICT (BICT) across state Technology faculties (Moratuwa, Sri Jayewardenepura, Kelaniya, Ruhuna, Rajarata).',
    },
    subjects: [
      {
        id: 'sft',
        name: 'Science for Technology (SFT)',
        category: 'compulsory',
        description: 'Compulsory foundation integrating Applied Physics, Chemistry, Biology, Applied Mathematics, and Technical IT.',
        olPrerequisite: 'Credit pass in O/L Science and Mathematics.',
        difficulty: 'Challenging',
        unlockedFields: ['All Technology Faculty Degrees (BET, BICT, BBST)'],
        keyTopics: ['Applied Physics & Mechanics', 'Industrial Chemistry', 'Bioscience Principles', 'Basic Applied Mathematics'],
      },
      {
        id: 'engineering-tech',
        name: 'Engineering Technology (ET)',
        category: 'basket1',
        description: 'Mechanical, civil, electrical, automobile, building construction, and electronics engineering technologies.',
        olPrerequisite: 'Pass in O/L Science & Math with strong technical interest.',
        difficulty: 'Advanced',
        unlockedFields: ['Bachelor of Engineering Technology (BET Hons)', 'Automobile Engineering', 'Robotics & Automation'],
        keyTopics: ['Mechanics & Workshop Practice', 'Electrical & Electronics', 'Construction & Civil Works', 'Automobile Systems'],
      },
      {
        id: 'biosystems-tech',
        name: 'Bio-systems Technology (BST)',
        category: 'basket1',
        description: 'Biotechnology, agricultural machinery, food processing, post-harvest technology, and environmental management.',
        olPrerequisite: 'Pass in O/L Science.',
        difficulty: 'Challenging',
        unlockedFields: ['Bachelor of Bio-systems Technology (BBST Hons)', 'Food Technology', 'Agro-processing'],
        keyTopics: ['Bio-processing & Food Preservation', 'Irrigation & Agri-Machinery', 'Bio-energy Systems', 'Soil & Plant Tech'],
      },
      {
        id: 'ict',
        name: 'Information & Communication Technology (ICT)',
        category: 'basket2',
        description: 'Software development, databases, networking, IoT, and embedded system programming.',
        olPrerequisite: 'Basic computer skills.',
        difficulty: 'Moderate',
        unlockedFields: ['Bachelor of Information & Communication Technology (BICT)', 'Software Technology', 'Network Tech'],
        keyTopics: ['Object-Oriented Programming', 'Web Technologies', 'Networking & Cloud', 'Database Management'],
      },
      {
        id: 'economics',
        name: 'Economics',
        category: 'basket2',
        description: 'Economic principles applied to industrial technology, project valuation, and production cost management.',
        olPrerequisite: 'Pass in O/L Mathematics.',
        difficulty: 'Moderate',
        unlockedFields: ['Technology Management', 'Industrial Project Valuation'],
        keyTopics: ['Industrial Economics', 'Cost-Benefit Analysis', 'Market Dynamics'],
      },
      {
        id: 'accounting',
        name: 'Accounting',
        category: 'basket2',
        description: 'Accounting basics for tech startups, small industrial enterprises, and operations management.',
        olPrerequisite: 'Pass in O/L Mathematics.',
        difficulty: 'Moderate',
        unlockedFields: ['Technopreneurship', 'Industrial Enterprise Management'],
        keyTopics: ['Cost Accounting', 'Financial Statements', 'Budgeting for Projects'],
      },
    ],
    recommendedCombos: [
      {
        id: 'tech-combo-1',
        name: 'Engineering Technology & Computing (ET Route)',
        tagline: 'Premier tech combination for BET engineering and BICT software tech programs',
        subjects: ['Science for Technology (SFT)', 'Engineering Technology (ET)', 'ICT'],
        keyDegrees: ['Bachelor of Engineering Technology (BET Hons - Moratuwa, USJ, Kelaniya, Ruhuna)', 'Bachelor of ICT (BICT Hons)', 'BTech in Software Technology'],
        bestFor: 'Students aspiring to become Engineering Technologists, Mechatronics Specialists, and Software Engineers.',
        badge: 'HIGHEST DEMAND',
      },
      {
        id: 'tech-combo-2',
        name: 'Bio-systems Technology & Agro-Tech (BST Route)',
        tagline: 'Specialized for biotechnology, food processing, and environmental engineering',
        subjects: ['Science for Technology (SFT)', 'Bio-systems Technology (BST)', 'ICT'],
        keyDegrees: ['Bachelor of Bio-systems Technology (BBST Hons)', 'BTech in Food Technology', 'BTech in Environmental Tech'],
        bestFor: 'Students interested in biotechnology, modern smart agriculture, and food quality control.',
      },
      {
        id: 'tech-combo-3',
        name: 'Technopreneurship & Industrial Management',
        tagline: 'Combines engineering skills with business financial literacy',
        subjects: ['Science for Technology (SFT)', 'Engineering Technology (ET)', 'Accounting'],
        keyDegrees: ['BET in Construction & Production Management', 'BTech in Technology Management'],
        bestFor: 'Students aiming to start technical businesses or manage engineering contracts and manufacturing plants.',
      },
    ],
    validateCombination: (selected) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const degrees: string[] = [];

      const hasSft = selected.includes('sft');
      const hasEt = selected.includes('engineering-tech');
      const hasBst = selected.includes('biosystems-tech');
      const hasIct = selected.includes('ict');

      if (!hasSft) errors.push('Science for Technology (SFT) is compulsory for all Technology stream students.');
      if (!hasEt && !hasBst) errors.push('You must choose either Engineering Technology (ET) OR Bio-systems Technology (BST).');
      if (hasEt && hasBst) errors.push('You cannot choose both ET and BST together. Pick one hard technology subject and one enabling subject.');

      if (selected.length === 3 && errors.length === 0) {
        if (hasEt) {
          degrees.push('Bachelor of Engineering Technology (BET Hons) - Moratuwa, USJ, Kelaniya, Ruhuna, SEUSL, UOJ');
          degrees.push('BTech in Mechatronics & Automation');
          degrees.push('BTech in Civil & Construction Technology');
        }
        if (hasBst) {
          degrees.push('Bachelor of Bio-systems Technology (BBST Hons) - USJ, Kelaniya, Ruhuna, Wayamba, UOJ');
          degrees.push('BTech in Food Processing & Post Harvest Technology');
          degrees.push('BTech in Agro-Technology');
        }
        if (hasIct) {
          degrees.push('Bachelor of Information & Communication Technology (BICT Hons - USJ, Kelaniya, Ruhuna, Rajarata, SEUSL)');
          degrees.push('BTech in Software Technology & Network Systems');
        }
      }

      return {
        isValid: errors.length === 0 && selected.length === 3,
        errors,
        warnings,
        unlockedDegrees: degrees,
      };
    },
  },

  'arts': {
    id: 'arts',
    name: 'Arts & Humanities Stream',
    shortName: 'Arts',
    badge: 'LAW, SOCIAL SCIENCES & MEDIA',
    tagline: 'Pathway to Law (LLB), International Relations, Languages, Media Studies, and Education.',
    howToChooseRules: {
      ruleTitle: 'How to Choose Arts Subjects',
      description: 'You must choose 3 subjects adhering to UGC Arts Baskets (Social Sciences, Languages, Aesthetics/Applied).',
      steps: [
        'Basket 1 (Social Sciences): Logic & Scientific Method, Political Science, Economics, Geography, History, Sociology',
        'Basket 2 (Languages): Sinhala, Tamil, English, Arabic, French, German, Japanese, Chinese, Hindi, Pali, Sanskrit',
        'Basket 3 (Aesthetics & Applied): Art, Dancing, Music, Drama & Theatre, Communication & Media Studies, ICT, Home Economics',
      ],
      importantNote: 'For Bachelor of Laws (LLB) at University of Colombo, students frequently choose Logic & Scientific Method + Political Science + Economics/English. To maintain broad university admission options, avoid taking all 3 subjects from a restricted single sub-category.',
    },
    subjects: [
      {
        id: 'logic',
        name: 'Logic & Scientific Method',
        category: 'basket1',
        description: 'Formal logic, deductive reasoning, scientific inquiry, critical thinking, and philosophical arguments.',
        olPrerequisite: 'Good analytical and logical reasoning skills.',
        difficulty: 'Challenging',
        unlockedFields: ['Bachelor of Laws (LLB)', 'Philosophy', 'Cognitive Sciences', 'Policy Analysis'],
        keyTopics: ['Formal Propositional Logic', 'Syllogisms & Fallacies', 'Scientific Method & Hypothesis', 'Indian Logic'],
      },
      {
        id: 'political-science',
        name: 'Political Science',
        category: 'basket1',
        description: 'Constitutional governance, political systems, state theory, public administration, and international relations.',
        olPrerequisite: 'Strong reading and essay writing capability.',
        difficulty: 'Moderate',
        unlockedFields: ['International Relations (IR)', 'Diplomatic Service', 'Public Administration', 'Law (LLB)'],
        keyTopics: ['State, Sovereignty & Democracy', 'Constitutional Law & Governance', 'Sri Lankan Political System', 'International Politics'],
      },
      {
        id: 'economics',
        name: 'Economics',
        category: 'basket1',
        description: 'Economic systems, development economics, public finance, trade, and economic policy.',
        olPrerequisite: 'Credit pass in O/L Mathematics.',
        difficulty: 'Challenging',
        unlockedFields: ['BA in Economics', 'Public Policy', 'Development Studies', 'Economic Journalism'],
        keyTopics: ['Micro & Macro Economics', 'Public Finance & Fiscal Policy', 'Economic Development', 'International Economics'],
      },
      {
        id: 'media-studies',
        name: 'Communication & Media Studies',
        category: 'basket3',
        description: 'Mass communication theory, journalism, digital media production, broadcasting, and media ethics.',
        olPrerequisite: 'Strong communication skills.',
        difficulty: 'Moderate',
        unlockedFields: ['Mass Communication', 'Journalism & PR', 'Digital Content Direction', 'Broadcasting'],
        keyTopics: ['Media Theory & Culture', 'Journalism & News Writing', 'Television & Radio Production', 'Digital Media & Law'],
      },
      {
        id: 'english-lit',
        name: 'English Literature',
        category: 'basket2',
        description: 'Poetry, drama, prose, critical literary appreciation, linguistic theory, and cultural discourse.',
        olPrerequisite: 'Minimum "A" or "B" in O/L English Literature.',
        difficulty: 'Advanced',
        unlockedFields: ['BA in English', 'Linguistics', 'Publishing & Editorial', 'Law & Creative Writing'],
        keyTopics: ['Shakespeare & World Drama', 'Poetry Analysis', 'Modern Novels & Prose', 'Literary Criticism'],
      },
      {
        id: 'ict',
        name: 'Information & Communication Technology (ICT)',
        category: 'basket3',
        description: 'Applied computing, web publishing, multimedia design, and data communication.',
        olPrerequisite: 'Basic computer literacy.',
        difficulty: 'Moderate',
        unlockedFields: ['Digital Humanities', 'Media Tech', 'Educational Technology'],
        keyTopics: ['Web Design & Publishing', 'Multimedia Production', 'Database Systems', 'Python Basics'],
      },
    ],
    recommendedCombos: [
      {
        id: 'arts-combo-1',
        name: 'Law & Governance Pathway (Pre-Law)',
        tagline: 'The most popular route for LLB admissions at University of Colombo and Law College',
        subjects: ['Logic & Scientific Method', 'Political Science', 'Economics'],
        keyDegrees: ['Bachelor of Laws (LL.B - University of Colombo)', 'Attorney-at-Law (Sri Lanka Law College)', 'BA in International Relations'],
        bestFor: 'Students aspiring to become Lawyers, Judges, Diplomats, Policy Analysts, and Legal Advisors.',
        badge: 'TOP PRE-LAW ROUTE',
      },
      {
        id: 'arts-combo-2',
        name: 'Media, Communication & Creative Arts',
        tagline: 'Dynamic pathway for journalism, public relations, and multimedia broadcasting',
        subjects: ['Communication & Media Studies', 'English Literature', 'Political Science'],
        keyDegrees: ['BA (Hons) in Mass Communication (Kelaniya / Sri Palee)', 'BA in Journalism & Public Relations', 'Digital Content & Broadcasting'],
        bestFor: 'Students seeking careers in journalism, advertising, broadcasting, and digital media production.',
      },
      {
        id: 'arts-combo-3',
        name: 'Social Sciences & Public Policy',
        tagline: 'Comprehensive study of socio-economic systems and developmental planning',
        subjects: ['Economics', 'Political Science', 'Logic & Scientific Method'],
        keyDegrees: ['BA in Economics', 'BA in Development Studies', 'BA in Public Policy & Administration'],
        bestFor: 'Students interested in government service (SLAS), research institutions, and international NGOs.',
      },
    ],
    validateCombination: (selected) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const degrees: string[] = [];

      if (selected.length === 3) {
        degrees.push('Bachelor of Laws (LL.B - University of Colombo, Open University)');
        degrees.push('BA (Hons) in Social Sciences & Humanities across all State Universities');
        degrees.push('BA in International Relations (UOC)');
        degrees.push('BA in Mass Communication & Media Studies');
        degrees.push('Entry to Sri Lanka Law College (Entrance Examination)');
      }

      return {
        isValid: errors.length === 0 && selected.length === 3,
        errors,
        warnings,
        unlockedDegrees: degrees,
      };
    },
  },
};

export const AlSubjectSelectionPage: FC = () => {
  const [searchParams] = useSearchParams();

  const streamParam = (searchParams.get('stream') as StreamKey) || 'physical-science';
  const goalParam = searchParams.get('goal') || '';

  const activeStreamKey: StreamKey = STREAMS_DATA[streamParam] ? streamParam : 'physical-science';
  const streamData = STREAMS_DATA[activeStreamKey];

  const [customSelections, setCustomSelections] = useState<Record<string, string[]>>({});
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

  const selectedSubjectIds = useMemo(() => {
    if (customSelections[activeStreamKey] !== undefined) {
      return customSelections[activeStreamKey];
    }
    return streamData.subjects.slice(0, 3).map((s) => s.id);
  }, [customSelections, activeStreamKey, streamData]);

  const handleSubjectToggle = (subjectId: string) => {
    const current = selectedSubjectIds;
    let next: string[];
    if (current.includes(subjectId)) {
      next = current.filter((id) => id !== subjectId);
    } else if (current.length >= 3) {
      next = [...current.slice(1), subjectId];
    } else {
      next = [...current, subjectId];
    }
    setCustomSelections((prev) => ({
      ...prev,
      [activeStreamKey]: next,
    }));
  };

  const validation = useMemo(() => {
    return streamData.validateCombination(selectedSubjectIds);
  }, [streamData, selectedSubjectIds]);

  const selectedSubjectObjects = useMemo(() => {
    return selectedSubjectIds
      .map((id) => streamData.subjects.find((s) => s.id === id))
      .filter((s): s is SubjectInfo => Boolean(s));
  }, [selectedSubjectIds, streamData]);

  return (
    <AfterOlLayout
      title="A/L Subject Combinations & Guidelines"
      subtitle="Explore available subjects by stream and understand the official rules for selecting your 3 A/L subjects."
    >
      <div className="space-y-8 max-w-6xl pb-12">
        {/* Stream Hero Banner */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-2xs relative overflow-hidden">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D6F0EB] text-[#0D645B] text-[11px] font-bold font-mono uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{streamData.badge}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2 font-heading">
              {streamData.name}
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed font-normal">
              {streamData.tagline}
            </p>
          </div>
        </div>

        {/* Interactive 3-Subject Combination Builder & Live Checker */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <div className="text-[11px] font-bold text-[#0D645B] uppercase tracking-wider font-mono mb-1">
                INTERACTIVE COMBINATION CHECKER
              </div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">
                Build Your 3-Subject Combination
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select 3 subjects below to verify official UGC eligibility and see which degrees you unlock.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-xl ${
                  selectedSubjectIds.length === 3
                    ? 'bg-teal-50 text-[#0D645B] border border-teal-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {selectedSubjectIds.length}/3 Subjects Picked
              </span>
              <button
                type="button"
                onClick={() =>
                  setCustomSelections((prev) => ({
                    ...prev,
                    [activeStreamKey]: [],
                  }))
                }
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                title="Reset Selection"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subject Pills Selection Area */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-700 block">
              Click subjects to include in your 3-subject combination:
            </span>
            <div className="flex flex-wrap gap-2.5">
              {streamData.subjects.map((subj) => {
                const isSelected = selectedSubjectIds.includes(subj.id);
                const isCompulsory = subj.category === 'compulsory';

                return (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => handleSubjectToggle(subj.id)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                      isSelected
                        ? 'bg-[#0D645B] text-white border-[#0D645B] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        isSelected ? 'bg-white text-[#0D645B]' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isSelected ? <Check className="w-3 h-3 stroke-[3]" /> : '+'}
                    </div>
                    <span>{subj.name}</span>
                    {isCompulsory && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md uppercase ${
                          isSelected ? 'bg-white/20 text-teal-100' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        Compulsory
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Validation & Output Box */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            {/* Selected Summary */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-600">Current Selection:</span>
              {selectedSubjectObjects.length === 0 ? (
                <span className="text-slate-400 italic">No subjects selected yet</span>
              ) : (
                selectedSubjectObjects.map((s) => (
                  <span
                    key={s.id}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-slate-800 shadow-2xs"
                  >
                    {s.name}
                  </span>
                ))
              )}
            </div>

            {/* Error or Warnings Feedback */}
            {validation.errors.length > 0 && (
              <div className="space-y-1.5">
                {validation.errors.map((err, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-rose-700">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="space-y-1.5">
                {validation.warnings.map((warn, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{warn}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Unlocked Degrees Box */}
            {validation.unlockedDegrees.length > 0 && (
              <div className="pt-3 border-t border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0D645B]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>State University Degree Programs Unlocked with this Combination:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {validation.unlockedDegrees.map((deg, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white border border-slate-200/90 text-xs font-medium text-slate-800 flex items-center gap-2"
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-[#0D645B] shrink-0" />
                      <span className="leading-tight">{deg}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Available Subjects Directory */}
        <div className="space-y-4">
          <div>
            <div className="text-[11px] font-bold text-[#0D645B] uppercase tracking-wider font-mono">
              SUBJECT DIRECTORY
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-heading">
              Available Subjects in {streamData.shortName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Explore subject syllabus focus, O/L recommended preparation, and unlocked fields.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {streamData.subjects.map((subj) => {
              const isExpanded = expandedSubjectId === subj.id;

              return (
                <div
                  key={subj.id}
                  className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            subj.category === 'compulsory'
                              ? 'bg-[#D6F0EB] text-[#0D645B]'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {subj.category}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Difficulty: {subj.difficulty}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 font-heading">
                        {subj.name}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedSubjectId(isExpanded ? null : subj.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Toggle Details"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {subj.description}
                  </p>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                    <span className="font-bold text-slate-700">Recommended O/L Preparation: </span>
                    <span>{subj.olPrerequisite}</span>
                  </div>

                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-700 block mb-1">Key Syllabus Topics:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {subj.keyTopics.map((topic, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="font-bold text-slate-700 block mb-1">Related Fields & Degrees:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {subj.unlockedFields.map((field, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-teal-50 text-[#0D645B] text-[11px] font-medium"
                            >
                              {field}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Footer Bar */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            to={`/after-ol/pathways?goal=${goalParam || 'software-engineer'}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Compass className="w-4 h-4" />
            <span>← Back to A/L Streams</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to={`/after-ol/study-options?stream=${activeStreamKey}&subjects=${selectedSubjectIds.join(',')}${goalParam ? `&goal=${goalParam}` : ''}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0D645B] hover:bg-[#0A4E46] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
            >
              <span>Explore Available Courses & Degrees</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </AfterOlLayout>
  );
};
