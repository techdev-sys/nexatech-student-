<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'email'       => 'required|email|unique:users,email',
            'password'    => 'required|string|min:8|confirmed',
            'school_name' => 'required|string|max:255',
            'school_email'=> 'required|email|unique:schools,email',
        ]);

        $school = School::create([
            'name'  => $data['school_name'],
            'email' => $data['school_email'],
        ]);

        $user = User::create([
            'school_id' => $school->id,
            'name'      => $data['name'],
            'email'     => $data['email'],
            'password'  => Hash::make($data['password']),
            'role'      => 'super_admin',
        ]);

        $token = $user->createToken('api-token', ['*'], now()->addDays(30))->plainTextToken;

        return $this->withAuthCookie(response()->json([
            'user'  => $user->load('school'),
        ], 201), $token);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->school_id && !$user->school?->is_active) {
            throw ValidationException::withMessages([
                'email' => ['This school account has been deactivated.'],
            ]);
        }

        $token = $user->createToken('api-token', ['*'], now()->addDays(30))->plainTextToken;

        return $this->withAuthCookie(response()->json([
            'user'  => $user->load('school'),
        ]), $token);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.'])
            ->withoutCookie(config('auth_cookie.name'), '/', config('auth_cookie.domain'));
    }

    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:12|confirmed|different:current_password',
        ]);

        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->forceFill(['password' => Hash::make($data['password'])])->save();
        $user->tokens()->delete();

        return response()->json(['message' => 'Password changed. Sign in again.'])
            ->withoutCookie(config('auth_cookie.name'), '/', config('auth_cookie.domain'));
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->load('school'));
    }

    private function withAuthCookie($response, string $token)
    {
        return $response->cookie(
            config('auth_cookie.name'),
            $token,
            config('auth_cookie.lifetime_minutes'),
            '/',
            config('auth_cookie.domain'),
            config('auth_cookie.secure'),
            true,
            false,
            config('auth_cookie.same_site'),
        );
    }
}
