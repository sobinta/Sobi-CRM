# Business modules

Modules are thin compositions of the shared engines plus a **manifest**
(`core/module-registry/module-manifests.ts`) declaring the module's workspace,
nav, permissions, and relationship kinds. Activation is a feature grant
(`module.<key>`); the workspace rail is composed per-request from the tenant's
active modules.

The 8 first-build modules collapse into **two reusable engine patterns**:

## Pipeline / case-driven (Pipeline + Documents + Finance + Rules)
| Module | Core entities |
|---|---|
| **Insurance** *(reference build)* | products, carriers, **policies** (expiry → renewal reminders), **claims**, commissions |
| **Loan & Banking** | applications, bank partners, applicant profile (encrypted income), credit checklist, submissions |
| **Real Estate** | properties, buyer/seller roles, viewings, offers, contracts, matching |
| **Sales & Agency** | campaigns, proposals, targets, performance |
| **Immigration** | visa/permit cases, authority submissions, required-doc templates, deadlines |

## Booking / service-driven (Booking engine)
| Module | Core entities |
|---|---|
| **Barber Shop** | services, staff, chairs, appointments, walk-ins, visit history |
| **Beauty Salon** | + treatment series, before/after photos, consent forms |
| **Restaurant** | table reservations, guest profiles/allergies, event leads |

**Insurance** is fully realized (dashboard with renewal reminders + policies).
The **booking** schema (`Service`, `StaffMember`, `Appointment`) backs the
service modules. The remaining spec modules (Investment, Legal, Education,
Healthcare, Service & Maintenance, Project Management) are registered scaffolds
shown as "coming soon" in module activation.

## Adding a module
1. Add a Prisma schema file `mod-<key>.prisma` (or reuse the booking/pipeline
   engines) and register its models in `core/tenancy/model-metadata.ts`.
2. Register a manifest in `module-manifests.ts` (workspace, nav, permissions).
3. Add the module to `core/module-registry/catalog.ts`.
4. Build pages under `app/[locale]/(app)/m/<key>/` composing the engines.
