<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Sign-in code</title>
</head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1e293b;">
    <p>Hello {{ $userName }},</p>
    <p>Your verification code is:</p>
    <p style="font-size: 1.5rem; font-weight: 700; letter-spacing: 0.2em;">{{ $code }}</p>
    <p style="font-size: 0.875rem; color: #64748b;">This code expires in 10 minutes. If you did not try to sign in, you can ignore this email.</p>
</body>
</html>
