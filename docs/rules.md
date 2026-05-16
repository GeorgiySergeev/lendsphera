CONTEXT: This is a NestJS 11 monorepo (apps/api). We use nestjs-zod for
validation, @nestjs/swagger for docs, and follow the existing patterns from
apps/api/src/landings/landings.dto.ts and
apps/api/src/publish/publish.service.ts. TASK: Create the file
apps/api/src/crawler/crawler.dto.ts Requirements: 1. Export CreateCrawlJobDto
(Zod schema + class via createZodDto): - url: z.string().url() — the site URL to
crawl - maxDepth: z.number().int().min(1).max(5).default(2) — crawl depth -
maxPages: z.number().int().min(1).max(100).default(20) — page limit -
followExternalLinks: z.boolean().default(false) 2. Export CrawlJobStatusDto for
response shape: - id, status (QUEUED | RUNNING | SUCCESS | FAILED), url,
createdAt, finishedAt?, downloadUrl?, error?, logs? 3. Add @ApiProperty()
decorators on all fields (use nestjs-zod pattern). Do NOT create any other files
yet.
