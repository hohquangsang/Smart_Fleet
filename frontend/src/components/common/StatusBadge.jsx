const StatusBadge = ({ status }) => {
  const statusClass = status?.toLowerCase().replace(/ /g, '_');

  return (
    <span className={`status-badge status-badge--${statusClass}`}>
      <span className="status-badge__dot" />
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

export default StatusBadge;
