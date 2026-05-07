<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ToolResource;
use App\Models\Tool;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class AdminToolController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Tool::query()
            ->with(['creator:id,name,email', 'categories', 'tags', 'roles'])
            ->latest();

        if ($request->filled('approval_status')) {
            $status = (string) $request->input('approval_status');
            if (in_array($status, ['pending', 'approved', 'rejected'], true)) {
                $query->where('approval_status', $status);
            }
        }

        if ($request->filled('role_id')) {
            $roleId = (int) $request->input('role_id');
            $query->whereHas('roles', function ($q) use ($roleId) {
                $q->where('roles.id', $roleId);
            });
        }

        if ($request->filled('category_id')) {
            $categoryId = (int) $request->input('category_id');
            $query->whereHas('categories', function ($q) use ($categoryId) {
                $q->where('categories.id', $categoryId);
            });
        }

        if ($request->filled('search')) {
            $search = $request->string('search');
            if ((string) $search !== '') {
                $query->where('name', 'like', '%'.(string) $search.'%');
            }
        }

        return ToolResource::collection($query->get());
    }

    public function approve(Tool $tool): JsonResponse
    {
        $tool->update(['approval_status' => 'approved']);
        $tool->load(['creator:id,name,email', 'categories', 'tags', 'roles']);

        return (new ToolResource($tool))->response();
    }

    public function reject(Tool $tool): JsonResponse
    {
        $tool->update(['approval_status' => 'rejected']);
        $tool->load(['creator:id,name,email', 'categories', 'tags', 'roles']);

        return (new ToolResource($tool))->response();
    }
}
