const PERMISSIONS = {
  VIEW: "view",
  CREATE: "create",
  EDIT: "edit",
  DELETE: "delete",
  ARCHIVE: "archive",
  DELETE_ALL: "delete_all",
  MANAGE_USERS: "manage_users",
  DRAG_CARD: "drag_card",
  UPDATE_STATUS: "update_status",
  MANAGE_EVENT_STATUS: "manage_event_status",
  VIEW_AUDIT_LOGS: "view_audit_logs",
  DELETE_PAID_EXPENSE: "delete_paid_expense",
};

const RESOURCES = {
  VENDOR: "vendor",
  EVENT: "event",
  TASK: "task",
  CLIENT: "client",
  USER: "user",
  EXPENSE: "expense",
  AUDIT_LOG: "audit_log",
};

const ROLES = {
  VIEWER: "viewer",
  PLANNER: "planner",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
};

// 2. Role hierarchy
const ROLE_HIERARCHY = {
  [ROLES.VIEWER]: 1,
  [ROLES.PLANNER]: 2,
  [ROLES.ADMIN]: 3,
  [ROLES.SUPER_ADMIN]: 4,
};

// 3. Base permissions generator
const getBasePermissionsForRole = (role) => {
  const hierarchy = ROLE_HIERARCHY[role] || 0;

  const basePermissions = {
    [RESOURCES.VENDOR]: [PERMISSIONS.VIEW],
    [RESOURCES.EVENT]: [PERMISSIONS.VIEW, PERMISSIONS.DRAG_CARD],
    [RESOURCES.TASK]: [PERMISSIONS.VIEW],
    [RESOURCES.CLIENT]: [PERMISSIONS.VIEW],
    [RESOURCES.USER]: [PERMISSIONS.VIEW],
    [RESOURCES.EXPENSE]: [PERMISSIONS.VIEW],
    [RESOURCES.AUDIT_LOG]: [],
  };

  if (hierarchy >= ROLE_HIERARCHY[ROLES.PLANNER]) {
    // Planners get create/edit/archive for most resources
    [
      RESOURCES.VENDOR,
      RESOURCES.EVENT,
      RESOURCES.TASK,
      RESOURCES.CLIENT,
      RESOURCES.EXPENSE,
    ].forEach((resource) => {
      basePermissions[resource].push(
        PERMISSIONS.CREATE,
        PERMISSIONS.EDIT,
        PERMISSIONS.ARCHIVE,
        PERMISSIONS.UPDATE_STATUS,
        PERMISSIONS.MANAGE_EVENT_STATUS,
      );
    });
  }

  if (hierarchy >= ROLE_HIERARCHY[ROLES.ADMIN]) {
    // Admins and Super Admins get ALL permissions for ALL resources
    Object.values(RESOURCES).forEach((resource) => {
      basePermissions[resource].push(
        PERMISSIONS.CREATE,
        PERMISSIONS.EDIT,
        PERMISSIONS.DELETE,
        PERMISSIONS.ARCHIVE,
        PERMISSIONS.DELETE_ALL,
        PERMISSIONS.MANAGE_USERS,
      );
    });

    // Audit log permission for Admins and Super Admins
    basePermissions[RESOURCES.AUDIT_LOG].push(PERMISSIONS.VIEW_AUDIT_LOGS);
  }

  // Only Super Admins can delete paid expenses
  if (hierarchy >= ROLE_HIERARCHY[ROLES.SUPER_ADMIN]) {
    basePermissions[RESOURCES.EXPENSE].push(PERMISSIONS.DELETE_PAID_EXPENSE);
    basePermissions[RESOURCES.AUDIT_LOG].push(PERMISSIONS.VIEW_AUDIT_LOGS);
  }

  return basePermissions;
};

