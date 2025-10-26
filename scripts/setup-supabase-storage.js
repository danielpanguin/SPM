#!/usr/bin/env node

/**
 * Supabase Storage Setup Script
 *
 * This script automatically creates the 'attachments' storage bucket
 * and sets up the necessary RLS policies for the attachment upload feature.
 *
 * Usage:
 *   node scripts/setup-supabase-storage.js
 *
 * Prerequisites:
 *   - NEXT_PUBLIC_SUPABASE_URL in .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set in .env.local');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set in .env.local');
  console.error('   Get this from: Supabase Dashboard → Project Settings → API → service_role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupStorage() {
  console.log('🚀 Setting up Supabase storage for attachments...\n');

  // Step 1: Check if bucket exists
  console.log('1️⃣  Checking if "attachments" bucket exists...');
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('❌ Failed to list buckets:', listError.message);
    process.exit(1);
  }

  const attachmentBucket = buckets.find(b => b.name === 'attachments');

  if (attachmentBucket) {
    console.log('✅ Bucket "attachments" already exists');
  } else {
    // Step 2: Create bucket
    console.log('📦 Creating "attachments" bucket...');
    const { data: newBucket, error: createError } = await supabase.storage.createBucket('attachments', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/png',
        'image/jpeg'
      ]
    });

    if (createError) {
      console.error('❌ Failed to create bucket:', createError.message);
      process.exit(1);
    }

    console.log('✅ Created bucket "attachments"');
  }

  // Step 3: Set up storage policies
  console.log('\n2️⃣  Setting up storage policies...');

  const policies = [
    {
      name: 'Allow public read',
      sql: `
        CREATE POLICY IF NOT EXISTS "Allow public read"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'attachments');
      `
    },
    {
      name: 'Allow public upload',
      sql: `
        CREATE POLICY IF NOT EXISTS "Allow public upload"
        ON storage.objects FOR INSERT
        TO public
        WITH CHECK (bucket_id = 'attachments');
      `
    },
    {
      name: 'Allow public delete',
      sql: `
        CREATE POLICY IF NOT EXISTS "Allow public delete"
        ON storage.objects FOR DELETE
        TO public
        USING (bucket_id = 'attachments');
      `
    }
  ];

  for (const policy of policies) {
    console.log(`   📝 Creating policy: "${policy.name}"...`);
    const { error } = await supabase.rpc('exec_sql', { sql: policy.sql });

    if (error && !error.message.includes('already exists')) {
      console.warn(`   ⚠️  Warning for "${policy.name}":`, error.message);
    } else {
      console.log(`   ✅ Policy "${policy.name}" configured`);
    }
  }

  // Step 4: Verify setup
  console.log('\n3️⃣  Verifying setup...');

  // Test upload
  const testFileName = `test-${Date.now()}.txt`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(testFileName, 'Test file for setup verification', {
      contentType: 'text/plain'
    });

  if (uploadError) {
    console.error('❌ Upload test failed:', uploadError.message);
    console.error('\n⚠️  Setup incomplete. You may need to configure policies manually in Supabase Dashboard.');
    process.exit(1);
  }

  console.log('✅ Upload test successful');

  // Clean up test file
  await supabase.storage.from('attachments').remove([testFileName]);
  console.log('✅ Cleanup successful');

  console.log('\n✅ ✅ ✅  Supabase storage setup complete! ✅ ✅ ✅');
  console.log('\nYour attachment upload feature is ready to use! 🎉');
}

setupStorage().catch((error) => {
  console.error('\n❌ Setup failed:', error);
  process.exit(1);
});
