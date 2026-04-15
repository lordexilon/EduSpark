-- Configure Supabase Storage bucket for landing page images
-- This script sets up the bucket and RLS policies for image uploads

-- Note: Buckets must be created via Supabase Dashboard first
-- Go to Storage > Create new bucket > Name: "landing-page-images"
-- Set as Public bucket: YES (for public landing pages)

-- 1. Create RLS policies for the landing-page-images bucket

-- Policy 1: Public can view images (for landing pages)
CREATE POLICY "Public can view landing page images"
ON storage.objects FOR SELECT
USING (bucket_id = 'landing-page-images');

-- Policy 2: Authenticated users can upload images
CREATE POLICY "Authenticated users can upload landing page images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'landing-page-images'
  AND auth.role() = 'authenticated'
);

-- Policy 3: Admin and Admin-campus can update their institution's images
CREATE POLICY "Admins can update landing page images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'landing-page-images'
  AND (
    -- Full admin can update all images
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role_id = 3
    )
    OR
    -- Admin-campus can update images for their institution
    -- Image path should be: institution-{id}/filename.ext
    (
      name LIKE 'institution-' || (
        SELECT institution_id::text 
        FROM user_institutions 
        WHERE user_id = auth.uid()
        LIMIT 1
      ) || '/%'
      AND EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid() AND role_id = 5
      )
    )
  )
);

-- Policy 4: Admin and Admin-campus can delete their institution's images
CREATE POLICY "Admins can delete landing page images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'landing-page-images'
  AND (
    -- Full admin can delete all images
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role_id = 3
    )
    OR
    -- Admin-campus can delete images for their institution
    (
      name LIKE 'institution-' || (
        SELECT institution_id::text 
        FROM user_institutions 
        WHERE user_id = auth.uid()
        LIMIT 1
      ) || '/%'
      AND EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid() AND role_id = 5
      )
    )
  )
);

-- Instructions:
-- 1. Create bucket "landing-page-images" in Supabase Dashboard (Storage section)
-- 2. Set as Public bucket
-- 3. Run this script to apply RLS policies
-- 4. Image paths should follow: institution-{id}/logo.webp, institution-{id}/hero.jpg, etc.
