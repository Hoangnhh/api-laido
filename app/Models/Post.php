<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'content',
        'thumbnail',
        'status',
        'published_at',
        'author_id',
        'category',
    ];

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
