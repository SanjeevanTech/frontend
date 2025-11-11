import './Pagination.css';

function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange, loading = false }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Show pagination info even if only 1 page (for debugging and user feedback)
  if (totalItems === 0) return null; // Don't show if no items
  
  if (totalPages <= 1) {
    // Show simple info for single page
    return (
      <div className="pagination-container">
        <div className="pagination-info">
          Showing all {totalItems} items
        </div>
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
  
  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first, last, and pages around current
      if (currentPage < 3) {
        // Near start
        for (let i = 0; i < 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages - 1);
      } else if (currentPage > totalPages - 4) {
        // Near end
        pages.push(0);
        pages.push('...');
        for (let i = totalPages - 4; i < totalPages; i++) pages.push(i);
      } else {
        // Middle
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
    <div className="pagination-container">
      <div className="pagination-info">
        Showing {startItem} to {endItem} of {totalItems} items
      </div>
      
      <div className="pagination-controls">
        <button
          className="pagination-btn"
          onClick={handlePrevious}
          disabled={currentPage === 0 || loading}
        >
          ← Previous
        </button>
        
        <div className="pagination-pages">
          {getPageNumbers().map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
            ) : (
              <button
                key={page}
                className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                onClick={() => handlePageClick(page)}
                disabled={loading}
              >
                {page + 1}
              </button>
            )
          ))}
        </div>
        
        <button
          className="pagination-btn"
          onClick={handleNext}
          disabled={currentPage >= totalPages - 1 || loading}
        >
          Next →
        </button>
      </div>
      
      <div className="pagination-summary">
        Page {currentPage + 1} of {totalPages}
      </div>
    </div>
  );
}

export default Pagination;
