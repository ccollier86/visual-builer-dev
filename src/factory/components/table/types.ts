export interface TableCellHints {
  columnIndex?: number;
  column?: number | string;
  columnKey?: string;
  columnId?: string;
  role?: 'primary' | 'support';
  emphasis?: string;
  italic?: boolean;
  bold?: boolean;
  strong?: boolean;
  muted?: boolean;
  className?: string | string[];
}
