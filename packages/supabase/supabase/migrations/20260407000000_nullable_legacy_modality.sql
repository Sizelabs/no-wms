-- Make legacy modality text column nullable now that modality_id FK is the source of truth
ALTER TABLE shipping_instructions ALTER COLUMN modality DROP NOT NULL;
