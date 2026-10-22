<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateWithTokenCookie
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->bearerToken() && $token = $request->cookie(config('auth_cookie.name'))) {
            $request->headers->set('Authorization', 'Bearer '.$token);
        }

        return $next($request);
    }
}
