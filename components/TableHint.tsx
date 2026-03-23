import { PencilIcon } from '@/components/icons';

export default function TableHint() {
  return (
    <p className="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
      <PencilIcon />
      This is an editable table—simply click into a cell to update info or right-click to add a row.
    </p>
  );
}
