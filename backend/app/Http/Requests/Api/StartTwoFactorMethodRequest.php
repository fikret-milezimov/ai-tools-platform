<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StartTwoFactorMethodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'pending_token' => ['required', 'string', 'size:64'],
            'method' => ['required', 'string', 'in:email,totp'],
        ];
    }
}
