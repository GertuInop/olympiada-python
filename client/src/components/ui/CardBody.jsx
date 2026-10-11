export default function CardBody({ children, className = '' }) {
  return <div className={`card-body ${className}`.trim()}>{children}</div>;
}
