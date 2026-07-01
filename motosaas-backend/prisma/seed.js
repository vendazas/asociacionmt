const bcrypt = require("bcryptjs");
const { PrismaClient, UserRole, RecordStatus } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const associationId = process.env.SEED_ASSOCIATION_ID || "platform";
  const slug = process.env.SEED_ASSOCIATION_SLUG || "platform";
  const email = process.env.SEED_ADMIN_EMAIL || "admin@motosaas.local";
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

  const association = await prisma.association.upsert({
    where: { slug },
    update: {
      status: RecordStatus.ACTIVE,
      updated_by: "seed"
    },
    create: {
      association_id: associationId,
      name: "MotoSaaS Platform",
      slug,
      city: "Santa Cruz de la Sierra",
      status: RecordStatus.ACTIVE,
      created_by: "seed",
      updated_by: "seed"
    }
  });

  await prisma.user.upsert({
    where: {
      association_id_email: {
        association_id: association.association_id,
        email
      }
    },
    update: {
      password_hash: await bcrypt.hash(password, 12),
      role: UserRole.SUPER_ADMIN,
      status: RecordStatus.ACTIVE,
      updated_by: "seed"
    },
    create: {
      association_id: association.association_id,
      email,
      password_hash: await bcrypt.hash(password, 12),
      full_name: "Platform Admin",
      role: UserRole.SUPER_ADMIN,
      status: RecordStatus.ACTIVE,
      created_by: "seed",
      updated_by: "seed"
    }
  });

  await prisma.fareConfig.upsert({
    where: { id: `${association.association_id}-default-fare` },
    update: {},
    create: {
      id: `${association.association_id}-default-fare`,
      association_id: association.association_id,
      name: "Tarifa principal",
      base_fare: 5,
      minimum_fare: 8,
      per_kilometer_fare: 2.5,
      night_surcharge: 3,
      waiting_per_minute_fare: 0.5,
      association_commission_percent: 8,
      platform_commission_percent: 5,
      created_by: "seed",
      updated_by: "seed"
    }
  });

  console.log(`Seed ready: ${slug} / ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
