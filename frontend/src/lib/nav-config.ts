/**
 * Main navbar links only. Add tool is linked from /tools; Profile from the account menu.
 */

export type NavItem = {
  href: string;
  label: string;
};

const dashboard: NavItem = { href: "/dashboard", label: "Dashboard" };
const tools: NavItem = { href: "/tools", label: "Tools" };

export function navItemsForRole(): NavItem[] {
  return [dashboard, tools];
}

/** Shown on /tools only (not in navbar). */
export function canAccessAddToolNav(role: string): boolean {
  return role !== "qa" && role !== "pm";
}
