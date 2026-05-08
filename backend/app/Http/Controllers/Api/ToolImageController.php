<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ToolImageController extends Controller
{
    public function show(Request $request): StreamedResponse
    {
        $path = $request->query('path');
        if (! is_string($path)) {
            abort(404);
        }

        $cleanPath = ltrim($path, '/');
        if ($cleanPath === '' || str_contains($cleanPath, '..')) {
            abort(404);
        }

        $disk = Storage::disk('public');
        if (! $disk->exists($cleanPath)) {
            abort(404);
        }

        return $disk->response($cleanPath);
    }
}
