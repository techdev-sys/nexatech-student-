<!doctype html>
<html lang="en">
<body style="font-family: Arial, sans-serif; color: #1a1b1f;">
    <h1 style="font-size: 22px;">Nexatech School Operations Platform demo access</h1>
    <p>Hello {{ $demoRequest->name }},</p>
    <p>Your evaluation request for {{ $demoRequest->institution }} has been approved.</p>
    <p>Your single-use access code is:</p>
    <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">{{ $accessCode }}</p>
    <p>This code expires at {{ $expiresAt->toDayDateTimeString() }} and can be redeemed once for one role workspace.</p>
    <p>Use the same email address from your request when redeeming the code. The demo workspace is read-only and contains synthetic data.</p>
</body>
</html>
