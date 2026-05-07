/**
 * Main navbar links only. Add tool is linked from /tools; Profile from the account menu.
 */

export type NavItem = {
  href: string;
  label: string;
};

const dashboard: NavItem = { href: "/dashboard", label: "Dashboard" };
const tools: NavItem = { href: "/tools", label: "Tools" };
const adminTools: NavItem = { href: "/admin/tools", label: "Admin" };

export function navItemsForRole(role: string | null): NavItem[] {
  const items: NavItem[] = [dashboard, tools];
  if (role === "owner") {
    items.push(adminTools);
  }
  return items;
}

/** Shown on /tools only (not in navbar). */
export function canAccessAddToolNav(role: string): boolean {
  return role !== "qa" && role !== "pm";
}
