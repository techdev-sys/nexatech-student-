<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Paynow redirects the parent back here after completing checkout.
// The React SPA will handle this URL and display a receipt page.
Route::get('/payment/return', fn() => redirect('/'))->name('paynow.return');
Route::get('/payment/cancel', fn() => redirect('/?payment=cancelled'))->name('payment.cancel');
