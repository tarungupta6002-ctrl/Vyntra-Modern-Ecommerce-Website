/**
 * Vyntra Internal Admin Utility
 * Grants or revokes administrative/vendor roles for a verified email in Supabase/Prisma.
 * Usage: node scripts/set-user-role.cjs <email> <CUSTOMER|VENDOR|ADMIN|SUPER_ADMIN>
 */
const { PrismaClient, UserRole } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const email = args[0]?.trim();
  const targetRole = args[1]?.trim().toUpperCase();

  if (!email || !targetRole) {
    console.error('Usage: node scripts/set-user-role.cjs <email> <CUSTOMER|VENDOR|ADMIN|SUPER_ADMIN>');
    process.exit(1);
  }

  if (!Object.values(UserRole).includes(targetRole)) {
    console.error(`Invalid role "${targetRole}". Allowed roles: ${Object.values(UserRole).join(', ')}`);
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    console.error(`User with email "${email}" not found in database.`);
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: targetRole },
    select: { id: true, name: true, email: true, role: true },
  });

  console.log(`Successfully updated user ${updated.email} (${updated.name}) role from ${user.role} -> ${updated.role}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
