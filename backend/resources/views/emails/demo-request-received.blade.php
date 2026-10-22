<!doctype html>
<html lang="en">
<body style="font-family: Arial, sans-serif; color: #1a1b1f;">
    <h1 style="font-size: 22px;">New Nexatech demo request</h1>
    <p>A visitor has requested access to the Nexatech demonstration.</p>
    <table style="border-collapse: collapse;">
        <tr><th style="padding: 4px 16px 4px 0; text-align: left;">Name</th><td>{{ $demoRequest->name }}</td></tr>
        <tr><th style="padding: 4px 16px 4px 0; text-align: left;">Institution</th><td>{{ $demoRequest->institution }}</td></tr>
        <tr><th style="padding: 4px 16px 4px 0; text-align: left;">Email</th><td>{{ $demoRequest->email }}</td></tr>
        <tr><th style="padding: 4px 16px 4px 0; text-align: left;">Phone</th><td>{{ $demoRequest->phone ?: 'Not provided' }}</td></tr>
        <tr><th style="padding: 4px 16px 4px 0; text-align: left;">Role</th><td>{{ $demoRequest->role ?: 'Not provided' }}</td></tr>
        <tr><th style="padding: 4px 16px 4px 0; text-align: left;">Country</th><td>{{ $demoRequest->country ?: 'Not provided' }}</td></tr>
        <tr><th style="padding: 4px 16px 4px 0; text-align: left;">Requested</th><td>{{ $demoRequest->created_at?->toDayDateTimeString() }}</td></tr>
    </table>
    <p>Sign in to the platform and open <strong>Demo Requests</strong> to approve or reject it.</p>
</body>
</html>
