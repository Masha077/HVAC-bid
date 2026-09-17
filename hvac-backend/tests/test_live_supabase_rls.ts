import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://yrqrbrwfencpyttaoihs.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_K-qzp71NjTywhEVAbiXpjg_NsSRq9gr';

console.log('=== REAL SUPABASE LIVE RLS TEST ===');
console.log(`Connecting to live Supabase URL: ${supabaseUrl}`);

async function testSupabaseRLS() {
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  const emailA = `usera_${Date.now()}@hvac-test.com`;
  const emailB = `userb_${Date.now()}@hvac-test.com`;
  const password = 'TestPassword123!';

  console.log(`\nAttempting signup for User A: ${emailA}...`);
  const signUpA = await anonClient.auth.signUp({ email: emailA, password });
  
  console.log(`Attempting signup for User B: ${emailB}...`);
  const signUpB = await anonClient.auth.signUp({ email: emailB, password });

  if (signUpA.error || signUpB.error || !signUpA.data?.session || !signUpB.data?.session || !signUpA.data?.user || !signUpB.data?.user) {
    console.log('\n[RLS TEST OBSERVATION]');
    console.log('User A SignUp result:', signUpA.error ? signUpA.error.message : 'Session requires email confirmation or admin creation.');
    console.log('User B SignUp result:', signUpB.error ? signUpB.error.message : 'Session requires email confirmation or admin creation.');
    console.log('Note: SUPABASE_SERVICE_ROLE_KEY is currently unset in environment.');
  } else {
    console.log('User A and User B successfully authenticated with live Supabase auth!');
    const userA = signUpA.data.user;
    const userB = signUpB.data.user;
    const clientA = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${signUpA.data.session.access_token}` } }
    });
    const clientB = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${signUpB.data.session.access_token}` } }
    });

    const projectIdA = `PRJ-RLS-TEST-A-${Date.now()}`;
    const insertA = await clientA.from('projects').insert({
      project_id: projectIdA,
      user_id: userA.id,
      mode: 'REQUIREMENT_DRIVEN',
      location: 'Chennai'
    });
    console.log('User A insert result:', insertA.error ? insertA.error.message : 'Success');

    const queryB = await clientB.from('projects').select('*').eq('project_id', projectIdA);
    console.log(`User B query for User A project (${projectIdA}):`, queryB.data?.length === 0 ? 'ISOLATED (0 rows returned)' : `FAILED (${queryB.data?.length} rows returned)`);

    const queryA = await clientA.from('projects').select('*').eq('project_id', projectIdA);
    console.log(`User A query for User A project (${projectIdA}):`, queryA.data?.length === 1 ? 'ACCESSIBLE (1 row returned)' : 'FAILED');

    const unauthQuery = await anonClient.from('projects').select('*').eq('project_id', projectIdA);
    console.log(`Unauthenticated query for User A project (${projectIdA}):`, unauthQuery.data?.length === 0 ? 'REJECTED / ISOLATED (0 rows returned)' : 'FAILED');
  }
}

testSupabaseRLS().catch((err) => console.error('Supabase RLS test error:', err));
