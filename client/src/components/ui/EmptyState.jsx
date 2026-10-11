export default function EmptyState({ icon = '∅', title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      {title ? <div className="empty-title">{title}</div> : null}
      {description ? <p className="text-sm muted">{description}</p> : null}
      {action ? <div className="mt-16">{action}</div> : null}
    </div>
  );
}
