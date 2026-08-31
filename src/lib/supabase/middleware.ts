import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Check if Supabase credentials are validly configured
  const isSupabaseConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('placeholder')
  );

  if (!isSupabaseConfigured) {
    return NextResponse.next({ request });
  }

  const pathname = request.nextUrl ? request.nextUrl.pathname : new URL(request.url).pathname;
  const isStrictProd = process.env.NEXT_PUBLIC_STRICT_PROD === 'true';
  const isDemoExplicit = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  // Fast-path: Check if any Supabase session cookies exist in the request
  const allCookies = request.cookies && typeof request.cookies.getAll === 'function' ? request.cookies.getAll() : [];
  const hasAuthCookie = allCookies.some(
    (c) =>
      c.name.includes('auth-token') ||
      c.name.includes('sb-') ||
      c.name.includes('supabase')
  );

  // If no auth cookie exists, return immediately in 0ms without external network calls
  if (!hasAuthCookie && (!isStrictProd || isDemoExplicit)) {
    return NextResponse.next({ request });
  }

  // Fast-path for development or explicit demo mode: zero network delay on page routing
  if (!isStrictProd || isDemoExplicit) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });
  try {
    const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
      cookies: {
        getAll() {
          return request.cookies && typeof request.cookies.getAll === 'function' ? request.cookies.getAll() : [];
        },
        setAll(cookiesToSet) {
          if (request.cookies && typeof request.cookies.set === 'function') {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
          }
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });
    // Refresh auth session token with a fast 600ms timeout to prevent edge middleware hanging
    const userPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<{ data: { user: null }; error: Error }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null }, error: new Error('Auth timeout') }), 600)
    );
    const { data: { user } } = await Promise.race([userPromise, timeoutPromise]);
    // Admin route protection on strict production mode (temporarily open for general access unless STRICT_ADMIN_AUTH is true)
    const isStrictAdminAuth = process.env.STRICT_ADMIN_AUTH === 'true';
    if (isStrictAdminAuth && isStrictProd && !isDemoExplicit && pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
      if (!user) {
        const loginUrl = new URL('/admin/login', request.url);
        return NextResponse.redirect(loginUrl);
      }
    }

    return supabaseResponse;
  } catch (error) {
    console.warn('Supabase middleware session sync:', error);
    return supabaseResponse;
  }
}
