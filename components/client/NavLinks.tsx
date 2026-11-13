'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardPen, FileText, FolderKanban, HandHelping, LayoutDashboard, OctagonAlert, Presentation, ShieldCheck, Target, UsersRound, type LucideIcon } from 'lucide-react';

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Dasbor portofolio', icon: LayoutDashboard },
  { href: '/proyek', label: 'Daftar proyek', icon: FolderKanban },
  { href: '/update', label: 'Update mingguan', icon: ClipboardPen },
  { href: '/isu', label: 'Isu & PICA', icon: OctagonAlert },
  { href: '/dukungan', label: 'Dukungan & keputusan', icon: HandHelping },
  { href: '/ringkasan', label: 'Ringkasan Direktur', icon: Presentation },
  { href: '/laporan', label: 'Laporan & charter', icon: FileText },
  { href: '/pic', label: 'Master PIC', icon: UsersRound },
  { href: '/sasaran', label: 'Sasaran strategis', icon: Target },
  { href: '/pengguna', label: 'Pengguna & peran', icon: ShieldCheck },
];

// menu: daftar href yang boleh dibuka pengguna (lib/menu.ts), dihitung di server.
export default function NavLinks({ badgeUpdate, menu, varian = 'side' }: { badgeUpdate?: number; menu: string[]; varian?: 'side' | 'mobile' }) {
  const path = usePathname();
  const aktif = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  return (
    <nav className={varian === 'side' ? 'side-nav' : 'mobile-nav'} aria-label="Navigasi utama">
      {NAV.filter(n => menu.includes(n.href)).map(({ href, label, icon: Ikon }) => (
        <Link key={href} href={href} className={aktif(href) ? 'aktif' : undefined} aria-current={aktif(href) ? 'page' : undefined} title={label}>
          <Ikon size={17} aria-hidden="true" />
          <span className="nav-label">{label}</span>
          {href === '/update' && !!badgeUpdate && <small className="badge-n">{badgeUpdate}</small>}
        </Link>
      ))}
    </nav>
  );
}
