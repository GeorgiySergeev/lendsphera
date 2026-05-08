import AdmZip from "adm-zip";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { LegacySource, Prisma, VersionStatus } from "@prisma/client";

import type { AuthUser } from "../common/current-user.decorator";
import { env } from "../config/env";
import { getPagination, listResponse } from "../common/pagination";
import { toInputJson } from "../common/prisma-json";
import { mapPrismaError } from "../common/prisma-errors";
import { serializeBigInts } from "../common/serialize";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import type {
  CreateLegacyDto,
  CreateLegacyFileDto,
  ImportLinkDto,
  LegacyAssetQueryDto,
  LegacyFileContentDto,
  LegacyFilesQueryDto,
  LegacyGitConnectDto,
  LegacyImportAsLandingDto,
  LegacyListQueryDto,
  LegacyUploadQueryDto,
  UpdateLegacyDto
} from "./legacy.dto";

type UploadFile = {
  buffer: Buffer;
  mimetype?: string;
  originalname: string;
  size: number;
};

type NormalizedUpload = {
  buffer: Buffer;
  mimeType: string;
  path: string;
};

type LegacyTreeNode = {
  id: string;
  name: string;
  path: string;
  type: "folder" | "file";
  children?: LegacyTreeNode[];
};

const TEXT_EXTENSIONS = new Set([
  "html",
  "htm",
  "css",
  "js",
  "mjs",
  "cjs",
  "json",
  "txt",
  "xml",
  "svg"
]);
const EDITABLE_EXTENSIONS = new Set(["html", "htm", "css", "js", "mjs", "cjs"]);
const TEXT_SIZE_LIMIT = 1_500_000;
const GIT_FILE_SIZE_LIMIT = 20 * 1024 * 1024;
const GIT_INDEX_CONCURRENCY = 24;
const DEFAULT_GIT_REPOSITORY_URL = "https://github.com/GeorgiySergeev/landing-legacy-2";
const DEFAULT_GIT_BRANCH = "main";
const IGNORED_GIT_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "build",
  "node_modules",
  "vendor"
]);

const execFileAsync = promisify(execFile);

