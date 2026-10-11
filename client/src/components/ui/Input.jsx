export default function Input({
  label,
  error,
  hint,
  as = 'input',
  className = '',
  id,
  children,
  ...props
}) {
  const Comp = as === 'textarea' ? 'textarea' : as === 'select' ? 'select' : 'input';
  const fieldClass =
    Comp === 'textarea' ? 'textarea' : Comp === 'select' ? 'select' : 'input';

  return (
    <div className={`input-wrap ${className}`.trim()}>
      {label ? (
        <label className="input-label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      {children != null ? (
        <Comp id={id} className={`${fieldClass}${error ? ' is-error' : ''}`} {...props}>
          {children}
        </Comp>
      ) : (
        <Comp id={id} className={`${fieldClass}${error ? ' is-error' : ''}`} {...props} />
      )}
      {error ? <div className="input-error">{error}</div> : null}
      {!error && hint ? <div className="form-hint">{hint}</div> : null}
    </div>
  );
}
