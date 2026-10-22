<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureDemoReadOnly
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (
            $user?->is_demo
            && !$request->isMethodSafe()
            && !$request->is('api/logout')
        ) {
            return response()->json([
                'message' => 'The demo workspace is read-only.',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
