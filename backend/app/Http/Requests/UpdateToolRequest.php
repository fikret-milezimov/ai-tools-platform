<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateToolRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Same rules as create: full replacement on update (simplest for beginners).
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'link' => ['required', 'string', 'max:2048'],
            'documentation_url' => ['nullable', 'string', 'max:2048'],
            'description' => ['required', 'string'],
            'how_to_use' => ['nullable', 'string'],
            'real_examples' => ['nullable', 'string'],
            'image_url' => ['nullable', 'string', 'max:2048'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
            'tag_ids' => ['nullable', 'array'],
            'tag_ids.*' => ['integer', 'exists:tags,id'],
            'role_ids' => ['nullable', 'array'],
            'role_ids.*' => ['integer', 'exists:roles,id'],
            'screenshot' => ['nullable', 'image', 'max:4096', 'mimes:jpeg,png,webp,gif'],
        ];
    }
}
