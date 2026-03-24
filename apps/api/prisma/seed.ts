import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CRM database...');

  // ── Organization ─────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: 'cong-ty-abc' },
    create: {
      name: 'Công ty ABC Việt Nam',
      slug: 'cong-ty-abc',
      website: 'https://abc.com.vn',
      phone: '028-3823-4567',
      email: 'contact@abc.com.vn',
      address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
      plan: 'pro',
    },
    update: {},
  });

  console.log(`✅ Organization: ${org.name}`);

  // ── Permissions ───────────────────────────────────────────
  const permDefs = [
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'update' },
    { resource: 'users', action: 'delete' },
    { resource: 'organization', action: 'update' },
    { resource: 'leads', action: 'create' },
    { resource: 'leads', action: 'read' },
    { resource: 'leads', action: 'update' },
    { resource: 'leads', action: 'delete' },
    { resource: 'leads', action: 'assign' },
    { resource: 'leads', action: 'export' },
    { resource: 'contacts', action: 'create' },
    { resource: 'contacts', action: 'read' },
    { resource: 'contacts', action: 'update' },
    { resource: 'contacts', action: 'delete' },
    { resource: 'contacts', action: 'export' },
    { resource: 'companies', action: 'create' },
    { resource: 'companies', action: 'read' },
    { resource: 'companies', action: 'update' },
    { resource: 'companies', action: 'delete' },
    { resource: 'deals', action: 'create' },
    { resource: 'deals', action: 'read' },
    { resource: 'deals', action: 'update' },
    { resource: 'deals', action: 'delete' },
    { resource: 'deals', action: 'assign' },
    { resource: 'tasks', action: 'create' },
    { resource: 'tasks', action: 'read' },
    { resource: 'tasks', action: 'update' },
    { resource: 'tasks', action: 'delete' },
    { resource: 'tasks', action: 'assign' },
    { resource: 'projects', action: 'create' },
    { resource: 'projects', action: 'read' },
    { resource: 'projects', action: 'update' },
    { resource: 'projects', action: 'delete' },
    { resource: 'campaigns', action: 'create' },
    { resource: 'campaigns', action: 'read' },
    { resource: 'campaigns', action: 'update' },
    { resource: 'campaigns', action: 'delete' },
    { resource: 'conversations', action: 'read' },
    { resource: 'conversations', action: 'assign' },
    { resource: 'conversations', action: 'reply' },
    { resource: 'reports', action: 'read' },
    { resource: 'audit', action: 'read' },
    { resource: 'integrations', action: 'manage' },
    { resource: 'pipelines', action: 'manage' },
    { resource: 'custom_fields', action: 'manage' },
  ];

  const permMap = new Map<string, string>();
  for (const pd of permDefs) {
    const perm = await prisma.permission.upsert({
      where: { resource_action: { resource: pd.resource, action: pd.action } },
      create: pd,
      update: {},
    });
    permMap.set(`${pd.resource}:${pd.action}`, perm.id);
  }
  console.log(`✅ Permissions: ${permDefs.length}`);

  // ── Roles ─────────────────────────────────────────────────
  const allPermIds = Array.from(permMap.values());

  const roleData = [
    { name: 'SUPER_ADMIN' as const, displayName: 'Super Admin', perms: allPermIds },
    { name: 'ADMIN' as const, displayName: 'Admin', perms: allPermIds },
    {
      name: 'MANAGER' as const, displayName: 'Quản lý',
      perms: ['users:read', 'leads:create', 'leads:read', 'leads:update', 'leads:assign', 'contacts:create', 'contacts:read', 'contacts:update', 'companies:read', 'companies:create', 'deals:create', 'deals:read', 'deals:update', 'deals:assign', 'tasks:create', 'tasks:read', 'tasks:update', 'tasks:assign', 'projects:create', 'projects:read', 'projects:update', 'conversations:read', 'conversations:assign', 'conversations:reply', 'reports:read']
        .map((k) => permMap.get(k)!).filter(Boolean),
    },
    {
      name: 'SALES' as const, displayName: 'Kinh doanh',
      perms: ['leads:create', 'leads:read', 'leads:update', 'leads:assign', 'contacts:create', 'contacts:read', 'contacts:update', 'companies:read', 'companies:create', 'deals:create', 'deals:read', 'deals:update', 'tasks:create', 'tasks:read', 'tasks:update']
        .map((k) => permMap.get(k)!).filter(Boolean),
    },
    {
      name: 'MARKETING' as const, displayName: 'Marketing',
      perms: ['leads:read', 'contacts:read', 'campaigns:create', 'campaigns:read', 'campaigns:update', 'reports:read']
        .map((k) => permMap.get(k)!).filter(Boolean),
    },
    {
      name: 'SUPPORT' as const, displayName: 'CSKH / Hỗ trợ',
      perms: ['contacts:read', 'conversations:read', 'conversations:reply', 'conversations:assign', 'tasks:create', 'tasks:read', 'tasks:update']
        .map((k) => permMap.get(k)!).filter(Boolean),
    },
    {
      name: 'STAFF' as const, displayName: 'Nhân viên',
      perms: ['leads:read', 'contacts:read', 'tasks:read', 'tasks:update']
        .map((k) => permMap.get(k)!).filter(Boolean),
    },
  ];

  const roleMap = new Map<string, string>();
  for (const rd of roleData) {
    const role = await prisma.role.upsert({
      where: { orgId_name: { orgId: org.id, name: rd.name } },
      create: { orgId: org.id, name: rd.name, displayName: rd.displayName },
      update: { displayName: rd.displayName },
    });
    roleMap.set(rd.name, role.id);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (rd.perms.length > 0) {
      await prisma.rolePermission.createMany({
        data: rd.perms.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }
  }
  console.log(`✅ Roles: ${roleData.length}`);

  // ── Departments ───────────────────────────────────────────
  const deptSales = await prisma.department.upsert({
    where: { id: 'dept-sales-001' },
    create: { id: 'dept-sales-001', orgId: org.id, name: 'Phòng Kinh Doanh' },
    update: {},
  });
  const deptMarketing = await prisma.department.upsert({
    where: { id: 'dept-mkt-001' },
    create: { id: 'dept-mkt-001', orgId: org.id, name: 'Phòng Marketing' },
    update: {},
  });
  const deptSupport = await prisma.department.upsert({
    where: { id: 'dept-cs-001' },
    create: { id: 'dept-cs-001', orgId: org.id, name: 'Phòng CSKH' },
    update: {},
  });

  // ── Users ─────────────────────────────────────────────────
  const password = await bcrypt.hash('Admin@123456', 12);

  const users = [
    { email: 'superadmin@abc.com.vn', name: 'Trần Minh Khoa', role: 'SUPER_ADMIN', deptId: null },
    { email: 'admin@abc.com.vn', name: 'Lê Thị Mai', role: 'ADMIN', deptId: null },
    { email: 'manager.sales@abc.com.vn', name: 'Nguyễn Văn Hùng', role: 'MANAGER', deptId: deptSales.id },
    { email: 'sales1@abc.com.vn', name: 'Phạm Thị Lan', role: 'SALES', deptId: deptSales.id },
    { email: 'sales2@abc.com.vn', name: 'Vũ Quang Dũng', role: 'SALES', deptId: deptSales.id },
    { email: 'marketing@abc.com.vn', name: 'Hoàng Thu Hà', role: 'MARKETING', deptId: deptMarketing.id },
    { email: 'support@abc.com.vn', name: 'Đặng Thị Bình', role: 'SUPPORT', deptId: deptSupport.id },
  ];

  const userMap = new Map<string, string>();
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { orgId_email: { orgId: org.id, email: u.email } },
      create: {
        orgId: org.id,
        email: u.email,
        passwordHash: password,
        fullName: u.name,
        status: 'ACTIVE',
        deptId: u.deptId ?? undefined,
      },
      update: {},
    });
    userMap.set(u.email, user.id);

    const roleId = roleMap.get(u.role);
    if (roleId) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId } },
        create: { userId: user.id, roleId, orgId: org.id },
        update: {},
      });
    }
  }
  console.log(`✅ Users: ${users.length}`);

  // ── Pipeline + Deal Stages ────────────────────────────────
  const pipeline = await prisma.pipeline.upsert({
    where: { id: 'pipeline-default' },
    create: {
      id: 'pipeline-default',
      orgId: org.id,
      name: 'Pipeline Kinh Doanh',
      isDefault: true,
    },
    update: {},
  });

  const stages = [
    { id: 'stage-1', name: 'Tiềm năng', order: 1, color: '#6366f1', probability: 10 },
    { id: 'stage-2', name: 'Đã liên hệ', order: 2, color: '#8b5cf6', probability: 30 },
    { id: 'stage-3', name: 'Báo giá', order: 3, color: '#f59e0b', probability: 50 },
    { id: 'stage-4', name: 'Đàm phán', order: 4, color: '#f97316', probability: 70 },
    { id: 'stage-5', name: 'Chốt hợp đồng', order: 5, color: '#22c55e', probability: 90 },
  ];

  for (const s of stages) {
    await prisma.dealStage.upsert({
      where: { id: s.id },
      create: { ...s, orgId: org.id, pipelineId: pipeline.id },
      update: {},
    });
  }
  console.log(`✅ Pipeline + ${stages.length} stages`);

  // ── Sample Companies ──────────────────────────────────────
  const companies = [
    { name: 'Công ty TNHH TechViet', industry: 'Công nghệ', size: '51-200' },
    { name: 'Tập đoàn Vingroup', industry: 'Bất động sản', size: '1000+' },
    { name: 'Startup FoodApp', industry: 'F&B / Thực phẩm', size: '11-50' },
    { name: 'Công ty CP Mekong Logistics', industry: 'Vận tải & Logistics', size: '201-1000' },
  ];

  const companyIds: string[] = [];
  for (const c of companies) {
    const company = await prisma.company.create({
      data: { orgId: org.id, ...c },
    });
    companyIds.push(company.id);
  }
  console.log(`✅ Companies: ${companies.length}`);

  // ── Sample Leads ──────────────────────────────────────────
  const leadStatuses: ('NEW' | 'CONTACTED' | 'QUALIFIED' | 'UNQUALIFIED')[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED'];
  const sources = ['facebook', 'zalo', 'website', 'referral', 'cold_call'];
  const salesIds = [userMap.get('sales1@abc.com.vn')!, userMap.get('sales2@abc.com.vn')!];

  const leadNames = [
    'Nguyễn Thị Thanh Hoa', 'Trần Văn Nam', 'Lê Minh Tuấn', 'Phạm Thị Ngọc',
    'Vũ Quốc Việt', 'Hoàng Thị Kim Anh', 'Đặng Hữu Phước', 'Bùi Thị Linh',
    'Đinh Văn Sơn', 'Ngô Thị Hương',
  ];

  for (let i = 0; i < leadNames.length; i++) {
    await prisma.lead.create({
      data: {
        orgId: org.id,
        fullName: leadNames[i],
        email: `lead${i + 1}@example.vn`,
        phone: `090${String(1234567 + i).padStart(7, '0')}`,
        status: leadStatuses[i % leadStatuses.length],
        source: sources[i % sources.length],
        assignedTo: salesIds[i % salesIds.length],
      },
    });
  }
  console.log(`✅ Leads: ${leadNames.length}`);

  // ── Sample Contacts + Deals ───────────────────────────────
  const contactData = [
    { fullName: 'Nguyễn Văn Bình', email: 'binh@techviet.vn', phone: '0912345678', companyIdx: 0 },
    { fullName: 'Trần Thị Cúc', email: 'cuc@vingroup.vn', phone: '0987654321', companyIdx: 1 },
    { fullName: 'Lê Hoàng Minh', email: 'minh@foodapp.vn', phone: '0976543210', companyIdx: 2 },
  ];

  const stageIds = stages.map((s) => s.id);

  for (let i = 0; i < contactData.length; i++) {
    const cd = contactData[i];
    const contact = await prisma.contact.create({
      data: {
        orgId: org.id,
        fullName: cd.fullName,
        email: cd.email,
        phone: cd.phone,
        companyId: companyIds[cd.companyIdx],
        assignedTo: salesIds[i % salesIds.length],
      },
    });

    // Create a deal per contact
    await prisma.deal.create({
      data: {
        orgId: org.id,
        title: `Hợp đồng với ${cd.fullName}`,
        value: (i + 1) * 50_000_000,
        currency: 'VND',
        stageId: stageIds[i % stageIds.length],
        pipelineId: pipeline.id,
        contactId: contact.id,
        companyId: companyIds[cd.companyIdx],
        ownerId: salesIds[i % salesIds.length],
        probability: stages[i % stages.length].probability,
      },
    });
  }
  console.log(`✅ Contacts + Deals: ${contactData.length}`);

  // ── Tags ──────────────────────────────────────────────────
  const tags = [
    { name: 'VIP', color: '#ef4444' },
    { name: 'Tiềm năng cao', color: '#f59e0b' },
    { name: 'Đã gặp mặt', color: '#22c55e' },
    { name: 'Chờ phản hồi', color: '#6366f1' },
    { name: 'Giới thiệu', color: '#8b5cf6' },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { orgId_name: { orgId: org.id, name: tag.name } },
      create: { orgId: org.id, ...tag },
      update: {},
    });
  }
  console.log(`✅ Tags: ${tags.length}`);

  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Login credentials:');
  console.log('  Super Admin: superadmin@abc.com.vn / Admin@123456');
  console.log('  Admin:       admin@abc.com.vn      / Admin@123456');
  console.log('  Manager:     manager.sales@abc.com.vn / Admin@123456');
  console.log('  Sales:       sales1@abc.com.vn     / Admin@123456');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
