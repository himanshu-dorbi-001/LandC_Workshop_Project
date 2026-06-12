export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'PRM Tool API',
    version: '2.0.0',
    description:
      'Project & Resource Management Tool — REST API for managing employees, projects, allocations, timesheets and AI-assisted resource planning.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local development server' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error description' },
        },
      },
      Success: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'admin' },
          password: { type: 'string', example: 'Admin@1234' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          forcePasswordChange: { type: 'boolean' },
          role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'RESOURCE'] },
          employeeId: { type: 'integer' },
          username: { type: 'string' },
          fullName: { type: 'string' },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', example: 'NewPass@99' },
        },
      },
      ForceChangePasswordRequest: {
        type: 'object',
        required: ['newPassword'],
        properties: {
          newPassword: { type: 'string', example: 'NewPass@99' },
        },
      },
      CreateEmployeeRequest: {
        type: 'object',
        required: ['username', 'email', 'password', 'role', 'full_name', 'department_id'],
        properties: {
          full_name: { type: 'string', example: 'Jane Smith' },
          email: { type: 'string', example: 'jane.smith@company.com' },
          username: { type: 'string', example: 'jsmith' },
          password: { type: 'string', example: 'Pass@1234' },
          role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'RESOURCE'] },
          department_id: { type: 'integer', example: 3 },
        },
      },
      UpdateEmployeeRequest: {
        type: 'object',
        properties: {
          full_name: { type: 'string' },
          email: { type: 'string' },
          department_id: { type: 'integer' },
        },
      },
      Employee: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          full_name: { type: 'string' },
          email: { type: 'string' },
          username: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'RESOURCE'] },
          department_name: { type: 'string' },
          status: { type: 'string', enum: ['BENCH', 'ALLOCATED'] },
          is_active: { type: 'boolean' },
          skills: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                skill_id: { type: 'integer' },
                skill_name: { type: 'string' },
                category: { type: 'string' },
                proficiency: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] },
              },
            },
          },
        },
      },
      AddSkillRequest: {
        type: 'object',
        required: ['skill_name', 'category', 'proficiency'],
        properties: {
          skill_name: { type: 'string', example: 'Node.js' },
          category: { type: 'string', enum: ['BACKEND', 'FRONTEND', 'DEVOPS', 'QA', 'OTHER'] },
          proficiency: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] },
        },
      },
      UpdateSkillRequest: {
        type: 'object',
        required: ['proficiency'],
        properties: {
          proficiency: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] },
        },
      },
      CreateProjectRequest: {
        type: 'object',
        required: ['name', 'start_date', 'end_date', 'status', 'total_story_points'],
        properties: {
          name: { type: 'string', example: 'Payment Gateway' },
          description: { type: 'string' },
          start_date: { type: 'string', format: 'date', example: '2025-01-01' },
          end_date: { type: 'string', format: 'date', example: '2025-06-30' },
          status: { type: 'string', enum: ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] },
          total_story_points: { type: 'integer', example: 120 },
          manager_id: { type: 'integer', nullable: true },
        },
      },
      UpdateProjectRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          start_date: { type: 'string', format: 'date' },
          end_date: { type: 'string', format: 'date' },
          status: { type: 'string', enum: ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] },
          total_story_points: { type: 'integer' },
          manager_id: { type: 'integer', nullable: true },
        },
      },
      Project: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] },
          health_status: { type: 'string', enum: ['ON_TRACK', 'ATTENTION', 'AT_RISK'] },
          start_date: { type: 'string', format: 'date' },
          end_date: { type: 'string', format: 'date' },
          total_story_points: { type: 'integer' },
          manager_id: { type: 'integer', nullable: true },
          manager_name: { type: 'string', nullable: true },
          done_story_points: { type: 'integer' },
        },
      },
      AddMilestoneRequest: {
        type: 'object',
        required: ['title', 'due_date', 'story_points'],
        properties: {
          title: { type: 'string', example: 'API Integration Complete' },
          due_date: { type: 'string', format: 'date', example: '2025-03-31' },
          story_points: { type: 'integer', example: 40 },
        },
      },
      UpdateMilestoneRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'DONE'] },
        },
      },
      Milestone: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          project_id: { type: 'integer' },
          title: { type: 'string' },
          due_date: { type: 'string', format: 'date' },
          story_points: { type: 'integer' },
          status: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'DONE'] },
        },
      },
      CreateAllocationRequest: {
        type: 'object',
        required: ['employee_id', 'project_id', 'utilisation_pct', 'from_date', 'to_date'],
        properties: {
          employee_id: { type: 'integer' },
          project_id: { type: 'integer' },
          utilisation_pct: { type: 'integer', minimum: 1, maximum: 100, example: 50 },
          from_date: { type: 'string', format: 'date', example: '2025-01-01' },
          to_date: { type: 'string', format: 'date', example: '2025-06-30' },
        },
      },
      Allocation: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          employee_id: { type: 'integer' },
          project_id: { type: 'integer' },
          utilisation_pct: { type: 'integer' },
          from_date: { type: 'string', format: 'date' },
          to_date: { type: 'string', format: 'date' },
          is_active: { type: 'boolean' },
          employee_name: { type: 'string' },
          project_name: { type: 'string' },
        },
      },
      SubmitTimesheetRequest: {
        type: 'object',
        required: ['week_start_date', 'entries'],
        properties: {
          week_start_date: { type: 'string', format: 'date', example: '2025-01-06' },
          entries: {
            type: 'array',
            items: {
              type: 'object',
              required: ['project_id', 'hours_worked', 'activity_tags'],
              properties: {
                project_id: { type: 'integer' },
                hours_worked: { type: 'number', example: 32 },
                activity_tags: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['development', 'bug-fix'],
                },
              },
            },
          },
        },
      },
      Timesheet: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          employee_id: { type: 'integer' },
          week_start_date: { type: 'string', format: 'date' },
          status: { type: 'string', enum: ['SUBMITTED', 'MISSED'] },
          total_hours: { type: 'number' },
          entries: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                project_id: { type: 'integer' },
                project_name: { type: 'string' },
                hours_worked: { type: 'number' },
                activity_tags: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      SystemConfig: {
        type: 'object',
        properties: {
          llm_provider: { type: 'string', enum: ['gemini', 'groq'] },
          llm_api_key: { type: 'string', description: 'Masked in GET response' },
          scheduler_interval: { type: 'integer', example: 4 },
          max_weekly_hours: { type: 'integer', example: 40 },
        },
      },
      UpdateConfigRequest: {
        type: 'object',
        properties: {
          llm_provider: { type: 'string', enum: ['gemini', 'groq'] },
          llm_api_key: { type: 'string' },
          scheduler_interval: { type: 'integer', minimum: 1 },
          max_weekly_hours: { type: 'integer', minimum: 1, maximum: 80 },
        },
      },
      Dashboard: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          bench: { type: 'integer' },
          allocated: { type: 'integer' },
          employees: { type: 'array', items: { $ref: '#/components/schemas/Employee' } },
        },
      },
      AISkillMatchRequest: {
        type: 'object',
        required: ['requirement', 'project_id'],
        properties: {
          requirement: { type: 'string', example: 'Need a backend Java developer for 3 months' },
          project_id: { type: 'integer' },
        },
      },
      AIRiskSummaryRequest: {
        type: 'object',
        required: ['project_id'],
        properties: {
          project_id: { type: 'integer' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Auth', description: 'Authentication — public endpoints' },
    { name: 'Admin / Employees', description: 'Employee & account management (ADMIN)' },
    { name: 'Admin / Projects', description: 'Project & milestone management (ADMIN)' },
    { name: 'Admin / Allocations', description: 'Allocation overview (ADMIN)' },
    { name: 'Admin / Config', description: 'System configuration (ADMIN)' },
    { name: 'Manager / Dashboard', description: 'Resource dashboard (MANAGER)' },
    { name: 'Manager / Allocations', description: 'Allocate and manage resources (MANAGER)' },
    { name: 'Manager / Projects', description: 'Project view for managers (MANAGER)' },
    { name: 'Manager / Timesheets', description: 'Team timesheet view (MANAGER)' },
    { name: 'Manager / AI', description: 'AI-powered resource tools (MANAGER)' },
    { name: 'Resource / Timesheets', description: 'Submit and view own timesheets (RESOURCE)' },
    { name: 'Resource / Allocations', description: 'View own allocations (RESOURCE)' },
  ],
  paths: {
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        description: 'Authenticate and receive a JWT. If `forcePasswordChange` is true, call `/force-change-password` before accessing any other endpoint.',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: {
          200: { description: 'Login successful', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/Success' }, { properties: { data: { $ref: '#/components/schemas/LoginResponse' } } }] } } } },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/auth/force-change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Force password change (first login)',
        description: 'Must be called when `forcePasswordChange: true` is returned from login. Sets a new password and clears the force-change flag.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ForceChangePasswordRequest' } } } },
        responses: {
          200: { description: 'Password updated' },
          400: { description: 'Weak password or validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change own password (voluntary)',
        description: 'Requires the current password for verification. Available to all authenticated roles.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ChangePasswordRequest' } } } },
        responses: {
          200: { description: 'Password changed' },
          400: { description: 'Current password incorrect or weak new password', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/admin/employees': {
      get: {
        tags: ['Admin / Employees'],
        summary: 'List all employees',
        description: 'Returns all active employees with their role, department, derived status (BENCH/ALLOCATED) and skills.',
        responses: { 200: { description: 'Employee list', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/Success' }, { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Employee' } } } }] } } } } },
      },
      post: {
        tags: ['Admin / Employees'],
        summary: 'Create employee',
        description: 'Creates employee record, user_account (force_password_change=true), and role assignment in one atomic operation.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateEmployeeRequest' } } } },
        responses: {
          201: { description: 'Employee created', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/Success' }, { properties: { data: { $ref: '#/components/schemas/Employee' } } }] } } } },
          400: { description: 'Validation error or duplicate username/email', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/admin/employees/{id}': {
      get: {
        tags: ['Admin / Employees'],
        summary: 'Get employee detail',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Employee detail with skills', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/Success' }, { properties: { data: { $ref: '#/components/schemas/Employee' } } }] } } } }, 404: { description: 'Not found' } },
      },
      put: {
        tags: ['Admin / Employees'],
        summary: 'Update employee profile',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateEmployeeRequest' } } } },
        responses: { 200: { description: 'Updated' }, 404: { description: 'Not found' } },
      },
    },
    '/api/admin/employees/{id}/reset-password': {
      put: {
        tags: ['Admin / Employees'],
        summary: 'Reset employee password',
        description: 'Sets a new password and re-arms `force_password_change=true`. The employee must change it on next login.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['newPassword'], properties: { newPassword: { type: 'string' } } } } } },
        responses: { 200: { description: 'Password reset' } },
      },
    },
    '/api/admin/employees/{id}/deactivate': {
      put: {
        tags: ['Admin / Employees'],
        summary: 'Deactivate employee',
        description: 'Deactivates employee and user_account. All active allocations are ended automatically.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Deactivated' } },
      },
    },
    '/api/admin/employees/{id}/reactivate': {
      put: {
        tags: ['Admin / Employees'],
        summary: 'Reactivate employee',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Reactivated' } },
      },
    },
    '/api/admin/employees/{id}/skills': {
      get: {
        tags: ['Admin / Employees'],
        summary: 'List employee skills',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Skills list' } },
      },
      post: {
        tags: ['Admin / Employees'],
        summary: 'Add skill to employee',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AddSkillRequest' } } } },
        responses: { 201: { description: 'Skill added' }, 400: { description: 'Validation error' } },
      },
    },
    '/api/admin/employees/{id}/skills/{skillId}': {
      put: {
        tags: ['Admin / Employees'],
        summary: 'Update skill proficiency',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'skillId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateSkillRequest' } } } },
        responses: { 200: { description: 'Updated' } },
      },
      delete: {
        tags: ['Admin / Employees'],
        summary: 'Remove skill from employee',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'skillId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Removed' } },
      },
    },
    '/api/admin/projects': {
      get: {
        tags: ['Admin / Projects'],
        summary: 'List all projects',
        responses: { 200: { description: 'Project list with manager name and done story points', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/Success' }, { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Project' } } } }] } } } } },
      },
      post: {
        tags: ['Admin / Projects'],
        summary: 'Create project',
        description: 'Set `manager_id` to assign a manager at creation time, or leave null and assign later via PUT.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProjectRequest' } } } },
        responses: { 201: { description: 'Project created', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/Success' }, { properties: { data: { $ref: '#/components/schemas/Project' } } }] } } } } },
      },
    },
    '/api/admin/projects/{id}': {
      get: {
        tags: ['Admin / Projects'],
        summary: 'Get project detail',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Project detail' }, 404: { description: 'Not found' } },
      },
      put: {
        tags: ['Admin / Projects'],
        summary: 'Update project / assign manager',
        description: 'Partial update. Pass `manager_id` to assign or re-assign the manager for this project.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateProjectRequest' } } } },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/api/admin/projects/{id}/milestones': {
      get: {
        tags: ['Admin / Projects'],
        summary: 'List project milestones',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Milestone list', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/Success' }, { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Milestone' } } } }] } } } } },
      },
      post: {
        tags: ['Admin / Projects'],
        summary: 'Add milestone to project',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AddMilestoneRequest' } } } },
        responses: { 201: { description: 'Milestone created', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/Success' }, { properties: { data: { $ref: '#/components/schemas/Milestone' } } }] } } } } },
      },
    },
    '/api/admin/projects/{id}/milestones/{milestoneId}': {
      put: {
        tags: ['Admin / Projects'],
        summary: 'Update milestone status',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'milestoneId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateMilestoneRequest' } } } },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/api/admin/allocations': {
      get: {
        tags: ['Admin / Allocations'],
        summary: 'View all active allocations',
        responses: { 200: { description: 'All active allocations with employee and project names', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/Success' }, { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Allocation' } } } }] } } } } },
      },
    },
    '/api/admin/config': {
      get: {
        tags: ['Admin / Config'],
        summary: 'Get system configuration',
        description: 'The `llm_api_key` is masked as `****` in the response.',
        responses: { 200: { description: 'Config values', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/Success' }, { properties: { data: { $ref: '#/components/schemas/SystemConfig' } } }] } } } } },
      },
      put: {
        tags: ['Admin / Config'],
        summary: 'Update system configuration',
        description: 'Partial update. Only provided fields are changed. `llm_api_key` is stored in plain text — provide the real key here.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateConfigRequest' } } } },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/api/manager/dashboard': {
      get: {
        tags: ['Manager / Dashboard'],
        summary: 'Resource dashboard',
        description: 'Returns all RESOURCE employees with their status (BENCH/ALLOCATED) and skills. Counts for total, bench, and allocated.',
        responses: { 200: { description: 'Dashboard data', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/Success' }, { properties: { data: { $ref: '#/components/schemas/Dashboard' } } }] } } } } },
      },
    },
    '/api/manager/dashboard/employees/{id}': {
      get: {
        tags: ['Manager / Dashboard'],
        summary: 'Employee drill-down from dashboard',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Full employee detail' }, 404: { description: 'Not found' } },
      },
    },
    '/api/manager/allocations': {
      post: {
        tags: ['Manager / Allocations'],
        summary: 'Allocate resource to project',
        description: 'Creates an allocation. Rejects if the employee\'s existing utilisation + new % would exceed 100% in the requested period (over-allocation guard).',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateAllocationRequest' } } } },
        responses: {
          201: { description: 'Allocation created', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/Success' }, { properties: { data: { $ref: '#/components/schemas/Allocation' } } }] } } } },
          400: { description: 'Over-allocation or validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/manager/allocations/{id}/end': {
      put: {
        tags: ['Manager / Allocations'],
        summary: 'End an allocation',
        description: 'Sets `to_date = today` and marks the allocation inactive. Only the manager who owns the project can end its allocations.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Allocation ended' }, 403: { description: 'Not your project' } },
      },
    },
    '/api/manager/projects/{id}/allocations': {
      get: {
        tags: ['Manager / Allocations'],
        summary: 'List allocations for a project',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Allocation list for the project' } },
      },
    },
    '/api/manager/projects': {
      get: {
        tags: ['Manager / Projects'],
        summary: 'List all projects',
        description: 'Returns all projects visible to the manager, including health status (ON_TRACK / ATTENTION / AT_RISK) set by the scheduler.',
        responses: { 200: { description: 'Project list' } },
      },
    },
    '/api/manager/projects/{id}': {
      get: {
        tags: ['Manager / Projects'],
        summary: 'Get project detail',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Project detail' }, 404: { description: 'Not found' } },
      },
    },
    '/api/manager/timesheets': {
      get: {
        tags: ['Manager / Timesheets'],
        summary: 'Team timesheets for a given week',
        description: 'Returns timesheet entries for all RESOURCE employees. Pass `?week=YYYY-MM-DD` (Monday of the week). Defaults to the current week.',
        parameters: [{ name: 'week', in: 'query', required: false, schema: { type: 'string', format: 'date', example: '2025-01-06' } }],
        responses: { 200: { description: 'Team timesheet entries' } },
      },
    },
    '/api/manager/ai/skill-match': {
      post: {
        tags: ['Manager / AI'],
        summary: 'AI skill match',
        description: 'Sends available RESOURCE employees (with capacity > 0) and their skills to the configured LLM. Returns a ranked list of best-fit candidates for the given requirement.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AISkillMatchRequest' } } } },
        responses: {
          200: { description: 'AI-generated ranked candidate list', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/Success' }, { properties: { data: { type: 'object', properties: { result: { type: 'string' } } } } }] } } } },
          400: { description: 'LLM API key not configured' },
        },
      },
    },
    '/api/manager/ai/risk-summary': {
      post: {
        tags: ['Manager / AI'],
        summary: 'AI project risk summary',
        description: 'Sends project data (milestones, allocations, last week\'s logged hours) to the LLM. Returns a plain-English risk assessment paragraph.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AIRiskSummaryRequest' } } } },
        responses: {
          200: { description: 'AI-generated risk summary', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/Success' }, { properties: { data: { type: 'object', properties: { result: { type: 'string' } } } } }] } } } },
          400: { description: 'LLM API key not configured or project not found' },
        },
      },
    },
    '/api/resource/timesheets': {
      post: {
        tags: ['Resource / Timesheets'],
        summary: 'Submit timesheet',
        description: 'Submits hours for the given week. Each entry must reference a `project_id` the employee is actively allocated to. `activity_tags` are free-form strings (e.g. "development", "bug-fix"). Validation: no future weeks, no duplicate submission, hours per project cannot exceed allocation %, total cannot exceed `max_weekly_hours`.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SubmitTimesheetRequest' } } } },
        responses: {
          201: { description: 'Timesheet submitted', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/Success' }, { properties: { data: { $ref: '#/components/schemas/Timesheet' } } }] } } } },
          400: { description: 'Validation error (future week, duplicate, over-hours, wrong project)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      get: {
        tags: ['Resource / Timesheets'],
        summary: 'List own timesheets',
        description: 'Returns all submitted timesheets. Also returns `missed_week_reminder` if last week\'s timesheet was not submitted.',
        responses: { 200: { description: 'Timesheets + optional missed-week reminder' } },
      },
    },
    '/api/resource/timesheets/{id}': {
      get: {
        tags: ['Resource / Timesheets'],
        summary: 'Get timesheet detail',
        description: 'Returns the timesheet with its individual project entries and activity tags.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Timesheet with entries' }, 404: { description: 'Not found' }, 403: { description: 'Not your timesheet' } },
      },
    },
    '/api/resource/allocations': {
      get: {
        tags: ['Resource / Allocations'],
        summary: 'List own allocations',
        description: 'Returns all allocations for the authenticated resource employee — active and historical.',
        responses: { 200: { description: 'Allocation list' } },
      },
    },
    '/health': {
      get: {
        tags: ['Auth'],
        summary: 'Health check',
        security: [],
        responses: { 200: { description: 'Server is up', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' }, timestamp: { type: 'string' } } } } } } },
      },
    },
  },
};
