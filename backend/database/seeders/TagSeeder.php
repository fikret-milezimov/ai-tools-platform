<?php

namespace Database\Seeders;

use App\Models\Tag;
use Illuminate\Database\Seeder;

class TagSeeder extends Seeder
{
    public function run(): void
    {
        $names = [
            'Free tier',
            'Paid',
            'Open source',
            'Official API',
            'Beginner-friendly',
            'Enterprise',
        ];

        foreach ($names as $name) {
            Tag::query()->firstOrCreate(['name' => $name]);
        }
    }
}
