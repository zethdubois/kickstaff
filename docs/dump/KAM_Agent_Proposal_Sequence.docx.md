**PROJECT PROPOSAL & STATEMENT OF WORK**

**Kickagent — Phase B**

**Prepared for:** _Matthew Becker and Otto Nielson, representing Kick Asset Management_

**Prepared by:** _Zeth duBois, representing No Friction LLC_

**Date:** _August 31, 2026_

This is the Phase B build plan promised as a Phase A deliverable. The **sequence of stages is final**. Provider choices, Bent Pipe handoff details, and accounting sign-off remain inputs to individual stages; they do not reopen the order of work.

## **Names used in this proposal**

| Term            | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **KAM**         | Kick Asset Management, the client.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Kickagent**   | The software being built: the backend.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **kickstaff**  | The frontend for Kickagent. People log into kickstaff.                                                                                                                                                                                                                                                                                                                                                                                                       |
| **AF**          | AppFolio, the current property-management system.                                                                                                                                                                                                                                                                                                                                                                                                             |
| **QB**          | QuickBooks, which remains the W2 payroll system.                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Bent Pipe**   | Bent's pipeline for cataloging invoices and bills — ingesting PDFs, scraping vendor sites for expense logs, and similar intake. Kickagent uses what it produces.                                                                                                                                                                                                                                                                                              |
| **Suppression** | A display rule, not a delete. Some amounts are real on the books but must not show up in certain views — especially owner statements. The usual example is **Management Income**: it is the management company's fee, so it must not appear as the owner's revenue. The money stays in Kickagent; owners simply do not see it as theirs. **Suppression behavior** is the set of those rules: which amounts are hidden, on which reports, and for which roles. |

After this table, those names are used as defined.

**Chatbot-assisted kickstaff.** kickstaff includes conversational assistance as a general capability of the frontend — another way to reach the same Kickagent records and actions, under the same roles and permissions. It is a global integration, not a feature scheduled stage by stage, and this proposal does not enumerate each command it can run. It is part of kickstaff; it will be there.

## **Third-party tools — review list**

AF and QB bundle a lot of outside work today (e-sign, screening, payments, listing posts). Kickagent / kickstaff have to connect to those jobs directly. This is the review list: what the product needs, what discovery actually named, and example vendors from the Phase A research. **No vendor on this list is locked** except where work has already started. Examples are starting points for the decisions in Section 10.

**Plaid:** No Friction has already opened contact and accounts with Plaid for bank linking. That relationship is in progress; the payment *rail* (ACH, check-send) is still open.

**On-prem?** means the job can run on a server KAM or No Friction controls — a hosted box they pay for, or a machine on their own power — without depending on that vendor's cloud. **No** means a bureau, bank, carrier, or public board has to stay in the middle.

**Keep — already in the KAM stack**

| Need | What it does | Today | Phase B | On-prem? |
| ---- | ------------ | ----- | ------- | -------- |
| **QB** | W2 payroll and related company books | QB | Keep. Kickagent does not replace payroll. | No |
| **Bent Pipe** | Catalog invoices and bills; ingest PDFs; scrape vendor expense logs | Bent Pipe | Keep. Confirm the handoff into Kickagent before Stage 2. | Yes — already a KAM/Bent pipeline that can live on a server they control |
| **Google Drive, Gmail, Google Voice** | Office files, email, and phone | Named in discovery (Otto, Max) | Keep as office tools. kickstaff may pull tenant email into the unified inbox; Voice stays a phone number, not a Kickagent feature. | No |

**Must choose — AF does this today, Kickagent cannot ship the workflow without a replacement**

