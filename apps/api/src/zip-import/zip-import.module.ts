import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { StorageModule } from "../storage/storage.module";
import { ZipImportController } from "./zip-import.controller";
import { ZipImportService } from "./zip-import.service";

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [ZipImportController],
  providers: [ZipImportService],
  exports: [ZipImportService]
})
export class ZipImportModule {}
