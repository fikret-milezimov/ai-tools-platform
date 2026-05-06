<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ToolResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'link' => $this->link,
            'documentation_url' => $this->documentation_url,
            'description' => $this->description,
            'how_to_use' => $this->how_to_use,
            'real_examples' => $this->real_examples,
            'image_url' => $this->image_url,
            'created_by' => $this->created_by,
            'creator' => $this->whenLoaded('creator', function () {
                return [
                    'id' => $this->creator->id,
                    'name' => $this->creator->name,
                    'email' => $this->creator->email,
                ];
            }),
            'categories' => $this->whenLoaded(
                'categories',
                fn () => $this->categories->map(fn ($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                ])->values()
            ),
            'tags' => $this->whenLoaded(
                'tags',
                fn () => $this->tags->map(fn ($t) => [
                    'id' => $t->id,
                    'name' => $t->name,
                ])->values()
            ),
            'roles' => $this->whenLoaded(
                'roles',
                fn () => $this->roles->map(fn ($r) => [
                    'id' => $r->id,
                    'slug' => $r->slug,
                    'name' => $r->name,
                ])->values()
            ),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