| Need | What it does | Today (from discovery) | Example replacements (not chosen) | Choose before | On-prem? |
| ---- | ------------ | ---------------------- | --------------------------------- | ------------- | -------- |
| **E-signature** | Sign leases, renewals, and addenda | AF built-in e-sign | DocuSign, Dropbox Sign | Stage 3 | Possible — a self-hosted signer (not DocuSign/Dropbox Sign) can run on our server; the usual SaaS products cannot |
| **Tenant screening** | Credit, background, tenant history, proof of income | AF Folio Screen → Experian. Max: “we need this plugin.” AF takes a cut of the screening fee. | Experian (or equivalent), TransUnion SmartMove, Checkr | Stage 3 | No — credit bureaus stay off-box |
| **Payments (vendors, owners, and later rent if collected here)** | Pay bills and 1099 vendors; Otto likes AF Checksend with text 2FA; also wants owner payments that are not attached to a property | AF Checksend. “We do not use QB for making payments. Writes a check.” | **Plaid is underway:** No Friction has already opened contact and accounts with Plaid for bank linking. An ACH / check-send rail (e.g. Stripe, Dwolla, or a check-mail partner) is still to be chosen. 2FA can stay SMS or move to an authenticator. | Stage 2 | No — banks and payment rails stay off-box |
| **Listing syndication** | “Post to internet” / third-party marketing so a unit can be advertised off kickstaff | AF marketing tasks; Max listed “3rd party marketing” as a primary tool. Specific boards were not named. | The same boards KAM uses today (to be listed by the office), or a syndication partner | Stage 3 if ads must go live from kickstaff; otherwise post manually during the designated-group run | No — the boards are public sites. kickstaff itself can host the listing; posting *out* cannot |

**Infrastructure — Kickagent needs a vendor even though AF hid it**

| Need | What it does | Today | Example replacements (not chosen) | Choose before | On-prem? |
| ---- | ------------ | ----- | --------------------------------- | ------------- | -------- |
| **Document storage** | Leases, applications, lead warnings, move-in checklists, invoice PDFs | AF document store; Google Drive | S3 or equivalent | Stage 1 | Yes — disk or object storage on a server we control (S3-compatible or local) |
| **Email delivery** | Application requests, lease packets, owner notices, inbox mail | AF + Gmail | SendGrid, Postmark | Stage 3 (inbox / applications) | Possible — own mail server on our nickel; deliverability is harder than using SendGrid/Postmark |
| **SMS** | AF Checksend 2FA; tenant messages that behave like texts in the AF portal | AF SMS | Twilio, or drop SMS 2FA in favor of an authenticator | Stage 2 if payments keep SMS; Stage 3 if tenant text stays in scope | No — a carrier has to send the text |
| **Chatbot model** | Conversational kickstaff | Claude is already used in the office | The model / host used for kickstaff assistance | Global (not a stage) | Yes — a local model can run on a GPU/CPU box we control. Claude and similar APIs cannot |

**Later or optional — do not block Phase B**

| Need | What it does | Today | Notes | On-prem? |
| ---- | ------------ | ----- | ----- | -------- |
| **1099 e-file** | Year-end 1099-NEC generation and filing | AF upsell, never used; accountants do this in AF and QB | In-product generation is a nice-to-have. A filing *approach* is still a Stage 2 decision (keep the accountant, or pick Track1099 / Tax1099). | No — filing goes to the IRS / a filing service |
| **Address validation** | Clean property and unit addresses on import | Not named in discovery | Useful at migration; not required to start Stage 1. | Possible — skip the API or use a local address file |
| **Resident utility billing** | AF can attach a residential utility billing add-on to a lease | Mentioned in Max's lease notes; the team does not want that as a move-in step | Out of the Stage 3 gate unless KAM later asks for it. | No — typically a utility/billing vendor |

# **1 Overview**

Phase B is a self-paced build carried out by No Friction working directly with KAM staff as subject-matter contacts rather than as a larger project team. Because the work is led by a single builder rather than parallel workstreams, each stage depends on decisions, data, and working features established in the stage before it.

Progress is measured against six cumulative stages and their completion gates, not against calendar dates. Some stages produce visible workflows early; migration and reconciliation produce less new interface work but are required for a reliable AF replacement. Stage 6 exists only as a cutover buffer and is skipped if the parallel run already meets acceptance.

