<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $users = User::where('school_id', $request->user()->school_id)
            ->when($request->role, fn($q) => $q->where('role', $request->role))
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'created_at']);

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $allowedRoles = $request->user()->isSuperAdmin()
            ? ['admin', 'teacher', 'parent']
            : ['teacher', 'parent'];

        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role'     => 'required|in:' . implode(',', $allowedRoles),
        ]);

        $user = User::create([
            'school_id' => $request->user()->school_id,
            'name'      => $data['name'],
            'email'     => $data['email'],
            'password'  => Hash::make($data['password']),
            'role'      => $data['role'],
        ]);

        return response()->json($user->only(['id', 'name', 'email', 'role', 'created_at']), 201);
    }

    public function update(Request $request, User $user)
    {
        abort_if($user->school_id !== $request->user()->school_id, 403);

        $allowedRoles = $request->user()->isSuperAdmin()
            ? ['admin', 'teacher', 'parent']
            : ['teacher', 'parent'];

        $data = $request->validate([
            'name'     => 'sometimes|string|max:255',
            'email'    => 'sometimes|email|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:8',
            'role'     => 'sometimes|in:' . implode(',', $allowedRoles),
        ]);

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        return response()->json($user->only(['id', 'name', 'email', 'role', 'created_at']));
    }

    public function destroy(Request $request, User $user)
    {
        abort_if($user->id === $request->user()->id, 422, 'Cannot delete your own account.');
        abort_if($user->school_id !== $request->user()->school_id, 403);
        abort_if($user->isSuperAdmin(), 422, 'Cannot delete a super admin account.');

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }
}
