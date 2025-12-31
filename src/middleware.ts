
import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  
  // Pass the original URL to be used in the layout for header visibility
  requestHeaders.set('next-url', pathname);

  // Allow the request to proceed with the added header
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  // Match all paths except for static assets and the Next.js metadata routes.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