## **Designated property group — how the office tests old vs new**

The office does not switch the whole portfolio at once. KAM designates a **limited property group** — a small, named set of properties that is enough to exercise real bills, listings, leases, and owner views without putting the rest of the book at risk.

From Stage 2 onward, the office team runs that group **in parallel**: the same work in AF (and QB where it still applies) and in kickstaff / Kickagent. The point is a head-to-head comparison of the actual process, not a demo on fake data. Workers give feedback while current tools remain the system of record for the rest of the portfolio.

The group is chosen in Stage 1. Later stages use it as the default review set. Stage 5 widens history and parallel operation from that group to the agreed remaining properties only after the office is satisfied the processes match.

Commercial terms continue the Phase A engagement: the $24,000 contract value, monthly invoicing, and the Phase A $2,000 credit described in Sections 13–15.

## **Discovery basis**

This sequence incorporates the Phase A discovery records collected after the original draft was written:

- Otto's Administrator interview — accounting, cost, vendor, materials, and reporting requirements.
- Max's Property Manager interview — listings, applications, lease, renewal, and communication requirements.
- A session with Becker, and a follow-up with Otto, confirming accounting process and the general-ledger list the team wants to start from.

Only completed survey responses are treated as requirements. Blank fields are not interpreted as approval, rejection, or evidence that a function is unnecessary.

## **Chart of accounts — product feature, not a locked list**

kickstaff will include a **chart-of-accounts manager**, backed by Kickagent. Authorized users can add, edit, hide or deactivate, and remove unused GL accounts, and can maintain the flags the business already uses (cash-flow inclusion, 1099 exclusion, management-fee treatment, property vs corporate availability). Posted history is preserved when an account is retired.

The exact labels and the number of accounts are **not** a deliverable of this proposal. Otto's working export ([`chart_of_accounts-20260826.xlsx`](chart_of_accounts-20260826.xlsx), 26 August 2026) is attached as **seed data** for first import and as an example of the current AF list. It is not a frozen ledger. Construction and job costing may be tracked as attributes on bills and jobs even when they are not separate GL lines.

Governance here means permissions, consistency rules, and an audit trail so the list can be maintained without becoming a junk drawer.

# **2 Scope**

## **In scope**

- Shared operating records in Kickagent: properties, units, owners, applicants, tenants, leases, vendors, jobs, bills, materials, payments, and a user-managed chart of accounts.
- kickstaff as the access point. Roles determine which features and which records a signed-in user can see. Owners are a first-class role: they log into kickstaff and get realtime data for the properties they own (statements, cash flow, costs, occupancy), with “Management Income” suppressed.
- Chatbot-assisted kickstaff, as defined above: conversational access to the same Kickagent capabilities, not a separate product or stage.
- Non-payroll cost workflows from invoice intake through categorization, approval, payment, and reporting, including construction-oriented job costs and owner payments that are not attached to a property.
- Listings, applications, screening, lease execution, move-in, renewals, and a unified tenant inbox with concise, reviewable AI assistance.
- Recurring operational reports: cash flow, owner statements, profit and loss, and aged payables.
- A designated property group operated in parallel with current tools so the office can compare processes head to head, give feedback, and keep risk on a small set of properties.
- Migration of agreed AF history and the non-payroll QB data Kickagent needs, widening from the designated group to the rest of the agreed portfolio before cutover.

## **Out of scope for Phase B**

- **W2 payroll.** QB remains the payroll system. Construction labor cost may still be visible where it is needed for jobs; payroll execution is not being replaced.
- **Year-end 1099 form generation in kickstaff.** A filing *approach* must still be chosen before payment workflows are finalized (Section 10). Generating the forms in-product is a nice-to-have, not a Stage 2 gate.
- **Open-ended feature work in the cutover buffer.** Stage 6 closes only issues already identified during the parallel run.

## **Implementation inputs (do not reopen the sequence)**

