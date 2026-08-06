import { useState, useEffect } from 'react';
import api from '../../services/api';
import '../../styles/dashboard.css';

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const { data } = await api.get('/invoices');
        setInvoices(data.data.invoices);
      } catch (err) {
        console.error('Failed to fetch invoices:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const handleDownload = (orderId, invoiceNumber) => {
    window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/invoices/${orderId}/download`, '_blank');
  };

  const formatDate = (date) => new Date(date).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="dashboard">
      <h2 className="dashboard__title">Invoices & Billing</h2>
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Pickup Address</th>
              <th>Dropoff Address</th>
              <th>Distance</th>
              <th>Total Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 16, width: '80%' }} /></td>
                  ))}
                </tr>
              ))
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No invoices available yet
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id}>
                  <td><code style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{inv.invoiceNumber}</code></td>
                  <td>{formatDate(inv.issuedAt)}</td>
                  <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.pickupAddress}</td>
                  <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.dropoffAddress}</td>
                  <td>{Number(inv.distanceKm).toFixed(1)} km</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{Number(inv.totalFare).toLocaleString('vi-VN')}₫</td>
                  <td>
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={() => handleDownload(inv.orderId, inv.invoiceNumber)}
                    >
                      📥 Download PDF
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoicesPage;
