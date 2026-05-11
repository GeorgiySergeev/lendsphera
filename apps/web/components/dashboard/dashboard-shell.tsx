"use client";

import {
  Bell,
  ChevronsUpDown,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sun,
  User
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
import { dashboardNavItems } from "./navigation";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div 
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:flex transition-all duration-300 z-40",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <DashboardSidebar isCollapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed(!isCollapsed)} />
      </div>
      <div 
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300",
          isCollapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <DashboardTopBar onOpenMobileNav={() => setOpen(true)} />
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
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
    <Sidebar className={cn("transition-all duration-300", isCollapsed ? "w-16" : "w-64")}>
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
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        )}
      </SidebarHeader>
      <Separator className="bg-sidebar-border" />
      <SidebarContent>
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
                      <SidebarMenuButton asChild isActive={isActive} className={cn(isCollapsed && "justify-center px-0")}>
                        <Link href={item.href} onClick={onNavigate}>
                          <Icon className={cn("shrink-0", isCollapsed ? "h-5 w-5" : "h-4 w-4")} aria-hidden="true" />
                          {!isCollapsed && <span className="truncate">{item.title}</span>}
                          {!isCollapsed && item.badge ? (
                            <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                          ) : null}
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    {isCollapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
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
        <div className={cn("flex items-center rounded-md px-2 py-2", isCollapsed ? "justify-center" : "gap-3")}>
          <Avatar className={cn("shrink-0", isCollapsed ? "h-8 w-8" : "h-9 w-9")}>
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Admin Desk</p>
              <p className="truncate text-xs text-sidebar-foreground/55">Owner workspace</p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function DashboardTopBar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
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
        <div className="relative w-40 shrink-0 sm:min-w-0 sm:flex-1 sm:max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Search dashboard"
            placeholder="Search workspace"
            className="h-10 pl-9"
          />
        </div>
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
    </header>
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

export { DashboardShell };