- Third-party vendors are **not preselected**. The review list above is the menu; Section 10 is when each choice is due.
- **Bent Pipe** handoff, exception review, and which system owns vendor and bill corrections must be confirmed before Cost & Vendor workflows are finalized.
- Matt's accounting review is required for chart-of-accounts *governance rules*, construction-cost treatment, suppression, and report definitions — not for approving a fixed list of account names.

# **3 Confirmed priorities from discovery**

**Must — administration, accounting, and construction**

- Record costs against properties or jobs with a streamlined bill-approval process.
- Let authorized users manage the GL account list (add, edit, hide/deactivate, remove unused) without the list becoming inconsistent or unmanageable.
- Onboard vendors without duplicating the same record across systems.
- Support non-payroll vendor and 1099 payments, including owner payments that are not attached to a property.
- Record material purchases and associate invoice-derived costs with the correct job or property.
- Produce cash flow, owner statements, profit and loss, and aged payables.
- Suppress “Management Income” so it does not appear as owner revenue.
- Give owners their own kickstaff login, scoped by role to realtime data for their properties.

**Must — listings and tenant operations**

- Create and update properties and listings with configurable fields and less irrelevant data entry.
- Separate property or listing creation from the decision to market a unit.
- Allow applications and screening even when a unit is not actively marketed.
- Support lease templates, merge fields, e-signature, renewals, and a shorter move-in process.
- Reuse unit data for recurring charges, move-in charges, and other lease obligations.
- Centralize tenant communications and keep AI-assisted responses concise and controllable.

**Nice-to-have**

- A budget-versus-actual summary dashboard.
- Year-end 1099 form generation in kickstaff.

# **4 Stage 1 — Foundation & Operating Model**

_Cumulative progress mark: ~20%_

**Function.** Establish the Kickagent operating model for properties, units, people, vendors, jobs, bills, and a user-managed chart of accounts. Define how property-management activity and construction activity relate without forcing either into the other's workflow. kickstaff is the access point for administrators, accounting, property managers, and owners; role and property scope determine features and records.

**Dependencies.** Completed discovery and the Phase A technical environment. Accounting review of governance rules, construction-cost definitions, “Management Income” treatment, and the boundary between AF data, non-payroll QB data, and W2 payroll. Otto's attached chart is imported as the starting list; it is not the spec.

**What I'm doing.** Designing and building the Kickagent schema, role and permission model (including the owner role and property-scoped access), configurable property and unit fields, the chart-of-accounts manager, suppression rules, workflow states, and source-system mappings that later stages depend on. Loading the designated property group as the first live records. kickstaff is the review surface, including chatbot-assisted access as a general frontend capability.

**What the client can review.** Limited but real. Accounting can add, edit, hide, and retire sample GL accounts and confirm suppression behavior. Property managers can spot-check that the property and unit model matches how KAM actually operates, even though listings and applications are built in Stage 3. A sample owner login in kickstaff can be shown as a restricted view of the same product — not a separate portal. The office names the designated property group in this stage. This is foundation work, not a finished operations desk.

**Completion gate.** KAM approves the core records, accounting boundaries, chart-of-accounts *manager* (not a frozen account list), suppression behavior, minimum role permissions — including owner scope — and the named property group that later stages will run in parallel.

# **5 Stage 2 — Cost, Vendor & Construction Operations**

_Cumulative progress mark: ~40%_

**Function.** Manage non-payroll costs from invoice intake through categorization, approval, payment, and reporting. Support property-management expenses and construction-oriented job costs, including materials, vendors, contractors, owners, and costs incurred before occupancy.

**Dependencies.** The ledger manager, vendor, job, and suppression rules from Stage 1. The designated property group is the live test set. Live payment automation depends on a selected payment method and authentication model. Year-end *filing approach* (not in-product form generation) must be agreed.

**What I'm doing.** Building invoice-ingestion handoffs from Bent Pipe, bill review, configurable approval flows, recurring-bill exceptions, GL categorization against the managed account list, vendor onboarding, weekly payment workflows, material-to-job allocation, aged payables, and bill detail by vendor. Owner payments that do not attach to a property are included. “Management Income” is not presented as owner revenue.

