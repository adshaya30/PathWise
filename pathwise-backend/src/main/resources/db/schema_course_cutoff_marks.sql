-- Table 1: course_cutoff_marks (Main Table)
CREATE TABLE IF NOT EXISTS course_cutoff_marks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    
    -- Foreign Keys
    document_id BIGINT NOT NULL,
    document_page_id BIGINT,
    
    -- Core Data
    district VARCHAR(50) NOT NULL,
    course_of_study VARCHAR(200) NOT NULL,
    university VARCHAR(200) NOT NULL,
    minimum_z_score DECIMAL(6, 4),  -- e.g., 1.5223 (4 decimal places)
    
    -- Metadata
    academic_year VARCHAR(9) NOT NULL,  -- e.g., "2024/2025"
    medium_of_instruction VARCHAR(20),   -- "Sinhala", "Tamil", "English"
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    
    -- Constraints
    CONSTRAINT unique_cutoff UNIQUE (
        district, 
        course_of_study, 
        university, 
        academic_year,
        medium_of_instruction
    )
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_cutoff_district ON course_cutoff_marks(district);
CREATE INDEX IF NOT EXISTS idx_cutoff_course ON course_cutoff_marks(course_of_study);
CREATE INDEX IF NOT EXISTS idx_cutoff_university ON course_cutoff_marks(university);
CREATE INDEX IF NOT EXISTS idx_cutoff_zscore ON course_cutoff_marks(minimum_z_score);
CREATE INDEX IF NOT EXISTS idx_cutoff_academic_year ON course_cutoff_marks(academic_year);
CREATE INDEX IF NOT EXISTS idx_cutoff_document ON course_cutoff_marks(document_id);

-- Table 2: districts (Reference Table)
CREATE TABLE IF NOT EXISTS districts (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR(10) UNIQUE,      -- e.g., "COL", "GAM"
    name VARCHAR(100) UNIQUE NOT NULL,  -- e.g., "COLOMBO", "GAMPAHA"
    province VARCHAR(50)          -- e.g., "Western", "Central"
);

-- Insert all 25 districts
INSERT INTO districts (code, name, province) VALUES
('COL', 'COLOMBO', 'Western'),
('GAM', 'GAMPAHA', 'Western'),
('KAL', 'KALUTARA', 'Western'),
('MAT', 'MATALE', 'Central'),
('KAN', 'KANDY', 'Central'),
('NUE', 'NUWARA ELIYA', 'Central'),
('GAL', 'GALLE', 'Southern'),
('MAT_S', 'MATARA', 'Southern'),
('HAM', 'HAMBANTOTA', 'Southern'),
('JAF', 'JAFFNA', 'Northern'),
('KIL', 'KILINOCHCHI', 'Northern'),
('MAN', 'MANNAR', 'Northern'),
('MUL', 'MULLAITIVU', 'Northern'),
('VAV', 'VAVUNIYA', 'Northern'),
('TRI', 'TRINCOMALEE', 'Eastern'),
('BAT', 'BATTICALOA', 'Eastern'),
('AMP', 'AMPARA', 'Eastern'),
('PUT', 'PUTTALAM', 'North Western'),
('KUR', 'KURUNEGALA', 'North Western'),
('ANU', 'ANURADHAPURA', 'North Central'),
('POL', 'POLONNARUWA', 'North Central'),
('BAD', 'BADULLA', 'Uva'),
('MON', 'MONARAGALA', 'Uva'),
('KEG', 'KEGALLE', 'Sabaragamuwa'),
('RAT', 'RATNAPURA', 'Sabaragamuwa')
ON CONFLICT (name) DO NOTHING;

-- Table 3: universities (Reference Table)
CREATE TABLE IF NOT EXISTS universities (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR(10) UNIQUE,      -- e.g., "UOC", "UOP"
    name VARCHAR(200) UNIQUE NOT NULL,  -- e.g., "University of Colombo"
    short_name VARCHAR(100)       -- e.g., "Colombo", "Peradeniya"
);

-- Insert all universities
INSERT INTO universities (code, name, short_name) VALUES
('UOC', 'University of Colombo', 'Colombo'),
('UOP', 'University of Peradeniya', 'Peradeniya'),
('USJ', 'University of Sri Jayewardenepura', 'Sri Jayewardenepura'),
('UOK', 'University of Kelaniya', 'Kelaniya'),
('UOM', 'University of Moratuwa', 'Moratuwa'),
('UOJ', 'University of Jaffna', 'Jaffna'),
('UOR', 'University of Ruhuna', 'Ruhuna'),
('UOE', 'University of Eastern Sri Lanka', 'Eastern'),
('UOW', 'University of Wayamba', 'Wayamba'),
('UOS', 'University of Sabaragamuwa', 'Sabaragamuwa'),
('UOU', 'University of Uva', 'Uva'),
('UOV', 'University of Vavuniya', 'Vavuniya'),
('SUS', 'South Eastern University of Sri Lanka', 'South Eastern'),
('OUS', 'Open University of Sri Lanka', 'Open'),
('BUDD', 'Buddhist and Pali University of Sri Lanka', 'Buddhist'),
('UOVP', 'University of the Visual & Performing Arts', 'Visual Arts'),
('UOCL', 'University of Colombo - School of Computing', 'Computing')
ON CONFLICT (name) DO NOTHING;

-- Table 4: courses (Reference Table)
CREATE TABLE IF NOT EXISTS courses (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uni_code VARCHAR(10) NOT NULL,  -- e.g., "001A", "011G"
    course_name VARCHAR(200) NOT NULL,  -- e.g., "MEDICINE", "ENGINEERING"
    course_category VARCHAR(100),   -- e.g., "BIOLOGICAL SCIENCE", "PHYSICAL SCIENCE"
    university_id INT REFERENCES universities(id),
    
    CONSTRAINT unique_course UNIQUE (uni_code, course_name, university_id)
);
