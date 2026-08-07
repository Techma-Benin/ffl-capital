-- Lead event for LeadConduit "No Campaign Available" rejections (distinct from integrity_rejected).
ALTER TYPE "LeadEventType" ADD VALUE IF NOT EXISTS 'integrity_no_campaign';
