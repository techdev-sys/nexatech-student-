<!doctype html>
<html lang="en">
<body style="font-family: Arial, sans-serif; color: #1a1b1f;">
    <h1 style="font-size: 22px;">Payment receipt</h1>
    <p>Payment reference: <strong>{{ $transaction->transaction_reference }}</strong></p>
    <p>Invoice: {{ $transaction->invoice->invoice_number }}</p>
    <p>Amount received: {{ $transaction->currency }} {{ number_format((float) $transaction->amount, 2) }}</p>
    <p>Remaining balance: {{ $transaction->currency }} {{ number_format((float) $transaction->invoice->balance_amount, 2) }}</p>
    <p>Student: {{ $transaction->invoice->student->first_name }} {{ $transaction->invoice->student->last_name }}</p>
    <p>Thank you. Keep this message for your records.</p>
</body>
</html>
