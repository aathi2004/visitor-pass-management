import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="empty" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="big">404</div>
      <div style={{ fontWeight: 700, fontSize: 18 }}>Page not found</div>
      <div style={{ marginTop: 6 }}>The page you are looking for does not exist.</div>
      <div style={{ marginTop: 16 }}>
        <Link to="/" className="btn btn-primary">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
