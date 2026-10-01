import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/create(.*)",
  "/course(.*)",
  "/api/((?!inngest).*)", // every API route except the Inngest webhook
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:css|js|json|jpg|jpeg|png|gif|svg|woff2?|ttf|eot|mp4|webm|wav|mp3|m4a|aac|oga)).*)",
    "/api/(.*)",
    "/trpc/(.*)",
  ],
};
