import type { RoleRow } from "@/lib/tools-types";

type Props = {
  label: string;
  roles: RoleRow[];
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
};

export function RoleMultiSelect({
  label,
  roles,
  value,
  onChange,
  disabled,
}: Props) {
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-gray-800">{label}</span>
      <select
        multiple
        disabled={disabled}
        className="min-h-[9rem] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 disabled:opacity-50"
        value={value.map(String)}
        onChange={(e) => {
          const opts = Array.from(e.target.selectedOptions);
          onChange(opts.map((o) => Number(o.value)));
        }}
      >
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name} ({r.slug})
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500">
        Hold Ctrl (Windows) or Cmd (Mac) to select multiple roles.
      </p>
    </div>
  );
}
