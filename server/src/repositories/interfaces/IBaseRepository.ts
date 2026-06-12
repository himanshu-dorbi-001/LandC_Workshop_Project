// Interface Segregation + Dependency Inversion:
// Services depend on this contract, never on concrete MySQL classes.
export interface IBaseRepository<T> {
  findById(id: number): Promise<T | null>;
  findAll(): Promise<T[]>;
  delete(id: number): Promise<void>;
}
