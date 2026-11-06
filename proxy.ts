import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Menyegarkan token Supabase Auth di setiap permintaan dan mengarahkan tamu ke /login.
// Otorisasi data tetap di database (RLS); ini hanya pemeriksaan cepat.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: daftar => {
        daftar.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        daftar.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await sb.auth.getUser();
  const diLogin = request.nextUrl.pathname.startsWith('/login');
  if (!user && !diLogin) return NextResponse.redirect(new URL('/login', request.url));
  if (user && diLogin) return NextResponse.redirect(new URL('/', request.url));
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|brand/).*)'],
};
