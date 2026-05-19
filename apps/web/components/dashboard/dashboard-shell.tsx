"use client";

import {
  Bell,
  Braces,
  Check,
  ChevronsUpDown,
  Images,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Settings,
  Sun,
  User,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useTheme } from "next-themes";

import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn
} from "@workspace/ui";

import { useAuthStore } from "../../stores/auth-store";
import {
  useDashboardTopbarStore,
  type DashboardLandingTopbarContext
} from "../../stores/dashboard-topbar-store";
import { dashboardNavItems } from "./navigation";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <div
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:flex lg:overflow-hidden transition-all duration-300 z-40",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <DashboardSidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      </div>
      <div
        className={cn(
          "flex h-dvh min-h-0 flex-col transition-all duration-300",
          isCollapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <DashboardTopBar onOpenMobileNav={() => setOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-6 sm:px-6 lg:px-8">
          <div className="w-full max-w-none">{children}</div>
        </main>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Dashboard navigation</SheetTitle>
            <SheetDescription>
              Primary navigation for dashboard sections.
            </SheetDescription>
          </SheetHeader>
          <DashboardSidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DashboardSidebar({
  onNavigate,
  isCollapsed = false,
  onToggleCollapse
}: {
  onNavigate?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();

  return (
    <Sidebar
      className={cn(
        "h-full min-h-0 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarHeader className="flex flex-row items-center justify-between min-h-16 px-2">
        {!isCollapsed && (
          <Link
            href="/"
            onClick={onNavigate}
            className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring px-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Landing Builder</p>
              <p className="truncate text-xs text-sidebar-foreground/55">
                Production workspace
              </p>
            </div>
          </Link>
        )}
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className={cn("h-8 w-8 shrink-0", isCollapsed ? "mx-auto" : "ml-auto")}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        )}
      </SidebarHeader>
      <Separator className="bg-sidebar-border" />
      <SidebarContent className="min-h-0 overflow-y-auto overscroll-y-contain">
        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarMenu>
            {dashboardNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

              return (
                <SidebarMenuItem key={item.href}>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={cn(isCollapsed && "justify-center px-0")}
                      >
                        <Link href={item.href} onClick={onNavigate}>
                          <Icon
                            className={cn(
                              "shrink-0",
                              isCollapsed ? "h-5 w-5" : "h-4 w-4"
                            )}
                            aria-hidden="true"
                          />
                          {!isCollapsed && <span className="truncate">{item.title}</span>}
                          {!isCollapsed && item.badge ? (
                            <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                          ) : null}
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    {isCollapsed && (
                      <TooltipContent side="right">{item.title}</TooltipContent>
                    )}
                  </Tooltip>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
        {!isCollapsed && (
          <div className="rounded-md border border-sidebar-border bg-sidebar-accent/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-sidebar-foreground">API stage</p>
              <Badge variant="secondary">Mocked</Badge>
            </div>
            <p className="mt-2 text-xs leading-5 text-sidebar-foreground/65">
              Query keys and token transport are ready for the next backend pass.
            </p>
          </div>
        )}
      </SidebarContent>
      <SidebarFooter>
        <div
          className={cn(
            "flex items-center rounded-md px-2 py-2",
            isCollapsed ? "justify-center" : "gap-3"
          )}
        >
          <Avatar className={cn("shrink-0", isCollapsed ? "h-8 w-8" : "h-9 w-9")}>
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Admin Desk</p>
              <p className="truncate text-xs text-sidebar-foreground/55">
                Owner workspace
              </p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function DashboardTopBar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  return (
    <header className="z-30 shrink-0 border-b bg-background/95 backdrop-blur">
      <div className="flex min-h-16 items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6 lg:px-8">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
        <DashboardLandingContextPanel />
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="relative"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-secondary ring-2 ring-background" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>
          <ThemeToggle />
          <div className="hidden sm:block">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}

function DashboardLandingContextPanel() {
  const landingContext = useDashboardTopbarStore((state) => state.landingContext);
  const [isEditing, setIsEditing] = React.useState(false);
  const [draftName, setDraftName] = React.useState("");

  React.useEffect(() => {
    if (!landingContext) {
      setIsEditing(false);
      setDraftName("");
      return;
    }

    if (!isEditing) {
      setDraftName(landingContext.name);
    }
  }, [isEditing, landingContext]);

  if (!landingContext) {
    return null;
  }

  const saveName = async () => {
    const nextName = draftName.trim();
    if (!nextName || nextName === landingContext.name) {
      setIsEditing(false);
      setDraftName(landingContext.name);
      return;
    }

    await landingContext.onRename?.(nextName);
    setIsEditing(false);
  };

  return (
    <div className="hidden min-w-0 flex-1 items-center lg:flex">
      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 px-3 py-2">
        {isEditing ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void saveName();
            }}
          >
            <Input
              aria-label="Landing name"
              autoFocus
              className="h-9 min-w-0 flex-1 text-sm font-semibold"
              disabled={landingContext.isRenaming}
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setDraftName(landingContext.name);
                  setIsEditing(false);
                }
              }}
            />
            <Button
              aria-label="Save landing name"
              className="h-9 w-9"
              disabled={!draftName.trim() || landingContext.isRenaming}
              size="icon"
              type="submit"
              variant="secondary"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Cancel landing name edit"
              className="h-9 w-9"
              disabled={landingContext.isRenaming}
              onClick={() => {
                setDraftName(landingContext.name);
                setIsEditing(false);
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-base font-semibold text-foreground">
                  {landingContext.name}
                </p>
                <Badge
                  variant="outline"
                  className="h-6 shrink-0 rounded-full px-2.5 text-[11px]"
                >
                  {formatTopbarLandingStatus(landingContext.status)}
                </Badge>
                {landingContext.metaError ? (
                  <span className="shrink-0 text-xs font-medium text-destructive">
                    {landingContext.metaError}
                  </span>
                ) : null}
              </div>
              <LandingContextMetaRow context={landingContext} />
            </div>
            <div className="flex shrink-0 items-center gap-2 pl-2">
              <ProjectAssetsButton context={landingContext} />
              <LandingVariablesPopover context={landingContext} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label="Edit landing name"
                    className="h-9 w-9 shrink-0"
                    onClick={() => {
                      setDraftName(landingContext.name);
                      setIsEditing(true);
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit landing name</TooltipContent>
              </Tooltip>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ThemeToggle() {
  const [mounted, setMounted] = React.useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? (
            <Sun className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Moon className="h-5 w-5" aria-hidden="true" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{isDark ? "Light mode" : "Dark mode"}</TooltipContent>
    </Tooltip>
  );
}

function UserMenu() {
  const user = useAuthStore((state) => state.user);
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AD";

  const handleLogout = React.useCallback(async () => {
    const { logout } = await import("../../lib/api/auth");
    await logout();
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-10 gap-1 px-1 sm:px-2"
          aria-label="Open user menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <ChevronsUpDown
            className="hidden h-4 w-4 text-muted-foreground sm:block"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block truncate">{user?.name ?? "Admin Desk"}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {user?.email ?? "admin@example.test"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="h-4 w-4" aria-hidden="true" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="h-4 w-4" aria-hidden="true" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LandingVariablesPopover({
  context
}: {
  context: DashboardLandingTopbarContext;
}) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    context.onVariablesOpenChange?.(open);
  }, [context, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-full border-border/70 bg-background/80 px-3 text-sm"
        >
          <Braces className="mr-2 h-4 w-4" aria-hidden="true" />
          Variables
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {context.variablesCount ?? 0}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(26rem,calc(100vw-2rem))] rounded-2xl border-border/80 p-0 shadow-2xl"
        sideOffset={12}
      >
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Variables</p>
          <p className="text-xs text-muted-foreground">
            {context.variablesDescription ?? "Legacy PHP and runtime placeholders"}
          </p>
        </div>
        <div className="px-4 py-3 text-sm text-muted-foreground">
          Use the Variables control in the editor workspace to review and override
          imported runtime placeholders.
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ProjectAssetsButton({ context }: { context: DashboardLandingTopbarContext }) {
  if (!context.onProjectAssetsOpen) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-9 rounded-full border-border/70 bg-background/80 px-3 text-sm"
      onClick={context.onProjectAssetsOpen}
    >
      <Images className="mr-2 h-4 w-4" aria-hidden="true" />
      Project assets
      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
        {context.projectAssetsCount ?? 0}
      </span>
    </Button>
  );
}

function LandingContextMetaRow({ context }: { context: DashboardLandingTopbarContext }) {
  const geoLabel = [
    context.geoFlagEmoji,
    context.geoName,
    context.geoCode ? `(${context.geoCode})` : null
  ]
    .filter(Boolean)
    .join(" ");

  const items: Array<{ label: string; value: string | null | undefined }> = [
    { label: "Public ID", value: context.publicId },
    { label: "Slug", value: context.slug },
    { label: "Geo", value: geoLabel || null },
    { label: "Category", value: context.categoryName },
    { label: "Variant", value: context.variantName },
    { label: "Template", value: context.templateName },
    {
      label: "Updated",
      value: context.updatedAt ? formatTopbarDate(context.updatedAt) : null
    }
  ];

  return (
    <dl className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {items.map((item) =>
        item.value ? (
          <div
            key={item.label}
            className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-2.5 py-1"
          >
            <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/50">
              {item.label}
            </dt>
            <dd className="truncate text-foreground/80">{item.value}</dd>
          </div>
        ) : null
      )}
    </dl>
  );
}

function formatTopbarLandingStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTopbarDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(new Date(value));
}

export { DashboardShell };
