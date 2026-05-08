<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Role;
use App\Models\Tag;
use App\Models\Tool;
use App\Models\User;
use Illuminate\Database\Seeder;

class ToolSeeder extends Seeder
{
    public function run(): void
    {
        // Attribute tools to an owner so non-owner demo users (e.g. frontend) are not creators.
        // Avoid User::query()->value('id') without order — that row is DB-dependent and can be any user.
        $userId = User::query()
            ->where('role', 'owner')
            ->orderBy('id')
            ->value('id')
            ?? User::query()->orderBy('id')->value('id');

        if (! $userId) {
            return;
        }

        $chatgpt = Tool::query()->updateOrCreate(
            ['name' => 'ChatGPT'],
            [
                'link' => 'https://chat.openai.com',
                'documentation_url' => 'https://platform.openai.com/docs',
                'description' => 'Conversational AI for writing, coding help, and research.',
                'how_to_use' => 'Sign in, start a chat, and ask clear questions. Use system prompts for repeatable tasks.',
                'real_examples' => "Example: \"Summarize this article in three bullet points.\"",
                'image_url' => null,
                'created_by' => $userId,
                'approval_status' => 'approved',
            ]
        );

        $chatgpt->categories()->sync(
            Category::query()->whereIn('name', ['Generative AI', 'Developer tools'])->pluck('id')
        );
        $chatgpt->tags()->sync(
            Tag::query()->whereIn('name', ['Free tier', 'Paid', 'Official API'])->pluck('id')
        );
        $chatgpt->roles()->sync(
            Role::query()->whereIn('slug', ['frontend', 'backend', 'pm', 'designer'])->pluck('id')
        );

        $cursor = Tool::query()->updateOrCreate(
            ['name' => 'Cursor'],
            [
                'link' => 'https://cursor.com',
                'documentation_url' => 'https://docs.cursor.com',
                'description' => 'AI-first code editor based on VS Code.',
                'how_to_use' => 'Install, open a repo, use Cmd+K for inline edits and chat for larger refactors.',
                'real_examples' => null,
                'image_url' => null,
                'created_by' => $userId,
                'approval_status' => 'approved',
            ]
        );

        $cursor->categories()->sync(
            Category::query()->whereIn('name', ['Developer tools', 'Generative AI'])->pluck('id')
        );
        $cursor->tags()->sync(
            Tag::query()->whereIn('name', ['Paid', 'Beginner-friendly'])->pluck('id')
        );
        $cursor->roles()->sync(
            Role::query()->whereIn('slug', ['backend', 'frontend', 'owner'])->pluck('id')
        );

        $playwright = Tool::query()->updateOrCreate(
            ['name' => 'Playwright'],
            [
                'link' => 'https://playwright.dev',
                'documentation_url' => 'https://playwright.dev/docs/intro',
                'description' => 'End-to-end browser testing framework.',
                'how_to_use' => 'Install @playwright/test, write tests in TypeScript or JavaScript, run npx playwright test.',
                'real_examples' => 'await page.goto("https://example.com"); await expect(page).toHaveTitle(/Example/);',
                'image_url' => null,
                'created_by' => $userId,
                'approval_status' => 'approved',
            ]
        );

        $playwright->categories()->sync(
            Category::query()->whereIn('name', ['QA & testing', 'Developer tools'])->pluck('id')
        );
        $playwright->tags()->sync(
            Tag::query()->whereIn('name', ['Open source', 'Free tier', 'Official API'])->pluck('id')
        );
        $playwright->roles()->sync(
            Role::query()->whereIn('slug', ['qa', 'backend', 'frontend'])->pluck('id')
        );
    }
}
