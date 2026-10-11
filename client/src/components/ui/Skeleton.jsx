export default function Skeleton({ width = '100%', height = 16, className = '', style }) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card card-pad stack">
      <Skeleton height={20} width="60%" />
      <Skeleton height={14} width="90%" />
      <Skeleton height={14} width="40%" />
      <Skeleton height={36} width="120px" />
    </div>
  );
}
