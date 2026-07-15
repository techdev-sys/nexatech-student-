<?php

namespace App\Services;

use App\Jobs\SendBehaviourIncidentNotificationJob;
use App\Models\BehaviourIncident;

class BehaviourNotificationService
{
    /**
     * Dispatch an SMS notification job if the incident type requires it.
     * Returns true when a job was dispatched, false otherwise.
     * Failure of the job does not affect incident creation.
     */
    public function dispatchIfRequired(BehaviourIncident $incident): bool
    {
        if ($incident->parent_notified_at !== null) {
            return false;
        }

        $type = $incident->incidentType;

        $shouldNotify = $type?->notify_parent
            || in_array($type?->severity, ['high', 'critical']);

        if (!$shouldNotify) {
            return false;
        }

        SendBehaviourIncidentNotificationJob::dispatch($incident);

        return true;
    }
}
