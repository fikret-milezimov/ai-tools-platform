<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tool;
use App\Models\ToolComment;
use App\Models\ToolRating;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ToolFeedbackController extends Controller
{
    public function index(Request $request, Tool $tool): JsonResponse
    {
        $perPage = max(1, min(50, (int) $request->input('per_page', 10)));
        $comments = ToolComment::query()
            ->where('tool_id', $tool->id)
            ->with('user:id,name,email,role')
            ->latest()
            ->paginate($perPage)
            ->appends($request->query());

        $avg = ToolRating::query()
            ->where('tool_id', $tool->id)
            ->avg('rating');
        $count = ToolRating::query()
            ->where('tool_id', $tool->id)
            ->count();

        $myRating = null;
        if ($request->user()) {
            $myRating = ToolRating::query()
                ->where('tool_id', $tool->id)
                ->where('user_id', $request->user()->id)
                ->value('rating');
        }

        return response()->json([
            'summary' => [
                'average_rating' => $avg !== null ? round((float) $avg, 2) : null,
                'ratings_count' => $count,
                'my_rating' => $myRating !== null ? (int) $myRating : null,
            ],
            'comments' => collect($comments->items())->map(function (ToolComment $comment) {
                return [
                    'id' => $comment->id,
                    'body' => $comment->body,
                    'created_at' => $comment->created_at?->toIso8601String(),
                    'user' => $comment->user ? [
                        'id' => $comment->user->id,
                        'name' => $comment->user->name,
                        'email' => $comment->user->email,
                        'role' => $comment->user->role,
                    ] : null,
                ];
            })->values(),
            'pagination' => [
                'current_page' => $comments->currentPage(),
                'per_page' => $comments->perPage(),
                'total' => $comments->total(),
                'last_page' => $comments->lastPage(),
                'from' => $comments->firstItem(),
                'to' => $comments->lastItem(),
            ],
        ]);
    }

    public function upsertRating(Request $request, Tool $tool): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $data = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
        ]);

        $rating = ToolRating::query()->updateOrCreate(
            [
                'tool_id' => $tool->id,
                'user_id' => $user->id,
            ],
            [
                'rating' => (int) $data['rating'],
            ]
        );

        AuditLogger::log(
            $user,
            'tool.rating.upsert',
            $tool,
            [
                'rating' => (int) $rating->rating,
                'created' => (bool) $rating->wasRecentlyCreated,
            ]
        );

        return response()->json(['message' => 'Rating saved.']);
    }

    public function addComment(Request $request, Tool $tool): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $data = $request->validate([
            'body' => ['required', 'string', 'max:3000'],
        ]);

        $comment = ToolComment::query()->create([
            'tool_id' => $tool->id,
            'user_id' => $user->id,
            'body' => trim((string) $data['body']),
        ]);
        $comment->load('user:id,name,email,role');

        AuditLogger::log(
            $user,
            'tool.comment.created',
            $tool,
            [
                'comment_id' => $comment->id,
            ]
        );

        return response()->json([
            'comment' => [
                'id' => $comment->id,
                'body' => $comment->body,
                'created_at' => $comment->created_at?->toIso8601String(),
                'user' => [
                    'id' => $comment->user->id,
                    'name' => $comment->user->name,
                    'email' => $comment->user->email,
                    'role' => $comment->user->role,
                ],
            ],
        ], 201);
    }
}
