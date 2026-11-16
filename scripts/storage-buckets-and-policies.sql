-- ==============================================================================
-- VYNTRA SUPABASE STORAGE BUCKETS & RLS POLICIES (Phase 6-8 Production Ready)
-- WARNING: DO NOT EXECUTE AUTOMATICALLY. LOCAL PREPARATION ONLY.
-- Requires manual execution in Supabase SQL Editor by authorized Project Admin.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. BUCKET DEFINITIONS (Idempotent Insertion)
-- ------------------------------------------------------------------------------

-- Bucket 1: product-images (Public - Catalog PDP & A+ modules)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket 2: vendor-assets (Public - Storefront logos, banners & swatches)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'vendor-assets',
    'vendor-assets',
    true,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket 3: vendor-documents (Private - GST, PAN, Bank Proofs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'vendor-documents',
    'vendor-documents',
    false,
    10485760, -- 10 MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket 4: return-evidence (Private - Customer unboxing videos/photos & vendor QC)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'return-evidence',
    'return-evidence',
    false,
    20971520, -- 20 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ------------------------------------------------------------------------------
-- 2. SECURITY & OWNERSHIP HELPER FUNCTIONS (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Helper 1: Verify Admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public."User"
        WHERE id = auth.uid()::text
          AND role IN ('ADMIN', 'SUPER_ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper 2: Verify Vendor Ownership (Maps both auth.uid() AND VendorProfile.id)
-- Solves the mismatch where folder is vendorProfileId while auth token is auth.uid()
CREATE OR REPLACE FUNCTION public.is_vendor_owner(folder_identifier TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF folder_identifier IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public."VendorProfile"
        WHERE (id = folder_identifier OR "userId" = folder_identifier)
          AND "userId" = auth.uid()::text
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- Bucket 1: product-images Policies (Public Read, Vendor-Isolated Write)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public product-images read" ON storage.objects;
CREATE POLICY "Public product-images read" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Vendor and Admin product-images upload" ON storage.objects;
CREATE POLICY "Vendor and Admin product-images upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'product-images' AND
        (
            public.is_admin() OR
            public.is_vendor_owner((storage.foldername(name))[1]) OR
            (storage.foldername(name))[1] = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Vendor and Admin product-images manage" ON storage.objects;
CREATE POLICY "Vendor and Admin product-images manage" ON storage.objects
    FOR ALL TO authenticated
    USING (
        bucket_id = 'product-images' AND
        (
            public.is_admin() OR
            public.is_vendor_owner((storage.foldername(name))[1]) OR
            (storage.foldername(name))[1] = auth.uid()::text
        )
    )
    WITH CHECK (
        bucket_id = 'product-images' AND
        (
            public.is_admin() OR
            public.is_vendor_owner((storage.foldername(name))[1]) OR
            (storage.foldername(name))[1] = auth.uid()::text
        )
    );

-- ------------------------------------------------------------------------------
-- Bucket 2: vendor-assets Policies (Public Read, Vendor-Isolated Write)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public vendor-assets read" ON storage.objects;
CREATE POLICY "Public vendor-assets read" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'vendor-assets');

DROP POLICY IF EXISTS "Vendor and Admin vendor-assets manage" ON storage.objects;
CREATE POLICY "Vendor and Admin vendor-assets manage" ON storage.objects
    FOR ALL TO authenticated
    USING (
        bucket_id = 'vendor-assets' AND
        (
            public.is_admin() OR
            public.is_vendor_owner((storage.foldername(name))[1]) OR
            (storage.foldername(name))[1] = auth.uid()::text
        )
    )
    WITH CHECK (
        bucket_id = 'vendor-assets' AND
        (
            public.is_admin() OR
            public.is_vendor_owner((storage.foldername(name))[1]) OR
            (storage.foldername(name))[1] = auth.uid()::text
        )
    );

-- ------------------------------------------------------------------------------
-- Bucket 3: vendor-documents Policies (Strict Confidentiality - Private)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Strict vendor-documents read" ON storage.objects;
CREATE POLICY "Strict vendor-documents read" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'vendor-documents' AND
        (
            public.is_admin() OR
            public.is_vendor_owner((storage.foldername(name))[1]) OR
            (storage.foldername(name))[1] = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Strict vendor-documents upload" ON storage.objects;
CREATE POLICY "Strict vendor-documents upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'vendor-documents' AND
        (
            public.is_admin() OR
            public.is_vendor_owner((storage.foldername(name))[1]) OR
            (storage.foldername(name))[1] = auth.uid()::text
        )
    );

-- ------------------------------------------------------------------------------
-- Bucket 4: return-evidence Policies (Private - Customer Dispute Investigation)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Return evidence upload" ON storage.objects;
CREATE POLICY "Return evidence upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'return-evidence');

DROP POLICY IF EXISTS "Return evidence read" ON storage.objects;
CREATE POLICY "Return evidence read" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'return-evidence' AND
        (
            public.is_admin() OR
            owner = auth.uid() OR
            public.is_vendor_owner((storage.foldername(name))[1]) OR
            (storage.foldername(name))[1] = auth.uid()::text
        )
    );

COMMIT;
