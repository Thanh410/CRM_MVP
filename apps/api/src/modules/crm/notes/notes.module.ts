import { Module } from '@nestjs/common';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { NotesCleanupService } from './notes-cleanup.service';

@Module({
  controllers: [NotesController],
  providers: [NotesService, NotesCleanupService],
  exports: [NotesService],
})
export class NotesModule {}