@Injectable()
export class LegacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
  ) {}

  async list(query: LegacyListQueryDto) {
    const { skip, take, page, limit } = getPagination(query);
    const where: Prisma.LegacyLandingWhereInput = {
      source: query.source,
      geoHint: query.geoHint,
      tags: query.tag ? { has: query.tag } : undefined,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: "insensitive" } },
            { path: { contains: query.search, mode: "insensitive" } },
            { categoryHint: { contains: query.search, mode: "insensitive" } }
          ]
        : undefined
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.legacyLanding.findMany({
        where,
        include: { importedAs: true },
        skip,
        take,
        orderBy: { updatedAt: "desc" }
      }),
      this.prisma.legacyLanding.count({ where })
    ]);

    return serializeBigInts(listResponse(items, total, page, limit));
  }

  async get(id: string) {
    const legacy = await this.prisma.legacyLanding.findUniqueOrThrow({
      where: { id },
      include: { files: true, importedAs: true }
    });

    return serializeBigInts(legacy);
  }

  async create(dto: CreateLegacyDto) {
    try {
      const legacy = await this.prisma.legacyLanding.create({
        data: {
          ...dto,
          source: dto.source ?? LegacySource.UPLOAD,
          sizeBytes: dto.sizeBytes ?? 0n,
          fileCount: dto.fileCount ?? 0,
          fileTree: toInputJson(dto.fileTree) ?? Prisma.JsonNull
        }
      });

      return serializeBigInts(legacy);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async update(id: string, dto: UpdateLegacyDto) {
    try {
      const legacy = await this.prisma.legacyLanding.update({
        where: { id },
        data: {
          ...dto,
          fileTree: toInputJson(dto.fileTree)
        }
      });

      return serializeBigInts(legacy);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async delete(id: string) {
    try {
      const legacy = await this.prisma.legacyLanding.delete({ where: { id } });
      return serializeBigInts(legacy);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async tree(legacyLandingId: string) {
    const files = await this.prisma.legacyFile.findMany({
      where: { legacyLandingId },
      orderBy: { path: "asc" },
      select: { id: true, path: true }
    });

    return this.buildTree(files);
  }

  async listFiles(legacyLandingId: string, query: LegacyFilesQueryDto) {
    const { skip, take, page, limit } = getPagination(query);

    if (query.search) {
      return this.searchFiles(legacyLandingId, query, skip, take, page, limit);
    }

    const where: Prisma.LegacyFileWhereInput = {
      legacyLandingId,
      path: query.folder
        ? { startsWith: `${query.folder.replace(/\/$/, "")}/` }
        : undefined
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.legacyFile.findMany({
        where,
        skip,
        take,
        orderBy: { path: "asc" }
      }),
      this.prisma.legacyFile.count({ where })
    ]);

    return listResponse(items, total, page, limit);
  }

  async createFile(legacyLandingId: string, dto: CreateLegacyFileDto) {
    try {
      return await this.prisma.legacyFile.create({
        data: {
          ...dto,
          extension: dto.extension ?? getExtension(dto.path),
          legacyLandingId,
          isBinary: dto.isBinary ?? false
        }
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async deleteFile(id: string) {
    try {
      return await this.prisma.legacyFile.delete({ where: { id } });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async upload(files: UploadFile[], query: LegacyUploadQueryDto, user: AuthUser) {
    if (!files.length) {
      throw new BadRequestException("Upload at least one file.");
    }

    const existingLegacy = query.legacyLandingId
      ? await this.prisma.legacyLanding.findUniqueOrThrow({
          where: { id: query.legacyLandingId }
        })
      : null;
    const uploads = files.flatMap((file) => this.expandUpload(file));
    const legacy =
      existingLegacy ??
      (await this.prisma.legacyLanding.create({
        data: {
          fileTree: Prisma.JsonNull,
          name: query.name ?? inferUploadName(files[0].originalname),
          path:
            query.path ??
            `legacy/${slugify(query.name ?? inferUploadName(files[0].originalname))}-${Date.now().toString(36)}`,
          source: hasZip(files) ? LegacySource.ZIP : LegacySource.UPLOAD
        }
      }));

    for (const upload of uploads) {
      await this.storeLegacyFile(legacy.id, upload, user);
    }

    return this.refreshLegacyStats(legacy.id);
  }

  async connectGitRepository(dto: LegacyGitConnectDto, user: AuthUser) {
    const sourceUrl = normalizeGitHubUrl(dto.url ?? DEFAULT_GIT_REPOSITORY_URL);
    const branch = dto.branch?.trim() || DEFAULT_GIT_BRANCH;
    const name = inferGitRepositoryName(sourceUrl);
    const pathValue = `git/${slugify(name)}-${slugify(branch)}`;

    const legacy =
      (await this.prisma.legacyLanding.findFirst({
        where: { branch, source: LegacySource.GIT_REPO, sourceUrl }
      })) ??
      (await this.prisma.legacyLanding.create({
        data: {
          branch,
          fileTree: Prisma.JsonNull,
          name,
          path: pathValue,
          source: LegacySource.GIT_REPO,
          sourceUrl,
          syncStatus: "PENDING"
        }
      }));

    return this.syncGitRepository(legacy.id, user);
  }

  async syncGitRepository(id: string, user: AuthUser) {
    const legacy = await this.prisma.legacyLanding.findUniqueOrThrow({
      where: { id }
    });

    if (legacy.source !== LegacySource.GIT_REPO || !legacy.sourceUrl) {
      throw new BadRequestException("Only Git repository roots can be synced.");
    }

    const sourceUrl = normalizeGitHubUrl(legacy.sourceUrl || DEFAULT_GIT_REPOSITORY_URL);
    const branch = legacy.branch || DEFAULT_GIT_BRANCH;

    await this.prisma.legacyLanding.update({
      where: { id },
      data: { syncError: null, syncStatus: "SYNCING" }
    });

    try {
      const result = await this.cloneAndIndexGitRepository({
        branch,
        legacyLandingId: id,
        sourceUrl,
        user
      });
      const synced = await this.prisma.legacyLanding.update({
        where: { id },
        data: {
          branch,
          commitSha: result.commitSha,
          lastSyncedAt: new Date(),
          sourceUrl,
          syncError: null,
          syncStatus: "SYNCED"
        }
      });

      await this.deleteMissingGitFiles(id, result.paths);

      return this.refreshLegacyStats(synced.id);
    } catch (error) {
      const message = getErrorMessage(error);
      await this.prisma.legacyLanding.update({
        where: { id },
        data: { syncError: message, syncStatus: "FAILED" }
      });
      throw new BadRequestException(`Git sync failed: ${message}`);
    }
  }

  async getFileContent(fileId: string) {
    const file = await this.prisma.legacyFile.findUniqueOrThrow({
      where: { id: fileId }
    });

    if (file.isBinary || !isTextExtension(file.extension ?? getExtension(file.path))) {
      throw new BadRequestException(
        "Only text files can be opened in the inline editor."
      );
    }

    const content =
      file.textContent ??
      (await this.storage.getObjectBuffer(file.s3Key)).toString("utf8");

    return { content, file };
  }

  async saveFileContent(fileId: string, dto: LegacyFileContentDto, user: AuthUser) {
    const file = await this.prisma.legacyFile.findUniqueOrThrow({
      where: { id: fileId }
    });
    const extension = file.extension ?? getExtension(file.path);

    if (!EDITABLE_EXTENSIONS.has(extension)) {
      throw new BadRequestException("Only HTML, CSS, and JS files can be saved here.");
    }

    const buffer = Buffer.from(dto.content, "utf8");
    await this.storage.putObject({
      body: buffer,
      contentType: getMimeType(file.path),
      key: file.s3Key
    });

    return this.prisma.legacyFile.update({
      where: { id: fileId },
      data: {
        hash: hashBuffer(buffer),
        isBinary: false,
        mimeType: getMimeType(file.path),
        size: buffer.byteLength,
        textContent: dto.content,
        updatedById: user.id
      }
    });
  }

  async previewHtml(fileId: string) {
    const file = await this.prisma.legacyFile.findUniqueOrThrow({
      where: { id: fileId }
    });
    const extension = file.extension ?? getExtension(file.path);

    if (extension !== "html" && extension !== "htm") {
      throw new BadRequestException("Preview is available for HTML files.");
    }

    const content =
      file.textContent ??
      (await this.storage.getObjectBuffer(file.s3Key)).toString("utf8");

    return this.rewriteHtmlAssetUrls(content, file);
  }

  async getRelativeAsset(fileId: string, query: LegacyAssetQueryDto) {
    const source = await this.prisma.legacyFile.findUniqueOrThrow({
      where: { id: fileId },
      select: { legacyLandingId: true, path: true }
    });
    const assetPath = resolveRelativePath(source.path, query.path);
    const asset = await this.prisma.legacyFile.findUnique({
      where: {
        legacyLandingId_path: {
          legacyLandingId: source.legacyLandingId,
          path: assetPath
        }
      }
    });

    if (!asset) {
      throw new NotFoundException("Asset not found.");
    }

    return {
      buffer: await this.storage.getObjectBuffer(asset.s3Key),
      file: asset
    };
  }

  async importAsLanding(fileId: string, dto: LegacyImportAsLandingDto, user: AuthUser) {
    const file = await this.prisma.legacyFile.findUniqueOrThrow({
      where: { id: fileId },
      include: { legacy: true }
    });
    const extension = file.extension ?? getExtension(file.path);

    if (extension !== "html" && extension !== "htm") {
      throw new BadRequestException("Import as Landing starts from an HTML file.");
    }

    const html =
      file.textContent ??
      (await this.storage.getObjectBuffer(file.s3Key)).toString("utf8");
    const localAssets = await this.collectLinkedTextAssets(
      file.legacyLandingId,
      file.path,
      html
    );
    const landingSlug = dto.slug ?? slugify(dto.name);
    const publicId = dto.publicId ?? `${landingSlug}-${Date.now().toString(36)}`;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const templateId =
          dto.templateId ??
          (
            await tx.template.upsert({
              where: { slug: "legacy-raw-html" },
              update: { isActive: true },
              create: {
                authorId: user.id,
                baseHtml: "{{legacyHtml}}",
                categoryId: dto.categoryId,
                description: "Raw HTML template used for imported legacy landings.",
                isActive: true,
                isPublic: false,
                name: "Legacy Raw HTML",
                placeholders: [
                  { key: "legacyHtml", type: "richtext", label: "Legacy HTML" }
                ],
                slug: "legacy-raw-html",
                tags: ["legacy", "repository"]
              }
            })
          ).id;
        const landing = await tx.landing.create({
          data: {
            categoryId: dto.categoryId,
            geoId: dto.geoId,
            name: dto.name.trim(),
            ownerId: user.id,
            publicId,
            slug: landingSlug,
            status: "DRAFT",
            tags: ["legacy-import"],
            templateId,
            variantId: dto.variantId
          }
        });
        const version = await tx.version.create({
          data: {
            authorId: user.id,
            css: localAssets.css,
            customJs: localAssets.js,
            grapesJson: Prisma.JsonNull,
            html,
            landingId: landing.id,
            message: `Imported from ${file.path}`,
            placeholders: Prisma.JsonNull,
            status: VersionStatus.MANUAL,
            versionNum: 1
          }
        });
        await tx.landing.update({
          where: { id: landing.id },
          data: { currentVersionId: version.id }
        });
        await tx.legacyLanding.update({
          where: { id: file.legacyLandingId },
          data: {
            importedAsId: landing.id,
            importedAt: new Date()
          }
        });

        return tx.landing.findUniqueOrThrow({
          where: { id: landing.id },
          include: { currentVersion: true, template: true }
        });
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async importLink(id: string, dto: ImportLinkDto) {
    try {
      const legacy = await this.prisma.legacyLanding.update({
        where: { id },
        data: {
          importedAsId: dto.landingId,
          importedAt: new Date()
        },
        include: { importedAs: true }
      });

      return serializeBigInts(legacy);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  private async cloneAndIndexGitRepository({
    branch,
    legacyLandingId,
    sourceUrl,
    user
  }: {
    branch: string;
    legacyLandingId: string;
    sourceUrl: string;
    user: AuthUser;
  }) {
    await this.assertGitBranchExists(sourceUrl, branch);

    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "legacy-git-"));
    const checkoutDir = path.join(tempRoot, "repo");

    try {
      await runGit([
        "clone",
        "--depth=1",
        "--branch",
        branch,
        "--single-branch",
        sourceUrl,
        checkoutDir
      ]);

      const commitSha = (await runGit(["-C", checkoutDir, "rev-parse", "HEAD"])).trim();
      const files = await collectGitFiles(checkoutDir);
      const paths = new Set<string>();

      await mapWithConcurrency(files, GIT_INDEX_CONCURRENCY, async (file) => {
        const buffer = await readFile(file.absolutePath);
        const normalizedPath = normalizeLegacyPath(file.relativePath);

        paths.add(normalizedPath);
        await this.storeLegacyFile(
          legacyLandingId,
          {
            buffer,
            mimeType: getMimeType(normalizedPath),
            path: normalizedPath
          },
          user
        );
      });

      return { commitSha, paths };
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  }

  private async assertGitBranchExists(sourceUrl: string, branch: string) {
    const output = await runGit(["ls-remote", "--heads", sourceUrl, branch]);

    if (!output.trim()) {
      throw new BadRequestException(`Branch "${branch}" was not found.`);
    }
  }

  private async deleteMissingGitFiles(
    legacyLandingId: string,
    indexedPaths: Set<string>
  ) {
    const existing = await this.prisma.legacyFile.findMany({
      where: { legacyLandingId },
      select: { id: true, path: true }
    });
    const missingIds = existing
      .filter((file) => !indexedPaths.has(file.path))
      .map((file) => file.id);

    if (missingIds.length) {
      await this.prisma.legacyFile.deleteMany({ where: { id: { in: missingIds } } });
    }
  }

  private async searchFiles(
    legacyLandingId: string,
    query: LegacyFilesQueryDto,
    skip: number,
    take: number,
    page: number,
    limit: number
  ) {
    const folderPrefix = query.folder ? `${query.folder.replace(/\/$/, "")}/` : "";
    const search = query.search ?? "";
    const like = `%${search}%`;
    const items = await this.prisma.$queryRaw<Array<Prisma.LegacyFileGetPayload<object>>>`
      SELECT *
      FROM "LegacyFile"
      WHERE "legacyLandingId" = ${legacyLandingId}
        AND (${folderPrefix} = '' OR "path" LIKE ${`${folderPrefix}%`})
        AND (
          to_tsvector('simple', "path" || ' ' || coalesce("textContent", '')) @@ websearch_to_tsquery('simple', ${search})
          OR "path" ILIKE ${like}
        )
      ORDER BY ts_rank(
        to_tsvector('simple', "path" || ' ' || coalesce("textContent", '')),
        websearch_to_tsquery('simple', ${search})
      ) DESC, "path" ASC
      OFFSET ${skip}
      LIMIT ${take}
    `;
    const totalRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint as count
      FROM "LegacyFile"
      WHERE "legacyLandingId" = ${legacyLandingId}
        AND (${folderPrefix} = '' OR "path" LIKE ${`${folderPrefix}%`})
        AND (
          to_tsvector('simple', "path" || ' ' || coalesce("textContent", '')) @@ websearch_to_tsquery('simple', ${search})
          OR "path" ILIKE ${like}
        )
    `;

    return listResponse(items, Number(totalRows[0]?.count ?? 0), page, limit);
  }

  private expandUpload(file: UploadFile): NormalizedUpload[] {
    if (isZip(file)) {
      const zip = new AdmZip(file.buffer);
      return zip
        .getEntries()
        .filter((entry) => !entry.isDirectory)
        .map((entry) => ({
          buffer: entry.getData(),
          mimeType: getMimeType(entry.entryName),
          path: normalizeLegacyPath(entry.entryName)
        }));
    }

    return [
      {
        buffer: file.buffer,
        mimeType: file.mimetype ?? getMimeType(file.originalname),
        path: normalizeLegacyPath(file.originalname)
      }
    ];
  }

  private async storeLegacyFile(
    legacyLandingId: string,
    upload: NormalizedUpload,
    user: AuthUser
  ) {
    const extension = getExtension(upload.path);
    const isBinary = !isTextExtension(extension);
    const textContent =
      !isBinary && upload.buffer.byteLength <= TEXT_SIZE_LIMIT
        ? upload.buffer.toString("utf8")
        : undefined;
    const s3Key = `legacy/${legacyLandingId}/${upload.path}`;

    await this.storage.putObject({
      body: upload.buffer,
      contentType: upload.mimeType,
      key: s3Key
    });

    await this.prisma.legacyFile.upsert({
      where: {
        legacyLandingId_path: {
          legacyLandingId,
          path: upload.path
        }
      },
      update: {
        extension,
        hash: hashBuffer(upload.buffer),
        isBinary,
        mimeType: upload.mimeType,
        s3Key,
        size: upload.buffer.byteLength,
        textContent,
        updatedById: user.id
      },
      create: {
        extension,
        hash: hashBuffer(upload.buffer),
        isBinary,
        legacyLandingId,
        mimeType: upload.mimeType,
        path: upload.path,
        s3Key,
        size: upload.buffer.byteLength,
        textContent,
        updatedById: user.id
      }
    });
  }

  private async refreshLegacyStats(legacyLandingId: string) {
    const files = await this.prisma.legacyFile.findMany({
      where: { legacyLandingId },
      orderBy: { path: "asc" },
      select: { id: true, path: true, size: true }
    });
    const sizeBytes = files.reduce((total, file) => total + BigInt(file.size), 0n);
    const fileTree = this.buildTree(files);

    return serializeBigInts(
      await this.prisma.legacyLanding.update({
        where: { id: legacyLandingId },
        data: {
          fileCount: files.length,
          fileTree: toInputJson(fileTree) ?? Prisma.JsonNull,
          sizeBytes
        },
        include: { files: true, importedAs: true }
      })
    );
  }

  private buildTree(files: Array<{ id: string; path: string }>) {
    const root: LegacyTreeNode[] = [];
    const folders = new Map<string, LegacyTreeNode>();

    for (const file of files) {
      const parts = file.path.split("/");
      let current = root;
      let folderPath = "";

      for (const [index, part] of parts.entries()) {
        const isFile = index === parts.length - 1;
        const nextPath = folderPath ? `${folderPath}/${part}` : part;

        if (isFile) {
          current.push({ id: file.id, name: part, path: nextPath, type: "file" });
          continue;
        }

        let folder = folders.get(nextPath);

        if (!folder) {
          folder = {
            children: [],
            id: `folder:${nextPath}`,
            name: part,
            path: nextPath,
            type: "folder"
          };
          folders.set(nextPath, folder);
          current.push(folder);
        }

        current = folder.children ?? [];
        folderPath = nextPath;
      }
    }

    return sortTree(root);
  }

  private async rewriteHtmlAssetUrls(
    html: string,
    file: { legacyLandingId: string; path: string }
  ) {
    const pattern = /\b(src|href)=("|')([^"']+)\2/gi;
    let output = "";
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(html))) {
      const [raw, attr, quote, value] = match;
      output += html.slice(lastIndex, match.index);
      lastIndex = match.index + raw.length;

      if (isExternalReference(value)) {
        output += raw;
        continue;
      }

      const assetPath = resolveRelativePath(file.path, value);
      const asset = await this.prisma.legacyFile.findUnique({
        where: {
          legacyLandingId_path: {
            legacyLandingId: file.legacyLandingId,
            path: assetPath
          }
        }
      });

      if (!asset) {
        output += raw;
        continue;
      }

      const buffer = await this.storage.getObjectBuffer(asset.s3Key);
      const mimeType = asset.mimeType ?? getMimeType(asset.path);
      output += `${attr}=${quote}data:${mimeType};base64,${buffer.toString("base64")}${quote}`;
    }

    return output + html.slice(lastIndex);
  }

  private async collectLinkedTextAssets(
    legacyLandingId: string,
    htmlPath: string,
    html: string
  ) {
    const refs = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)]
      .map((match) => match[1])
      .filter((value) => value && !isExternalReference(value));
    const css: string[] = [];
    const js: string[] = [];

    for (const ref of refs) {
      const assetPath = resolveRelativePath(htmlPath, ref);
      const extension = getExtension(assetPath);

      if (extension !== "css" && extension !== "js") {
        continue;
      }

      const asset = await this.prisma.legacyFile.findUnique({
        where: { legacyLandingId_path: { legacyLandingId, path: assetPath } }
      });

      if (!asset) {
        continue;
      }

      const content =
        asset.textContent ??
        (await this.storage.getObjectBuffer(asset.s3Key)).toString("utf8");

      if (extension === "css") {
        css.push(`/* ${asset.path} */\n${content}`);
      } else {
        js.push(`// ${asset.path}\n${content}`);
      }
    }

    return { css: css.join("\n\n"), js: js.join("\n\n") };
  }
}

function sortTree(nodes: LegacyTreeNode[]): LegacyTreeNode[] {
  return nodes
    .sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    })
    .map((node) => ({
      ...node,
      children: node.children ? sortTree(node.children) : undefined
    }));
}

function normalizeLegacyPath(value: string) {
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = normalized.split("/").filter(Boolean);

  if (!parts.length || parts.some((part) => part === "." || part === "..")) {
    throw new BadRequestException("Uploaded file path is not allowed.");
  }

  return parts.join("/");
}

function resolveRelativePath(basePath: string, relativePath: string) {
  const cleanRef = relativePath.split("#")[0].split("?")[0];
  const baseDir = path.posix.dirname(basePath);
  return normalizeLegacyPath(path.posix.normalize(path.posix.join(baseDir, cleanRef)));
}

function getExtension(filePath: string) {
  return path.posix.extname(filePath).replace(".", "").toLowerCase();
}

function isTextExtension(extension?: string | null) {
  return Boolean(extension && TEXT_EXTENSIONS.has(extension));
}

function getMimeType(filePath: string) {
  const extension = getExtension(filePath);
  const map: Record<string, string> = {
    css: "text/css; charset=utf-8",
    gif: "image/gif",
    htm: "text/html; charset=utf-8",
    html: "text/html; charset=utf-8",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    js: "text/javascript; charset=utf-8",
    json: "application/json; charset=utf-8",
    mjs: "text/javascript; charset=utf-8",
    png: "image/png",
    svg: "image/svg+xml",
    txt: "text/plain; charset=utf-8",
    webp: "image/webp",
    xml: "application/xml; charset=utf-8",
    zip: "application/zip"
  };

  return map[extension] ?? "application/octet-stream";
}

function hashBuffer(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function isZip(file: UploadFile) {
  return (
    file.originalname.toLowerCase().endsWith(".zip") ||
    file.mimetype === "application/zip"
  );
}

function hasZip(files: UploadFile[]) {
  return files.some(isZip);
}

function inferUploadName(fileName: string) {
  return path.basename(fileName, path.extname(fileName)).replace(/[-_]+/g, " ");
}

function inferGitRepositoryName(sourceUrl: string) {
  const parsed = new URL(sourceUrl);
  const segments = parsed.pathname.split("/").filter(Boolean);
  const repo = segments.at(-1)?.replace(/\.git$/i, "");

  return repo ? repo.replace(/[-_]+/g, " ") : "landing legacy repository";
}

function normalizeGitHubUrl(value: string) {
  const parsed = new URL(value.trim());

  if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== "github.com") {
    throw new BadRequestException(
      "Only public https://github.com repositories are supported."
    );
  }

  const parts = parsed.pathname.replace(/\/+$/, "").split("/").filter(Boolean);

  if (parts.length !== 2) {
    throw new BadRequestException("GitHub repository URL must include owner and repo.");
  }

  return `https://github.com/${parts[0]}/${parts[1].replace(/\.git$/i, "")}`;
}

async function runGit(args: string[]) {
  try {
    const gitArgs = ["-c", "core.longpaths=true", ...getGitAuthArgs(), ...args];
    const { stderr, stdout } = await execFileAsync("git", gitArgs, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000
    });

    const stderrText = String(stderr ?? "");
    const stdoutText = String(stdout ?? "");

    if (stderrText && /fatal:/i.test(stderrText)) {
      throw new Error(stderrText.trim());
    }

    return stdoutText;
  } catch (error) {
    throw new BadRequestException(getErrorMessage(error));
  }
}

function getGitAuthArgs() {
  const token = env.GITHUB_ACCESS_TOKEN?.trim();

  if (!token) {
    return [];
  }

  const basic = Buffer.from(`x-access-token:${token}`).toString("base64");

  return ["-c", `http.https://github.com/.extraheader=AUTHORIZATION: basic ${basic}`];
}

async function collectGitFiles(root: string) {
  const files: Array<{ absolutePath: string; relativePath: string }> = [];

  async function walk(directory: string) {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && IGNORED_GIT_DIRECTORIES.has(entry.name)) {
        continue;
      }

      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const metadata = await stat(absolutePath);

      if (metadata.size > GIT_FILE_SIZE_LIMIT) {
        continue;
      }

      files.push({
        absolutePath,
        relativePath: path.relative(root, absolutePath).replace(/\\/g, "/")
      });
    }
  }

  await walk(root);

  return files;
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
) {
  let index = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (index < items.length) {
        const item = items[index];
        index += 1;

        if (item) {
          await worker(item);
        }
      }
    }
  );

  await Promise.all(workers);
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `legacy-${Date.now().toString(36)}`
  );
}

function isExternalReference(value: string) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value);
}

function getErrorMessage(error: unknown) {
  if (error instanceof BadRequestException) {
    const response = error.getResponse();

    if (typeof response === "string") {
      return response;
    }

    if (
      response &&
      typeof response === "object" &&
      "message" in response &&
      typeof response.message === "string"
    ) {
      return response.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}
