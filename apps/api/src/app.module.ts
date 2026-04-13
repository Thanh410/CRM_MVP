import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TraceIdInterceptor } from './common/interceptors/trace-id.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
// Phase 2 – CRM Core
import { LeadsModule } from './modules/crm/leads/leads.module';
import { ContactsModule } from './modules/crm/contacts/contacts.module';
import { CompaniesModule } from './modules/crm/companies/companies.module';
import { DealsModule } from './modules/crm/deals/deals.module';
import { NotesModule } from './modules/crm/notes/notes.module';
import { ActivitiesModule } from './modules/crm/activities/activities.module';
import { TagsModule } from './modules/crm/tags/tags.module';
// Phase 3 – Tasks & Projects
import { TasksModule } from './modules/tasks/tasks.module';
import { ProjectsModule } from './modules/projects/projects.module';
// Phase 4 – Marketing
import { MarketingModule } from './modules/marketing/marketing.module';
// Phase 5 – Omnichannel Chat
import { ConversationsModule } from './modules/conversations/conversations.module';
import { ZaloModule } from './modules/integrations/zalo/zalo.module';
import { MessengerModule } from './modules/integrations/messenger/messenger.module';
// Reporting
import { ReportingModule } from './modules/reporting/reporting.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // ── Config ─────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '.env.local'],
    }),

    // ── Events & Scheduling ────────────────────────────────
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),

    // ── Structured Logging ─────────────────────────────────
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env['LOG_LEVEL'] ?? 'info',
        transport:
          process.env['LOG_PRETTY'] === 'true'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: false } }
            : undefined,
        customProps: (req: any) => ({ traceId: req['traceId'] }),
        redact: ['req.headers.authorization', 'req.body.password'],
      },
    }),

    // ── Rate Limiting ──────────────────────────────────────
    ThrottlerModule.forRootAsync({
      useFactory: () => [
        {
          ttl: parseInt(process.env['THROTTLE_TTL'] ?? '60', 10) * 1000,
          limit: parseInt(process.env['THROTTLE_LIMIT'] ?? '100', 10),
        },
      ],
    }),

    // ── Core Infrastructure ────────────────────────────────
    PrismaModule,

    // ── Feature Modules ────────────────────────────────────
    AuthModule,
    UsersModule,
    OrganizationsModule,
    RbacModule,
    AuditModule,
    NotificationsModule,

    // Phase 2 – CRM Core
    LeadsModule,
    ContactsModule,
    CompaniesModule,
    DealsModule,
    NotesModule,
    ActivitiesModule,
    TagsModule,

    // Phase 3 – Tasks & Projects
    TasksModule,
    ProjectsModule,

    // Phase 4 – Marketing
    MarketingModule,

    // Phase 5 – Omnichannel Chat
    ConversationsModule,
    ZaloModule,
    MessengerModule,

    // Reporting
    ReportingModule,
  ],

  controllers: [HealthController],

  providers: [
    // Global providers
    TraceIdInterceptor,
    HttpExceptionFilter,
    {
      provide: APP_INTERCEPTOR,
      useExisting: TraceIdInterceptor,
    },
    {
      provide: APP_FILTER,
      useExisting: HttpExceptionFilter,
    },
    // Global JWT guard – protects all routes by default
    // Use @Public() to exempt routes
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
