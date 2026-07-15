<?php

namespace App\Services;

use App\Models\BehaviourIncident;
use App\Models\Student;

class BehaviourScoreService
{
    public function summary(Student $student, array $filters = []): array
    {
        $query = BehaviourIncident::where('student_id', $student->id)
            ->where('school_id', $student->school_id);

        if (!empty($filters['term'])) {
            $query->where('term', $filters['term']);
        }
        if (!empty($filters['academic_year'])) {
            $query->where('academic_year', $filters['academic_year']);
        }

        $incidents = $query->with('incidentType')->get();

        $totalPoints    = $incidents->sum('points');
        $positivePoints = $incidents->where('points', '>', 0)->sum('points');
        $negativePoints = $incidents->where('points', '<', 0)->sum('points');

        return [
            'total_points'    => $totalPoints,
            'positive_points' => $positivePoints,
            'negative_points' => $negativePoints,
            'standing'        => $this->standing($totalPoints),
            'incident_count'  => $incidents->count(),
        ];
    }

    public function standing(int $points): string
    {
        if ($points >= 50)          return 'Excellent';
        if ($points >= 10)          return 'Good';
        if ($points >= -20)         return 'Watchlist';
        return 'Critical';
    }

    public function standingColor(string $standing): string
    {
        return match ($standing) {
            'Excellent' => 'emerald',
            'Good'      => 'blue',
            'Watchlist' => 'amber',
            'Critical'  => 'red',
            default     => 'slate',
        };
    }
}
