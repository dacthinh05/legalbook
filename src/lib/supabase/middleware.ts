import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith('/admin');

  // Check if Supabase credentials are validly configured
  const isSupabaseConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('placeholder')
  );

  // When Supabase is NOT configured:
  // Strictly FAIL-CLOSED on all admin routes unless explicitly running in local development mode
  if (!isSupabaseConfigured) {
    if (isAdminRoute) {
      const isLocalDev = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
      const demoRoleCookie = request.cookies.get('legalbook_auth_role')?.value;
      if (isLocalDev && demoRoleCookie === 'admin') {
        return NextResponse.next({ request });
      }
      if (!isLocalDev) {
        // Production / Staging without auth: strictly deny admin access
        const url = request.nextUrl.clone();
        url.pathname = '/';
        url.searchParams.set('error', 'admin_auth_unconfigured');
        return NextResponse.redirect(url);
      }
    }
    // Public routes allowed for offline/demo browsing
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Strict Admin Route Protection: require active user with admin role
    if (isAdminRoute) {
      if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
        const demoRoleCookie = request.cookies.get('legalbook_auth_role')?.value;
        if (demoRoleCookie === 'admin') {
          return supabaseResponse;
        }
      }

      if (authError || !user) {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        url.searchParams.set('auth', 'required');
        return NextResponse.redirect(url);
      }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        url.searchParams.set('error', 'forbidden');
        return NextResponse.redirect(url);
      }
    }

    return supabaseResponse;
  } catch (error) {
    // Fail-closed for protected routes on any exception
    if (isAdminRoute) {
      console.error('Supabase middleware auth exception on protected route — failing closed:', error);
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'auth_failed');
      return NextResponse.redirect(url);
    }

    console.warn('Supabase middleware warning on public route:', error);
    return supabaseResponse;
  }
}
