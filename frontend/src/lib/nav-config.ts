/**
 * Navigation items visible per role. QA and PM focus on review / overview — Add tool is omitted from nav (API may still allow creates).
 */

export type NavItem = {
  href: string;
  label: string;
};

const dashboard: NavItem = { href: "/dashboard", label: "Dashboard" };
const tools: NavItem = { href: "/tools", label: "Tools" };
const addTool: NavItem = { href: "/tools/new", label: "Add tool" };
const profile: NavItem = { href: "/profile", label: "Profile" };

export function navItemsForRole(role: string): NavItem[] {
  switch (role) {
    case "qa":
    case "pm":
      return [dashboard, tools, profile];
    default:
      return [dashboard, tools, addTool, profile];
  }
}

export function canAccessAddToolNav(role: string): boolean {
  return role !== "qa" && role !== "pm";
}
