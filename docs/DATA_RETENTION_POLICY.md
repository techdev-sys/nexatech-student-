# Nexatech School Operations Platform data retention policy

Status: operational baseline for legal review before production launch.

## Principles

- Collect only information needed to operate the school service.
- Treat learner records, attendance, results, behaviour, guardian contacts, and payment data as confidential.
- Use synthetic information only in demonstrations and testing.
- Give each school control over exports, correction requests, and deletion requests, subject to applicable education and financial-record obligations.
- Never reuse production learner data in demonstrations, development, or support reproductions.

## Default retention windows

| Record | Default | Disposal |
|---|---:|---|
| Rejected, expired, or redeemed demo requests | 30 days | Automated hard deletion |
| Communication delivery diagnostics | 180 days | Automated hard deletion |
| Administrative activity logs | 365 days | Automated hard deletion |
| Authentication tokens | 30 days maximum | Sanctum scheduled pruning |
| Student, academic, attendance, finance, and safeguarding records | School/legal policy | Export and controlled deletion workflow |
| Database backups | 30 days | Provider-managed encrypted expiry |

The scheduled `data:prune-retention` command enforces the operational windows. Run it with `--dry-run` before enabling the scheduler in a new environment.

## Data-subject and school requests

Before deleting school records, verify the requester, create an export, check statutory retention duties, record the approval, and ensure deletion propagates to replicas and expires from backups under the backup retention schedule.

## Security and incident handling

Production access must use least privilege, MFA for infrastructure accounts, encrypted transport and storage, audited administrative actions, and documented incident escalation. Suspected exposure of children’s data must be escalated immediately and handled under applicable Zimbabwean and customer-jurisdiction requirements.
