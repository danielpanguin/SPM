/**
 * Cleanup script to remove owners from task_collaborator table
 * 
 * This script removes duplicate entries where the owner is also listed
 * as a collaborator in the task_collaborator table.
 * 
 * Run with: npx tsx scripts/cleanup-owner-from-collaborators.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupOwnerFromCollaborators() {
  console.log('🔍 Starting cleanup of owner duplicates in task_collaborator table...\n');

  try {
    // 1. Fetch all tasks with their owners
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, owned_by');

    if (tasksError) {
      throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
    }

    console.log(`📊 Found ${tasks?.length || 0} tasks to check\n`);

    let totalRemoved = 0;
    let tasksAffected = 0;

    // 2. For each task, remove owner from task_collaborator if present
    for (const task of tasks || []) {
      if (!task.owned_by) continue;

      // Check if owner exists in task_collaborator
      const { data: existing, error: checkError } = await supabase
        .from('task_collaborator')
        .select('*')
        .eq('task_id', task.id)
        .eq('user_id', task.owned_by);

      if (checkError) {
        console.error(`⚠️  Error checking task ${task.id}:`, checkError.message);
        continue;
      }

      if (existing && existing.length > 0) {
        // Remove owner from collaborators
        const { error: deleteError } = await supabase
          .from('task_collaborator')
          .delete()
          .eq('task_id', task.id)
          .eq('user_id', task.owned_by);

        if (deleteError) {
          console.error(`❌ Failed to remove owner from task ${task.id}:`, deleteError.message);
        } else {
          totalRemoved += existing.length;
          tasksAffected++;
          console.log(`✅ Removed owner from task ${task.id} collaborators`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Cleanup completed!');
    console.log('='.repeat(60));
    console.log(`📈 Tasks affected: ${tasksAffected}`);
    console.log(`🗑️  Duplicate entries removed: ${totalRemoved}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupOwnerFromCollaborators()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
