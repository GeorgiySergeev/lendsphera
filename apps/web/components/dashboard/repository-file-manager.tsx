"use client";

import type { EditorProps } from "@monaco-editor/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NodeRendererProps } from "react-arborist";
import { Tree } from "react-arborist";
import {
  ChevronRight,
  Code2,
  DownloadCloud,
  File,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  Github,
  Import,
  Loader2,
  RefreshCw,
  Save,
  Search,
  UploadCloud
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import * as React from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn
} from "@workspace/ui";

import {
  fetchCategoryOptions,
  fetchCreateTemplates,
  fetchGeoOptions,
  fetchVariantOptions
} from "../../lib/api/landings";
import {
  connectGitRepository,
  fetchLegacyFileContent,
  fetchLegacyFiles,
  fetchLegacyLandings,
  fetchLegacyPreviewHtml,
  fetchLegacyTree,
  importLegacyFileAsLanding,
  saveLegacyFileContent,
  syncGitRepository,
  uploadRepositoryFiles,
  type LegacyFile,
  type LegacyLanding,
  type LegacyTreeNode,
  type TemplateOption
} from "../../lib/api/repository";

const MonacoEditor = dynamic<EditorProps>(() => import("@monaco-editor/react"), {
  loading: () => <Skeleton className="h-[520px] w-full" />,
  ssr: false
});

const queryKeys = {
  categories: ["repository", "categories"] as const,
  content: (fileId?: string) => ["repository", "content", fileId] as const,
  files: (legacyId?: string, folder?: string, search?: string) =>
    ["repository", "files", legacyId, folder, search] as const,
  geos: ["repository", "geos"] as const,
  legacy: ["repository", "legacy"] as const,
  preview: (fileId?: string) => ["repository", "preview", fileId] as const,
  templates: (geoId?: string) => ["repository", "templates", geoId] as const,
  tree: (legacyId?: string) => ["repository", "tree", legacyId] as const,
  variants: ["repository", "variants"] as const
};

const editorOptions = {
  automaticLayout: true,
  fontSize: 12,
  lineNumbersMinChars: 3,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: "on"
} as const;