**What the client can review.** The office processes the designated group's real bills in kickstaff and in the current tools, then compares categories, approvals, property or job attribution, and payables. AF and QB stay authoritative for the rest of the portfolio. W2 payroll stays in QB.

**Completion gate.** Bills and payments for the designated property group move through the full non-payroll workflow with correct categories, property or job attribution, suppression behavior, audit history, and reviewer sign-off after a head-to-head check against current tools.

# **6 Stage 3 — Listings, Applications & Tenancy**

_Cumulative progress mark: ~65%_

**Function.** Manage property and unit information, listing content, marketing status, applications, screening, lease creation, move-in, renewals, tenant state, and daily communication.

**Dependencies.** The property, unit, people, permission, and category models approved in Stage 1. Screening and e-signature require approved providers, but property setup, listing management, application intake, and lease preparation are not blocked by marketing status.

**What I'm doing.** Building configurable property and listing forms; separating listing creation from marketing publication; supporting applications for units that are not actively marketed; connecting screening decisions to applicant status; generating leases from templates and merge fields; and shortening move-in by reusing unit data for charges and obligations. Signed leases drive tenant status. Tenant messages from the resident portal and supported email channels come into a unified inbox with concise, reviewable AI assistance.

**What the client can review.** The office runs listings, applications, leases, and tenant communication for the designated group in kickstaff and in AF. Prospective tenants on those units can move through application-to-lease without depending on an unrelated move-out or marketing workflow. Feedback from that head-to-head work is what adjusts the forms and steps — not a separate UAT exercise on dummy units.

**Completion gate.** A unit in the designated group can move from setup through application, screening decision, lease execution, tenant activation, recurring charges, and renewal with no duplicate entry of data already stored on the unit, compared against the same process in current tools.

# **7 Stage 4 — Integrated Operations & Reporting**

_Cumulative progress mark: ~85%_

**Function.** Connect cost, construction, vendor, owner, property, listing, applicant, lease, and tenant workflows in Kickagent, presented through kickstaff. Navigation and reports show only what that role is allowed to see. Owners get realtime data for their properties — statements, cash flow, costs, and occupancy — without a separate portal or a delayed export.

**Dependencies.** Stages 2 and 3 functionally usable on the designated property group. Report definitions and owner-visible fields require accounting and owner review.

**What I'm doing.** Building unified views and reports for occupancy, property and job costs, contractor and vendor spend, cash flow, profit and loss, owner statements, and aged payables. Reports support drill-down to discrete bills by vendor and preserve suppressed-fee treatment. Owner accounts see the live records for their properties, not a periodic snapshot mailed after the fact. I will refine permissions, navigation, and communication workflows from observed use, with fewer clicks and less duplicate entry.

**What the client can review.** kickstaff should feel like one product on the designated group. Administrators, property managers, accounting, and those owners log into kickstaff, see the features and properties that belong to their role, and compare reports and owner views with current tools. The rest of the portfolio is not required to be live in Kickagent yet.

**Nice-to-have in this stage.** A budget-versus-actual summary dashboard, after budget definitions and actual-cost data are reliable.

**Completion gate.** For the designated group, the agreed recurring reports reconcile to their source records and to the parallel results in current tools. An owner login in kickstaff shows current, role-scoped data for that owner's properties in the group with suppression applied. Role permissions are approved, and the office can complete those cross-module workflows without reverting to avoidable manual workarounds.

# **8 Stage 5 — Migration & Parallel Run**

_Cumulative progress mark: ~97%_

**Function.** Widen from the designated property group to the agreed remaining portfolio: migrate the agreed historical AF data and necessary non-payroll QB data, then keep operating in parallel long enough to confirm that operational states, costs, payments, reports, and owner-facing outputs agree.

