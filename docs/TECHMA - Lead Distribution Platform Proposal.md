## **P R O J E C T  P R O P O S A L** 

## **Custom Lead Distribution & Aged-Lead Marketplace Platform** 

_An owned, in-house platform to capture, distribute, and resell your IUL leads — including aged-lead self-service for your partners._ 

## **Prepared by TECHMA** 

masdouk@techma.ca  |  techma.ca Date: June 24, 2026 

Page 1 

TECHMA  ·  Lead Distribution & Aged-Lead Marketplace Platform 

## **1. Executive Summary** 

Your company generates IUL (life insurance) leads through Meta and distributes them to partner agents using a third-party lead-distribution platform (Boberdoo). That platform handles state matching, priority routing, wallet billing, and resale postings — but it has hard limits you keep running into. The biggest one: it can't hold leads past the 30-day mark, which is exactly when a lead should become an aged lead and be resold at a discounted price. Today that whole aged-lead process is manual. You export every lead, re-upload them, then hand-build each order by state, age, and budget whenever an agent asks. It works, but it doesn't scale, and you're paying for a platform that boxes you in. 

TECHMA proposes building your own lead-distribution and aged-lead marketplace platform — a web application you fully own and control. It will do what your current platform does (capture leads from your Meta funnel, auto-match to active partners by state and priority, run the Stripe wallet, and post unmatched leads to your resale partner), and then add the part you can't get today: an aged-lead marketplace where partners log in and buy aged leads themselves, straight from their existing wallet balance, with zero manual work on your end. 

This moves the manual export-and-rebuild work off your plate, lets partners self-serve, and removes the dependency on a platform that limits how you operate. You own the system, you set the rules, and as the business grows you can change it without waiting on another vendor or paying for features you'll never use. The build is delivered collaboratively — weekly check-ins, a live demo each week, and your feedback baked in as we go — so the final product matches how your business actually runs. 

## **2. Project Background** 

We connected through Fiverr and held a discovery call where you walked me through your current Boberdoo setup in full — lead intake, partner onboarding, matching, billing, resale, and the aged-lead workflow. The picture is clear: your distribution model works, but you've outgrown the rented platform and the manual workarounds that come with it. Here's how your operation runs today: 

- **Lead generation —** One Meta ad generates roughly 500 IUL leads per day, open to all states. Leads flow through LeadConduit and TrustedForm (for compliance certificates), then into your distribution platform. 

- **Matching & priority —** Leads auto-match to active partners by state filter and a priority weight (1–10). A priority-10 partner beats a priority-8 partner for the same state. In-house clients are prioritized over outside clients. 

- **Wallet & billing —** Partners load a Stripe wallet. A partner is “active” once their balance covers the lead price. Leads are billed straight from the wallet on delivery. IUL leads are $25 by default, with per-partner discounts (e.g. $20 for a key partner). 

Page 2 

TECHMA  ·  Lead Distribution & Aged-Lead Marketplace Platform 

- **Resale —** Unmatched leads are reprocessed for 24 hours; if still unmatched, they're posted to IntegrityCONNECT Leads (integrity.com/leads) via ping/post — real-time (auto-sold) or storefront (daily log reconciliation, revenue share). 

- **The bottleneck —** After 30 days a lead should become an aged lead resold at $5. Your platform won't store leads that long for this purpose, so you do it by hand: export, re-upload, filter by state/age/budget, and build each order manually. You also want partners to buy aged leads themselves, which the rented platform doesn't allow. 

Your goal, in your words, is to almost replicate the current site and add more to it — under your own roof. This proposal is scoped to do exactly that. 

Page 3 

TECHMA  ·  Lead Distribution & Aged-Lead Marketplace Platform 

## **3. Scope of Work** 

The platform is delivered as two connected portals — an Admin portal for you, and a Partner portal for your agents — powered by a shared lead-distribution engine. Below is the full breakdown of what gets built. 

## **3.1  Lead Intake & Capture Pipeline** 

Connects your existing Meta lead funnel directly into the platform so every submission lands as a lead in real time — no manual uploads. 

- **Funnel integration —** Meta Lead Ads → LeadConduit → TrustedForm → platform, wired through webhook/API so each form submission is pushed in instantly. 

- **TrustedForm capture —** Each lead stores its TrustedForm certificate for legal/compliance proof, kept on the lead record. 

- **Volume-ready —** Built to handle your current ~500 leads/day across all states, with room to grow. 

- **Lead record —** Captures contact details, state, lead type, source, timestamp, and compliance cert. Every lead is timestamped on entry (this drives the 30-day agedlead logic). 

