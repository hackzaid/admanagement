"use client";

import { ReactNode, useMemo, useState } from "react";

export function usePagination<T>(rows: T[], initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, safePage, pageSize]);

  return {
    page: safePage,
    pageSize,
    pagedRows,
    totalRows: rows.length,
    totalPages,
    setPage,
    setPageSize,
  };
}

export function PaginationFooter({
  page,
  pageSize,
  totalRows,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const start = totalRows ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, totalRows);

  return (
    <div className="pagination-bar">
      <div className="pagination-meta">
        {start}-{end} of {totalRows}
      </div>
      <div className="pagination-actions">
        <label className="pagination-size">
          <span>Rows</span>
          <select
            value={pageSize}
            onChange={(event) => {
              onPageSizeChange(Number.parseInt(event.target.value, 10));
              onPageChange(1);
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </label>
        <button className="table-action" disabled={page <= 1} onClick={() => onPageChange(page - 1)} type="button">
          Prev
        </button>
        <span className="pagination-page">
          {page} / {totalPages}
        </span>
        <button className="table-action" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} type="button">
          Next
        </button>
      </div>
    </div>
  );
}

export function TablePanel({
  table,
  footer,
}: {
  table: ReactNode;
  footer: ReactNode;
}) {
  return (
    <>
      <div className="table-wrap">{table}</div>
      {footer}
    </>
  );
}
