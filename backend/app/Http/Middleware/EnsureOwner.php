<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOwner
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || $user->role !== 'owner') {
            abort(Response::HTTP_FORBIDDEN, 'Only administrators can access this resource.');
        }

        return $next($request);
    }
}
