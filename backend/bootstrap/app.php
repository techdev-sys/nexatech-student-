<?php

use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\AuthenticateWithTokenCookie;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Security headers on every response
        $middleware->append(SecurityHeaders::class);

        // Convert the auth cookie before route-level auth:sanctum is evaluated.
        $middleware->api(prepend: [AuthenticateWithTokenCookie::class]);

        $middleware->alias([
            'role' => \App\Http\Middleware\CheckUserRole::class,
            'demo.readonly' => \App\Http\Middleware\EnsureDemoReadOnly::class,
        ]);

        $middleware->redirectGuestsTo(fn (Request $request) => $request->is('api/*') ? null : route('login'));
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
