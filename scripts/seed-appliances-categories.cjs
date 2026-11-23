const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Appliances Department & Category Hierarchy...');

  // 1. Root Department: Appliances
  const rootAppliance = await prisma.category.upsert({
    where: { slug: 'appliances' },
    update: {
      name: 'Appliances',
      description: 'Major home appliances, refrigerators, washing machines, inverter air conditioners, and kitchen appliances',
    },
    create: {
      name: 'Appliances',
      slug: 'appliances',
      description: 'Major home appliances, refrigerators, washing machines, inverter air conditioners, and kitchen appliances',
    },
  });
  console.log('Created/Updated Root Department:', rootAppliance.name, `(${rootAppliance.id})`);

  // 2. Sections under Appliances
  const sections = [
    {
      name: 'Refrigerators & Freezers',
      slug: 'refrigerators',
      description: 'Single door, double door frost-free, and side-by-side inverter refrigerators',
      subCategories: [
        { name: 'Single Door Refrigerators', slug: 'single-door-refrigerators' },
        { name: 'Double Door Frost Free', slug: 'double-door-refrigerators' },
        { name: 'Side by Side Refrigerators', slug: 'side-by-side-refrigerators' },
        { name: 'Mini Fridges & Deep Freezers', slug: 'mini-fridges-freezers' },
      ],
    },
    {
      name: 'Washing Machines & Dryers',
      slug: 'washing-machines',
      description: 'Fully automatic front load, top load, and semi-automatic washing machines',
      subCategories: [
        { name: 'Fully Automatic Front Load', slug: 'front-load-washing-machines' },
        { name: 'Fully Automatic Top Load', slug: 'top-load-washing-machines' },
        { name: 'Semi-Automatic Washing Machines', slug: 'semi-automatic-washing-machines' },
        { name: 'Clothes Dryers', slug: 'clothes-dryers' },
      ],
    },
    {
      name: 'Air Conditioners & Coolers',
      slug: 'air-conditioners',
      description: 'Split inverter ACs, 5-star energy efficient air conditioners, and window ACs',
      subCategories: [
        { name: 'Split Inverter ACs', slug: 'split-inverter-acs' },
        { name: 'Window Air Conditioners', slug: 'window-air-conditioners' },
        { name: 'Smart Wi-Fi Connected ACs', slug: 'smart-wifi-acs' },
        { name: 'Personal & Desert Air Coolers', slug: 'air-coolers' },
      ],
    },
    {
      name: 'Kitchen & Cooking Appliances',
      slug: 'kitchen-appliances',
      description: 'Microwave ovens, chimneys, induction cooktops, air fryers, and dishwashers',
      subCategories: [
        { name: 'Microwave Ovens & OTG', slug: 'microwave-ovens' },
        { name: 'Kitchen Chimneys & Hobs', slug: 'kitchen-chimneys' },
        { name: 'Induction Cooktops', slug: 'induction-cooktops' },
        { name: 'Digital Air Fryers', slug: 'air-fryers' },
        { name: 'Dishwashers', slug: 'dishwashers' },
        { name: 'Mixer Grinders & Blenders', slug: 'mixer-grinders' },
      ],
    },
    {
      name: 'Home Essentials & Water Purifiers',
      slug: 'home-appliances',
      description: 'RO water purifiers, vacuum cleaners, geysers, and room heaters',
      subCategories: [
        { name: 'RO + UV Water Purifiers', slug: 'water-purifiers' },
        { name: 'Vacuum Cleaners & Robot Vacuums', slug: 'vacuum-cleaners' },
        { name: 'Storage & Instant Water Geysers', slug: 'water-geysers' },
        { name: 'Garment Steamers & Irons', slug: 'steamers-irons' },
        { name: 'Air Purifiers', slug: 'air-purifiers' },
      ],
    },
  ];

  for (const sec of sections) {
    const upsertedSection = await prisma.category.upsert({
      where: { slug: sec.slug },
      update: {
        name: sec.name,
        description: sec.description,
        parentId: rootAppliance.id,
      },
      create: {
        name: sec.name,
        slug: sec.slug,
        description: sec.description,
        parentId: rootAppliance.id,
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

  console.log('\n✅ Successfully seeded Appliances category hierarchy into database!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
