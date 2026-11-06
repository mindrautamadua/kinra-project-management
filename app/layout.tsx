import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { IBM_Plex_Mono, Nunito_Sans } from 'next/font/google';
import { NAMA_COOKIE_TEMA } from '@/components/client/TombolTema';
import { NAMA_COOKIE_SIDEBAR } from '@/components/client/TombolSidebar';
import './globals.css';

// Guideline memakai Museo Sans (berlisensi). Nunito Sans dipakai sebagai pengganti terdekat yang bebas lisensi.
const sans = Nunito_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'KINRA Project Hub',
  description: 'Portofolio proyek PT KINRA: progres terhadap baseline, status otomatis, PICA, dan permintaan dukungan.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const kue = await cookies();
  const tema = kue.get(NAMA_COOKIE_TEMA)?.value;
  const sidebarCiut = kue.get(NAMA_COOKIE_SIDEBAR)?.value === 'ciut';
  return (
    <html lang="id" className={`${sans.variable} ${mono.variable}`} data-theme={tema === 'light' || tema === 'dark' ? tema : undefined} data-sidebar={sidebarCiut ? 'ciut' : undefined}>
      <body>{children}</body>
    </html>
  );
}
