-- Add category_assigned to LeadEventType enum
ALTER TYPE "LeadEventType" ADD VALUE IF NOT EXISTS 'category_assigned';
