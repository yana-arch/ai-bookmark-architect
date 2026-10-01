import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/services/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check active sessions and sets the user
        const initializeAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        };

        initializeAuth();

        // Listen for changes on auth state (logged in, signed out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                setIsLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signOut = useCallback(async () => {
        setIsLoading(true);
        await supabase.auth.signOut();
        setIsLoading(false);
    }, []);

    return {
        user,
        session,
        isLoading,
        isAuthenticated: !!session,
        signOut
    };
};
