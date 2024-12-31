<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    /**
     * Bảng liên kết với model
     */
    protected $table = 'reviews';

    /**
     * Các trường có thể gán giá trị
     */
    protected $fillable = [
        'staff_code',
        'customer_name', 
        'customer_phone',
        'email',
        'stars',
        'other_review',
        'note',
        'is_view'
    ];

    /**
     * Không sử dụng updated_at
     */
    public const UPDATED_AT = null;

    /**
     * Config cho các loại đánh giá khác
     */
    const OTHER_REVIEW_CONFIG = [
        'lich_su' => [
            'name' => 'Lịch sự',
            'score' => 1
        ],
        'thai_do_tot' => [
            'name' => 'Thái độ tốt',
            'score' => 1
        ],
        'dieu_khien_an_toan' => [
            'name' => 'Điều khiển an toàn',
            'score' => 1
        ],
    ];

    /**
     * Relationship với Staff
     */
    public function staff()
    {
        return $this->belongsTo(Staff::class, 'staff_code', 'code');
    }

    /**
     * Scope để lọc các review chưa xem
     */
    public function scopeUnviewed($query)
    {
        return $query->where('is_view', 0);
    }

    /**
     * Scope để lọc theo số sao
     */
    public function scopeWithStars($query, $stars)
    {
        return $query->where('stars', $stars);
    }

    /**
     * Lấy tên tiếng Việt của other_review
     */
    public function getOtherReviewName()
    {
        if (empty($this->other_review)) {
            return null;
        }

        // Nếu other_review là JSON string, decode nó
        $reviews = is_string($this->other_review) ? json_decode($this->other_review, true) : $this->other_review;

        if (!is_array($reviews)) {
            return null;
        }

        $names = [];
        foreach ($reviews as $review => $value) {
            if (isset(self::OTHER_REVIEW_CONFIG[$review]) && $value == 1) {
                $names[] = self::OTHER_REVIEW_CONFIG[$review]['name'];
            }
        }

        return !empty($names) ? implode(', ', $names) : null;
    }

    /**
     * Tính tổng điểm trừ từ other_review
     */
    public function calculatePenaltyScore()
    {
        if (empty($this->other_review)) {
            return 0;
        }

        $reviews = is_string($this->other_review) ? json_decode($this->other_review, true) : $this->other_review;

        if (!is_array($reviews)) {
            return 0;
        }

        $totalScore = 0;
        foreach ($reviews as $review) {
            if (isset(self::OTHER_REVIEW_CONFIG[$review])) {
                $totalScore += self::OTHER_REVIEW_CONFIG[$review]['score'];
            }
        }

        return $totalScore;
    }

    /**
     * Lấy danh sách config other review
     */
    public static function getOtherReviewConfig()
    {
        return self::OTHER_REVIEW_CONFIG;
    }

    /**
     * Append các trường tính toán vào JSON
     */
    protected $appends = ['other_review_names', 'penalty_score'];

    /**
     * Get other review names attribute
     */
    public function getOtherReviewNamesAttribute()
    {
        return $this->getOtherReviewName();
    }

    /**
     * Get penalty score attribute
     */
    public function getPenaltyScoreAttribute()
    {
        return $this->calculatePenaltyScore();
    }
} 