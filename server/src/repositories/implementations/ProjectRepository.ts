import { pool } from '../../database/connection';
import { IProjectRepository } from '../interfaces/IProjectRepository';
import {
  Project, ProjectWithDetails, Milestone,
  CreateProjectDTO, UpdateProjectDTO,
  CreateMilestoneDTO, UpdateMilestoneDTO,
  HealthStatus,
} from '../../models/interfaces/Project';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class ProjectRepository implements IProjectRepository {

  async findById(id: number): Promise<Project | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM projects WHERE id = ?', [id]
    );
    return (rows[0] as Project) ?? null;
  }

  async findAll(): Promise<Project[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM projects ORDER BY id'
    );
    return rows as Project[];
  }

  async findAllWithDetails(): Promise<ProjectWithDetails[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT p.*,
             e.full_name AS manager_name,
             COALESCE(SUM(CASE WHEN m.status = 'DONE' THEN m.story_points ELSE 0 END), 0) AS done_story_points
      FROM projects p
      LEFT JOIN employees e ON p.manager_id = e.id
      LEFT JOIN milestones m ON m.project_id = p.id
      GROUP BY p.id, e.full_name
      ORDER BY p.id
    `);
    return rows as ProjectWithDetails[];
  }

  async findByManagerId(managerId: number): Promise<ProjectWithDetails[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT p.*,
             e.full_name AS manager_name,
             COALESCE(SUM(CASE WHEN m.status = 'DONE' THEN m.story_points ELSE 0 END), 0) AS done_story_points
      FROM projects p
      LEFT JOIN employees e ON p.manager_id = e.id
      LEFT JOIN milestones m ON m.project_id = p.id
      WHERE p.manager_id = ?
      GROUP BY p.id, e.full_name
      ORDER BY p.id
    `, [managerId]);
    return rows as ProjectWithDetails[];
  }

  async create(dto: CreateProjectDTO): Promise<Project> {
    const [result] = await pool.execute<ResultSetHeader>(`
      INSERT INTO projects (name, description, start_date, end_date, status, manager_id, total_story_points)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [dto.name, dto.description ?? null, dto.start_date, dto.end_date, dto.status, dto.manager_id ?? null, dto.total_story_points]
    );
    const project = await this.findById(result.insertId);
    if (!project) throw new Error('Failed to retrieve created project');
    return project;
  }

  async update(id: number, dto: UpdateProjectDTO): Promise<void> {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    if (dto.name               !== undefined) { fields.push('name = ?');               values.push(dto.name); }
    if (dto.description        !== undefined) { fields.push('description = ?');        values.push(dto.description ?? null); }
    if (dto.start_date         !== undefined) { fields.push('start_date = ?');         values.push(dto.start_date); }
    if (dto.end_date           !== undefined) { fields.push('end_date = ?');           values.push(dto.end_date); }
    if (dto.status             !== undefined) { fields.push('status = ?');             values.push(dto.status); }
    if (dto.manager_id         !== undefined) { fields.push('manager_id = ?');         values.push(dto.manager_id ?? null); }
    if (dto.total_story_points !== undefined) { fields.push('total_story_points = ?'); values.push(dto.total_story_points); }
    if (fields.length === 0) return;
    values.push(id);
    await pool.execute(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async updateHealthStatus(id: number, health: HealthStatus): Promise<void> {
    await pool.execute('UPDATE projects SET health_status = ? WHERE id = ?', [health, id]);
  }

  async getMilestones(projectId: number): Promise<Milestone[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM milestones WHERE project_id = ? ORDER BY due_date', [projectId]
    );
    return rows as Milestone[];
  }

  async addMilestone(projectId: number, dto: CreateMilestoneDTO): Promise<Milestone> {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO milestones (project_id, title, due_date, story_points) VALUES (?, ?, ?, ?)',
      [projectId, dto.title, dto.due_date, dto.story_points]
    );
    const milestone = await this.findMilestoneById(result.insertId);
    if (!milestone) throw new Error('Failed to retrieve created milestone');
    return milestone;
  }

  async updateMilestone(milestoneId: number, dto: UpdateMilestoneDTO): Promise<void> {
    await pool.execute(
      'UPDATE milestones SET status = ? WHERE id = ?',
      [dto.status, milestoneId]
    );
  }

  async findMilestoneById(milestoneId: number): Promise<Milestone | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM milestones WHERE id = ?', [milestoneId]
    );
    return (rows[0] as Milestone) ?? null;
  }

  async delete(id: number): Promise<void> {
    await pool.execute('DELETE FROM projects WHERE id = ?', [id]);
  }
}
