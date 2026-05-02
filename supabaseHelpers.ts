
import { supabase } from './supabaseClient';
import { Product, MaintenanceJob, Transaction, Debt } from './types';

export const updateProductStock = async (id: string, newStock: number) => {
  const { error } = await supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', id);
  if (error) {
    console.error('Error updating stock:', error);
    return { success: false, error };
  }
  return { success: true };
};

export const createMaintenanceJob = async (job: Omit<MaintenanceJob, 'id'>, shopId: string) => {
  const jobToInsert = { 
    ...job, 
    shop_id: shopId,
    paidAmount: job.paidAmount || 0 
  };
  
  const { data, error } = await supabase
    .from('maintenance_jobs')
    .insert([jobToInsert])
    .select()
    .single();
    
  if (error) {
    console.error('Error creating job:', error);
    return { data: null, error };
  }
  return { data, error: null };
};

export const updateMaintenanceJob = async (id: string, updates: Partial<MaintenanceJob>) => {
  const { error } = await supabase
    .from('maintenance_jobs')
    .update(updates)
    .eq('id', id);
  if (error) {
    console.error('Error updating job:', error);
    return { success: false, error };
  }
  return { success: true };
};

export const createDebt = async (debt: Omit<Debt, 'id'>, shopId: string) => {
  const { data, error } = await supabase
    .from('debts')
    .insert([{ ...debt, shop_id: shopId }])
    .select()
    .single();
  if (error) {
    console.error('Error creating debt:', error);
    return { data: null, error };
  }
  return { data, error: null };
};
