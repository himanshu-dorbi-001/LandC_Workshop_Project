-- PRM Tool - Complete Database Schema (v2)
-- Drop and recreate for clean slate. Run once.

CREATE DATABASE IF NOT EXISTS prm_tool CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE prm_tool;

-- ============================================================
-- DEPARTMENTS  (lookup table)
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  type       VARCHAR(50)  NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- EMPLOYEES  (everyone: ADMIN, MANAGER, RESOURCE)
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_emp_dept FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- ============================================================
-- ROLES  (ADMIN | MANAGER | RESOURCE)
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(20)  NOT NULL UNIQUE,
  description VARCHAR(200)
);

-- ============================================================
-- EMPLOYEE_ROLES  (RBAC mapping — employee ↔ role)
-- ============================================================
CREATE TABLE IF NOT EXISTS employee_roles (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  employee_id  INT NOT NULL,
  role_id      INT NOT NULL,
  assigned_by  INT NULL,
  assigned_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_er_employee    FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_er_role        FOREIGN KEY (role_id)     REFERENCES roles(id),
  CONSTRAINT fk_er_assigned_by FOREIGN KEY (assigned_by) REFERENCES employees(id),
  CONSTRAINT uq_er_employee_role UNIQUE (employee_id, role_id)
);

-- ============================================================
-- USER_ACCOUNTS  (authentication only — one per employee)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_accounts (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  employee_id           INT NOT NULL UNIQUE,
  username              VARCHAR(50)  NOT NULL UNIQUE,
  password_hash         VARCHAR(255) NOT NULL,
  force_password_change BOOLEAN NOT NULL DEFAULT TRUE,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ua_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- ============================================================
-- SKILLS  (shared catalog)
-- ============================================================
CREATE TABLE IF NOT EXISTS skills (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  skill_name VARCHAR(100) NOT NULL UNIQUE,
  category   VARCHAR(50)  NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- EMPLOYEE_SKILLS  (RESOURCE and MANAGER only)
-- ============================================================
CREATE TABLE IF NOT EXISTS employee_skills (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  employee_id  INT NOT NULL,
  skill_id     INT NOT NULL,
  proficiency  VARCHAR(20) NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_es_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_es_skill    FOREIGN KEY (skill_id)    REFERENCES skills(id),
  CONSTRAINT uq_es_employee_skill UNIQUE (employee_id, skill_id)
);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  manager_id         INT NULL,
  name               VARCHAR(100) NOT NULL,
  description        TEXT,
  start_date         DATE NOT NULL,
  end_date           DATE NOT NULL,
  status             VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
  health_status      VARCHAR(20) NOT NULL DEFAULT 'ON_TRACK',
  total_story_points INT NOT NULL DEFAULT 0,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_project_manager FOREIGN KEY (manager_id) REFERENCES employees(id)
);

-- ============================================================
-- MILESTONES
-- ============================================================
CREATE TABLE IF NOT EXISTS milestones (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  project_id   INT NOT NULL,
  title        VARCHAR(150) NOT NULL,
  due_date     DATE NOT NULL,
  story_points INT NOT NULL DEFAULT 0,
  status       VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_milestone_project FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- ============================================================
-- ALLOCATIONS  (RESOURCE employees only)
-- ============================================================
CREATE TABLE IF NOT EXISTS allocations (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  employee_id     INT NOT NULL,
  project_id      INT NOT NULL,
  utilisation_pct INT NOT NULL,
  from_date       DATE NOT NULL,
  to_date         DATE NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_alloc_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_alloc_project  FOREIGN KEY (project_id)  REFERENCES projects(id),
  CONSTRAINT chk_utilisation   CHECK (utilisation_pct BETWEEN 1 AND 100),
  CONSTRAINT chk_dates         CHECK (from_date < to_date)
);

-- ============================================================
-- TIMESHEETS  (RESOURCE employees only — one row per employee per week)
-- ============================================================
CREATE TABLE IF NOT EXISTS timesheets (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  employee_id     INT NOT NULL,
  week_start_date DATE NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  total_hours     DECIMAL(5,2) NOT NULL DEFAULT 0,
  submitted_at    DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ts_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT uq_ts_employee_week UNIQUE (employee_id, week_start_date)
);

-- ============================================================
-- TIMESHEET_ENTRIES  (one project entry per timesheet)
-- ============================================================
CREATE TABLE IF NOT EXISTS timesheet_entries (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  timesheet_id  INT NOT NULL,
  project_id    INT NOT NULL,
  hours_worked  DECIMAL(5,2) NOT NULL,
  activity_tags JSON NOT NULL DEFAULT (JSON_ARRAY()),
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tse_timesheet FOREIGN KEY (timesheet_id) REFERENCES timesheets(id),
  CONSTRAINT fk_tse_project   FOREIGN KEY (project_id)   REFERENCES projects(id),
  CONSTRAINT chk_hours        CHECK (hours_worked >= 0)
);

-- ============================================================
-- SYSTEM_CONFIG  (key-value settings, tracks who last changed each)
-- ============================================================
CREATE TABLE IF NOT EXISTS system_config (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  updated_by_employee_id INT NULL,
  config_key             VARCHAR(50) NOT NULL UNIQUE,
  config_value           TEXT NOT NULL,
  updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_config_employee FOREIGN KEY (updated_by_employee_id) REFERENCES employees(id)
);

-- ============================================================
-- PERMISSIONS  (all possible actions in the system)
-- ============================================================
CREATE TABLE IF NOT EXISTS permissions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(200),
  module      VARCHAR(50)  NOT NULL
);

-- ============================================================
-- ROLE_PERMISSIONS  (which role can do which action — pure DB-driven RBAC)
-- ============================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  role_id       INT NOT NULL,
  permission_id INT NOT NULL,
  CONSTRAINT fk_rp_role       FOREIGN KEY (role_id)       REFERENCES roles(id),
  CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id),
  CONSTRAINT uq_rp            UNIQUE (role_id, permission_id)
);

