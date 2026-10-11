export default function Progress({ value = 0, label, showValue = true }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div>
      {(label || showValue) && (
        <div className="progress-label">
          <span>{label}</span>
          {showValue ? <span>{Math.round(pct)}%</span> : null}
        </div>
      )}
      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
