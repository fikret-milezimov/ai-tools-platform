<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreToolRequest;
use App\Http\Requests\UpdateToolRequest;
use App\Http\Resources\ToolResource;
use App\Models\Tool;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class ToolController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Tool::query()
            ->where('approval_status', 'approved')
            ->with(['creator:id,name,email', 'categories', 'tags', 'roles'])
            ->latest();

        $nameSearch = $request->filled('search')
            ? $request->string('search')
            : ($request->filled('name') ? $request->string('name') : null);

        if ($nameSearch !== null && (string) $nameSearch !== '') {
            $query->where('name', 'like', '%'.(string) $nameSearch.'%');
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

        if ($request->filled('tag_id')) {
            $tagId = (int) $request->input('tag_id');
            $query->whereHas('tags', function ($q) use ($tagId) {
                $q->where('tags.id', $tagId);
            });
        }

        return ToolResource::collection($query->get());
    }

    public function store(StoreToolRequest $request): JsonResponse
    {
        $data = $request->validated();

        $categoryIds = $data['category_ids'] ?? [];
        $tagIds = $data['tag_ids'] ?? [];
        $roleIds = $data['role_ids'] ?? [];

        unset($data['category_ids'], $data['tag_ids'], $data['role_ids']);
        unset($data['screenshot']);

        if ($request->hasFile('screenshot')) {
            $path = $request->file('screenshot')->store('tool-images', 'public');
            $data['image_url'] = Storage::disk('public')->url($path);
        }

        $data['created_by'] = $request->user()->id;
        $data['approval_status'] = 'pending';

        $tool = Tool::query()->create($data);

        $tool->categories()->sync($categoryIds);
        $tool->tags()->sync($tagIds);
        $tool->roles()->sync($roleIds);

        $tool->load(['creator:id,name,email', 'categories', 'tags', 'roles']);

        return (new ToolResource($tool))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Request $request, Tool $tool): ToolResource
    {
        if ($tool->approval_status !== 'approved') {
            $user = $request->user('sanctum');
            $allowed = $user !== null && (
                $user->role === 'owner' || (int) $user->id === (int) $tool->created_by
            );
            if (! $allowed) {
                throw new NotFoundHttpException;
            }
        }

        $tool->load(['creator:id,name,email', 'categories', 'tags', 'roles']);

        return new ToolResource($tool);
    }

    public function update(UpdateToolRequest $request, Tool $tool): ToolResource
    {
        $data = $request->validated();

        $categoryIds = $data['category_ids'] ?? [];
        $tagIds = $data['tag_ids'] ?? [];
        $roleIds = $data['role_ids'] ?? [];

        unset($data['category_ids'], $data['tag_ids'], $data['role_ids']);
        unset($data['screenshot']);

        if ($request->hasFile('screenshot')) {
            $path = $request->file('screenshot')->store('tool-images', 'public');
            $data['image_url'] = Storage::disk('public')->url($path);
        }

        if (
            $request->user()->role !== 'owner'
            && $tool->approval_status === 'rejected'
        ) {
            $data['approval_status'] = 'pending';
        }

        $tool->update($data);

        $tool->categories()->sync($categoryIds);
        $tool->tags()->sync($tagIds);
        $tool->roles()->sync($roleIds);

        $tool->load(['creator:id,name,email', 'categories', 'tags', 'roles']);

        return new ToolResource($tool);
    }

    public function destroy(Tool $tool): Response
    {
        $tool->delete();

        return response()->noContent();
    }
}
