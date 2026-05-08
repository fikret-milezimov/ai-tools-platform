<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ToolComment;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ToolCommentController extends Controller
{
    public function update(Request $request, ToolComment $comment): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }
        if (! $this->canManageComment($user->id, $user->role, $comment->user_id)) {
            abort(403, 'You cannot edit this comment.');
        }

        $data = $request->validate([
            'body' => ['required', 'string', 'max:3000'],
        ]);
        $previousBody = $comment->body;
        $comment->update([
            'body' => trim((string) $data['body']),
        ]);
        $comment->load('user:id,name,email,role');
        $comment->loadMissing('tool');

        AuditLogger::log(
            $user,
            'tool.comment.updated',
            $comment->tool,
            [
                'comment_id' => $comment->id,
                'from' => $previousBody,
                'to' => $comment->body,
            ]
        );

        return response()->json([
            'comment' => [
                'id' => $comment->id,
                'body' => $comment->body,
                'created_at' => $comment->created_at?->toIso8601String(),
                'user' => $comment->user ? [
                    'id' => $comment->user->id,
                    'name' => $comment->user->name,
                    'email' => $comment->user->email,
                    'role' => $comment->user->role,
                ] : null,
            ],
        ]);
    }

    public function destroy(Request $request, ToolComment $comment): Response
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }
        if (! $this->canManageComment($user->id, $user->role, $comment->user_id)) {
            abort(403, 'You cannot delete this comment.');
        }

        $comment->loadMissing('tool');
        $tool = $comment->tool;
        $commentId = $comment->id;
        $deletedBody = $comment->body;

        $comment->delete();

        AuditLogger::log(
            $user,
            'tool.comment.deleted',
            $tool,
            [
                'comment_id' => $commentId,
                'body' => $deletedBody,
            ]
        );

        return response()->noContent();
    }

    private function canManageComment(int $actorId, string $actorRole, int $ownerId): bool
    {
        if ($actorId === $ownerId) {
            return true;
        }

        return in_array($actorRole, ['owner', 'pm'], true);
    }
}
