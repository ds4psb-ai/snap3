import { supabase } from './supabase';
import { VDP } from './schemas/vdp.zod';

export const createVDP = async (data: any): Promise<VDP> => {
  const { data: vdp, error } = await supabase
    .from('vdps')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create VDP: ${error.message}`);
  }

  return vdp;
};

export const getVDP = async (id: string): Promise<VDP | null> => {
  const { data, error } = await supabase
    .from('vdps')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching VDP:', error);
    return null;
  }

  return data;
};

export const updateVDP = async (id: string, updates: Partial<VDP>): Promise<VDP> => {
  const { data, error } = await supabase
    .from('vdps')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update VDP: ${error.message}`);
  }

  return data;
};
