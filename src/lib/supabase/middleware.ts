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

  let supabaseResponse = NextResponse.next({
    request,
  });

  try {
    const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });
    // Refresh auth session token with a fast 1200ms timeout to prevent edge middleware hanging
    const userPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<{ data: { user: null }; error: Error }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null }, error: new Error('Auth timeout') }), 1200)
    );
    const { data: { user } } = await Promise.race([userPromise, timeoutPromise]);
    // Admin route protection on strict production mode
    const pathname = request.nextUrl.pathname;
    const isStrictProd = process.env.NEXT_PUBLIC_STRICT_PROD === 'true';
    const isDemoExplicit = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

    if (isStrictProd && !isDemoExplicit && pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
      if (!user) {
        const loginUrl = new URL('/', request.url);
        loginUrl.searchParams.set('auth_required', 'admin');
        return NextResponse.redirect(loginUrl);
      }
    }

    return supabaseResponse;
  } catch (error) {
    console.warn('Supabase middleware session sync:', error);
    return supabaseResponse;
  }
}
