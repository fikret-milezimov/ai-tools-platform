<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tool;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min(100, (int) $request->input('per_page', 10)));

        $usersQuery = User::query()
            ->select(['id', 'name', 'email', 'role', 'is_active', 'created_at'])
            ->latest('id');

        if ($request->filled('role')) {
            $usersQuery->where('role', (string) $request->input('role'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            if ($search !== '') {
                $usersQuery->where(function ($q) use ($search) {
                    $q->where('name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%');
                });
            }
        }

        $users = $usersQuery
            ->paginate($perPage)
            ->appends($request->query());

        return response()->json([
            'users' => $users->items(),
            'pagination' => [
                'current_page' => $users->currentPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
                'last_page' => $users->lastPage(),
                'from' => $users->firstItem(),
                'to' => $users->lastItem(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (! $actor) {
            abort(401);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email:rfc,dns', 'max:255', 'unique:users,email'],
            'role' => ['required', 'in:owner,backend,frontend,designer,qa,pm'],
            'password' => ['required', 'string', 'min:8', 'max:255'],
        ]);

        $user = User::query()->create([
            'name' => trim((string) $data['name']),
            'email' => strtolower(trim((string) $data['email'])),
            'role' => (string) $data['role'],
            'is_active' => true,
            'password' => (string) $data['password'],
            'two_factor_email_enabled' => false,
            'two_factor_totp_secret' => null,
            'two_factor_totp_enabled_at' => null,
        ]);

        AuditLogger::log(
            $actor,
            'user.created',
            null,
            [
                'created_user_id' => $user->id,
                'created_user_email' => $user->email,
                'created_user_role' => $user->role,
            ]
        );

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'is_active' => (bool) $user->is_active,
                'created_at' => $user->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    public function updateRole(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();
        if (! $actor) {
            abort(401);
        }
        if ((int) $actor->id === (int) $user->id) {
            abort(422, 'You cannot change your own role.');
        }

        $data = $request->validate([
            'role' => ['required', 'in:owner,backend,frontend,designer,qa,pm'],
        ]);

        $newRole = (string) $data['role'];
        $oldRole = (string) $user->role;
        if ($newRole === $oldRole) {
            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'role' => $user->role,
                ],
            ]);
        }

        if (
            $oldRole === 'owner'
            && $newRole !== 'owner'
            && $user->is_active
            && $this->activeOwnersCount() <= 1
        ) {
            abort(422, 'At least one active owner must remain.');
        }

        $user->update([
            'role' => $newRole,
        ]);

        AuditLogger::log(
            $actor,
            'user.role.updated',
            null,
            [
                'target_user_id' => $user->id,
                'target_user_email' => $user->email,
                'from' => $oldRole,
                'to' => $newRole,
            ]
        );

        return response()->json([
            'user' => [
                'id' => $user->id,
                'role' => $user->role,
            ],
        ]);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();
        if (! $actor) {
            abort(401);
        }
        if ((int) $actor->id === (int) $user->id) {
            abort(422, 'You cannot change your own status.');
        }

        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $newStatus = (bool) $data['is_active'];
        $oldStatus = (bool) $user->is_active;
        if ($newStatus === $oldStatus) {
            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'is_active' => (bool) $user->is_active,
                ],
            ]);
        }

        if ($user->role === 'owner' && ! $newStatus && $this->activeOwnersCount() <= 1) {
            abort(422, 'At least one active owner must remain.');
        }

        $user->update([
            'is_active' => $newStatus,
        ]);

        if (! $newStatus) {
            $user->tokens()->delete();
        }

        AuditLogger::log(
            $actor,
            'user.status.updated',
            null,
            [
                'target_user_id' => $user->id,
                'target_user_email' => $user->email,
                'from' => $oldStatus,
                'to' => $newStatus,
            ]
        );

        return response()->json([
            'user' => [
                'id' => $user->id,
                'is_active' => (bool) $user->is_active,
            ],
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();
        if (! $actor) {
            abort(401);
        }
        if ((int) $actor->id === (int) $user->id) {
            abort(422, 'You cannot delete your own account.');
        }

        if ($user->role === 'owner' && $user->is_active && $this->activeOwnersCount() <= 1) {
            abort(422, 'At least one active owner must remain.');
        }

        $toolsOwned = Tool::query()->where('created_by', $user->id)->count();
        $replacementId = $this->toolCreatorReassignmentId((int) $user->id);
        if ($toolsOwned > 0 && $replacementId === null) {
            abort(422, 'Cannot delete user: no other user exists to reassign tool ownership.');
        }

        $deletedEmail = $user->email;
        $deletedId = (int) $user->id;

        DB::transaction(function () use ($user, $replacementId, $toolsOwned, $actor, $deletedId, $deletedEmail): void {
            if ($toolsOwned > 0) {
                Tool::query()->where('created_by', $user->id)->update(['created_by' => $replacementId]);
            }
            $user->tokens()->delete();

            AuditLogger::log($actor, 'user.deleted', null, [
                'target_user_id' => $deletedId,
                'target_user_email' => $deletedEmail,
            ]);

            $user->delete();
        });

        return response()->json(['message' => 'User deleted.']);
    }

    private function toolCreatorReassignmentId(int $excludeUserId): ?int
    {
        $preferOwner = User::query()
            ->where('id', '!=', $excludeUserId)
            ->where('role', 'owner')
            ->orderByDesc('is_active')
            ->orderBy('id')
            ->value('id');

        if ($preferOwner !== null) {
            return (int) $preferOwner;
        }

        $any = User::query()
            ->where('id', '!=', $excludeUserId)
            ->orderByDesc('is_active')
            ->orderBy('id')
            ->value('id');

        return $any !== null ? (int) $any : null;
    }

    private function activeOwnersCount(): int
    {
        return User::query()->where('role', 'owner')->where('is_active', true)->count();
    }
}
