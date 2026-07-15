<?php

namespace App\Mail;

use App\Models\Communication;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CommunicationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Communication $communication,
        public ?string       $recipientName = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->communication->subject ?? 'Message from ' . config('app.name'),
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.communication');
    }

    public function attachments(): array
    {
        return [];
    }
}
