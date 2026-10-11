export default function Card({
  children,
  className = '',
  padding = 'md',
  hover = false,
  title,
  subtitle,
  actions,
  ...props
}) {
  const pad = padding === 'lg' ? 'card-pad-lg' : padding === 'none' ? '' : 'card-pad';
  return (
    <div className={`card ${pad} ${hover ? 'card-hover' : ''} ${className}`.trim()} {...props}>
      {(title || actions) && (
        <div className="card-header">
          <div>
            {title ? <div className="card-title">{title}</div> : null}
            {subtitle ? <div className="card-subtitle">{subtitle}</div> : null}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
