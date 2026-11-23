const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Books Department & Category Hierarchy...');

  // 1. Root Department: Books
  const rootBooks = await prisma.category.upsert({
    where: { slug: 'books' },
    update: {
      name: 'Books',
      description: 'Fiction, Non-fiction, Self-help, Business, Academic, Indian Literature, and Manga',
    },
    create: {
      name: 'Books',
      slug: 'books',
      description: 'Fiction, Non-fiction, Self-help, Business, Academic, Indian Literature, and Manga',
    },
  });
  console.log('Created/Updated Root Department:', rootBooks.name, `(${rootBooks.id})`);

  // 2. Sections under Books
  const sections = [
    {
      name: 'Self-Help & Personal Development',
      slug: 'self-help-books',
      description: 'Mindset, habits, productivity, mindfulness, and psychology',
      subCategories: [
        { name: 'Habits & Productivity', slug: 'habits-productivity' },
        { name: 'Mindfulness & Meditation', slug: 'mindfulness-meditation' },
        { name: 'Communication & Social Skills', slug: 'communication-skills' },
      ],
    },
    {
      name: 'Business, Finance & Investing',
      slug: 'business-finance-books',
      description: 'Personal finance, stock market, wealth building, management, and entrepreneurship',
      subCategories: [
        { name: 'Personal Finance & Wealth', slug: 'personal-finance-books' },
        { name: 'Investing & Stock Markets', slug: 'investing-stock-market' },
        { name: 'Entrepreneurship & Startups', slug: 'entrepreneurship-startups' },
      ],
    },
    {
      name: 'Fiction & Literature',
      slug: 'fiction-literature-books',
      description: 'Contemporary fiction, classics, thrillers, fantasy, and sci-fi',
      subCategories: [
        { name: 'Crime, Thriller & Mystery', slug: 'thriller-mystery-books' },
        { name: 'Fantasy & Science Fiction', slug: 'fantasy-scifi-books' },
        { name: 'Historical & Literary Fiction', slug: 'historical-fiction-books' },
      ],
    },
    {
      name: 'Indian Authors & Literature',
      slug: 'indian-literature-books',
      description: 'Mythology, historical epics, Hindi sahitya, and celebrated Indian storytellers',
      subCategories: [
        { name: 'Mythology & Epics', slug: 'mythology-epics' },
        { name: 'Hindi Sahitya & Classics', slug: 'hindi-sahitya-books' },
        { name: 'Contemporary Indian Fiction', slug: 'contemporary-indian-fiction' },
      ],
    },
    {
      name: 'Exam Prep & Academics',
      slug: 'exam-prep-books',
      description: 'UPSC, JEE, NEET, banking exams, school textbooks, and higher education',
      subCategories: [
        { name: 'UPSC & Civil Services', slug: 'upsc-civil-services' },
        { name: 'Engineering & Medical (JEE / NEET)', slug: 'jee-neet-exam-prep' },
        { name: 'NCERT & School Guides', slug: 'ncert-school-guides' },
      ],
    },
    {
      name: "Children's Books, Comics & Manga",
      slug: 'comics-manga-books',
      description: 'Illustrated stories, graphic novels, Japanese manga, and bedtime storybooks',
      subCategories: [
        { name: 'Illustrated Bedtime Stories', slug: 'illustrated-bedtime-stories' },
        { name: 'Japanese Manga & Anime', slug: 'japanese-manga' },
        { name: 'Graphic Novels & Comics', slug: 'graphic-novels-comics' },
      ],
    },
  ];

  for (const sec of sections) {
    const upsertedSection = await prisma.category.upsert({
      where: { slug: sec.slug },
      update: {
        name: sec.name,
        description: sec.description,
        parentId: rootBooks.id,
      },
      create: {
        name: sec.name,
        slug: sec.slug,
        description: sec.description,
        parentId: rootBooks.id,
      },
    });
    console.log(`  └─ Section: ${upsertedSection.name} (${upsertedSection.slug})`);

    // 3. Subcategories under each Section
    for (const sub of sec.subCategories) {
      const upsertedSub = await prisma.category.upsert({
        where: { slug: sub.slug },
        update: {
          name: sub.name,
          parentId: upsertedSection.id,
        },
        create: {
          name: sub.name,
          slug: sub.slug,
          parentId: upsertedSection.id,
        },
      });
      console.log(`      └─ Category: ${upsertedSub.name} (${upsertedSub.slug})`);
    }
  }

  console.log('\n✅ Successfully seeded Books category hierarchy into database!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