**Dependencies.** Phase B workflows and reports already proven on the designated group. Approved source-to-target mappings, data owners, reconciliation rules, and an explicit list of retained records. GL accounts from AF map into the managed chart; unused or duplicate source accounts can be retired in Kickagent rather than preserved one-for-one.

**What I'm doing.** Preparing and running repeatable imports for the wider set, validating record counts and relationships, preserving source references, checking vendor and category mappings, applying suppression rules, and keeping Kickagent and AF side by side. The designated group remains the first place differences are investigated. QB remains authoritative for W2 payroll.

**What the client can review.** Confidence, not new features. The office already knows the process on the designated group. This stage shows that the same process holds when history and the rest of the agreed properties are loaded, traces records to source data, and documents remaining differences before cutover.

**Completion gate.** Agreed reconciliation checks pass on the widened set, exceptions have owners and dispositions, and KAM approves Kickagent / kickstaff as operationally ready for cutover. Import alone is not cutover. A clean designated-group run is necessary but not sufficient.

# **9 Stage 6 — Cutover Buffer (conditional)**

_Cumulative progress mark: 100% if triggered; otherwise Stage 5 is the end-state_

This stage exists only if it is needed.

**Function.** Reserved time to close specific issues identified during the parallel run before the business fully commits to Kickagent / kickstaff.

**Dependencies.** Triggered only if defined gaps remain after Stage 5. Entry requires an agreed issue list, owner, acceptance condition, and disposition for each item.

**What I'm doing.** Closing those already-known readiness issues. This is not open-ended development and does not add unrelated features. If the parallel run meets acceptance, this stage does not occur.

**What the client can review.** Generally no new features. Assurance that already-reviewed workflows and reports are reliable before AF is cancelled or made read-only.

**What a cutover is.** The moment the business stops running the agreed day-to-day property-management operations through AF and switches those operations to Kickagent as the system of record, used through kickstaff. Parallel operation starts on the designated property group and only later covers the rest of the agreed portfolio. At cutover, AF may become read-only and Kickagent takes over the approved live operations. QB continues to handle W2 payroll. AF should be cancelled only after KAM confirms that retained historical access, migrated records, live workflows, reports, and the contingency plan are sufficient.

# **10 Decisions required before affected work**

These decisions do not block all of Phase B. Each must be resolved before its affected workflow is finalized. They do not change the stage order.

1. **Accounting governance.** Matt and the appropriate reviewers approve *rules* for the chart-of-accounts manager (who may add, edit, hide, or remove accounts), construction-cost definitions, cost-segregation expectations, and “Management Income” suppression. They are not asked to lock Otto's export as the permanent list.
2. **Invoice ingestion.** Confirm what Bent Pipe supplies, how uncertain extraction is reviewed, and which system owns vendor and bill corrections.
3. **Payments and filing.** Confirm the Plaid bank-link path (contact and accounts already started by No Friction), then select the ACH / check-send rail, approval/authentication pattern, owner-payment treatment, and year-end 1099 *approach*. In-product 1099 form generation remains optional.
4. **Screening and e-signature.** Select providers and confirm fee handling, data retention, applicant consent, and exception workflows.
5. **Tenant obligations.** Decide where resident-obligated utilities and other recurring obligations are maintained so they can populate leases and charges automatically.
6. **Communications.** Define which resident-portal, email, and other message sources belong in the unified inbox and what human review is required for AI-assisted replies.
7. **Owner-visible data.** Confirm which live records an owner role may see and act on (statements, cash flow, costs, occupancy, documents) so Stage 4 is not inventing the owner view.
8. **Designated property group.** Name the limited set of properties the office will operate in both systems, and who on the team runs that parallel work.
9. **Migration acceptance.** Approve retained history, reconciliation checks, cutover criteria, and the fallback plan before the portfolio is widened beyond the designated group.

# **11 Progress at a glance**

