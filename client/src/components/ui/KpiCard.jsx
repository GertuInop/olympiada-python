import Card from './Card';

export default function KpiCard({ label, value }) {
  return (
    <Card className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </Card>
  );
}
