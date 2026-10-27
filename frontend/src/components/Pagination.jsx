import React from 'react';

export default function Pagination({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  onPageChange,
  position = 'top',
}) {
  if (totalItems === 0) return null;

  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 2 && i <= currentPage + 2)
    ) {
      pageNumbers.push(i);
    }
  }

  const renderButtons = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center gap-1">
        <button
          disabled={currentPage === 1}
          onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
          className={`px-2.5 py-1 rounded border text-xs font-medium ${
            currentPage === 1
              ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
              : 'bg-white hover:bg-slate-100 text-slate-700 cursor-pointer'
          }`}
        >
          <i className="fa-solid fa-chevron-left"></i>
        </button>

        {pageNumbers.map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`px-3 py-1 rounded border text-xs font-semibold cursor-pointer ${
              pageNum === currentPage
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-white hover:bg-slate-100 text-slate-700'
            }`}
          >
            {pageNum}
          </button>
        ))}

        <button
          disabled={currentPage === totalPages}
          onClick={() =>
            currentPage < totalPages && onPageChange(currentPage + 1)
          }
          className={`px-2.5 py-1 rounded border text-xs font-medium ${
            currentPage === totalPages
              ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
              : 'bg-white hover:bg-slate-100 text-slate-700 cursor-pointer'
          }`}
        >
          <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    );
  };

  if (position === 'bottom') {
    return (
      <div className="flex justify-center items-center mt-8 text-xs text-slate-600 no-print">
        {renderButtons()}
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 text-xs text-slate-600 gap-2 no-print">
      <div>
        Mostrando {startIndex + 1} - {endIndex} de {totalItems} productos
      </div>
      {renderButtons()}
    </div>
  );
}
