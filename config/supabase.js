/**
 * Supabase Configuration
 * Rands Application
 */

const SUPABASE_URL = "https://fqbcidcezfprranfxhyj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxYmNpZGNlemZwcnJhbmZ4aHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MjY0ODgsImV4cCI6MjA5MzIwMjQ4OH0.eGCEE-lA8yLGjU1nFXv_A1RjbWvRbb5Mfm8FMzVRgHI";

// Initialize Supabase client (for use with traditional script tags)
if (window.supabase) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase connected');
}

// Helper functions for common operations
const getEvents = () => window.supabaseClient?.from('events').select('*');
const getTickets = () => window.supabaseClient?.from('tickets').select('*');

// Export for ES modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        getEvents,
        getTickets
    };
}