- **Lead types —** Traditional IUL and High-Intent IUL at launch, with the structure to add more types later (e.g. mortgage protection) without a rebuild. 

## **3.2  Matching & Distribution Engine** 

The core of the platform — the part that replaces what Boberdoo does for you. Incoming leads are automatically routed to the right partner. 

- **State + priority matching —** Each lead auto-matches to active partners by their state filter, then by priority weight. 

- **Priority system (1–10) —** New partners default to priority 5; you adjust per partner. Higher priority wins the lead for a shared state (priority 10 beats priority 8). 

- **“Active” gating —** A partner only receives leads while their wallet balance covers the lead price. Below the threshold, delivery pauses until they top up. 

- **Auto wallet deduction —** The lead price is deducted from the partner's wallet automatically on delivery. 

- **Ownership cap per lead —** Default of one owner per lead, with an admin control to 

   - sell the same lead to multiple partners (e.g. up to 5) when you choose. 

- **Reprocessing window —** Unmatched real-time leads are reprocessed for 24 hours to find a match; if none, they move to the storefront/resale path (48-hour window). 

- **Unmatched queue —** Leads with no valid campaign/match land in a clear admin queue (e.g. a state nobody wants) instead of disappearing. 

- **Instant notification —** Partners get an email the moment a lead is delivered to them. 

Page 4 

TECHMA  ·  Lead Distribution & Aged-Lead Marketplace Platform 

## **3.3  Aged-Lead Marketplace  (the core upgrade)** 

This is the piece you can't get today and the main reason for the build. It turns your manual export-and-rebuild process into a self-service store. 

- **Automatic aging —** Any lead sitting in the system 30+ days (matched or unmatched) is automatically flagged as an aged lead — no manual exporting. 

- **Discounted pricing —** Aged leads default to $5 (you set the price), separate from the $25 real-time price. 

- **Partner self-purchase —** Partners log into their portal and buy aged leads themselves, filtered by state, age range (e.g. 15–30 days), lead type, and their budget. 

- **Paid from existing wallet —** Purchases draw from the wallet balance partners already keep on file — nothing for you to process manually. 

- **Reprocessing fee —** When a lead is refunded and resold, or resent to another partner, an admin-set reprocessing fee/charge applies. 

- **Resell to multiple partners —** An aged lead can be sold to more than one partner, controlled by the same ownership-count setting. 

_Result: the work you do by hand today — export all leads, upload, filter by state and budget, build each order — is gone. Partners serve themselves and you keep the margin._ 

## **3.4  Partner / Agent Portal** 

What your agents see and use day to day. 

- **Self-signup —** A public new-client form creates the partner account and portal automatically on submission. 

- **Onboarding fields —** Name, company/partner affiliation, state located, lead type (Traditional or High-Intent IUL), and selection of up to 15 states. 

- **Wallet & card on file —** Add a card via Stripe, load funds, and see live balance/credit. 

- **Billing options —** Automatic recurring top-ups (e.g. $500/week) or one-time manual top-ups — partner's choice. 

- **Dashboard —** Active leads received, the aged-lead marketplace, transactions, and invoices in one place. 

- **Custom delivery —** Optionally push purchased leads to the partner's own CRM (Ringy, HubSpot, or similar) via API/webhook, in addition to email. 

- **One account per agent —** Each agent runs their own account so lead ownership stays clean (matching how you operate today). 

Page 5 

TECHMA  ·  Lead Distribution & Aged-Lead Marketplace Platform 

## **3.5  Admin Dashboard** 

Your control center — everything you manage today, in one owned system. 

- **Partner management —** View all partners, open any profile, edit details, and enable/disable a partner's access at any time. 

- **Priority control —** Set each partner's priority (1–10) to steer who wins sharedstate leads. 

- **Per-partner & per-type pricing —** Default IUL at $25, override per partner (e.g. $20 discount), and set price per lead type. 

- **Lead oversight —** See every incoming lead with its status (matched, unmatched, rejected, real-time, storefront) and reprocess or reassign as needed. 

- **Ownership & resale controls —** Set how many partners can own a given lead; manage aged-lead pricing and reprocessing fees. 

- **Billing visibility —** Wallets, transactions, and invoices across all partners. 

- **Resale/storefront management —** Manage postings to your resale partner and reconcile what sold. 

## **3.6  Resale & Custom Delivery Integrations** 

Keeps your resale revenue stream working and lets partners receive leads where they want them. 

