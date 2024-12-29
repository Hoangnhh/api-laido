<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Symfony\Component\HttpFoundation\Response;

class VerifyAjaxRequest
{
    public function handle(Request $request, Closure $next): Response
    {
        try {
            return $next($request);
        } catch (TokenMismatchException $e) {
            return response()->json([
                'message' => 'CSRF token mismatch',
                'redirect' => '/admin'
            ], 419);
        } catch (\Exception $e) {
            if (auth()->guest()) {
                return response()->json([
                    'message' => 'Unauthenticated',
                    'redirect' => '/admin'
                ], 401);
            }
            throw $e;
        }
    }
} 