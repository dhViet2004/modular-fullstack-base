import { prisma } from "../../../core/database/prisma.js";

// Tìm user theo email và chỉ lấy các trường cần thiết cho nghiệp vụ đăng nhập.
export function findPasswordUserByEmail(email: string) {
  // `findUnique` dùng cột có unique constraint nên trả về tối đa một bản ghi.
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      displayName: true,
      status: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
      passwordCredential: {
        select: {
          passwordHash: true,
        },
      },
    },
  });
}
