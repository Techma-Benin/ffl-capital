-- Hide the "id" column by default in all existing admin lead list views.
-- The id column is still available via column settings; it is just off by default.
UPDATE "lead_list_views"
SET "columns" = (
  SELECT jsonb_agg(
    CASE
      WHEN col->>'key' = 'id' THEN jsonb_set(col, '{visible}', 'false')
      ELSE col
    END
  )
  FROM jsonb_array_elements("columns") AS col
)
WHERE "scope" = 'admin'
  AND "columns" @> '[{"key":"id","visible":true}]';
