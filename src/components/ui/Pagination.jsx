import { useEffect, useMemo, useState } from "react";

export const PAGE_SIZE = 25;

const EMPTY_LIST = [];

export function usePagination(items, pageSize = PAGE_SIZE) {
  const list = items || EMPTY_LIST;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [list.length, pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const start = (page - 1) * pageSize;
  const pageItems = useMemo(
    () => list.slice(start, start + pageSize),
    [list, start, pageSize],
  );

  return {
    page,
    setPage,
    pageCount,
    pageItems,
    pageSize,
    total: list.length,
    start,
    end: Math.min(start + pageSize, list.length),
  };
}

export default function Pagination({
  page,
  setPage,
  pageCount,
  total,
  start,
  end,
  pageSize = PAGE_SIZE,
}) {
  if (!total || total <= pageSize || pageCount <= 1) return null;
  return (
    <div className="pager">
      <span className="pager-info">
        Showing {start + 1}–{end} of {total}
      </span>
      <div className="pager-controls">
        <button
          type="button"
          className="btn ghost sm"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Prev
        </button>
        <span className="pager-page">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          className="btn ghost sm"
          disabled={page >= pageCount}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
