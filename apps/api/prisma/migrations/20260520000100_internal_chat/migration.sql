-- Internal direct/group chat support on top of conversations.

CREATE TYPE "ConversationKind" AS ENUM ('EXTERNAL', 'DIRECT', 'GROUP');
CREATE TYPE "ConversationParticipantRole" AS ENUM ('ADMIN', 'MEMBER');

ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'INTERNAL';

ALTER TABLE "conversations"
  ADD COLUMN "kind" "ConversationKind" NOT NULL DEFAULT 'EXTERNAL';

ALTER TABLE "conversation_participants"
  ADD COLUMN "role" "ConversationParticipantRole" NOT NULL DEFAULT 'MEMBER',
  ADD COLUMN "lastReadAt" TIMESTAMP(3),
  ADD COLUMN "leftAt" TIMESTAMP(3);

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "conversations_kind_idx" ON "conversations"("kind");
CREATE INDEX "conversation_participants_userId_idx" ON "conversation_participants"("userId");
CREATE INDEX "conversation_participants_leftAt_idx" ON "conversation_participants"("leftAt");
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");