| Stage | Name | Cumulative mark | Client-reviewable outcome |
| ----- | ---- | --------------- | ------------------------- |
| 1 | Foundation & Operating Model | ~20% | Core Kickagent records, chart-of-accounts manager, roles, named property group |
| 2 | Cost, Vendor & Construction | ~40% | Head-to-head bill and payment workflows on the designated group |
| 3 | Listings, Applications & Tenancy | ~65% | Head-to-head listing-to-lease work on the designated group |
| 4 | Integrated Operations & Reporting | ~85% | kickstaff as the access point; realtime owner data on the designated group |
| 5 | Migration & Parallel Run | ~97% | Widen beyond the group; reconciliation and cutover-readiness decision |
| 6 | Cutover Buffer, if triggered | 100% | Closure of defined readiness gaps only |

# **12 Term**

Phase B is sequenced by the completion gates above, not by a fixed calendar. Work proceeds stage by stage. Delayed feedback, access, or approvals from KAM pause the affected stage; they do not reopen earlier stages or expand scope.

# **13 Compensation**

Phase B continues the contract value stated in the Phase A proposal:

- Total contract value: **$24,000**.
- The Phase A kickoff of **$2,000** is credited against that total.
- Remaining value is invoiced during Phase B and on final delivery as described in Section 14.

# **14 Payment schedule**

No Friction LLC will invoice Kick Asset Management on the 5th of each month, in the amount of **$2,000** per invoice, beginning the first full month of Phase B and continuing until the project reaches end-state (Stage 5 accepted, or Stage 6 if triggered).

The balance of the $24,000 principal, minus amounts already invoiced, is due on code release.

# **15 Change control, refund, and clawback**

Work not described in this proposal — including in-product 1099 generation or additional stages — requires a written change agreed by both parties before it is scheduled.

The cutover buffer is not a backlog. Items that are not on the Stage 6 issue list are changes, not buffer work.

Kick Asset Management may request a refund of Phase B payments in the event of Project Failure. Project Failure means No Friction LLC materially fails to perform the scope in this proposal and does not cure that failure within thirty (30) business days of written notice describing the specific deficiency. Delays or deficiencies caused by Kick Asset Management — including delayed feedback, access, or approvals — do not constitute Project Failure.

If Project Failure occurs during Phase B, Kick Asset Management may request a refund of Phase B payments made to date, including amounts corresponding to work already delivered. This right expires sixty (60) days after final delivery of Phase B or, if the engagement ends earlier, sixty (60) days after that date.

Phase A payments, once Phase A deliverables were delivered and accepted, remain payment for services rendered and are not subject to refund.

# **16 Intellectual property**

Except as provided below, software, code, documentation, and related work product created by No Friction LLC specifically for Kick Asset Management under this engagement ("the Software") is work made for hire and owned exclusively by Kick Asset Management upon full payment of all amounts due for the applicable phase. This ownership does not extend to general-purpose tools, libraries, frameworks, or pre-existing code owned by No Friction LLC prior to this engagement, or developed independently of it. No Friction LLC retains ownership of those materials and grants Kick Asset Management a perpetual, royalty-free license to use them solely as incorporated into the Software.

Kick Asset Management and No Friction LLC have discussed packaging and commercializing the Software beyond Kick Asset Management's internal use. If the parties later agree in writing to pursue that path, No Friction LLC shall hold a one-half ownership interest in the Software as commercialized, with Kick Asset Management holding the remaining one-half. Governance, control, revenue, and further development costs would be documented in a separate agreement at that time.

# **17 Attachments**

| Attachment | What it is |
| ---------- | ---------- |
| [`chart_of_accounts-20260826.xlsx`](chart_of_accounts-20260826.xlsx) | Otto's working AF export (26 August 2026). Seed data for the chart-of-accounts manager. Not a locked ledger and not itemized in this proposal. |

---

# **18 Acceptance**

This Phase B proposal is accepted and authorized to begin by the signatures below.
<br>
**For Kick Asset Management:**

<br><br>
Otto Nielson  

<br><br><br>

Date
<br>

**For No Friction LLC:**

<br><br>


Zeth duBois  

<br><br>
Date
