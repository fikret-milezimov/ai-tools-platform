<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Http\Resources\ToolResource;
use App\Models\AuditLog;
use App\Models\Tool;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $logsQuery = AuditLog::query()
            ->with(['user:id,name,email,role', 'tool:id,name,approval_status'])
            ->latest();

        if ($request->filled('action')) {
            $logsQuery->where('action', (string) $request->input('action'));
        }

        if ($request->filled('user_id')) {
            $logsQuery->where('user_id', (int) $request->input('user_id'));
        }

        if ($request->filled('tool_id')) {
            $logsQuery->where('tool_id', (int) $request->input('tool_id'));
        }

        if ($request->filled('from')) {
            $logsQuery->where('created_at', '>=', (string) $request->input('from'));
        }

        if ($request->filled('to')) {
            $logsQuery->where('created_at', '<=', (string) $request->input('to'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            if ($search !== '') {
                $logsQuery->where(function ($q) use ($search) {
                    $q->where('action', 'like', '%'.$search.'%')
                        ->orWhereHas('user', function ($uq) use ($search) {
                            $uq->where('name', 'like', '%'.$search.'%')
                                ->orWhere('email', 'like', '%'.$search.'%');
                        })
                        ->orWhereHas('tool', function ($tq) use ($search) {
                            $tq->where('name', 'like', '%'.$search.'%');
                        });
                });
            }
        }

        $perPage = max(1, min(100, (int) $request->input('per_page', 10)));
        $logs = $logsQuery->paginate($perPage)->appends($request->query());

        $latestTools = Tool::query()
            ->with(['creator:id,name,email', 'categories', 'tags', 'roles'])
            ->latest()
            ->limit(10)
            ->get();

        return response()->json([
            'latest_tools' => ToolResource::collection($latestTools)->resolve(),
            'logs' => AuditLogResource::collection($logs->items())->resolve(),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
                'last_page' => $logs->lastPage(),
                'from' => $logs->firstItem(),
                'to' => $logs->lastItem(),
            ],
            'filters' => [
                'actions' => AuditLog::query()
                    ->select('action')
                    ->distinct()
                    ->orderBy('action')
                    ->pluck('action')
                    ->values(),
            ],
        ]);
    }
}
