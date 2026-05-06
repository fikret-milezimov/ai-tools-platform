<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Roles that can be linked to tools (many-to-many). Slugs can match users.role.
 */
class Role extends Model
{
    protected $fillable = [
        'slug',
        'name',
    ];

    public function tools(): BelongsToMany
    {
        return $this->belongsToMany(Tool::class);
    }
}
