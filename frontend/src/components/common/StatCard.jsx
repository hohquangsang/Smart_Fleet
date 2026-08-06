const StatCard = ({ label, value, icon, trend, trendText, accentColor }) => {
  return (
    <div className="stat-card" style={{ '--stat-accent': accentColor }}>
      <div className="stat-card__header">
        <span className="stat-card__label">{label}</span>
        <div className="stat-card__icon" style={{ background: `${accentColor}15`, color: accentColor }}>
          {icon}
        </div>
      </div>
      <div className="stat-card__value">{value}</div>
      {(trend || trendText) && (
        <div className={`stat-card__trend ${trend === 'up' ? 'stat-card__trend--up' : trend === 'down' ? 'stat-card__trend--down' : ''}`}>
          {trend === 'up' && '↑'}{trend === 'down' && '↓'} {trendText}
        </div>
      )}
    </div>
  );
};

export default StatCard;
