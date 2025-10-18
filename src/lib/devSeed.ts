import { supabase } from './supabase';

export async function seedDummyPrayers(): Promise<{ prayersCount: number; updatesCount: number }> {
  const titles = [
    'Please pray for my mom',
    'Healing for a friend',
    'Job search guidance',
    'Wisdom for decisions',
    'Financial provision',
    'Peace in our church',
    'Safe travels',
    'Comfort in grief',
    'Healing after surgery',
    'Protection for children',
    'Saved marriage',
    'Guidance for vocation',
    'Strength in recovery',
    'New home',
    'Gratitude for a blessing',
    'Clarity in relationships',
    'Success on exams',
    'Endurance for caregivers',
    'Reconciliation',
    'Mission trip safety'
  ];

  const people = [
    'Alice', 'Bob', 'Carlos', 'Diana', 'Ethan', 'Fiona', 'George', 'Hannah', 'Ian', 'Jill'
  ];

  const descriptions = [
    'Short request.',
    'Please pray for healing and peace during this difficult time. He has been in the hospital and is awaiting test results.',
    'Prayers for provision as we transition jobs. We appreciate wisdom and open doors.',
    'Asking for strength to care for aging parents and for patience and provision.',
    'Longer note: We have been dealing with chronic illness for several years; prayer for complete restoration and peace would mean a lot to our family. Specific needs include clarity on treatment and emotional strength. Thank you for praying with us.'
  ];

  const statuses = ['current', 'ongoing', 'answered'];

  const prayersToInsert: Array<{
    title: string;
    prayer_for: string;
    description: string;
    requester: string;
    status: string;
    approval_status: string;
    is_seed_data: boolean;
    created_at: string;
  }> = [];
  const now = new Date();
  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setMonth(now.getMonth() - 2);

  for (let i = 0; i < 50; i++) {
    const title = titles[i % titles.length];
    
    // Generate random timestamp within the last 2 months
    const randomTimestamp = new Date(
      twoMonthsAgo.getTime() + Math.random() * (now.getTime() - twoMonthsAgo.getTime())
    );

    prayersToInsert.push({
      title,
      prayer_for: title,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      requester: people[Math.floor(Math.random() * people.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      approval_status: 'approved',
      is_seed_data: true,
      created_at: randomTimestamp.toISOString()
    });
  }

  const { data: insertedPrayers, error: prayerError } = await supabase
    .from('prayers')
    .insert(prayersToInsert)
    .select();

  if (prayerError) {
    console.error('Error inserting prayers:', prayerError);
    throw new Error(`Failed to insert prayers: ${prayerError.message}`);
  }

  // Insert some updates for a subset of prayers
  const updatesToInsert: any[] = [];
  const updateContents = [
    'Update: we have seen improvement this week. Thank you for praying.',
    'Short update: still holding on.',
    'Praise report! Prayer answered today.',
    'Continuing to trust God through this difficult time.',
    'Please keep praying - situation has become more challenging.',
    'Thank you all for your faithful prayers. We feel surrounded by love.',
    'Medical tests came back better than expected!',
    'Still waiting on results, but finding peace in the waiting.'
  ];

  if (insertedPrayers) {
    for (let i = 0; i < insertedPrayers.length; i++) {
      const prayer = insertedPrayers[i];
      const prayerCreatedDate = new Date(prayer.created_at);
      
      // Add 1-3 updates for about 60% of prayers
      const numUpdates = i % 5 === 0 ? 0 : Math.floor(Math.random() * 3) + 1;
      
      for (let u = 0; u < numUpdates; u++) {
        // Updates should be after the prayer creation date
        const daysSincePrayer = Math.floor(Math.random() * 30) + 1; // 1-30 days after
        const updateDate = new Date(prayerCreatedDate);
        updateDate.setDate(updateDate.getDate() + daysSincePrayer);
        
        // Don't create updates in the future
        if (updateDate <= now) {
          updatesToInsert.push({
            prayer_id: prayer.id,
            content: updateContents[Math.floor(Math.random() * updateContents.length)],
            author: people[Math.floor(Math.random() * people.length)],
            approval_status: 'approved',
            is_seed_data: true,
            created_at: updateDate.toISOString()
          });
        }
      }
    }
  }

  let updatesCount = 0;
  if (updatesToInsert.length > 0) {
    const { data: insertedUpdates, error: updateError } = await supabase
      .from('prayer_updates')
      .insert(updatesToInsert)
      .select();

    if (updateError) {
      console.error('Error inserting updates:', updateError);
      throw new Error(`Failed to insert updates: ${updateError.message}`);
    }

    updatesCount = insertedUpdates?.length ?? 0;
  }

  return {
    prayersCount: insertedPrayers?.length ?? 0,
    updatesCount
  };
}

export async function cleanupDummyPrayers(): Promise<{ prayersCount: number; updatesCount: number }> {
  // Query database for seed data using the is_seed_data flag
  const { data: seedPrayers, error: queryError } = await supabase
    .from('prayers')
    .select('id')
    .eq('is_seed_data', true);

  if (queryError) {
    console.error('Error querying seed prayers:', queryError);
    throw new Error(`Failed to query seed prayers: ${queryError.message}`);
  }

  if (!seedPrayers || seedPrayers.length === 0) {
    throw new Error('No seed data found in database. Have you run the seed function?');
  }

  // Delete updates marked as seed data
  const { data: deletedUpdates, error: updateError } = await supabase
    .from('prayer_updates')
    .delete()
    .eq('is_seed_data', true)
    .select();

  if (updateError) {
    console.error('Error deleting seed updates:', updateError);
    throw new Error(`Failed to delete seed updates: ${updateError.message}`);
  }

  // Delete prayers marked as seed data
  const { data: deletedPrayers, error: prayerError } = await supabase
    .from('prayers')
    .delete()
    .eq('is_seed_data', true)
    .select();

  if (prayerError) {
    console.error('Error deleting seed prayers:', prayerError);
    throw new Error(`Failed to delete seed prayers: ${prayerError.message}`);
  }

  return {
    prayersCount: deletedPrayers?.length ?? 0,
    updatesCount: deletedUpdates?.length ?? 0
  };
}
