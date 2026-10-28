**PROJECT PROPOSAL & STATEMENT OF WORK**

**KAM Agent — Phase A**

*Survey, Intake & Infrastructure*

**Prepared for:** *Otto Nielson, representing Kick Asset Management*

**Prepared by:** *Zeth duBois, representing No Friction LLC*

**Date:** *July 24, 2026*

# **1\. Overview**

This is a proposal for Phase A of the KAM Agent engagement: anticipating a one month period of survey, intake, and infrastructure scouting (anticipating the month of August). Its purpose is to make sure that if a Phase B build follows, it starts from complete, accurate requirements and a working technical foundation, rather than discovering gaps mid-build.

The functions in scope include replacing AppFolio in its entirety, as well as incorporating the QuickBooks functions the business currently relies on, including W-2 employer tracking, credit card tracking, and client invoicing. AppFolio is the primary focus of this engagement, with the relevant QuickBooks functionality included as part of the overall software replacement.

Phase A is a self-contained engagement. It is scoped, delivered, and compensated on its own terms, and its outcome — the Phase B proposal described in Section 3 — gives Kick Asset Management a concrete, detailed basis to decide whether and how to proceed, without either party having committed to Phase B in advance.

# **2\. Scope of Work**

## **2.1 Discovery & Survey**

Structured interviews with every team member who uses Appfolio or QuickBooks, guided by the KAM Agent Discovery Survey (companion document). This produces a full function inventory across listings, tenant management, applications, cost tracking, 1099 payments, material costs, reporting, and the QuickBooks functions in scope — W2 employer tracking, credit card tracking, and client invoicing.

## **2.2 Third-Party & Provider Research**

A number of functions currently handled inside Appfolio and QuickBooks depend on outside infrastructure that KAM Agent will need to connect to directly. This phase includes evaluating and selecting providers for:

* Banking & payments — a service such as Plaid for bank account connections and balance/transaction data, plus an ACH/payments rail (e.g., Stripe, Dwolla, or a Plaid-adjacent payments partner) for rent collection and contractor/vendor payouts.

* 1099 filing — a service such as Track1099 or Tax1099 for generating and e-filing 1099-NEC forms at year end.

* Tenant screening — a screening API (e.g., TransUnion SmartMove, Checkr, or a similar provider) for credit, background, and eviction history checks tied to applications.

* E-signature — a service such as DocuSign or Dropbox Sign for lease execution, replacing Appfolio's built-in e-sign.

* Document storage — cloud object storage (e.g., S3 or equivalent) for leases, applications, and property documents.

* Notifications — email and SMS delivery (e.g., SendGrid/Postmark and Twilio) for tenant and vendor communications, if this is a function the team currently relies on in Appfolio.

* Address & property data — an address validation/normalization API, useful for keeping property and unit records clean during migration.

*This is not an exhaustive list, nor will every provider above necessarily be needed — part of this work is confirming, against the discovery survey results, which of these are actually required versus nice-to-have.*

## **2.3 Repository, Environment & Technical Prep**

* Audit of existing repos and any code already in place, to confirm what can be extended versus rebuilt.

* Development, staging, and hosting environment setup.

* Initial data model sketch based on findings, to be finalized as part of the Phase B proposal.

# **3\. Deliverables**

*Anticipating August 31, Phase A will deliver the following:*

| Deliverable | Description |
| :---- | :---- |
| **Discovery survey record** | A completed function inventory from structured interviews with every team member using Appfolio or QuickBooks, covering listings, tenant management, applications, cost tracking, 1099 payments, material costs, reporting, and the in-scope QuickBooks functions (W2 employer tracking, credit card tracking, and client invoicing). |
| **Provider recommendation** | A written recommendation on third-party providers (banking/payments, 1099 filing, tenant screening, e-signature, document storage, notifications, address data), confirmed against what the discovery survey shows is actually needed. |
| **Technical environment** | Development, staging, and hosting environment set up and ready for Phase B development, plus an audit of any existing repos or code. |
| **Phase B proposal** | The finalized build plan, timeline, and milestones for Phase B, grounded in what Phase A actually found rather than assumptions made before the work started. |

