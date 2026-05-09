# Data Processing Addendum (DPA)

_Last updated: 2026-05-08_

This Data Processing Addendum applies to:
- **Self-hosters** running their own instance of Cited
- **Sponsors** who receive access to operational data for reporting purposes

## Roles

| Party | Role |
|-------|------|
| Self-host operator | Data Controller |
| Cited maintainers | Not a processor on self-host instances — maintainers have no access to user data on instances they do not operate |
| Hosted demo | Cited maintainers act as Controller until alpha launch (Phase 4), at which point a formal controller designation will be published |

## Processor Obligations (for hosted demo only)

Where Cited maintainers act as a processor on behalf of a business sponsor:

- Process data only on documented instructions from the controller
- Ensure persons authorized to process data are bound by confidentiality
- Implement appropriate technical and organizational measures (Supabase TDE at rest, TLS in transit)
- Engage sub-processors only with prior written consent; see [sub-processors.md](./sub-processors.md)
- Assist the controller with data subject rights requests, security obligations, and impact assessments
- Delete or return all personal data on termination of the agreement
- Make available all information necessary to demonstrate compliance

## Breach Notification

In the event of a personal data breach, we will notify affected controllers within **72 hours** of becoming aware of the breach, where feasible, in accordance with GDPR Article 33.

## Data Export on Termination

On termination of any data processing relationship, personal data will be returned in JSON format or deleted within 30 days, at the controller's election.

## Audit Rights

Controllers have the right to audit compliance with this DPA once per year, on 30 days' written notice.

## Sub-processors

Current sub-processor list: [sub-processors.md](./sub-processors.md)

Controllers must be notified of sub-processor changes with sufficient notice to object.

## Contact

**privacy@cited.dev** (placeholder)
