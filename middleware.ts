import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Gira su ogni richiesta a /dashboard/*: rinfresca il cookie di sessione
// Supabase e, se manca una sessione valida, rimanda a /login.
// L'email gia' validata qui viene propagata al layout via header di
// richiesta (x-tca-user-email): cosi' il layout non deve richiamare
// getUser() (un'altra chiamata di rete a Supabase Auth) ad ogni singola
// pagina del dashboard, solo per sapere chi e' loggato. L'header viene
// sempre sovrascritto qui sotto con il valore validato, quindi non e'
// falsificabile da un client che provasse a impostarlo da solo.
export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  const pendingCookies: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          pendingCookies.push(...cookiesToSet)
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user?.email) {
    requestHeaders.set('x-tca-user-email', user.email)
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))

  return response
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