| The Phase B plan delivered under this deliverable will be grounded in what Phase A actually finds. Kick Asset Management is free to accept, modify, or decline to proceed with the resulting Phase B proposal — that decision is separate from, and does not affect, Phase A's completion or compensation. |
| :---- |

# 

# 

# **4\. Term**

Phase A anticipates a one month duration, roughly the month of August, 2026\.

# **5\. Compensation**

Phase A is compensated as a straight cash kickoff deposit of $2,000, due via invoice on the 5th of August, 2026, covering discovery, provider research, and infrastructure preparation in full.

*If Phase B proceeds under a separate proposal, this $2,000 is credited as part of the total $24,000 contract value.*

# **6\. Payment Schedule**

No Friction LLC will invoice Kick Asset Management on the 5th of each month, in the amount of $2,000 per invoice. The $24,000 total contract value is distributed across Phase A, Phase B monthly invoices, and a final delivery balance, as follows:

* Phase A Kickoff Deposit: $2,000, invoiced on the 3rd of August, 2026\.

* Phase B Invoices: $2,000 due on the 5th of each month, beginning the first full month of Phase B, and concluding when the project reaches end-state.

Balance of payment (principal minus total invoiced) due on code release.

# **7\. Refund & Clawback Terms**

Kick Asset Management may request a refund of payments made under this engagement in the event of Project Failure as defined below. Project Failure means No Friction LLC materially fails to perform the scope of work described in this proposal (or, if Phase B has commenced, the corresponding Phase B proposal), and does not cure that failure within thirty (30) business days of receiving written notice describing the specific deficiency.

Phase A payments, once the Phase A deliverables described in Section 3 have been delivered and accepted, are considered payment for services rendered and are not subject to refund. Phase B payments are treated differently: if Project Failure occurs at any point during Phase B, Kick Asset Management may request a refund of Phase B payments made to date, including payments corresponding to work already completed and delivered during Phase B, and not solely amounts paid in advance of undelivered work. Delays or deficiencies caused by Kick Asset Management's own action or inaction — including delayed feedback, delayed access to systems or personnel, or delayed approvals needed to proceed — do not constitute Project Failure. This right to request a refund expires sixty (60) days after final delivery of the applicable phase or, if the engagement ends earlier, sixty (60) days after that date.

# **8\. Intellectual Property Ownership**

Except as provided below, all software, code, documentation, and related work product created by No Friction LLC specifically for Kick Asset Management under this engagement ("the Software") shall be considered work made for hire and owned exclusively by Kick Asset Management upon full payment of all amounts due for the applicable phase. This ownership does not extend to any general-purpose tools, libraries, frameworks, or pre-existing code owned by No Friction LLC prior to this engagement, or developed independently of it, which No Friction LLC retains full ownership of and grants Kick Asset Management a perpetual, royalty-free license to use solely as incorporated into the Software.

Kick Asset Management and No Friction LLC have discussed the possibility of packaging and commercializing the Software for sale beyond Kick Asset Management's internal use. Should the parties mutually agree in writing to pursue this path, No Friction LLC shall hold a one-half (1/2) ownership interest in the Software as commercialized, with Kick Asset Management holding the remaining one-half (1/2), notwithstanding the ownership terms above. The specific terms of that arrangement — including governance, control, revenue distribution, and the treatment of further development costs — shall be documented in a separate written agreement at the time the parties advance that path.

# **9\. Acceptance**

This Phase A proposal is accepted and authorized to begin by the signatures below.

**For Kick Asset Management:**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Otto Nielson                                                          Date

**For No Friction LLC:**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Zeth duBois                                                           Date