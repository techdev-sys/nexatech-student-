<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{ $communication->subject ?? 'School Communication' }}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f1f5f9; margin:0; padding:24px; }
  .card { background:#fff; border-radius:12px; max-width:560px; margin:0 auto; padding:32px; box-shadow:0 1px 3px rgba(0,0,0,.08); }
  .logo { font-weight:700; font-size:18px; color:#4f46e5; margin-bottom:24px; }
  h1 { font-size:20px; font-weight:700; color:#1e293b; margin:0 0 16px; }
  p { color:#475569; line-height:1.6; margin:0 0 16px; white-space:pre-wrap; }
  .footer { margin-top:24px; font-size:12px; color:#94a3b8; }
  hr { border:none; border-top:1px solid #e2e8f0; margin:24px 0; }
</style>
</head>
<body>
<div class="card">
  <div class="logo">{{ config('app.name') }}</div>

  @if($recipientName)
    <p>Dear {{ $recipientName }},</p>
  @endif

  @if($communication->subject)
    <h1>{{ $communication->subject }}</h1>
  @endif

  <p>{{ $communication->body }}</p>

  <hr>
  <div class="footer">
    This message was sent by {{ config('app.name') }} School Management System.
    Please do not reply to this email.
  </div>
</div>
</body>
</html>