- **Resale ping/post —** Integration with IntegrityCONNECT Leads (integrity.com/leads) using their ping/post APIs. 

- **Real-time vs storefront —** Real-time posts are auto-sold and marked sold instantly; storefront sales are reconciled from the daily log, with revenue-share tracking. 

- **Partner CRM delivery —** Optional outbound delivery of purchased leads into partner CRMs (Ringy, HubSpot, HCMS-type systems). 

## **3.7  Stripe Payments & Wallet System** 

The money layer behind both portals. 

- **Wallet top-ups —** Card on file, one-time and recurring (weekly) funding. 

- **Automatic deductions —** Per-lead charges pulled from the wallet on delivery or purchase. 

- **Credit & active status —** Live balance tracking that drives the partner's active/paused state. 

- **Refunds —** Refund handling for the cases where a lead needs to be returned and resold. 

## **3.8  Notifications** 

- **Partner emails —** automatic email to a partner each time a lead is delivered or purchased. 

Page 6 

TECHMA  ·  Lead Distribution & Aged-Lead Marketplace Platform 

- **Admin alerts —** optional alerts for key events (unmatched spikes, low balances) where useful. 

Page 7 

TECHMA  ·  Lead Distribution & Aged-Lead Marketplace Platform 

## **4. Scope at a Glance** 

A quick map of the modules included in this build. 

|**Module**|**Module**|**What it delivers**|**What it delivers**|
|---|---|---|---|
|Lead Intake Pipeline||Meta → LeadConduit → TrustedForm → platform, real-<br>time capture with compliance certs||
|Matching & Distribution<br>Engine||State + priority routing, active gating, auto wallet billing,<br>reprocessing, notifications||
|**Aged-Lead Marketplace**||Auto-aging at 30 days, $5 pricing, partner self-purchase,<br>reprocessing fee, multi-sell||
|Partner / Agent Portal||Self-signup, onboarding, wallet, billing options,<br>dashboard, custom CRM delivery||
|Admin Dashboard||Partner, priority, pricing, lead, ownership, resale, and<br>billing management||
|Resale Integrations||IntegrityCONNECT ping/post (real-time + storefront),<br>partner CRM delivery||
|Stripe Payments & Wallet||Top-ups, recurring billing, auto deductions, refunds,<br>active-status logic||
|Notifications||Partner lead emails + optional admin alerts||
|**5. User Roles & Access**||||
|**Role**|**Access Level**||**Key Capabilities**|
|Admin (You)|Full control||Manage partners, priority, pricing, leads,<br>matching, aged-lead settings, resale, billing,<br>and all reports|
|Partner / Agent|Self-service portal||Sign up, set states & lead type, load wallet,<br>receive leads, buy aged leads, set custom<br>delivery, view transactions & invoices|



Page 8 

TECHMA  ·  Lead Distribution & Aged-Lead Marketplace Platform 

## **6. Technical Approach** 

The entire platform — frontend, backend, database, and hosting — is built and run on Replit. Everything lives in one place that's reliable, easy to maintain, and simple to hand off to you. 

|**Layer**|**Details**|
|---|---|
|Frontend|React — fast, clean interface for both the admin and partner<br>portals, built on Replit|
|Backend|Node.js — the engine running matching, billing, aging, and<br>integrations, built on Replit|
|Database|PostgreSQL on Replit — secure, structured storage for leads,<br>partners, wallets, and transactions|
|Hosting|Replit — the whole platform is built, deployed, and hosted<br>here; one place to manage everything (~$23/month)|
|Integrations|Meta Lead Ads, LeadConduit, TrustedForm, Stripe,<br>IntegrityCONNECT Leads (ping/post), partner CRMs (Ringy,<br>HubSpot)|



You'll own the system end to end. We train you so small future changes can be done without coming back to us — and we stay available when you do want help. 

## **7. Project Timeline** 

Estimated 4–6 weeks from kickoff to launch. We work collaboratively: a live demo and check-in each week, your feedback applied as we go, and access to our booking link so you can grab a meeting any time a question comes up. 

|**Phase**|**Week**|**Deliverables**|
|---|---|---|
|Phase 1 —<br>Foundation|Week 1|Project setup, database design, authentication,<br>admin & partner portal shells, partner signup<br>form|
|Phase 2 — Lead<br>Pipeline|Week 2|Meta → LeadConduit → TrustedForm intake,<br>lead storage with compliance certs, admin lead<br>views|
|Phase 3 —<br>Distribution Engine|Week 3|State + priority matching, active gating, auto<br>wallet deduction, reprocessing logic, email<br>notifications|
|Phase 4 — Payments<br>& Aged Leads|Week 4|Stripe wallet (top-ups, recurring, refunds) and the<br>aged-lead marketplace with partner self-<br>purchase|



