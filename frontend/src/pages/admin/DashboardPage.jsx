import { useState, useEffect } from 'react';
import { HiOutlineShoppingCart, HiOutlineTruck, HiOutlineClock, HiOutlineCurrencyDollar } from 'react-icons/hi';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import api from '../../services/api';
import '../../styles/dashboard.css';

const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6'];

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/admin/dashboard');
        setStats(data.data.stats);
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Mock fleet composition data for chart
  const fleetData = [
    { name: 'In-Transit', value: stats?.activeDrivers || 0, color: '#3b82f6' },
    { name: 'Idle', value: Math.max(0, (stats?.totalDrivers || 0) - (stats?.activeDrivers || 0)), color: '#22c55e' },
    { name: 'Pending', value: stats?.pendingDrivers || 0, color: '#eab308' },
  ];

  // Mock performance trend data
  const performanceData = Array.from({ length: 12 }, (_, i) => ({
    time: `${String(8 + i).padStart(2, '0')}:00`,
    value: 30 + Math.random() * 25,
  }));

  // Mock alerts
  const alerts = [
    { alert: 'Delay on Route 4', detail: 'ETA slipped by 32 min', vehicle: 'North Loop - TRK-184', time: '08:42 AM', level: 'critical' },
    { alert: 'Low fuel threshold', detail: '18% remaining - refuel soon', vehicle: 'South Yard - TRK-202', time: '08:37 AM', level: 'warning' },
    { alert: 'Route deviation detected', detail: 'Vehicle 12 km off corridor', vehicle: 'East Corridor - TRK-091', time: '08:18 AM', level: 'warning' },
  ];

  if (loading) {
    return (
      <div className="dashboard">
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card" style={{ height: 130 }}>
              <div className="skeleton" style={{ width: '60%', height: 14 }} />
              <div className="skeleton" style={{ width: '40%', height: 32, marginTop: 12 }} />
              <div className="skeleton" style={{ width: '80%', height: 12, marginTop: 12 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* ─── Stats Cards ──────────────────────── */}
      <div className="stats-grid">
        <StatCard
          label="Total Orders Today"
          value={stats?.totalOrdersToday?.toLocaleString() || '0'}
          icon={<HiOutlineShoppingCart />}
          trend="up"
          trendText="vs. same day last week"
          accentColor="var(--accent-blue)"
        />
        <StatCard
          label="Active Vehicles"
          value={`${stats?.activeDrivers || 0} / ${stats?.totalDrivers || 0}`}
          icon={<HiOutlineTruck />}
          trendText={`${stats?.totalDrivers ? Math.round((stats.activeDrivers / stats.totalDrivers) * 100) : 0}% fleet utilization`}
          accentColor="var(--accent-green)"
        />
        <StatCard
          label="Average Delivery Time"
          value={`${stats?.avgDeliveryTimeMin || 0}m`}
          icon={<HiOutlineClock />}
          trend="up"
          trendText="faster than yesterday"
          accentColor="var(--accent-purple)"
        />
        <StatCard
          label="Revenue Today"
          value={`${Number(stats?.revenueToday || 0).toLocaleString('vi-VN')}₫`}
          icon={<HiOutlineCurrencyDollar />}
          trendText="estimated this month"
          accentColor="var(--accent-cyan)"
        />
      </div>

      {/* ─── Charts ───────────────────────────── */}
      <div className="charts-grid">
        {/* Donut Chart */}
        <div className="chart-card">
          <div className="chart-card__header">
            <div>
              <div className="chart-card__title">Fleet Composition</div>
              <div className="chart-card__subtitle">Fleet Status Overview</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={fleetData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  dataKey="value"
                  stroke="none"
                >
                  {fleetData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {fleetData.map((item) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                  <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>{item.name}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Line Chart */}
        <div className="chart-card">
          <div className="chart-card__header">
            <div>
              <div className="chart-card__title">Delivery Velocity</div>
              <div className="chart-card__subtitle">Live Performance Trend</div>
            </div>
            <div className="chart-card__toggle">
              <button className="chart-card__toggle-btn chart-card__toggle-btn--active">Today</button>
              <button className="chart-card__toggle-btn">7 days</button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: 'var(--fs-3xl)', fontWeight: 800 }}>
              {stats?.avgDeliveryTimeMin || 42.3}
            </span>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>min</span>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent-green)', marginLeft: '0.5rem' }}>
              ↑ 8.7% vs yesterday
            </span>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={performanceData}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                }}
              />
              <Area type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} fill="url(#areaGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Critical Alerts ──────────────────── */}
      <div className="alerts-section">
        <div className="alerts-section__header">
          <div>
            <div className="alerts-section__title">⚠️ Critical Alerts</div>
            <div className="alerts-section__subtitle">Issues requiring attention from the dispatch desk</div>
          </div>
          <span className="alerts-section__link">View all alerts →</span>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Alert</th>
              <th>Vehicle / Location</th>
              <th>Reported</th>
              <th>Level</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert, i) => (
              <tr key={i}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{alert.alert}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{alert.detail}</div>
                </td>
                <td>{alert.vehicle}</td>
                <td>{alert.time}</td>
                <td><StatusBadge status={alert.level} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardPage;