function RepositoryFileManager() {
  const queryClient = useQueryClient();
  const [legacySearch, setLegacySearch] = React.useState("");
  const [selectedLegacyId, setSelectedLegacyId] = React.useState<string>("");
  const [selectedFolder, setSelectedFolder] = React.useState("");
  const [fileSearch, setFileSearch] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<LegacyFile | null>(null);
  const [editorValue, setEditorValue] = React.useState("");
  const [dirty, setDirty] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [gitOpen, setGitOpen] = React.useState(false);

  const legacyQuery = useQuery({
    queryKey: [...queryKeys.legacy, legacySearch],
    queryFn: () => fetchLegacyLandings(legacySearch)
  });
  const activeLegacy = legacyQuery.data?.items.find(
    (item) => item.id === selectedLegacyId
  );
  const treeQuery = useQuery({
    enabled: Boolean(selectedLegacyId),
    queryKey: queryKeys.tree(selectedLegacyId),
    queryFn: () => fetchLegacyTree(selectedLegacyId)
  });
  const filesQuery = useQuery({
    enabled: Boolean(selectedLegacyId),
    queryKey: queryKeys.files(selectedLegacyId, selectedFolder, fileSearch),
    queryFn: () =>
      fetchLegacyFiles(selectedLegacyId, {
        folder: selectedFolder,
        limit: 100,
        page: 1,
        search: fileSearch
      })
  });
  const contentQuery = useQuery({
    enabled: Boolean(selectedFile && isEditableFile(selectedFile)),
    queryKey: queryKeys.content(selectedFile?.id),
    queryFn: () => fetchLegacyFileContent(selectedFile?.id ?? "")
  });
  const previewQuery = useQuery({
    enabled: Boolean(selectedFile && isHtmlFile(selectedFile)),
    queryKey: queryKeys.preview(selectedFile?.id),
    queryFn: () => fetchLegacyPreviewHtml(selectedFile?.id ?? "")
  });

  React.useEffect(() => {
    const first = legacyQuery.data?.items[0];

    if (!selectedLegacyId && first) {
      setSelectedLegacyId(first.id);
    }
  }, [legacyQuery.data?.items, selectedLegacyId]);

  React.useEffect(() => {
    setEditorValue(contentQuery.data?.content ?? "");
    setDirty(false);
  }, [contentQuery.data?.content, selectedFile?.id]);

  const invalidateRepository = async (legacyId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.legacy }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.tree(legacyId ?? selectedLegacyId)
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.files(
          legacyId ?? selectedLegacyId,
          selectedFolder,
          fileSearch
        )
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.preview(selectedFile?.id) })
    ]);
  };

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => {
      const isZipUpload = files.some((file) => file.name.toLowerCase().endsWith(".zip"));

      return uploadRepositoryFiles({
        files,
        legacyLandingId: isZipUpload ? undefined : selectedLegacyId || undefined,
        name: inferUploadName(files[0]?.name ?? "legacy upload")
      });
    },
    onError: (error) => {
      setUploadError(getErrorMessage(error));
    },
    onSuccess: async (legacy) => {
      setUploadError(null);
      setSelectedLegacyId(legacy.id);
      setSelectedFolder("");
      setSelectedFile(null);
      await invalidateRepository(legacy.id);
    }
  });
  const saveMutation = useMutation({
    mutationFn: () => saveLegacyFileContent(selectedFile?.id ?? "", editorValue),
    onSuccess: async (file) => {
      setDirty(false);
      setSelectedFile(file);
      await invalidateRepository(file.legacyLandingId);
    }
  });
  const syncMutation = useMutation({
    mutationFn: () => syncGitRepository(activeLegacy?.id ?? ""),
    onSuccess: async (legacy) => {
      setSelectedLegacyId(legacy.id);
      await invalidateRepository(legacy.id);
    }
  });

  const handleFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);

    if (files.length) {
      uploadMutation.mutate(files);
    }
  };

  const selectFile = (file: LegacyFile) => {
    setSelectedFile(file);
    setDirty(false);
  };

  const selectedLanguage = getEditorLanguage(selectedFile);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">
            Repository
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse legacy sources, preview raw HTML, edit code files, and import finished
            pages as landings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{legacyQuery.data?.meta.total ?? 0} roots</Badge>
          <Button variant="outline" onClick={() => setGitOpen(true)}>
            <Github className="h-4 w-4" aria-hidden="true" />
            Connect Git Repo
          </Button>
          <Button
            variant="outline"
            disabled={
              legacyQuery.isFetching || treeQuery.isFetching || filesQuery.isFetching
            }
            onClick={() => void invalidateRepository()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "rounded-md border border-dashed bg-card p-4 transition-colors",
          isDragging && "border-primary bg-primary/5"
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
              <UploadCloud className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Drop files or ZIP archives here</p>
              <p className="truncate text-xs text-muted-foreground">
                ZIP uploads create a new legacy root; loose files append to the selected
                root.
              </p>
            </div>
          </div>
          <label>
            <input
              className="sr-only"
              multiple
              type="file"
              onChange={(event) => {
                if (event.target.files) {
                  handleFiles(event.target.files);
                  event.target.value = "";
                }
              }}
            />
            <span
              className={cn(
                "inline-flex",
                uploadMutation.isPending && "pointer-events-none opacity-60"
              )}
            >
              <Button asChild variant="outline">
                <span>
                  {uploadMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <DownloadCloud className="h-4 w-4" aria-hidden="true" />
                  )}
                  Upload
                </span>
              </Button>
            </span>
          </label>
        </div>
        {uploadError ? (
          <p className="mt-3 text-sm text-destructive">{uploadError}</p>
        ) : null}
      </div>

      {activeLegacy?.source === "GIT_REPO" ? (
        <div className="flex flex-col gap-3 rounded-md border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Git</Badge>
              <span className="truncate text-sm font-medium">
                {activeLegacy.sourceUrl}
              </span>
              {activeLegacy.branch ? (
                <Badge variant="outline">{activeLegacy.branch}</Badge>
              ) : null}
              {activeLegacy.commitSha ? (
                <Badge variant="outline">{activeLegacy.commitSha.slice(0, 7)}</Badge>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeLegacy.syncStatus ?? "Not synced"}
              {activeLegacy.lastSyncedAt
                ? ` - ${formatDateTime(activeLegacy.lastSyncedAt)}`
                : ""}
            </p>
            {activeLegacy.syncError ? (
              <p className="mt-1 text-sm text-destructive">{activeLegacy.syncError}</p>
            ) : null}
          </div>
          <Button
            variant="outline"
            disabled={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            )}
            Sync
          </Button>
        </div>
      ) : null}

      <div className="grid min-h-[720px] gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <RepositorySidebar
          activeLegacy={activeLegacy}
          legacyItems={legacyQuery.data?.items ?? []}
          legacyLoading={legacyQuery.isLoading}
          legacySearch={legacySearch}
          selectedFolder={selectedFolder}
          selectedLegacyId={selectedLegacyId}
          selectedNodeId={
            selectedFile?.id ?? (selectedFolder ? `folder:${selectedFolder}` : undefined)
          }
          treeData={treeQuery.data ?? []}
          treeLoading={treeQuery.isLoading}
          onLegacySearchChange={setLegacySearch}
          onSelectFolder={(folder) => {
            setSelectedFolder(folder);
            setSelectedFile(null);
          }}
          onSelectLegacy={(legacyId) => {
            setSelectedLegacyId(legacyId);
            setSelectedFolder("");
            setSelectedFile(null);
          }}
          onSelectTreeFile={(node) => {
            const file = filesQuery.data?.items.find((item) => item.id === node.id);
            setSelectedFolder("");

            if (file) {
              selectFile(file);
            } else {
              void queryClient
                .fetchQuery({
                  queryKey: queryKeys.files(selectedLegacyId, "", node.path),
                  queryFn: () =>
                    fetchLegacyFiles(selectedLegacyId, {
                      limit: 1,
                      page: 1,
                      search: node.path
                    })
                })
                .then((result) => {
                  const match = result.items.find((item) => item.id === node.id);
                  if (match) {
                    selectFile(match);
                  }
                });
            }
          }}
        />

        <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card className="min-w-0">
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold">Files</h2>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {selectedFolder
                      ? selectedFolder
                      : (activeLegacy?.path ?? "No root selected")}
                  </p>
                </div>
                <div className="relative min-w-0 lg:w-72">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    aria-label="Search repository files"
                    className="pl-9"
                    placeholder="Search name or content"
                    value={fileSearch}
                    onChange={(event) => setFileSearch(event.target.value)}
                  />
                </div>
              </div>

              <FilesTable
                files={filesQuery.data?.items ?? []}
                loading={filesQuery.isLoading}
                selectedFileId={selectedFile?.id}
                onSelectFile={selectFile}
              />
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold">
                    {selectedFile?.path ?? "Preview"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedFile
                      ? formatBytes(selectedFile.size)
                      : "Select an HTML, CSS, or JS file to start."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    disabled={!selectedFile || !isHtmlFile(selectedFile)}
                    variant="outline"
                    onClick={() => setImportOpen(true)}
                  >
                    <Import className="h-4 w-4" aria-hidden="true" />
                    Import as Landing
                  </Button>
                  <Button
                    disabled={!dirty || saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Save className="h-4 w-4" aria-hidden="true" />
                    )}
                    Save
                  </Button>
                </div>
              </div>

              {selectedFile ? (
                <div className="grid gap-4">
                  {isHtmlFile(selectedFile) ? (
                    <div className="overflow-hidden rounded-md border">
                      {previewQuery.isLoading ? (
                        <Skeleton className="h-[300px] w-full" />
                      ) : (
                        <iframe
                          className="h-[300px] w-full bg-white"
                          sandbox="allow-forms allow-scripts allow-same-origin"
                          srcDoc={previewQuery.data ?? ""}
                          title={`Preview ${selectedFile.path}`}
                        />
                      )}
                    </div>
                  ) : null}

                  {isEditableFile(selectedFile) ? (
                    <div className="overflow-hidden rounded-md border">
                      <MonacoEditor
                        height="520px"
                        language={selectedLanguage}
                        options={editorOptions}
                        path={selectedFile.path}
                        theme="vs-dark"
                        value={editorValue}
                        onChange={(value) => {
                          setEditorValue(value ?? "");
                          setDirty(true);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">
                      Binary files can be stored and previewed as linked assets, but
                      inline editing is limited to HTML, CSS, and JS.
                    </div>
                  )}
                  {saveMutation.isError ? (
                    <p className="text-sm text-destructive">
                      {getErrorMessage(saveMutation.error)}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-[520px] items-center justify-center rounded-md border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  Choose a file from the table or the tree.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ImportLandingDialog
        file={selectedFile}
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => {
          void invalidateRepository();
        }}
      />
      <ConnectGitDialog
        open={gitOpen}
        onOpenChange={setGitOpen}
        onConnected={(legacy) => {
          setSelectedLegacyId(legacy.id);
          setSelectedFolder("");
          setSelectedFile(null);
          void invalidateRepository(legacy.id);
        }}
      />
    </div>
  );
}

function RepositorySidebar({
  activeLegacy,
  legacyItems,
  legacyLoading,
  legacySearch,
  selectedFolder,
  selectedLegacyId,
  selectedNodeId,
  treeData,
  treeLoading,
  onLegacySearchChange,
  onSelectFolder,
  onSelectLegacy,
  onSelectTreeFile
}: {
  activeLegacy?: LegacyLanding;
  legacyItems: LegacyLanding[];
  legacyLoading: boolean;
  legacySearch: string;
  selectedFolder: string;
  selectedLegacyId: string;
  selectedNodeId?: string;
  treeData: LegacyTreeNode[];
  treeLoading: boolean;
  onLegacySearchChange: (value: string) => void;
  onSelectFolder: (folder: string) => void;
  onSelectLegacy: (legacyId: string) => void;
  onSelectTreeFile: (node: LegacyTreeNode) => void;
}) {
  return (
    <Card className="min-w-0">
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor="legacy-search"
          >
            Legacy roots
          </label>
          <Input
            id="legacy-search"
            placeholder="Search roots"
            value={legacySearch}
            onChange={(event) => onLegacySearchChange(event.target.value)}
          />
        </div>

        <div className="max-h-60 space-y-1 overflow-auto pr-1">
          {legacyLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))
          ) : legacyItems.length ? (
            legacyItems.map((legacy) => (
              <button
                key={legacy.id}
                className={cn(
                  "flex w-full min-w-0 items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent",
                  legacy.id === selectedLegacyId && "bg-accent"
                )}
                type="button"
                onClick={() => onSelectLegacy(legacy.id)}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{legacy.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {legacy.fileCount} files
                  </span>
                </span>
                <Badge variant="outline">{legacy.source}</Badge>
              </button>
            ))
          ) : (
            <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
              No legacy roots yet. Upload a ZIP archive to create one.
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">
                {activeLegacy?.name ?? "File tree"}
              </h2>
              <p className="truncate text-xs text-muted-foreground">
                {selectedFolder || "All folders"}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={!selectedFolder}
              onClick={() => onSelectFolder("")}
            >
              All
            </Button>
          </div>
          {treeLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-full" />
              ))}
            </div>
          ) : treeData.length ? (
            <div className="h-[420px] overflow-hidden rounded-md border">
              <Tree<LegacyTreeNode>
                data={treeData}
                disableDrag
                disableEdit
                disableMultiSelection
                height={420}
                idAccessor="id"
                indent={18}
                openByDefault
                rowHeight={34}
                selection={selectedNodeId}
                width="100%"
                onActivate={(node) => {
                  if (node.data.type === "folder") {
                    onSelectFolder(node.data.path);
                  } else {
                    onSelectTreeFile(node.data);
                  }
                }}
              >
                {TreeNode}
              </Tree>
            </div>
          ) : (
            <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
              This root has no indexed files.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TreeNode({ node, style }: NodeRendererProps<LegacyTreeNode>) {
  const isFolder = node.data.type === "folder";

  return (
    <div
      className={cn(
        "flex min-w-0 cursor-pointer items-center gap-2 px-2 text-sm hover:bg-accent",
        node.isSelected && "bg-accent"
      )}
      style={style}
      onClick={() => node.activate()}
    >
      {isFolder ? (
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform",
            node.isOpen && "rotate-90"
          )}
          aria-hidden="true"
        />
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      {isFolder ? (
        node.isOpen ? (
          <FolderOpen
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )
      ) : (
        <FileIcon extension={node.data.name.split(".").pop()} />
      )}
      <span className="truncate">{node.data.name}</span>
    </div>
  );
}

function FilesTable({
  files,
  loading,
  selectedFileId,
  onSelectFile
}: {
  files: LegacyFile[];
  loading: boolean;
  selectedFileId?: string;
  onSelectFile: (file: LegacyFile) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden lg:table-cell">Type</TableHead>
            <TableHead className="hidden sm:table-cell">Size</TableHead>
            <TableHead className="hidden xl:table-cell">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.length ? (
            files.map((file) => (
              <TableRow
                key={file.id}
                className="cursor-pointer"
                data-state={file.id === selectedFileId ? "selected" : undefined}
                onClick={() => onSelectFile(file)}
              >
                <TableCell>
                  <div className="flex min-w-0 items-center gap-2">
                    <FileIcon extension={file.extension} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{fileName(file.path)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {file.path}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge variant={file.isBinary ? "outline" : "secondary"}>
                    {file.extension || "file"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground sm:table-cell">
                  {formatBytes(file.size)}
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground xl:table-cell">
                  {formatDate(file.updatedAt ?? file.createdAt)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                No files match the current folder or search.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ImportLandingDialog({
  file,
  open,
  onImported,
  onOpenChange
}: {
  file: LegacyFile | null;
  open: boolean;
  onImported: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = React.useState("");
  const [geoId, setGeoId] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [variantId, setVariantId] = React.useState("");
  const [templateId, setTemplateId] = React.useState("auto");
  const [createdLandingId, setCreatedLandingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (file && open) {
      setName(fileName(file.path).replace(/\.[^.]+$/, ""));
      setTemplateId("auto");
      setCreatedLandingId(null);
    }
  }, [file, open]);

  const geosQuery = useQuery({
    queryKey: queryKeys.geos,
    queryFn: fetchGeoOptions
  });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: fetchCategoryOptions
  });
  const variantsQuery = useQuery({
    queryKey: queryKeys.variants,
    queryFn: fetchVariantOptions
  });
  const templatesQuery = useQuery({
    enabled: Boolean(geoId),
    queryKey: queryKeys.templates(geoId),
    queryFn: () => fetchCreateTemplates(geoId)
  });

  React.useEffect(() => {
    if (!geoId && geosQuery.data?.[0]) {
      setGeoId(geosQuery.data[0].id);
    }

    if (!categoryId && categoriesQuery.data?.[0]) {
      setCategoryId(categoriesQuery.data[0].id);
    }

    if (!variantId && variantsQuery.data?.[0]) {
      setVariantId(variantsQuery.data[0].id);
    }
  }, [
    categoriesQuery.data,
    categoryId,
    geoId,
    geosQuery.data,
    variantId,
    variantsQuery.data
  ]);

  const importMutation = useMutation({
    mutationFn: () =>
      importLegacyFileAsLanding(file?.id ?? "", {
        categoryId,
        geoId,
        name,
        templateId: templateId === "auto" ? undefined : templateId,
        variantId
      }),
    onSuccess: (landing) => {
      setCreatedLandingId(landing.id);
      onImported();
    }
  });
  const canSubmit = Boolean(file && name.trim() && geoId && categoryId && variantId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import as Landing</DialogTitle>
          <DialogDescription>
            Create a draft landing from the selected HTML file and linked local CSS/JS.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="import-name">
              Name
            </label>
            <Input
              id="import-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={geoId} onValueChange={setGeoId}>
              <SelectTrigger aria-label="Import GEO">
                <SelectValue placeholder="GEO" />
              </SelectTrigger>
              <SelectContent>
                {(geosQuery.data ?? []).map((geo) => (
                  <SelectItem key={geo.id} value={geo.id}>
                    {geo.code} - {geo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger aria-label="Import category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {(categoriesQuery.data ?? []).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={variantId} onValueChange={setVariantId}>
              <SelectTrigger aria-label="Import variant">
                <SelectValue placeholder="Variant" />
              </SelectTrigger>
              <SelectContent>
                {(variantsQuery.data ?? []).map((variant) => (
                  <SelectItem key={variant.id} value={variant.id}>
                    {variant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger aria-label="Import template">
              <SelectValue placeholder="Template mapping" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto: Legacy Raw HTML</SelectItem>
              {filterTemplates(templatesQuery.data ?? [], categoryId).map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {importMutation.isError ? (
            <p className="text-sm text-destructive">
              {getErrorMessage(importMutation.error)}
            </p>
          ) : null}
          {createdLandingId ? (
            <Button asChild variant="outline">
              <Link href={`/dashboard/landings/${createdLandingId}/edit`}>
                <Code2 className="h-4 w-4" aria-hidden="true" />
                Open imported landing
              </Link>
            </Button>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit || importMutation.isPending}
            onClick={() => importMutation.mutate()}
          >
            {importMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Import className="h-4 w-4" aria-hidden="true" />
            )}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConnectGitDialog({
  onConnected,
  onOpenChange,
  open
}: {
  onConnected: (legacy: LegacyLanding) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [url, setUrl] = React.useState(
    "https://github.com/GeorgiySergeev/landing-legacy-2"
  );
  const [branch, setBranch] = React.useState("main");
  const connectMutation = useMutation({
    mutationFn: () => connectGitRepository({ branch, url }),
    onSuccess: (legacy) => {
      onConnected(legacy);
      onOpenChange(false);
    }
  });
  const canSubmit = Boolean(url.trim() && branch.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Connect Git Repo</DialogTitle>
          <DialogDescription>
            Import a public GitHub repository as a legacy source and index its files.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="git-url">
              Repository URL
            </label>
            <Input
              id="git-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="git-branch">
              Branch
            </label>
            <Input
              id="git-branch"
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
            />
          </div>
          {connectMutation.isError ? (
            <p className="text-sm text-destructive">
              {getErrorMessage(connectMutation.error)}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit || connectMutation.isPending}
            onClick={() => connectMutation.mutate()}
          >
            {connectMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Github className="h-4 w-4" aria-hidden="true" />
            )}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FileIcon({ extension }: { extension?: string | null }) {
  if (extension === "html" || extension === "htm") {
    return <FileCode2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />;
  }

  if (extension === "css" || extension === "js" || extension === "mjs") {
    return (
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    );
  }

  return <File className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
}

function isHtmlFile(file: LegacyFile | null) {
  return file?.extension === "html" || file?.extension === "htm";
}

function isEditableFile(file: LegacyFile | null) {
  return Boolean(
    file && ["html", "htm", "css", "js", "mjs", "cjs"].includes(file.extension ?? "")
  );
}

function getEditorLanguage(file: LegacyFile | null) {
  if (!file) {
    return "plaintext";
  }

  if (file.extension === "css") {
    return "css";
  }

  if (file.extension === "js" || file.extension === "mjs" || file.extension === "cjs") {
    return "javascript";
  }

  return isHtmlFile(file) ? "html" : "plaintext";
}

function fileName(filePath: string) {
  return filePath.split("/").pop() ?? filePath;
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function inferUploadName(fileNameValue: string) {
  return fileNameValue.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}

function getErrorMessage(error: unknown) {
  if (isAxiosLikeError(error)) {
    const message = error.response?.data?.message;

    if (error.response?.status === 401) {
      return "Dashboard session expired. Refresh the page after signing in, then try again.";
    }

    if (typeof message === "string") {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "The request failed. Check the API server and try again.";
}

function isAxiosLikeError(error: unknown): error is {
  response?: { data?: { message?: unknown }; status?: number };
} {
  return Boolean(error && typeof error === "object" && "response" in error);
}

function filterTemplates(templates: TemplateOption[], categoryId: string) {
  return templates.filter((template) => {
    const templateCategoryId = template.categoryId ?? template.category?.id;
    return !templateCategoryId || templateCategoryId === categoryId;
  });
}

export { RepositoryFileManager };
