<?php

namespace App\Observers;

use App\Services\ActivityLogger;
use Illuminate\Database\Eloquent\Model;

/**
 * Single observer wired to multiple models.
 * Registered in AppServiceProvider.
 */
class AuditObserver
{
    public function created(Model $model): void
    {
        ActivityLogger::log('created', $model, null, $this->sanitize($model, $model->getAttributes()));
    }

    public function updated(Model $model): void
    {
        ActivityLogger::log(
            'updated',
            $model,
            $this->sanitize($model, $model->getOriginal()),
            $this->sanitize($model, $model->getChanges()),
        );
    }

    public function deleted(Model $model): void
    {
        ActivityLogger::log('deleted', $model, $this->sanitize($model, $model->getAttributes()), null);
    }

    public function restored(Model $model): void
    {
        ActivityLogger::log('restored', $model, null, $this->sanitize($model, $model->getAttributes()));
    }

    /**
     * Strip model-specific sensitive fields declared in $auditRedact.
     */
    private function sanitize(Model $model, ?array $data): ?array
    {
        if (!$data) {
            return null;
        }

        $exclude = property_exists($model, 'auditRedact') ? $model::$auditRedact : [];

        return empty($exclude) ? $data : array_diff_key($data, array_flip($exclude));
    }
}
