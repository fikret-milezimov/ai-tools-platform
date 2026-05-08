<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ToolResource;
use App\Models\Tool;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AdminToolController extends Controller
{
    public function index(Request $request): JsonResponse
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

        $perPage = max(1, min(100, (int) $request->input('per_page', 10)));
        $tools = $query->paginate($perPage)->appends($request->query());

        return response()->json([
            'tools' => ToolResource::collection($tools->items())->resolve(),
            'pagination' => [
                'current_page' => $tools->currentPage(),
                'per_page' => $tools->perPage(),
                'total' => $tools->total(),
                'last_page' => $tools->lastPage(),
                'from' => $tools->firstItem(),
                'to' => $tools->lastItem(),
            ],
        ]);
    }

    public function approve(Request $request, Tool $tool): JsonResponse
    {
        $previousStatus = $tool->approval_status;
        $tool->update(['approval_status' => 'approved']);
        $tool->load(['creator:id,name,email', 'categories', 'tags', 'roles']);
        AuditLogger::log($request->user(), 'tool.approved', $tool, [
            'from' => $previousStatus,
            'to' => 'approved',
        ]);

        return (new ToolResource($tool))->response();
    }

    public function reject(Request $request, Tool $tool): JsonResponse
    {
        $previousStatus = $tool->approval_status;
        $tool->update(['approval_status' => 'rejected']);
        $tool->load(['creator:id,name,email', 'categories', 'tags', 'roles']);
        AuditLogger::log($request->user(), 'tool.rejected', $tool, [
            'from' => $previousStatus,
            'to' => 'rejected',
        ]);

        return (new ToolResource($tool))->response();
    }
}
