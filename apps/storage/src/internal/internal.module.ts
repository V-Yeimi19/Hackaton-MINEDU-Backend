import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [InternalController],
})
export class InternalModule {}
