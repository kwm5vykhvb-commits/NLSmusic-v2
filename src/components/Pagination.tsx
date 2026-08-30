import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
} from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalResults,
  onPageChange,
  disabled = false,
}) => {
  const [jumpPage, setJumpPage] = useState("");

  // Rule: If totalPages is 1 or less (e.g. results < 100), display only the single page available.
  if (totalPages <= 1) {
    return (
      <div
        id="pagination-single-page"
        className="mt-6 p-3 rounded-2xl bg-[#181818] border border-[#282828] flex items-center justify-between text-xs text-zinc-400"
      >
        <span className="flex items-center gap-1.5 font-medium text-zinc-300">
          <Sparkles className="w-3.5 h-3.5 text-[#1db954]" />
          Page unique disponible ({totalResults} morceaux trouvés)
        </span>
        <span className="text-[10px] bg-[#242424] text-zinc-400 font-bold px-2 py-0.5 rounded-full border border-[#333]">
          Page 1 / 1
        </span>
      </div>
    );
  }

  // Generate page numbers to show around current page (up to max 50 pages)
  const maxPages = Math.min(totalPages, 50);
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 2; // Number of pages to show around current

    for (let i = 1; i <= maxPages; i++) {
      if (
        i === 1 ||
        i === maxPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    return pages;
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPages) {
      onPageChange(pageNum);
      setJumpPage("");
    }
  };

  return (
    <div
      id="pagination-controls"
      className="mt-8 p-4 rounded-2xl bg-[#181818] border border-[#282828] shadow-lg flex flex-col md:flex-row items-center justify-between gap-4"
    >
      {/* Left Info */}
      <div className="text-xs text-zinc-400 flex items-center gap-2">
        <span className="font-semibold text-white">
          Page {currentPage} sur {maxPages}
        </span>
        <span className="text-zinc-600">•</span>
        <span>100 morceaux / page</span>
        {totalResults > 0 && (
          <>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">Total ~{totalResults}</span>
          </>
        )}
      </div>

      {/* Center Navigation Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {/* First Page */}
        <button
          id="btn-page-first"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1 || disabled}
          className="p-1.5 rounded-lg bg-[#222] hover:bg-[#333] text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Première page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          id="btn-page-prev"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || disabled}
          className="px-2.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#333] text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 text-xs font-semibold"
          title="Page précédente"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Précédent</span>
        </button>

        {/* Numeric Buttons */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`ellipsis-${idx}`} className="px-1.5 text-zinc-500 text-xs font-bold">
                  ...
                </span>
              );
            }
            const isCurrent = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                id={`btn-page-num-${p}`}
                onClick={() => onPageChange(p as number)}
                disabled={disabled}
                className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                  isCurrent
                    ? "bg-[#1db954] text-black shadow-md shadow-[#1db954]/30 scale-105"
                    : "bg-[#222] hover:bg-[#2e2e2e] text-zinc-300 hover:text-white"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          id="btn-page-next"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= maxPages || disabled}
          className="px-2.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#333] text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 text-xs font-semibold"
          title="Page suivante"
        >
          <span className="hidden sm:inline">Suivant</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          id="btn-page-last"
          onClick={() => onPageChange(maxPages)}
          disabled={currentPage === maxPages || disabled}
          className="p-1.5 rounded-lg bg-[#222] hover:bg-[#333] text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Dernière page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      {/* Right Jump Form */}
      <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
        <span className="text-[11px] text-zinc-400">Aller à :</span>
        <input
          id="input-jump-page"
          type="number"
          min={1}
          max={maxPages}
          value={jumpPage}
          onChange={(e) => setJumpPage(e.target.value)}
          placeholder={`1-${maxPages}`}
          className="w-14 bg-[#242424] border border-[#333] focus:border-[#1db954] text-white text-xs rounded-lg px-2 py-1 outline-none text-center"
        />
        <button
          id="btn-jump-submit"
          type="submit"
          disabled={!jumpPage || disabled}
          className="px-2.5 py-1 bg-[#242424] hover:bg-[#1db954] hover:text-black text-zinc-300 text-xs font-bold rounded-lg border border-[#333] transition-colors disabled:opacity-40"
        >
          Go
        </button>
      </form>
    </div>
  );
};
