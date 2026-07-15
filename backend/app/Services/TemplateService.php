<?php

namespace App\Services;

class TemplateService
{
    /**
     * Replace {{variable}} placeholders with actual values.
     *
     * Supported variables:
     *   {{student_name}}  {{parent_name}}  {{school_name}}
     *   {{grade}}  {{date}}  {{subject}}
     */
    public function render(string $body, array $variables = []): string
    {
        foreach ($variables as $key => $value) {
            $body = str_replace('{{' . $key . '}}', (string) $value, $body);
        }

        return $body;
    }

    /**
     * Extract all {{variable}} tokens from a template body.
     */
    public function extractVariables(string $body): array
    {
        preg_match_all('/\{\{(\w+)\}\}/', $body, $matches);

        return array_unique($matches[1] ?? []);
    }
}
