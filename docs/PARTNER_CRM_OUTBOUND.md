# Partner CRM outbound — self-service POST delivery

> Dernière mise à jour : 8 septembre 2026

Spécification produit et technique pour la livraison CRM optionnelle côté partner, en complément de l’email Resend (toujours envoyé).

---

## Résumé des décisions

| Sujet | Décision |
| ----- | -------- |
| Email | **Toujours** envoyé à chaque livraison matchée (Resend, comportement inchangé) |
| CRM optionnel | **Un seul** profil POST par partner ; **plus** de `deliveryChannel` sur filter set |
| Endpoint | URL HTTPS (HTTP autorisé si configuré), validée SSRF à l’enregistrement et à l’envoi |
| Auth | `none`, `bearer`, `api_key_header`, `basic`, `body_fields` (paires clé/valeur dans le JSON plat) |
| Secrets | Stockés **en clair** en BDD (choix produit) |
| Payload | **JSON plat uniquement** ; mapping source → clé destination |
| Wizard UX | Route dédiée `/partner/settings/crm-outbound` ; endpoint + auth + mapping ; « coller un exemple JSON » pour pré-remplir les clés (top-level). Sur Settings : carte **Lead delivery** (email + CRM). **Configuré** (ligne BDD + URL) ≠ **activé** (`enabled`) : sans config → Connect CRM seul ; avec config → host + badge Ready/Off, Power rouge = on (tooltip Disable), gris = off. **Désactiver** : `PATCH { enabled: false }` sans revalidation URL ni test. **Activer** : le serveur envoie d’abord un POST test ; succès → `enabled: true`, échec → reste off + erreur. Test / Delete séparés ; clic ligne → wizard |
| Succès | Par défaut **HTTP 2xx** ; règle optionnelle : `bodyContains`, `bodyRegex`, `bodyKeyEquals` (clé top-level) |
| Échec POST | **Pas de retry** ; email partner avec raison (status, réseau, règle) — **sans payload lead** ; CTA settings via `resolveAppOrigin` (ignore overrides / origines loopback) |
| SSRF | IP privées/loopback/metadata, DNS + re-check IP, `redirect: manual`, timeout ~15s, taille réponse max |
| Hors scope | OAuth CRM, ping/post dédié, JSON imbriqué, retry, chiffrement secrets |
| Legacy Boberdoo | Voir [BOBERDOO_EXPLORATION.md](BOBERDOO_EXPLORATION.md) §31/§38 (Custom Delivery ≈ POST + mapping + regex succès) |
| Migration legacy app | **Aucune** migration auto des champs `crmWebhookUrl` / Ringy / `crmProvider` — reconfiguration wizard |

---

## Flux runtime

1. Matching crée une `lead_delivery` et appelle `deliverLead`.
2. **Email** HTML Resend → adresse Clerk du partner (toujours, mode `live`).
3. Si `partner_crm_outbound_configs.enabled` :
   - Construire payload plat via `fieldMappings` + catalogue champs lead.
   - `POST` vers `endpointUrl` (auth + règle succès).
   - Succès → événement lead `crm_outbound` ; échec → événement `delivery_failed` + **email d’échec** (sans JSON lead).

Mode `integrations_mode=mock` (`app_settings` prime sur env `INTEGRATIONS_MODE`) : pas d’appels HTTP réels ; trace événements comme aujourd’hui.

---

## Modèle de données

Table **`partner_crm_outbound_configs`** (1:1 avec `partners`, PK = `partner_id`) :

| Colonne | Description |
| ------- | ----------- |
| `enabled` | Active le POST sortant |
| `endpoint_url` | URL cible |
| `http_method` | `POST` (seule valeur V1) |
| `auth_type` | Enum auth |
| `auth_config` | JSON selon type |
| `field_mappings` | `[{ "source": "firstName", "target": "first_name" }, …]` |
| `success_rule` | `{ "require2xx": true, "bodyContains?", "bodyRegex?", "bodyKeyEquals?" }` |

Champs supprimés (juil. 2026) : `partners.crm_webhook_url`, `crm_provider`, `ringy_*` ; `partner_filter_sets.delivery_channel`.

---

## API partner (session Clerk)

| Méthode | Route | Rôle |
| ------- | ----- | ---- |
| GET | `/api/partners/me/crm-outbound` | Lire la config (404 si absente) |
| PATCH | `/api/partners/me/crm-outbound` | Créer / mettre à jour (validation URL SSRF + Zod) |
| DELETE | `/api/partners/me/crm-outbound` | Supprimer la config |
| POST | `/api/partners/me/crm-outbound/test` | POST fixture synthétique → `{ ok, statusCode, bodyPreview, error, requestPayload }` (`requestPayload` = body mappé envoyé au CRM) |

Admin : plus d’édition CRM sur fiche partner ; carte compte = lecture seule (config activée + host endpoint + mapping non vide).

---

## Champs source (mapping UI)

Liste fermée `LEAD_DELIVERY_SOURCE_FIELDS` alignée sur `buildLeadDeliveryPayload` (`src/lib/delivery/lead-payload.ts`) : identité, contact, IUL, compliance, tracking, prix, ids livraison/partner, etc. **Pas** de `receivedAt` (timestamp d’intake). Un mapping déjà enregistré vers `receivedAt` est ignoré à l’envoi (`buildFlatOutboundPayload` dans `src/lib/delivery/outbound-payload.ts`).

---

## Déploiement Replit (GitHub → import)

**Compatible** — même stack Next.js API routes, pas de microservice.

| Étape | Détail |
| ----- | ------ |
| Migrations | Après pull, `scripts/post-merge.sh` (`pnpm install`, `prisma generate`, `prisma migrate deploy`, `pnpm run ensure:integrity-env`) via hook `[postMerge]` dans `.replit` |
| Config partner | PostgreSQL (`DATABASE_URL` Repl ou Supabase) — rien à copier hors BDD partagée |
| Secrets CRM | En clair en BDD — pas de Replit Secrets dédiés Ringy/webhook |
| Env livraison | Inchangées : `RESEND_API_KEY`, `FROM_EMAIL`, `DATABASE_URL`, `DIRECT_URL` (Repl : souvent `DIRECT_URL=$DATABASE_URL`) |
| HTTP sortant | `fetch` depuis le serveur Next.js (comme Integrity) ; bouton **Test** (carte Lead delivery) appelle l’API publique du Repl |
| Post-deploy | Partners avec ancien webhook admin **reconfigurent** le wizard ; Mode admin ou fallback env `INTEGRATIONS_MODE` ; défaut `mock` en dev, `live` en prod si aucune valeur |

**Risques existants (hors scope CRM)** : URLs redirect Clerk / domaine Repl ; cron externe.

---

## Implémentation (code)

| Module | Fichier |
| ------ | ------- |
| SSRF | `src/lib/delivery/outbound-url-guard.ts` |
| Payload plat | `src/lib/delivery/outbound-payload.ts` |
| HTTP + succès | `src/lib/delivery/outbound-http.ts` |
| Orchestration | `src/lib/delivery/deliver-lead.ts` |
| Schémas Zod | `src/lib/crm-outbound/schemas.ts` |
| Email échec | `src/lib/delivery/crm-outbound-failure-email.ts` |
| UI Settings | `partner-settings.tsx` + `partner-lead-delivery-card.tsx` (Profile + Lead delivery half/half ; filter sets en dessous) |
| UI wizard | `partner-crm-outbound-wizard.tsx` sur `/partner/settings/crm-outbound` |

Tests : `pnpm run test:outbound` (`scripts/test-outbound.ts`).
