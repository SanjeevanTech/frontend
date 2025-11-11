import { useState } from 'react';
import Pagination from './Pagination';

// Simple test component to verify pagination works
function PaginationTest() {
  const [currentPage, setCurrentPage] = useState(0);
  
  // Test data
  const totalItems = 200; // Simulate 200 items
  const itemsPerPage = 50;
  
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Pagination Test</h2>
      <p>This is a test to verify pagination component works.</p>
      
      <div style={{ margin: '2rem 0', padding: '1rem', background: '#f0f0f0' }}>
        <p><strong>Current Page:</strong> {currentPage + 1}</p>
        <p><strong>Total Items:</strong> {totalItems}</p>
        <p><strong>Items Per Page:</strong> {itemsPerPage}</p>
      </div>
      
      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        loading={false}
      />
      
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#e8f5e9' }}>
        <h3>✅ If you see pagination above, it works!</h3>
        <p>You should see: Previous, page numbers, and Next buttons.</p>
      </div>
    </div>
  );
}

export default PaginationTest;
