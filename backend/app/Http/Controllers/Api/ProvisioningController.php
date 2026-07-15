<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProvisioningController extends Controller
{
    public function index()
    {
        $schools = School::withCount(['students', 'users'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($s) => [
                'id'             => $s->id,
                'name'           => $s->name,
                'email'          => $s->email,
                'phone'          => $s->phone,
                'address'        => $s->address,
                'is_active'      => (bool) $s->is_active,
                'students_count' => $s->students_count,
                'users_count'    => $s->users_count,
                'created_at'     => $s->created_at->format('Y-m-d'),
            ]);

        return response()->json([
            'total'   => $schools->count(),
            'active'  => $schools->where('is_active', true)->count(),
            'schools' => $schools->values(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'school_name'    => 'required|string|max:255',
            'school_email'   => 'required|email|unique:schools,email',
            'school_phone'   => 'nullable|string|max:30',
            'school_address' => 'nullable|string|max:500',
            'admin_name'     => 'required|string|max:255',
            'admin_email'    => 'required|email|unique:users,email',
            'admin_password' => 'required|string|min:8',
        ]);

        $school = School::create([
            'name'      => $data['school_name'],
            'email'     => $data['school_email'],
            'phone'     => $data['school_phone'] ?? null,
            'address'   => $data['school_address'] ?? null,
            'is_active' => true,
        ]);

        $admin = User::create([
            'school_id' => $school->id,
            'name'      => $data['admin_name'],
            'email'     => $data['admin_email'],
            'password'  => Hash::make($data['admin_password']),
            'role'      => 'super_admin',
        ]);

        return response()->json([
            'school' => $school,
            'admin'  => $admin->only(['id', 'name', 'email', 'role']),
        ], 201);
    }

    public function toggleActive(School $school)
    {
        $school->update(['is_active' => !$school->is_active]);

        return response()->json([
            'id'        => $school->id,
            'name'      => $school->name,
            'is_active' => (bool) $school->is_active,
        ]);
    }
}
