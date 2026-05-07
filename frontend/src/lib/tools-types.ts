export type Category = { id: number; name: string };
export type Tag = { id: number; name: string };
export type RoleRow = { id: number; slug: string; name: string };

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type Tool = {
  id: number;
  name: string;
  link: string;
  description: string;
  image_url?: string | null;
  approval_status?: ApprovalStatus;
  categories?: { id: number; name: string }[];
  tags?: { id: number; name: string }[];
  roles?: { id: number; slug: string; name: string }[];
};

/** Full fields from API (show / edit). */
export type ToolDetail = Tool & {
  documentation_url: string | null;
  how_to_use: string | null;
  real_examples: string | null;
  image_url: string | null;
  created_by?: number;
};

export type Metadata = {
  categories: Category[];
  tags: Tag[];
  roles: RoleRow[];
};
