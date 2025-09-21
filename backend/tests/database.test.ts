import { supabase } from '../lib/supabase';

describe('Supabase DB Connection', () => {
  it('Database is connected', async () => {
    const { data, error } = await supabase.from('tasks').select('*').limit(1);
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});