-- ============================================================
-- SEED STATIC DATA
-- ============================================================
INSERT INTO departments (name, type) VALUES
  ('Operations',           'OPERATIONS'),
  ('Management',           'MANAGEMENT'),
  ('Software Engineering', 'ENGINEERING'),
  ('Testing & QA',         'TESTING'),
  ('DevOps',               'DEVOPS'),
  ('Design',               'DESIGN')
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO roles (name, description) VALUES
  ('ADMIN',    'System administrator — manages users, configuration, and system setup'),
  ('MANAGER',  'Project manager — allocates resources and monitors project health'),
  ('RESOURCE', 'Individual contributor — allocated to projects and submits timesheets')
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO system_config (config_key, config_value) VALUES
  ('llm_provider',       'gemini'),
  ('llm_api_key',        ''),
  ('scheduler_interval', '4'),
  ('max_weekly_hours',   '40')
ON DUPLICATE KEY UPDATE config_key = config_key;

-- ============================================================
-- SEED PERMISSIONS
-- ============================================================
INSERT INTO permissions (name, description, module) VALUES
  -- Employee management
  ('employee:create',         'Create new employee accounts',             'employee'),
  ('employee:read_all',       'View all employees',                       'employee'),
  ('employee:update',         'Update employee profile',                  'employee'),
  ('employee:deactivate',     'Deactivate an employee account',           'employee'),
  ('employee:reactivate',     'Reactivate an employee account',           'employee'),
  ('employee:reset_password', 'Reset any employee password',              'employee'),
  -- Skill management
  ('skill:manage',            'Add, update and remove employee skills',   'skill'),
  -- Project management
  ('project:create',          'Create new projects',                      'project'),
  ('project:update',          'Update project details',                   'project'),
  ('project:read_all',        'View all projects',                        'project'),
  ('milestone:manage',        'Add and update milestones',                'project'),
  -- Allocation
  ('allocation:read_all',     'View all allocations across the system',   'allocation'),
  ('allocation:create',       'Allocate a resource to a project',         'allocation'),
  ('allocation:end',          'End an active allocation',                 'allocation'),
  ('allocation:read_by_project', 'View allocations for a specific project', 'allocation'),
  ('allocation:read_own',     'View own allocations',                     'allocation'),
  -- Timesheet
  ('timesheet:submit',        'Submit a weekly timesheet',                'timesheet'),
  ('timesheet:read_own',      'View own timesheets',                      'timesheet'),
  ('timesheet:read_team',     'View all team timesheets',                 'timesheet'),
  -- Dashboard
  ('dashboard:read',          'View the resource dashboard',              'dashboard'),
  -- Configuration
  ('config:read',             'View system configuration',                'config'),
  ('config:update',           'Update system configuration',              'config'),
  -- AI
  ('ai:skill_match',          'Use AI skill matcher',                     'ai'),
  ('ai:risk_summary',         'Use AI project risk summary',              'ai')
ON DUPLICATE KEY UPDATE name = name;

-- ============================================================
-- SEED ROLE → PERMISSION MAPPINGS
-- ============================================================

-- ADMIN gets full system control
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.name IN (
  'employee:create', 'employee:read_all', 'employee:update',
  'employee:deactivate', 'employee:reactivate', 'employee:reset_password',
  'skill:manage',
  'project:create', 'project:update', 'project:read_all', 'milestone:manage',
  'allocation:read_all',
  'config:read', 'config:update'
)
WHERE r.name = 'ADMIN'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- MANAGER gets resource and project visibility + allocation management + AI
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.name IN (
  'employee:read_all',
  'project:read_all',
  'allocation:create', 'allocation:end', 'allocation:read_by_project',
  'timesheet:read_team',
  'dashboard:read',
  'ai:skill_match', 'ai:risk_summary'
)
WHERE r.name = 'MANAGER'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- RESOURCE gets own data only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.name IN (
  'timesheet:submit', 'timesheet:read_own',
  'allocation:read_own'
)
WHERE r.name = 'RESOURCE'
ON DUPLICATE KEY UPDATE role_id = role_id;
