<?php

namespace App\Support;

use App\Models\AuditLog;
use App\Models\Tool;
use App\Models\User;

class AuditLogger
{
    /**
     * @param  array<string, mixed>|null  $meta
     */
    public static function log(?User $user, string $action, ?Tool $tool = null, ?array $meta = null): void
    {
        AuditLog::query()->create([
            'user_id' => $user?->id,
            'tool_id' => $tool?->id,
            'action' => $action,
            'meta' => $meta,
        ]);
    }
}
