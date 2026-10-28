import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/** Keep page content together without repeating a second heading or tutorial. */
export function AtelierRoom({children}:{children:ReactNode}) {
  const {pathname}=useLocation();
  if (!['/bots', '/history', '/profile', '/admin', '/developer'].some(path => pathname.startsWith(path))) return <>{children}</>;
  return <div className="atelier-room page-workspace"><div className="atelier-desk">{children}</div></div>;
}
