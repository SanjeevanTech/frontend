import React from 'react'

function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange, loading = false }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (totalItems === 0) return null;
  
  if (totalPages <= 1) {
    return (
      <div className="text-center py-4 text-slate-400 text-sm">
        Showing all {totalItems} items
      </div>
    );
  }
  
  const handlePrevious = () => {
    if (currentPage > 0 && !loading) {
      onPageChange(currentPage - 1);
    }
  };
  
  const handleNext = () => {
    if (currentPage < totalPages - 1 && !loading) {
      onPageChange(currentPage + 1);
    }
  };
  
  const handlePageClick = (page) => {
    if (!loading && page !== currentPage) {
      onPageChange(page);
    }
  };
  
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage < 3) {
        for (let i = 0; i < 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages - 1);
      } else if (currentPage > totalPages - 4) {
        pages.push(0);
        pages.push('...');
        for (let i = totalPages - 4; i < totalPages; i++) pages.push(i);
      } else {
        pages.push(0);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages - 1);
      }
    }
    
    return pages;
  };
  
  const startItem = currentPage * itemsPerPage + 1;
  const endItem = Math.min((currentPage + 1) * itemsPerPage, totalItems);
  
  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-slate-400">
        Showing <span className="text-purple-400 font-semibold">{startItem}</span> to <span className="text-purple-400 font-semibold">{endItem}</span> of <span className="text-purple-400 font-semibold">{totalItems}</span> items
      </div>
      
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 0 || loading}
          className="px-4 py-2 bg-slate-800/50 border border-purple-500/20 text-slate-300 rounded-lg hover:bg-slate-700/50 hover:border-purple-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          ← Previous
        </button>
        
        <div className="flex gap-1 flex-wrap justify-center">
          {getPageNumbers().map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="px-3 py-2 text-slate-500">...</span>
            ) : (
              <button
                key={page}
                onClick={() => handlePageClick(page)}
                disabled={loading}
                className={`px-4 py-2 rounded-lg transition-all font-medium ${
                  currentPage === page
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-slate-800/50 border border-purple-500/20 text-slate-300 hover:bg-slate-700/50 hover:border-purple-500/40'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                {page + 1}
              </button>
            )
          ))}
        </div>
        
        <button
          onClick={handleNext}
          disabled={currentPage >= totalPages - 1 || loading}
          className="px-4 py-2 bg-slate-800/50 border border-purple-500/20 text-slate-300 rounded-lg hover:bg-slate-700/50 hover:border-purple-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Next →
        </button>
      </div>
      
      <div className="text-center text-sm font-medium text-slate-300">
        Page <span className="text-purple-400">{currentPage + 1}</span> of <span className="text-purple-400">{totalPages}</span>
      </div>
    </div>
  );
}

export default Pagination;
