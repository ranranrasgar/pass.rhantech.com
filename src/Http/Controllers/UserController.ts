import "server-only";
import { db } from "@/lib/db";
import { Role } from "@/lib/roles";
import { hashPassword } from "@/lib/password";
import { HttpError, requireUser } from "@/Http/Middleware/Authenticate";
import { ResetPasswordRequest, StoreUserRequest, UpdateUserRequest } from "@/Http/Requests/UserRequest";
import { User } from "@/Models/User";
import { AuditLog } from "@/Models/AuditLog";
import { action, body, idParam, json } from "./Controller";

const ONLY = [Role.SUPER_ADMIN];

export const UserController = {
  // GET /api/users
  index: action(async () => {
    await requireUser(ONLY);
    return json({ data: await User.all() });
  }),

  // POST /api/users
  store: action(async (req) => {
    const me = await requireUser(ONLY);
    const { password, ...input } = StoreUserRequest.parse(await body(req));
    const passwordHash = await hashPassword(password);
    const user = await db.$transaction(async (tx) => {
      const created = await User.create({ ...input, passwordHash }, tx);
      await AuditLog.record(
        { userId: me.id, action: "user.create", entityType: "user", entityId: created.id, after: created },
        tx,
      );
      return created;
    });
    return json({ data: user }, 201);
  }),

  // PATCH /api/users/:id  (ubah data, role, aktif/nonaktif)
  update: action(async (req, ctx) => {
    const me = await requireUser(ONLY);
    const id = await idParam(ctx);
    const input = UpdateUserRequest.parse(await body(req));
    if (id === me.id && (input.isActive === false || (input.role && input.role !== me.role))) {
      throw new HttpError(422, "Tidak bisa menonaktifkan atau mengubah role akun sendiri");
    }
    const user = await db.$transaction(async (tx) => {
      const before = await tx.user.findUniqueOrThrow({ where: { id }, omit: { passwordHash: true } });
      const after = await User.update(id, input, tx);
      await AuditLog.record(
        { userId: me.id, action: "user.update", entityType: "user", entityId: id, before, after },
        tx,
      );
      return after;
    });
    return json({ data: user });
  }),

  // POST /api/users/:id/reset-password
  resetPassword: action(async (req, ctx) => {
    const me = await requireUser(ONLY);
    const id = await idParam(ctx);
    const { password } = ResetPasswordRequest.parse(await body(req));
    const passwordHash = await hashPassword(password);
    await db.$transaction(async (tx) => {
      await User.update(id, { passwordHash }, tx);
      await AuditLog.record(
        { userId: me.id, action: "user.reset_password", entityType: "user", entityId: id },
        tx,
      );
    });
    return json({ data: { ok: true } });
  }),
};
