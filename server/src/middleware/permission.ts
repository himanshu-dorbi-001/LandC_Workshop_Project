import { Request, Response, NextFunction } from 'express';

let rolePermissionsCache: Map<string, Set<string>> = new Map();

export function setRolePermissions(map: Map<string, Set<string>>): void {
  rolePermissionsCache = map;
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.user?.role;
    if (!role) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }
    const perms = rolePermissionsCache.get(role);
    if (!perms || !perms.has(permission)) {
      res.status(403).json({
        success: false,
        message: `Access denied — requires '${permission}' permission`,
      });
      return;
    }
    next();
  };
}