// 4. User modification rules (mirroring canModifyUser)
const canModifyUser = (currentUser, targetUser, action) => {
  // Safety check
  if (!currentUser || !targetUser) return false;

  const currentRole = currentUser.role;
  const targetRole = targetUser.role || targetUser;
  const isSelf =
    targetUser._id && targetUser._id.toString() === currentUser._id.toString();

  // RULE 1: NO ONE can modify themselves (except basic info which is handled elsewhere)
  if (isSelf) {
    return false; // Never allow self-modification in canModifyUser
  }

  // RULE 2: Super admins can modify anyone else
  if (currentRole === ROLES.SUPER_ADMIN) {
    return true;
  }

  // RULE 3: Admins cannot modify super admins
  if (currentRole === ROLES.ADMIN && targetRole === ROLES.SUPER_ADMIN) {
    return false;
  }

  // RULE 4: Only Admins+ can modify other users
  if (currentRole !== ROLES.ADMIN && currentRole !== ROLES.SUPER_ADMIN) {
    return false; // Viewers and Planners CANNOT modify other users
  }

  // RULE 5: Admins can only modify users with lower role (not equal!)
  const currentLevel = ROLE_HIERARCHY[currentRole];
  const targetLevel = ROLE_HIERARCHY[targetRole];

  // Admins can edit lower roles only
  return currentLevel >= targetLevel;
};

// 5. Main permission checker
const checkPermission = (
  currentUser,
  permission,
  resource = null,
  targetUser = null,
) => {
  if (!currentUser?.role || !resource) return false;

  // PREVENT VIEWERS/PLANNERS FROM VIEWING DEACTIVATED USERS
  if (
    resource === RESOURCES.USER &&
    targetUser?.isDeactivated &&
    (currentUser.role === ROLES.VIEWER || currentUser.role === ROLES.PLANNER)
  ) {
    return false;
  }

  const userRole = currentUser.role;

  // Special rule: Viewers can see DRAG_CARD UI but can't actually update
  if (permission === PERMISSIONS.DRAG_CARD && userRole === ROLES.VIEWER) {
    return true;
  }

  // SPECIAL EXCEPTION: Everyone can edit their own basic info
  const isSelf =
    targetUser?._id && targetUser._id.toString() === currentUser._id.toString();
  if (
    resource === RESOURCES.USER &&
    permission === PERMISSIONS.EDIT &&
    isSelf
  ) {
    return true; // Allow self-edits for everyone
  }

  // RULE 1: Get base permissions based on role
  const basePermissions = getBasePermissionsForRole(userRole);
  const resourcePermissions = basePermissions[resource] || [];

  if (!resourcePermissions.includes(permission)) {
    return false;
  }

  // RULE 2: Special case - DELETE_ALL requires Admin+ (not Planner)
  if (permission === PERMISSIONS.DELETE_ALL) {
    return userRole === ROLES.ADMIN || userRole === ROLES.SUPER_ADMIN;
  }

  // RULE 3: User management protection (Admins can't touch Super Admins)
  if (resource === RESOURCES.USER && targetUser) {
    return canModifyUser(currentUser, targetUser, permission);
  }

  // RULE 4: Prevent self-deletion
  if (
    permission === PERMISSIONS.DELETE &&
    targetUser?._id &&
    targetUser._id.toString() === currentUser._id.toString()
  ) {
    return false;
  }

  // Special rule: Only super admins can delete paid expenses
  if (permission === PERMISSIONS.DELETE_PAID_EXPENSE) {
    return userRole === ROLES.SUPER_ADMIN;
  }

  // Special rule: Only super admins can view audit logs
  if (permission === PERMISSIONS.VIEW_AUDIT_LOGS) {
    return userRole === ROLES.ADMIN || userRole === ROLES.SUPER_ADMIN;
  }

  // For ALL other cases: if user has base permission, they're good!
  return true;
};

module.exports = {
  PERMISSIONS,
  RESOURCES,
  ROLES,
  checkPermission,
  canModifyUser,
  getBasePermissionsForRole,
};
