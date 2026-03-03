
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Context state for messages, avoiding useToast circular dependencies
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const clearMessages = useCallback(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  const handleSession = useCallback(async (session) => {
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        handleSession(session);
      } catch (error) {
        console.error("Auth initialization error");
        handleSession(null);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        handleSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const signUp = useCallback(async (email, password, options) => {
    if (!supabase) return { error: { message: "System configuration error" } };
    clearMessages();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options,
    });

    if (error) {
      setErrorMessage(error.message || "Something went wrong");
    } else {
      setSuccessMessage("Sign up successful!");
    }

    return { error };
  }, [clearMessages]);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) return { error: { message: "System configuration error" } };
    clearMessages();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage("Invalid login credentials or server error.");
    } else {
      setSuccessMessage("Sign in successful!");
    }

    return { error };
  }, [clearMessages]);

  const signOut = useCallback(async () => {
    if (!supabase) return { error: { message: "System configuration error" } };
    clearMessages();

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        const errorMsg = error.message?.toLowerCase() || '';
        if (
          errorMsg.includes('session_not_found') || 
          errorMsg.includes('not found') || 
          error.status === 404 || 
          error.status === 403
        ) {
          console.warn("Session already invalid on server, clearing local state silently.");
        } else {
          setErrorMessage(error.message || "Something went wrong during server signout.");
        }
      } else {
        setSuccessMessage("Signed out successfully.");
      }
    } catch (err) {
      console.warn("Exception during sign out:", err);
    } finally {
      handleSession(null);
    }

    return { error: null };
  }, [clearMessages, handleSession]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    errorMessage,
    successMessage,
    clearMessages,
    signUp,
    signIn,
    signOut,
  }), [user, session, loading, errorMessage, successMessage, clearMessages, signUp, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
