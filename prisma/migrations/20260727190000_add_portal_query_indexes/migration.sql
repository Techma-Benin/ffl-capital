CREATE INDEX "lead_list_views_scope_partner_id_is_default_idx"
ON "lead_list_views"("scope", "partner_id", "is_default");

CREATE INDEX "lead_deliveries_partner_id_delivered_at_idx"
ON "lead_deliveries"("partner_id", "delivered_at");

CREATE INDEX "lead_deliveries_filter_set_id_delivered_at_refunded_at_idx"
ON "lead_deliveries"("filter_set_id", "delivered_at", "refunded_at");

CREATE INDEX "refund_requests_status_created_at_idx"
ON "refund_requests"("status", "created_at");

CREATE INDEX "refund_requests_status_reviewed_at_idx"
ON "refund_requests"("status", "reviewed_at");

CREATE INDEX "transactions_partner_id_created_at_idx"
ON "transactions"("partner_id", "created_at");

CREATE INDEX "transactions_created_at_idx"
ON "transactions"("created_at");

CREATE INDEX "transactions_type_idx"
ON "transactions"("type");

CREATE INDEX "billing_recurrence_partner_id_active_created_at_idx"
ON "billing_recurrence"("partner_id", "active", "created_at");
