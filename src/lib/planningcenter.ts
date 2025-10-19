import { supabase } from './supabase';

export interface PlanningCenterPerson {
  id: string;
  type: string;
  attributes: {
    first_name: string;
    last_name: string;
    name: string;
    avatar: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
}

export interface EmailLookupResult {
  people: PlanningCenterPerson[];
  count: number;
}

/**
 * Look up a person in Planning Center by email address
 * @param email - The email address to search for
 * @returns Promise with array of matching people
 */
export async function lookupPersonByEmail(email: string): Promise<EmailLookupResult> {
  if (!email || email.trim() === '') {
    throw new Error('Email address is required');
  }

  try {
    const { data, error } = await supabase.functions.invoke('planning-center-lookup', {
      body: { email: email.trim() },
    });

    if (error) {
      console.error('Error calling planning-center-lookup:', error);
      throw new Error(error.message || 'Failed to lookup person in Planning Center');
    }

    return data as EmailLookupResult;
  } catch (error) {
    console.error('Error in lookupPersonByEmail:', error);
    throw error;
  }
}

/**
 * Format a Planning Center person's name
 */
export function formatPersonName(person: PlanningCenterPerson): string {
  return person.attributes.name || 
    `${person.attributes.first_name || ''} ${person.attributes.last_name || ''}`.trim() ||
    'Unknown';
}
