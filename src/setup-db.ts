import { supabase } from './supabase';

async function setupDatabase() {
  try {
    const { error } = await supabase.from('installations').select('count');
    
    // If table doesn't exist, create it
    if (error && error.message.includes('does not exist')) {
      console.log('Creating installations table...');
      
      const { error: createError } = await supabase
        .rpc('create_installations_table', {
          sql: `
            create table if not exists installations (
              id uuid default uuid_generate_v4() primary key,
              resource_id text unique not null,
              access_token text not null,
              refresh_token text not null,
              token_type text not null,
              expires_in integer not null,
              scope text not null,
              user_type text not null,
              company_id text,
              location_id text,
              created_at timestamp with time zone default timezone('utc'::text, now()) not null,
              updated_at timestamp with time zone default timezone('utc'::text, now()) not null
            );

            create index if not exists installations_resource_id_idx on installations(resource_id);
            create index if not exists installations_company_id_idx on installations(company_id);
            create index if not exists installations_location_id_idx on installations(location_id);
          `
        });

      if (createError) {
        console.error('Error creating table:', createError);
        return;
      }
      
      console.log('Successfully created installations table and indexes');
    } else {
      console.log('Installations table already exists');
    }
  } catch (error) {
    console.error('Setup error:', error);
  }
}

setupDatabase(); 