Page 9 

TECHMA  ·  Lead Distribution & Aged-Lead Marketplace Platform 

|**Phase**|**Week**|**Deliverables**|
|---|---|---|
|Phase 5 —<br>Integrations & Launch|Weeks<br>5–6|IntegrityCONNECT ping/post, partner CRM<br>delivery, full testing, training, and deployment|



_Note: timelines assume reasonable turnaround on access (IntegrityCONNECT API docs, Meta/LeadConduit access, Stripe account) and weekly feedback. Delays on those can shift the schedule._ 

## **8. Investment & Pricing** 

This is delivered as a single, all-inclusive build covering everything in the scope above — both portals, the distribution engine, the aged-lead marketplace, Stripe, and the integrations. 

|**Lead Distribution & Aged-Lead Marketplace Platform**|**Investment**|
|---|---|
|Complete build — all modules in Sections 3 & 4, both<br>portals, matching engine, aged-lead marketplace, Stripe<br>wallet, resale & CRM integrations|**$5,000 USD**|
|Weekly demos, check-ins & booking-link access during<br>the build|Included|
|Training + source code ownership transferred to you|Included|
|14 days post-launch bug fixes|Included|
|**Total**|**$5,000 USD**|



## **Running Costs (paid by you, directly to the providers)** 

|**Item**|**Approx. Cost**|
|---|---|
|Replit hosting|~$23 / month|
|Stripe processing fees|Standard Stripe rate (~2.9% + $0.30 per<br>transaction), pass-through|



## **Ongoing Support (after launch)** 

- Hourly rate for future changes or new features: $150/hr 

- Pre-paid hour blocks and monthly retainers available if you'd prefer predictable support. 

Page 10 

TECHMA  ·  Lead Distribution & Aged-Lead Marketplace Platform 

## **Payment** 

Handled through Fiverr. Once you approve, I'll set up the gig/order and we can structure it into milestones so payment tracks the build. Kickoff happens within 2 business days of the order. 

Page 11 

TECHMA  ·  Lead Distribution & Aged-Lead Marketplace Platform 

## **9. What's Included** 

- Fully functional lead-distribution platform with admin and partner portals 

- Automated state + priority matching engine with wallet billing 

- Aged-lead marketplace with partner self-purchase from existing wallet balance 

- Stripe wallet system: top-ups, recurring billing, auto deductions, refunds 

- Meta / LeadConduit / TrustedForm intake with compliance-cert capture 

- Resale ping/post integration with IntegrityCONNECT Leads (real-time + storefront) and partner CRM delivery 

- Weekly live demos and check-ins throughout the build 

- Training session so you can run and adjust the platform 

- Full source code ownership transferred to you on final payment 

- Deployment to Replit 

- 14 days of post-launch bug fixes 

## **10. Next Steps** 

1. Review this proposal and send over any feedback or changes. 

2. Approve the scope and pricing. 

3. I send the Fiverr order; you place it (we can split into milestones). 

4. Kickoff call within 2 business days, where we line up access (Meta/LeadConduit, resale API docs, Stripe). 

5. Weekly demos and progress updates until launch. 

Page 12 

TECHMA  ·  Lead Distribution & Aged-Lead Marketplace Platform 

## **11. Terms & Conditions** 

## **Payment** 

- Handled through Fiverr's milestone system, agreed before kickoff. 

## **Timeline** 

- Estimated 4–6 weeks from kickoff. Delays in client response or third-party access (APIs, accounts) may extend it. 

## **Support** 

- 14 days of post-launch bug fixes included. Ongoing support at $150/hr or via retainer. 

## **Intellectual Property** 

- All source code and assets become your property on final payment. TECHMA may reference the project anonymously in its portfolio. 

## **Confidentiality** 

- All business information and lead/partner data is treated as confidential and never shared with third parties without written consent. 

## **Third-Party Services** 

- Costs and terms of third-party providers (Replit, Stripe, Meta, LeadConduit, TrustedForm, IntegrityCONNECT) are billed by those providers directly and are outside this build fee. 

## **Let's build it.** 

Masdouk  |  TECHMA  |  masdouk@techma.ca  |  techma.ca 

Page 13 

TECHMA  ·  Lead Distribution & Aged-Lead Marketplace Platform 

