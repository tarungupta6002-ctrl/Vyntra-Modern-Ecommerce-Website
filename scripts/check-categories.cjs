const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.category.findMany({
    select: { id: true, name: true, slug: true, parentId: true },
    orderBy: { name: 'asc' },
  });
  console.log('TOTAL CATEGORIES:', cats.length);
  const roots = cats.filter((c) => !c.parentId);
  console.log('ROOTS:', JSON.stringify(roots, null, 2));

  for (const r of roots) {
    const children = cats.filter((c) => c.parentId === r.id);
    console.log(`\nChildren of [${r.name}] (${r.slug}):`, children.map((c) => c.name).join(', '));
  }
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
  });
