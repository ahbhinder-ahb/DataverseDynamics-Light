
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchInvoices = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('Invoices').select('*').order('created_at', { ascending: false });

      if (filters.status && filters.status !== 'All') {
        query = query.eq('status', filters.status);
      }
      if (filters.search) {
        query = query.or(`customer_name.ilike.%${filters.search}%,invoice_number.ilike.%${filters.search}%`);
      }
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      setInvoices(data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error fetching invoices",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createInvoice = async (invoiceData) => {
    setLoading(true);
    try {
      const dataToInsert = {
        ...invoiceData,
        created_by: user?.id,
        created_at: new Date().toISOString(),
      };
      
      const { data, error: insertError } = await supabase
        .from('Invoices')
        .insert([dataToInsert])
        .select()
        .single();

      if (insertError) throw insertError;
      
      setInvoices(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Invoice created successfully.",
      });
      return data;
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error creating invoice",
        description: err.message,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateInvoice = async (id, updateData) => {
    setLoading(true);
    try {
      const { data, error: updateError } = await supabase
        .from('Invoices')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      
      setInvoices(prev => prev.map(inv => inv.id === id ? data : inv));
      toast({
        title: "Success",
        description: "Invoice updated successfully.",
      });
      return data;
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error updating invoice",
        description: err.message,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteInvoice = async (id) => {
    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('Invoices')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      toast({
        title: "Success",
        description: "Invoice deleted successfully.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error deleting invoice",
        description: err.message,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    invoices,
    loading,
    error,
    fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice
  };
};
